import type { Prisma } from "@prisma/client";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";
import { AppError } from "../../utils/AppError.js";
import { comAutor } from "../servico/servico.repository.js";

// Pessoas saem do banco só com id, nome e foto (toAutorResumo no service)
const comColaborador = { colaborador: { select: AUTOR_RESUMO_SELECT } } as const;
// o mesmo do módulo servico (toServicoResposta), mais a avaliação do colaborador no pedido (filtrada na consulta)
const servicoResumo = { include: { ...comAutor, avaliacoes: { select: { id: true } } } } as const;

export type CandidaturaComColaborador = Prisma.CandidaturaGetPayload<{ include: typeof comColaborador }>;
export type CandidaturaComServico = Prisma.CandidaturaGetPayload<{ include: { servico: typeof servicoResumo } }>;

const candidaturaRepository = {
  criar: (data: Prisma.CandidaturaUncheckedCreateInput) => prisma.candidatura.create({ data, include: comColaborador }),

  listarDoServico: (servicoId: string) =>
    prisma.candidatura.findMany({ where: { servicoId }, include: comColaborador, orderBy: { createdAt: "asc" } }),

  // com a avaliação do próprio colaborador no pedido (se já fez), para o card de "Suas candidaturas" (Fase 17D)
  listarDoColaborador: (colaboradorId: string) =>
    prisma.candidatura.findMany({
      where: { colaboradorId },
      include: { servico: { include: { ...servicoResumo.include, avaliacoes: { where: { avaliadorId: colaboradorId }, select: { id: true } } } } },
      orderBy: { createdAt: "desc" },
    }),

  buscarPorId: (id: string) => prisma.candidatura.findUnique({ where: { id }, include: { servico: { select: { autorId: true } } } }),

  buscarComColaborador: (id: string) => prisma.candidatura.findUnique({ where: { id }, include: comColaborador }),

  // só muda se ainda estiver PENDENTE (devolve quantas linhas mudaram)
  retirar: (id: string) => prisma.candidatura.updateMany({ where: { id, status: "PENDENTE" }, data: { status: "RETIRADA" } }),

  // Aceitar, numa transação só. O serviço é o primeiro a mudar, e só se ainda estiver ABERTO: a condição
  // no UPDATE é o que resolve duas aceitações ao mesmo tempo (só uma muda a linha; a outra recebe 409).
  // Fase 17C: aoAceitar roda na mesma transação, com o autor e o valor combinado (a reserva de créditos);
  // se ele lançar erro (saldo insuficiente), a aceitação inteira volta.
  aceitar: (
    id: string,
    servicoId: string,
    colaboradorId: string,
    aoAceitar: (tx: Prisma.TransactionClient, dados: { autorId: string; valor: number | null }) => Promise<void>
  ) =>
    prisma.$transaction(async (tx) => {
      const servico = await tx.servico.updateMany({
        where: { id: servicoId, status: "ABERTO" },
        data: { status: "EM_ANDAMENTO", colaboradorId, aceitoEm: new Date() },
      });
      if (servico.count === 0) throw new AppError("Este pedido não está mais aberto", 409);
      const escolhida = await tx.candidatura.updateMany({ where: { id, status: "PENDENTE" }, data: { status: "ACEITA" } });
      if (escolhida.count === 0) throw new AppError("Só dá para aceitar uma candidatura pendente", 409);
      await tx.candidatura.updateMany({ where: { servicoId, status: "PENDENTE" }, data: { status: "RECUSADA" } });
      // valor combinado: o proposto pela candidatura ou, sem proposta, a remuneração do pedido
      const { valorProposto } = await tx.candidatura.findUniqueOrThrow({ where: { id }, select: { valorProposto: true } });
      const { autorId, remuneracao } = await tx.servico.findUniqueOrThrow({ where: { id: servicoId }, select: { autorId: true, remuneracao: true } });
      await aoAceitar(tx, { autorId, valor: valorProposto ?? remuneracao });
    }),

  // quem se candidata precisa ser Colaborador (o módulo user não é alterado: a leitura fica aqui)
  perfilDoUsuario: (id: string) => prisma.user.findUnique({ where: { id }, select: { perfil: true } }),

  buscarServico: (id: string) => prisma.servico.findUnique({ where: { id }, select: { id: true, autorId: true, status: true } }),
};

export default candidaturaRepository;
