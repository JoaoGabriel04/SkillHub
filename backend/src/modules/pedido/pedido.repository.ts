import type { ParteDoPedido, Prisma } from "@prisma/client";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";

// Único lugar que escreve em PedidoProduto e ItemPedido (Fase 18B). As partes saem do banco só com id, nome e foto;
// cidade, bairro e telefone têm consultas próprias e nunca entram no objeto que vira resposta.
// As escritas de status são updateMany com condição (nunca "lê, confere e grava"): a condição resolve as corridas,
// e a linha do pedido fica travada até o fim da transação de quem chamou.
type Tx = Prisma.TransactionClient;

// os itens em ordem de nome: o "primeiro item" do resumo, do extrato e do contato é sempre o mesmo
export const comPartes = {
  comprador: { select: AUTOR_RESUMO_SELECT },
  vendedor: { select: AUTOR_RESUMO_SELECT },
  itens: { orderBy: [{ nome: "asc" }, { id: "asc" }] },
} satisfies Prisma.PedidoProdutoInclude;
const ORDEM = [{ createdAt: "desc" }, { id: "desc" }] as const satisfies Prisma.PedidoProdutoOrderByWithRelationInput[];

export type PedidoComPartes = Prisma.PedidoProdutoGetPayload<{ include: typeof comPartes }>;
export type ItemNovo = Omit<Prisma.ItemPedidoCreateManyPedidoInput, "id">;

const pedidoRepository = {
  transacao: <T>(fn: (tx: Tx) => Promise<T>) => prisma.$transaction(fn),

  buscar: (id: string, tx: Tx | typeof prisma = prisma) => tx.pedidoProduto.findUnique({ where: { id }, include: comPartes }),

  buscarVarios: (ids: string[]) => prisma.pedidoProduto.findMany({ where: { id: { in: ids } }, include: comPartes, orderBy: [{ vendedorId: "asc" }] }),

  listar: (papel: "compradorId" | "vendedorId", usuarioId: string, limit: number, cursor?: string) =>
    prisma.pedidoProduto.findMany({
      where: { [papel]: usuarioId },
      include: comPartes,
      orderBy: [...ORDEM],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),

  criar: (tx: Tx, data: { compradorId: string; vendedorId: string; total: number; observacao?: string }, itens: ItemNovo[]) =>
    tx.pedidoProduto.create({ data: { ...data, itens: { createMany: { data: itens } } }, select: { id: true, total: true } }),

  // só a cidade e o bairro da outra parte (nunca rua, número, complemento nem CEP)
  local: (userId: string) => prisma.user.findUnique({ where: { id: userId }, select: { cidade: true, bairro: true } }),

  // só para o contatoDisponivel e o link do WhatsApp; nunca vai para a resposta
  telefone: async (userId: string) => (await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }))?.phone ?? null,

  // quem compra precisa ter o perfil completo (o módulo user não é alterado: a leitura fica aqui)
  perfilDoUsuario: (id: string) => prisma.user.findUnique({ where: { id }, select: { profileComplete: true } }),

  // vendedor: AGUARDANDO_ENVIO -> ENVIADO
  enviar: (id: string, vendedorId: string) =>
    prisma.pedidoProduto.updateMany({ where: { id, vendedorId, status: "AGUARDANDO_ENVIO" }, data: { status: "ENVIADO", enviadoEm: new Date() } }),

  // comprador: ENVIADO -> CONCLUIDO, só com o vendedor ainda na plataforma (há quem receber)
  concluir: (tx: Tx, id: string, compradorId: string) =>
    tx.pedidoProduto.updateMany({
      where: { id, compradorId, status: "ENVIADO", vendedorId: { not: null } },
      data: { status: "CONCLUIDO", concluidoEm: new Date() },
    }),

  // Cancelar (Seção 3.4 do PLANO_18B, com a exceção do D5): o comprador antes do envio, ou depois dele se o vendedor
  // excluiu a conta; o vendedor antes ou depois do envio.
  cancelar: (tx: Tx, id: string, usuarioId: string, parte: ParteDoPedido) =>
    tx.pedidoProduto.updateMany({
      where: {
        id,
        OR:
          parte === "COMPRADOR"
            ? [
                { compradorId: usuarioId, status: "AGUARDANDO_ENVIO" },
                { compradorId: usuarioId, status: "ENVIADO", vendedorId: null },
              ]
            : [{ vendedorId: usuarioId, status: { in: ["AGUARDANDO_ENVIO", "ENVIADO"] } }],
      },
      data: { status: "CANCELADO", canceladoPor: parte, canceladoEm: new Date() },
    }),

  // estado atual, sem trava, para explicar por que uma escrita condicional não pegou (404, 403 ou 409)
  estado: (id: string, tx: Tx | typeof prisma = prisma) =>
    tx.pedidoProduto.findUnique({ where: { id }, select: { status: true, compradorId: true, vendedorId: true } }),

  // dentro da transação, depois da trava: o que o pagamento e o estorno precisam
  paraCredito: (tx: Tx, id: string) =>
    tx.pedidoProduto.findUniqueOrThrow({
      where: { id },
      select: { id: true, total: true, compradorId: true, vendedorId: true, itens: { select: { produtoId: true, quantidade: true } } },
    }),
};

export default pedidoRepository;
