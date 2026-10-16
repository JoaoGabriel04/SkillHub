import type { Prisma, StatusServico } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";

// Autor e colaborador saem do banco só com id, nome e foto (toAutorResumo no service).
// A candidatura aceita vem só com o valor proposto: é dela o valor combinado (valorCombinado na resposta).
export const comAutor = {
  autor: { select: AUTOR_RESUMO_SELECT },
  colaborador: { select: AUTOR_RESUMO_SELECT },
  candidaturas: { where: { status: "ACEITA" }, select: { valorProposto: true }, take: 1 },
} as const;
const ORDEM = [{ createdAt: "desc" }, { id: "desc" }] as const satisfies Prisma.ServicoOrderByWithRelationInput[];

export type ServicoComAutor = Prisma.ServicoGetPayload<{ include: typeof comAutor }>;

type FiltroLista = {
  usuarioId: string;
  categoria?: Prisma.ServicoWhereInput["categoria"];
  q?: string;
  cidade?: string;
  limit: number;
  cursor?: string;
};

const servicoRepository = {
  // lista geral: só ABERTO e nunca os pedidos do próprio usuário (ele os vê em /servicos/meus)
  listarAbertos: ({ usuarioId, categoria, q, cidade, limit, cursor }: FiltroLista) =>
    prisma.servico.findMany({
      where: {
        status: "ABERTO",
        autorId: { not: usuarioId },
        ...(categoria && { categoria }),
        ...(q && {
          OR: [{ titulo: { contains: q, mode: "insensitive" } }, { descricao: { contains: q, mode: "insensitive" } }],
        }),
        // filtra pela cidade do autor sem devolvê-la
        ...(cidade && { autor: { cidade: { equals: cidade, mode: "insensitive" } } }),
      },
      include: comAutor,
      orderBy: [...ORDEM],
      take: limit + 1, // um a mais para saber se há próxima página
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),

  // com a contagem de candidaturas pendentes, para o card de "Seus pedidos"
  listarDoAutor: (autorId: string) =>
    prisma.servico.findMany({
      where: { autorId },
      include: { ...comAutor, _count: { select: { candidaturas: { where: { status: "PENDENTE" } } } } },
      orderBy: [...ORDEM],
    }),

  buscarPorId: (id: string) => prisma.servico.findUnique({ where: { id }, include: comAutor }),

  criar: (data: Prisma.ServicoUncheckedCreateInput) => prisma.servico.create({ data, include: comAutor }),

  atualizar: (id: string, data: Prisma.ServicoUncheckedUpdateInput) =>
    prisma.servico.update({ where: { id }, data, include: comAutor }),

  // cancelar não apaga a linha; as candidaturas pendentes viram RECUSADA (as outras ficam como histórico)
  // Só grava se o status ainda for o lido (a condição no UPDATE resolve corridas com concluir: sem ela,
  // cancelar e concluir juntos pagariam o colaborador e devolveriam a reserva ao autor).
  // aoCancelar roda na mesma transação com o status anterior (Fase 17C: estorno de um pedido em andamento).
  cancelar: (id: string, aoCancelar: (tx: Prisma.TransactionClient, statusAnterior: StatusServico) => Promise<void>) =>
    prisma.$transaction(async (tx) => {
      const { status } = await tx.servico.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (status !== "ABERTO" && status !== "EM_ANDAMENTO") throw new AppError("Este pedido não pode mais ser cancelado", 409);
      const { count } = await tx.servico.updateMany({ where: { id, status }, data: { status: "CANCELADO" } });
      if (count === 0) throw new AppError("O pedido mudou enquanto era cancelado. Tente de novo.", 409);
      await tx.candidatura.updateMany({ where: { servicoId: id, status: "PENDENTE" }, data: { status: "RECUSADA" } });
      await aoCancelar(tx, status);
      return tx.servico.findUniqueOrThrow({ where: { id }, include: comAutor });
    }),

  // Concluir só um pedido em andamento e com colaborador (condição no UPDATE, contra corridas).
  // aoConcluir roda na mesma transação com o colaborador (Fase 17C: o pagamento).
  concluir: (id: string, aoConcluir: (tx: Prisma.TransactionClient, colaboradorId: string) => Promise<void>) =>
    prisma.$transaction(async (tx) => {
      const { colaboradorId } = await tx.servico.findUniqueOrThrow({ where: { id }, select: { colaboradorId: true } });
      const { count } = await tx.servico.updateMany({
        where: { id, status: "EM_ANDAMENTO", colaboradorId: { not: null } },
        data: { status: "CONCLUIDO", concluidoEm: new Date() },
      });
      if (count === 0) throw new AppError("Só dá para concluir um pedido em andamento", 409);
      await aoConcluir(tx, colaboradorId!);
    }),

  // quem publica precisa ter o perfil completo (o módulo user não é alterado: a leitura fica aqui)
  perfilDoUsuario: (id: string) => prisma.user.findUnique({ where: { id }, select: { profileComplete: true } }),
};

export default servicoRepository;
