import type { Prisma, TipoTransacao } from "@prisma/client";
import { calcularTaxa, contaPlataforma } from "../../configs/creditos.js";
import { AppError } from "../../utils/AppError.js";
import creditoRepository from "./credito.repository.js";
import type { ExtratoInput } from "./credito.schema.js";

type Tx = Prisma.TransactionClient;
const ROTULO = { BONUS: "Bônus", RESERVA: "Reserva", ESTORNO: "Estorno", RECEBIMENTO: "Recebimento", TAXA: "Taxa da plataforma", TAXA_RECEBIDA: "Taxa recebida" } as const;

// O único jeito de mudar um saldo: atualiza User.credits e grava a linha do extrato com o saldo depois.
// Débito sem saldo: 409 "Créditos insuficientes", e a transação de quem chamou volta inteira.
// servicoId (17C) ou pedidoId (18B): a que a movimentação se refere no extrato.
async function movimentar(tx: Tx, userId: string, tipo: TipoTransacao, valor: number, servicoId: string | null, pedidoId: string | null = null) {
  if (valor === 0) return;
  if (valor < 0) {
    const { count } = await creditoRepository.debitar(tx, userId, -valor);
    if (count === 0) throw new AppError("Créditos insuficientes", 409, { code: "SALDO_INSUFICIENTE" });
  } else {
    await creditoRepository.creditar(tx, userId, valor);
  }
  const { credits } = await creditoRepository.saldo(tx, userId);
  await creditoRepository.registrar(tx, { userId, tipo, valor, saldoApos: credits, servicoId, pedidoId });
}

// Com taxa > 0, ela sai de quem recebeu (TAXA) e entra na conta da plataforma (TAXA_RECEBIDA), na mesma transação.
// A plataforma é sempre a última linha travada (PLANO_18B, Seção 3.4). Sem ela, falha e a transação volta inteira.
async function cobrarTaxa(tx: Tx, recebedorId: string, valor: number, servicoId: string | null, pedidoId: string | null) {
  const taxa = calcularTaxa(valor);
  if (taxa === 0) return;
  const plataforma = contaPlataforma().id;
  if (!(await creditoRepository.existe(tx, plataforma))) throw new Error("Conta da plataforma ausente; rode npm run plataforma:garantir");
  await movimentar(tx, recebedorId, "TAXA", -taxa, servicoId, pedidoId);
  await movimentar(tx, plataforma, "TAXA_RECEBIDA", taxa, servicoId, pedidoId);
}

// Fase 18B (ajuste 2 da aprovação): pagar e estornar um pedido usam pedido.total, e só depois de conferir que o pedido
// tem exatamente uma RESERVA, do comprador, de -total. Se não tiver, é um erro interno: nenhum crédito se move.
async function conferirReserva(tx: Tx, pedido: { id: string; total: number; compradorId: string | null }) {
  const reservas = await creditoRepository.reservasDoPedido(tx, pedido.id);
  const ok = reservas.length === 1 && reservas[0].valor === -pedido.total && (pedido.compradorId === null || reservas[0].userId === pedido.compradorId);
  if (!ok) throw new Error(`Reserva do pedido ${pedido.id} ausente ou diferente do total (${pedido.total})`);
}

// valor reservado de um pedido (positivo), ou null se não houve reserva ("a combinar" sem proposta)
async function valorReservado(tx: Tx, servicoId: string) {
  const reserva = await creditoRepository.transacaoDoServico(tx, servicoId, "RESERVA");
  return reserva ? -reserva.valor : null;
}

const creditoService = {
  // aceitar uma candidatura (17B): o autor reserva o valor combinado
  reservar: (tx: Tx, servicoId: string, autorId: string, valor: number | null) =>
    valor === null ? Promise.resolve() : movimentar(tx, autorId, "RESERVA", -valor, servicoId),

  // concluir: o colaborador recebe a reserva; com taxa > 0, ela sai dele (TAXA) e entra na conta da plataforma
  // (TAXA_RECEBIDA), na mesma transação. Com taxa 0, nenhuma linha extra.
  // Sem a conta da plataforma, o concluir falha (500) e volta inteiro: o pedido nunca conclui com crédito sumindo.
  pagar: async (tx: Tx, servicoId: string, colaboradorId: string) => {
    const valor = await valorReservado(tx, servicoId);
    if (valor === null) return;
    await movimentar(tx, colaboradorId, "RECEBIMENTO", valor, servicoId);
    await cobrarTaxa(tx, colaboradorId, valor, servicoId, null);
  },

  // cancelar um pedido em andamento: a reserva volta para o autor
  estornar: async (tx: Tx, servicoId: string, autorId: string) => {
    const valor = await valorReservado(tx, servicoId);
    if (valor !== null) await movimentar(tx, autorId, "ESTORNO", valor, servicoId);
  },

  // --- Fase 18B: pedidos de produtos. Chamadas dentro da transação do pedido, depois da trava da linha dele.

  // checkout: o comprador reserva o total de um pedido (sem saldo: 409 SALDO_INSUFICIENTE e o checkout volta inteiro)
  reservarPedido: (tx: Tx, pedidoId: string, compradorId: string, total: number) =>
    movimentar(tx, compradorId, "RESERVA", -total, null, pedidoId),

  // confirmação do recebimento: o vendedor recebe o total, menos a taxa (calculada sobre o total do pedido)
  pagarPedido: async (tx: Tx, pedido: { id: string; total: number; compradorId: string | null; vendedorId: string | null }) => {
    if (!pedido.vendedorId) throw new Error(`Pedido ${pedido.id} sem vendedor para receber`);
    await conferirReserva(tx, pedido);
    await movimentar(tx, pedido.vendedorId, "RECEBIMENTO", pedido.total, null, pedido.id);
    await cobrarTaxa(tx, pedido.vendedorId, pedido.total, null, pedido.id);
  },

  // cancelamento: o total volta inteiro ao comprador, sem taxa (quem chama só chama com o comprador na plataforma)
  estornarPedido: async (tx: Tx, pedido: { id: string; total: number; compradorId: string | null }) => {
    if (!pedido.compradorId) throw new Error(`Pedido ${pedido.id} sem comprador para estornar`);
    await conferirReserva(tx, pedido);
    await movimentar(tx, pedido.compradorId, "ESTORNO", pedido.total, null, pedido.id);
  },

  // script administrativo (scripts/conceder-creditos.ts) e seed de desenvolvimento
  conceder: async (email: string, valor: number) => {
    if (!Number.isInteger(valor) || valor <= 0) throw new AppError("O valor precisa ser um inteiro maior que zero", 400);
    const usuario = await creditoRepository.usuarioPorEmail(email.toLowerCase());
    if (!usuario) throw new AppError(`Nenhum usuário com o e-mail ${email}`, 404);
    await creditoRepository.transacao((tx) => movimentar(tx, usuario.id, "BONUS", valor, null));
    const { credits } = await creditoRepository.transacao((tx) => creditoRepository.saldo(tx, usuario.id));
    return { saldo: credits };
  },

  jaRecebeuBonus: async (email: string) => {
    const usuario = await creditoRepository.usuarioPorEmail(email.toLowerCase());
    return !!usuario && (await creditoRepository.temBonus(usuario.id)) > 0;
  },

  extrato: async (userId: string, { limit, cursor }: ExtratoInput) => {
    const linhas = await creditoRepository.extrato(userId, limit, cursor);
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    const ids = [...new Set(pagina.map((t) => t.servicoId).filter((id): id is string => !!id))];
    const titulos = new Map((await creditoRepository.titulosDosServicos(ids)).map((s) => [s.id, s.titulo]));
    const idsPedidos = [...new Set(pagina.map((t) => t.pedidoId).filter((id): id is string => !!id))];
    const rotulos = new Map(
      (await creditoRepository.itensDosPedidos(idsPedidos)).map((p) => [
        p.id,
        `Pedido: ${p.itens[0]?.nome ?? "sem itens"}${p.itens.length > 1 ? ` (+${p.itens.length - 1})` : ""}`,
      ])
    );
    return {
      transacoes: pagina.map((t) => ({
        id: t.id,
        tipo: ROTULO[t.tipo],
        valor: t.valor,
        saldoApos: t.saldoApos,
        createdAt: t.createdAt.toISOString(),
        // pedido que não existe mais (autor excluído) aparece como null
        servico: t.servicoId && titulos.has(t.servicoId) ? { id: t.servicoId, titulo: titulos.get(t.servicoId)! } : null,
        // Fase 18B: pedido de produtos; o que não existe mais aparece como null ("Pedido removido" na tela)
        pedido: t.pedidoId && rotulos.has(t.pedidoId) ? { id: t.pedidoId, rotulo: rotulos.get(t.pedidoId)! } : null,
      })),
      nextCursor: temMais ? pagina[pagina.length - 1].id : null,
    };
  },
};

export default creditoService;
