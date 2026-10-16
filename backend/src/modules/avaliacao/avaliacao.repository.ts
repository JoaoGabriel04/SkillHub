import type { Prisma } from "@prisma/client";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";

// Pessoas saem do banco só com id, nome e foto (toAutorResumo no service); o pedido, só com id e título
const comPessoas = {
  avaliador: { select: AUTOR_RESUMO_SELECT },
  avaliado: { select: AUTOR_RESUMO_SELECT },
  servico: { select: { id: true, titulo: true } },
} as const;

export type AvaliacaoCompleta = Prisma.AvaliacaoGetPayload<{ include: typeof comPessoas }>;

const avaliacaoRepository = {
  // as partes do pedido e o status, para as regras de quem pode avaliar e ver
  buscarServico: (id: string) =>
    prisma.servico.findUnique({ where: { id }, select: { id: true, status: true, autorId: true, colaboradorId: true } }),

  criar: (data: Prisma.AvaliacaoUncheckedCreateInput) => prisma.avaliacao.create({ data, include: comPessoas }),

  listarDoServico: (servicoId: string) =>
    prisma.avaliacao.findMany({ where: { servicoId }, include: comPessoas, orderBy: { createdAt: "asc" } }),

  listarRecebidas: (avaliadoId: string, limit: number, cursor?: string) =>
    prisma.avaliacao.findMany({
      where: { avaliadoId },
      include: comPessoas,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1, // um a mais para saber se há próxima página
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),

  // soma e contagem (a média sai delas no service, sem arredondar um float já arredondado)
  agregado: (avaliadoId: string) => prisma.avaliacao.aggregate({ where: { avaliadoId }, _sum: { nota: true }, _count: true }),

  usuarioExiste: async (id: string) => !!(await prisma.user.findUnique({ where: { id }, select: { id: true } })),
};

export default avaliacaoRepository;
