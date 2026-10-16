import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import { toAutorResumo } from "../../utils/autorResumo.js";
import avaliacaoRepository, { type AvaliacaoCompleta } from "./avaliacao.repository.js";
import type { AvaliarInput, ListarAvaliacoesInput } from "./avaliacao.schema.js";

const pedidoNaoEncontrado = () => new AppError("Pedido não encontrado", 404);

// Resposta da API: pessoas só com id, nome e foto; o pedido só com id e título.
// Conta de quem avaliou excluída ou pedido apagado: null, sem nenhum dado de quem saiu ("Usuário removido" na tela)
const toAvaliacaoResposta = (a: AvaliacaoCompleta) => ({
  id: a.id,
  nota: a.nota,
  comentario: a.comentario,
  createdAt: a.createdAt.toISOString(),
  avaliador: a.avaliador ? toAutorResumo(a.avaliador) : null,
  avaliado: toAutorResumo(a.avaliado),
  servico: a.servico,
});

// cancelado só existe para o autor, como em GET /servicos/:id
async function servicoVisivel(servicoId: string, usuarioId: string) {
  const servico = await avaliacaoRepository.buscarServico(servicoId);
  if (!servico || (servico.status === "CANCELADO" && servico.autorId !== usuarioId)) throw pedidoNaoEncontrado();
  return servico;
}

const ehParte = (s: { autorId: string; colaboradorId: string | null }, usuarioId: string) =>
  s.autorId === usuarioId || s.colaboradorId === usuarioId;

// média (uma casa, de soma e contagem: sem arredondar um float já inexato) e total das avaliações recebidas
async function mediaETotal(usuarioId: string) {
  const { _sum, _count } = await avaliacaoRepository.agregado(usuarioId);
  return { media: _count ? Math.round(((_sum.nota ?? 0) * 10) / _count) / 10 : null, total: _count };
}

const avaliacaoService = {
  mediaETotal,

  // Só as partes de um pedido concluído, uma vez cada. Quem é avaliado sai do pedido, nunca do corpo.
  avaliar: async (servicoId: string, usuarioId: string, dados: AvaliarInput) => {
    const servico = await servicoVisivel(servicoId, usuarioId);
    if (!ehParte(servico, usuarioId)) throw new AppError("Só quem participou do pedido pode avaliá-lo", 403);
    if (servico.status !== "CONCLUIDO") throw new AppError("Só dá para avaliar um pedido concluído", 409);
    const avaliadoId = servico.autorId === usuarioId ? servico.colaboradorId : servico.autorId;
    if (!avaliadoId) throw new AppError("O colaborador não está mais no SkillHub", 409);
    try {
      return toAvaliacaoResposta(await avaliacaoRepository.criar({ ...dados, servicoId, avaliadorId: usuarioId, avaliadoId }));
    } catch (err) {
      // @@unique([servicoId, avaliadorId]): também resolve duas avaliações ao mesmo tempo
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
        throw new AppError("Você já avaliou este pedido", 409);
      throw err;
    }
  },

  // as até duas avaliações do pedido, para o detalhe (só as partes)
  doServico: async (servicoId: string, usuarioId: string) => {
    const servico = await servicoVisivel(servicoId, usuarioId);
    if (!ehParte(servico, usuarioId)) throw new AppError("Só quem participou do pedido vê as avaliações", 403);
    return (await avaliacaoRepository.listarDoServico(servicoId)).map(toAvaliacaoResposta);
  },

  // o resumo público das avaliações recebidas: média (uma casa), total e a lista paginada
  doUsuario: async (usuarioId: string, { limit, cursor }: ListarAvaliacoesInput) => {
    if (!(await avaliacaoRepository.usuarioExiste(usuarioId))) throw new AppError("Usuário não encontrado", 404);
    const [linhas, agregado] = await Promise.all([avaliacaoRepository.listarRecebidas(usuarioId, limit, cursor), mediaETotal(usuarioId)]);
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    return {
      ...agregado,
      avaliacoes: pagina.map(toAvaliacaoResposta),
      nextCursor: temMais ? pagina[pagina.length - 1].id : null,
    };
  },
};

export default avaliacaoService;
