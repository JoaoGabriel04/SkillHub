import type { ParteDoPedido } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../utils/AppError.js";
import { toAutorResumo } from "../../utils/autorResumo.js";
import creditoService from "../credito/credito.service.js";
import produtoRepository from "../produto/produto.repository.js";
import { linkWhatsappPedido, normalizarTelefone } from "../produto/whatsapp.js";
import pedidoRepository, { type ItemNovo, type PedidoComPartes } from "./pedido.repository.js";
import type { CheckoutInput, ListarPedidosInput } from "./pedido.schema.js";
import { ROTULO_PARTE, ROTULO_STATUS_PEDIDO, STATUS_ABERTOS } from "./status.map.js";

// Pedidos de produtos (Fase 18B). Ordem das travas em toda transação (PLANO_18B, Seção 3.4), para não haver deadlock:
// 1. a linha do pedido; 2. as linhas de Produto, em ordem crescente de id; 3. os usuários, com a plataforma por último.
// Créditos só pelo creditoService; estoque só pelo produtoRepository.

const naoEncontrado = () => new AppError("Pedido não encontrado", 404);
const ehUuid = (id: string) => z.uuid().safeParse(id).success;
const pareceDe = (p: { compradorId: string | null; vendedorId: string | null }, eu: string) =>
  p.compradorId === eu ? "comprador" : p.vendedorId === eu ? "vendedor" : null;

// Resposta da API: rótulos no lugar dos enums, datas em ISO e a outra parte só com id, nome e foto.
// Nunca sai telefone, e-mail, documentos nem endereço (só cidade e bairro, no detalhe).
function toPedidoResumo(p: PedidoComPartes, eu: string) {
  const papel = p.compradorId === eu ? ("comprador" as const) : ("vendedor" as const);
  const outra = papel === "comprador" ? p.vendedor : p.comprador;
  return {
    id: p.id,
    status: ROTULO_STATUS_PEDIDO[p.status],
    total: p.total,
    createdAt: p.createdAt.toISOString(),
    enviadoEm: p.enviadoEm?.toISOString() ?? null,
    concluidoEm: p.concluidoEm?.toISOString() ?? null,
    canceladoEm: p.canceladoEm?.toISOString() ?? null,
    papel,
    primeiroItem: p.itens[0]?.nome ?? "",
    outrosItens: Math.max(0, p.itens.length - 1),
    capaUrl: p.itens[0]?.imagemUrl ?? null,
    outraParte: outra ? toAutorResumo(outra) : null,
  };
}

async function toPedidoDetalhe(p: PedidoComPartes, eu: string) {
  const resumo = toPedidoResumo(p, eu);
  const outraId = resumo.papel === "comprador" ? p.vendedorId : p.compradorId;
  const [local, telefone] = outraId ? await Promise.all([pedidoRepository.local(outraId), pedidoRepository.telefone(outraId)]) : [null, null];
  return {
    ...resumo,
    itens: p.itens.map(({ id, produtoId, nome, precoUnitario, quantidade, imagemUrl, digital }) => ({ id, produtoId, nome, precoUnitario, quantidade, imagemUrl, digital })),
    observacao: p.observacao,
    canceladoPor: p.canceladoPor ? ROTULO_PARTE[p.canceladoPor] : null,
    outraParteLocal: local ? { cidade: local.cidade, bairro: local.bairro } : null,
    // só o sim/não: o telefone continua fora da resposta
    contatoDisponivel: STATUS_ABERTOS.includes(p.status) && normalizarTelefone(telefone) !== null,
  };
}

// Por que uma escrita condicional não pegou: 404 (não existe), 403 (não é parte, ou é a parte errada) ou 409 (estado)
async function recusar(id: string, eu: string, parteExigida: "comprador" | "vendedor", acao: string): Promise<never> {
  const p = await pedidoRepository.estado(id);
  if (!p) throw naoEncontrado();
  const parte = pareceDe(p, eu);
  if (!parte) throw new AppError("Você não faz parte deste pedido", 403);
  if (parte !== parteExigida) throw new AppError(`Só o ${parteExigida} pode ${acao}`, 403);
  if (acao === "confirmar o recebimento" && p.status === "ENVIADO" && p.vendedorId === null)
    throw new AppError("O vendedor excluiu a conta", 409);
  throw new AppError(`Não dá para ${acao} um pedido ${ROTULO_STATUS_PEDIDO[p.status].toLowerCase()}`, 409);
}

async function doUsuario(id: string, eu: string) {
  if (!ehUuid(id)) throw naoEncontrado();
  const p = await pedidoRepository.buscar(id);
  if (!p) throw naoEncontrado();
  if (!pareceDe(p, eu)) throw new AppError("Você não faz parte deste pedido", 403);
  return p;
}

const detalheDe = async (id: string, eu: string) => toPedidoDetalhe((await pedidoRepository.buscar(id))!, eu);

const pedidoService = {
  // Checkout (PLANO_18B, Seção 3.4): uma transação. Baixa o estoque com o preço e o status na condição, cria um
  // pedido por vendedor com os itens em snapshot e reserva o total de cada um. Qualquer falha desfaz tudo.
  checkout: async (eu: string, { itens, observacao }: CheckoutInput) => {
    const perfil = await pedidoRepository.perfilDoUsuario(eu);
    if (!perfil) throw new AppError("Usuário não encontrado", 401);
    if (!perfil.profileComplete) throw new AppError("Complete seu perfil para comprar", 403);

    const ordenados = [...itens].sort((a, b) => a.produtoId.localeCompare(b.produtoId));
    const ids = await pedidoRepository.transacao(async (tx) => {
      const produtos = new Map((await produtoRepository.paraCheckout(tx, ordenados.map((i) => i.produtoId))).map((p) => [p.id, p]));
      if ([...produtos.values()].some((p) => p.vendedorId === eu)) throw new AppError("Você não pode comprar o seu próprio produto", 403);
      for (const { produtoId } of ordenados) {
        const p = produtos.get(produtoId);
        if (!p || p.status !== "ATIVO") throw new AppError("Este produto não está mais à venda", 409, { code: "INDISPONIVEL", produtoId });
      }

      // estoque: em ordem crescente de id (trava as linhas de Produto sempre na mesma ordem)
      for (const { produtoId, quantidade, precoEsperado } of ordenados) {
        if (await produtoRepository.baixarEstoque(tx, produtoId, quantidade, precoEsperado)) continue;
        const atual = await produtoRepository.estadoParaCheckout(tx, produtoId);
        if (!atual || atual.status !== "ATIVO") throw new AppError("Este produto não está mais à venda", 409, { code: "INDISPONIVEL", produtoId });
        if (atual.preco !== precoEsperado)
          throw new AppError("O preço deste produto mudou", 409, { code: "PRECO_ALTERADO", produtoId, precoAtual: atual.preco });
        throw new AppError("Não há estoque para a quantidade pedida", 409, { code: "ESGOTADO", produtoId, estoque: atual.estoque });
      }

      // um pedido por vendedor (decisão D3), em ordem de vendedor, com os itens em snapshot
      const porVendedor = new Map<string, ItemNovo[]>();
      for (const { produtoId, quantidade } of ordenados) {
        const p = produtos.get(produtoId)!;
        const lista = porVendedor.get(p.vendedorId) ?? [];
        lista.push({ produtoId, quantidade, nome: p.nome, precoUnitario: p.preco, imagemUrl: p.imagens[0]?.url ?? null, digital: p.digital });
        porVendedor.set(p.vendedorId, lista);
      }
      const criados: { id: string; total: number }[] = [];
      for (const vendedorId of [...porVendedor.keys()].sort()) {
        const lista = porVendedor.get(vendedorId)!;
        const total = lista.reduce((t, i) => t + i.precoUnitario * i.quantidade, 0);
        criados.push(await pedidoRepository.criar(tx, { compradorId: eu, vendedorId, total, observacao }, lista));
      }
      // a reserva de cada pedido, por último (a linha do comprador): sem saldo para todos, 409 e tudo volta
      for (const pedido of criados) await creditoService.reservarPedido(tx, pedido.id, eu, pedido.total);
      return criados.map((c) => c.id);
    });
    return Promise.all((await pedidoRepository.buscarVarios(ids)).map((p) => toPedidoDetalhe(p, eu)));
  },

  listar: async (eu: string, papel: "compradorId" | "vendedorId", { limit, cursor }: ListarPedidosInput) => {
    const linhas = await pedidoRepository.listar(papel, eu, limit, cursor);
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    return { pedidos: pagina.map((p) => toPedidoResumo(p, eu)), nextCursor: temMais ? pagina[pagina.length - 1].id : null };
  },

  detalhe: async (id: string, eu: string) => toPedidoDetalhe(await doUsuario(id, eu), eu),

  enviar: async (id: string, eu: string) => {
    if (!ehUuid(id)) throw naoEncontrado();
    if ((await pedidoRepository.enviar(id, eu)).count === 0) await recusar(id, eu, "vendedor", "enviar");
    return detalheDe(id, eu);
  },

  // ENVIADO -> CONCLUIDO e o pagamento ao vendedor (com a taxa), na mesma transação
  confirmarRecebimento: async (id: string, eu: string) => {
    if (!ehUuid(id)) throw naoEncontrado();
    const pegou = await pedidoRepository.transacao(async (tx) => {
      if ((await pedidoRepository.concluir(tx, id, eu)).count === 0) return false;
      await creditoService.pagarPedido(tx, await pedidoRepository.paraCredito(tx, id));
      return true;
    });
    if (!pegou) await recusar(id, eu, "comprador", "confirmar o recebimento");
    return detalheDe(id, eu);
  },

  // -> CANCELADO: devolve o estoque (em ordem de produto) e estorna a reserva ao comprador, na mesma transação.
  // Sem comprador (conta excluída), a reserva saiu com a conta: só o estoque volta.
  cancelar: async (id: string, eu: string) => {
    if (!ehUuid(id)) throw naoEncontrado();
    const antes = await pedidoRepository.estado(id);
    if (!antes) throw naoEncontrado();
    const parte = pareceDe(antes, eu);
    if (!parte) throw new AppError("Você não faz parte deste pedido", 403);
    const enumParte: ParteDoPedido = parte === "comprador" ? "COMPRADOR" : "VENDEDOR";
    const pegou = await pedidoRepository.transacao(async (tx) => {
      if ((await pedidoRepository.cancelar(tx, id, eu, enumParte)).count === 0) return false;
      const pedido = await pedidoRepository.paraCredito(tx, id);
      const itens = pedido.itens.filter((i): i is { produtoId: string; quantidade: number } => !!i.produtoId).sort((a, b) => a.produtoId.localeCompare(b.produtoId));
      for (const item of itens) await produtoRepository.devolverEstoque(tx, item.produtoId, item.quantidade);
      if (pedido.compradorId) await creditoService.estornarPedido(tx, pedido);
      return true;
    });
    if (!pegou) {
      const p = await pedidoRepository.estado(id);
      if (!p) throw naoEncontrado();
      throw new AppError(`Não dá para cancelar um pedido ${ROTULO_STATUS_PEDIDO[p.status].toLowerCase()}`, 409);
    }
    return detalheDe(id, eu);
  },

  // Seção 5.5: o link do WhatsApp da outra parte, só para as partes e só com o pedido em aberto
  contato: async (id: string, eu: string) => {
    const p = await doUsuario(id, eu);
    if (!STATUS_ABERTOS.includes(p.status)) throw new AppError("O pedido já foi encerrado", 409);
    const papel = pareceDe(p, eu)!;
    const outraId = papel === "comprador" ? p.vendedorId : p.compradorId;
    const telefone = outraId ? normalizarTelefone(await pedidoRepository.telefone(outraId)) : null;
    if (!telefone) throw new AppError("A outra parte não tem telefone cadastrado", 404);
    return { url: linkWhatsappPedido(telefone, p.itens[0]?.nome ?? "seu pedido", papel) };
  },
};

export default pedidoService;
