import type { Prisma } from "@prisma/client";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";

// Autor e colaborador saem do banco só com id, nome e foto (toAutorResumo no service)
const comAutor = { autor: { select: AUTOR_RESUMO_SELECT }, colaborador: { select: AUTOR_RESUMO_SELECT } } as const;
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
  cancelar: (id: string) =>
    prisma.$transaction(async (tx) => {
      await tx.candidatura.updateMany({ where: { servicoId: id, status: "PENDENTE" }, data: { status: "RECUSADA" } });
      return tx.servico.update({ where: { id }, data: { status: "CANCELADO" }, include: comAutor });
    }),

  // só muda se ainda estiver no status esperado (a condição no UPDATE resolve corridas): devolve quantas linhas mudaram
  concluir: (id: string) =>
    prisma.servico.updateMany({ where: { id, status: "EM_ANDAMENTO" }, data: { status: "CONCLUIDO", concluidoEm: new Date() } }),

  // quem publica precisa ter o perfil completo (o módulo user não é alterado: a leitura fica aqui)
  perfilDoUsuario: (id: string) => prisma.user.findUnique({ where: { id }, select: { profileComplete: true } }),
};

export default servicoRepository;
