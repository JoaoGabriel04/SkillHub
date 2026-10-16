import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import { toAutorResumo } from "../../utils/autorResumo.js";
import creditoService from "../credito/credito.service.js";
import { toServicoResposta } from "../servico/servico.service.js";
import candidaturaRepository, { type CandidaturaComColaborador, type CandidaturaComServico } from "./candidatura.repository.js";
import type { CandidatarInput } from "./candidatura.schema.js";

const STATUS = { PENDENTE: "Pendente", ACEITA: "Aceita", RECUSADA: "Recusada", RETIRADA: "Retirada" } as const;
const pedidoNaoEncontrado = () => new AppError("Pedido não encontrado", 404);
const naoEncontrada = () => new AppError("Candidatura não encontrada", 404);

const base = (c: CandidaturaComColaborador | CandidaturaComServico) => ({
  id: c.id,
  mensagem: c.mensagem,
  valorProposto: c.valorProposto,
  status: STATUS[c.status],
  createdAt: c.createdAt.toISOString(),
});
// para o autor do pedido: quem se candidatou, só com id, nome e foto
const toCandidaturaResposta = (c: CandidaturaComColaborador) => ({ ...base(c), colaborador: toAutorResumo(c.colaborador) });
// para o colaborador: o resumo do serviço (o mesmo formato da lista de serviços).
// avaliacaoPendente (Fase 17D): foi o colaborador aceito, o pedido está concluído e ele ainda não avaliou o autor.
const toMinhaCandidatura = (c: CandidaturaComServico) => ({
  ...base(c),
  servico: {
    ...toServicoResposta(c.servico),
    avaliacaoPendente: c.status === "ACEITA" && c.servico.status === "CONCLUIDO" && c.servico.avaliacoes.length === 0,
  },
});

// pedido cancelado só existe para o autor, como em GET /servicos/:id
async function servicoVisivel(servicoId: string, usuarioId: string) {
  const servico = await candidaturaRepository.buscarServico(servicoId);
  if (!servico || (servico.status === "CANCELADO" && servico.autorId !== usuarioId)) throw pedidoNaoEncontrado();
  return servico;
}

const candidaturaService = {
  candidatar: async (servicoId: string, usuarioId: string, dados: CandidatarInput) => {
    const servico = await servicoVisivel(servicoId, usuarioId);
    const usuario = await candidaturaRepository.perfilDoUsuario(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado", 401);
    if (usuario.perfil !== "Colaborador") throw new AppError("Só colaboradores podem se candidatar a pedidos", 403);
    if (servico.autorId === usuarioId) throw new AppError("Você não pode se candidatar ao próprio pedido", 403);
    if (servico.status !== "ABERTO") throw new AppError("Este pedido não está mais aberto", 409);
    try {
      return toCandidaturaResposta(await candidaturaRepository.criar({ ...dados, servicoId, colaboradorId: usuarioId }));
    } catch (err) {
      // @@unique([servicoId, colaboradorId])
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
        throw new AppError("Você já se candidatou a este pedido", 409);
      throw err;
    }
  },

  listarDoServico: async (servicoId: string, usuarioId: string) => {
    const servico = await servicoVisivel(servicoId, usuarioId);
    if (servico.autorId !== usuarioId) throw new AppError("Só quem publicou o pedido vê as candidaturas", 403);
    return (await candidaturaRepository.listarDoServico(servicoId)).map(toCandidaturaResposta);
  },

  minhas: async (usuarioId: string) => (await candidaturaRepository.listarDoColaborador(usuarioId)).map(toMinhaCandidatura),

  retirar: async (id: string, usuarioId: string) => {
    const candidatura = await candidaturaRepository.buscarPorId(id);
    if (!candidatura) throw naoEncontrada();
    if (candidatura.colaboradorId !== usuarioId) throw new AppError("Só quem se candidatou pode retirar a candidatura", 403);
    const { count } = await candidaturaRepository.retirar(id);
    if (count === 0) throw new AppError("Só dá para retirar uma candidatura pendente", 409);
    return toCandidaturaResposta((await candidaturaRepository.buscarComColaborador(id))!);
  },

  aceitar: async (id: string, usuarioId: string) => {
    const candidatura = await candidaturaRepository.buscarPorId(id);
    if (!candidatura) throw naoEncontrada();
    if (candidatura.servico.autorId !== usuarioId) throw new AppError("Só quem publicou o pedido pode aceitar candidaturas", 403);
    // reserva os créditos do autor na mesma transação (Fase 17C)
    await candidaturaRepository.aceitar(id, candidatura.servicoId, candidatura.colaboradorId, (tx, { autorId, valor }) =>
      creditoService.reservar(tx, candidatura.servicoId, autorId, valor)
    );
    return toCandidaturaResposta((await candidaturaRepository.buscarComColaborador(id))!);
  },
};

export default candidaturaService;
