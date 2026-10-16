import type { Prisma, TipoTransacao } from "@prisma/client";
import prisma from "../../configs/prisma.js";

// Único lugar do backend que escreve em User.credits (scripts/check-creditos.mjs garante).
// Tudo roda dentro de uma transação aberta por quem chama (tx).
type Tx = Prisma.TransactionClient;

const creditoRepository = {
  // débito condicional: só muda se houver saldo (nunca "ler, calcular e gravar"); devolve quantas linhas mudaram
  debitar: (tx: Tx, userId: string, valor: number) =>
    tx.user.updateMany({ where: { id: userId, credits: { gte: valor } }, data: { credits: { decrement: valor } } }),

  creditar: (tx: Tx, userId: string, valor: number) =>
    tx.user.update({ where: { id: userId }, data: { credits: { increment: valor } }, select: { id: true } }),

  // saldo depois do UPDATE: a linha fica travada por ele até o commit
  existe: async (tx: Tx, userId: string) => !!(await tx.user.findUnique({ where: { id: userId }, select: { id: true } })),

  saldo: (tx: Tx, userId: string) => tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } }),

  registrar: (tx: Tx, data: { userId: string; tipo: TipoTransacao; valor: number; saldoApos: number; servicoId: string | null }) =>
    tx.transacaoCredito.create({ data }),

  transacaoDoServico: (tx: Tx, servicoId: string, tipo: TipoTransacao) => tx.transacaoCredito.findFirst({ where: { servicoId, tipo } }),

  temBonus: (userId: string) => prisma.transacaoCredito.count({ where: { userId, tipo: "BONUS" } }),

  extrato: (userId: string, limit: number, cursor?: string) =>
    prisma.transacaoCredito.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),

  titulosDosServicos: (ids: string[]) =>
    prisma.servico.findMany({ where: { id: { in: ids } }, select: { id: true, titulo: true } }),

  // fora de transação, para o teste da taxa (scripts/verificar-taxa.ts). A soma é a invariante: reservar, pagar e
  // estornar só movem saldo entre contas
  saldoAtual: async (userId: string) => (await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } })).credits,

  somaDosSaldos: async () => (await prisma.user.aggregate({ _sum: { credits: true } }))._sum.credits ?? 0,

  usuarioPorEmail: (email: string) => prisma.user.findUnique({ where: { email }, select: { id: true } }),

  transacao: <T>(fn: (tx: Tx) => Promise<T>) => prisma.$transaction(fn),
};

export default creditoRepository;
