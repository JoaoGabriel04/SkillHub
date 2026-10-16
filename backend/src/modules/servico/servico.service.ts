import { AppError } from "../../utils/AppError.js";
import { toAutorResumo } from "../../utils/autorResumo.js";
import { categoriaDoRotulo, ROTULO_CATEGORIA } from "./categoria.map.js";
import servicoRepository, { type ServicoComAutor } from "./servico.repository.js";
import type { AtualizarServicoInput, CriarServicoInput, ListarServicosInput } from "./servico.schema.js";

const STATUS = { ABERTO: "Aberto", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" } as const;
const naoEncontrado = () => new AppError("Pedido não encontrado", 404);

// Resposta da API: rótulos no lugar dos enums, datas em ISO e autor/colaborador só com id, nome e foto.
// distanciaKm fica null até existir localização (decisão da 17A; o cálculo vem numa subfase própria).
// Também usada pelas candidaturas (resumo do serviço em /candidaturas/minhas).
export function toServicoResposta(s: ServicoComAutor) {
  return {
    id: s.id,
    titulo: s.titulo,
    descricao: s.descricao,
    categoria: ROTULO_CATEGORIA[s.categoria],
    autor: toAutorResumo(s.autor),
    distanciaKm: null,
    remuneracao: s.remuneracao,
    prazo: s.prazo?.toISOString() ?? null,
    status: STATUS[s.status],
    colaborador: s.colaborador ? toAutorResumo(s.colaborador) : null,
    aceitoEm: s.aceitoEm?.toISOString() ?? null,
    concluidoEm: s.concluidoEm?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

async function servicoDoAutor(id: string, usuarioId: string) {
  const servico = await servicoRepository.buscarPorId(id);
  // cancelado só existe para o autor; para os outros, como se não existisse
  if (!servico || (servico.status === "CANCELADO" && servico.autorId !== usuarioId)) throw naoEncontrado();
  if (servico.autorId !== usuarioId) throw new AppError("Só quem publicou o pedido pode alterá-lo", 403);
  return servico;
}

const servicoService = {
  listar: async (usuarioId: string, { categoria, q, cidade, limit, cursor }: ListarServicosInput) => {
    const linhas = await servicoRepository.listarAbertos({
      usuarioId,
      categoria: categoria && categoriaDoRotulo(categoria),
      q: q || undefined,
      cidade: cidade || undefined,
      limit,
      cursor,
    });
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    return { servicos: pagina.map(toServicoResposta), nextCursor: temMais ? pagina[pagina.length - 1].id : null };
  },

  meus: async (usuarioId: string) =>
    (await servicoRepository.listarDoAutor(usuarioId)).map((s) => ({ ...toServicoResposta(s), candidaturasPendentes: s._count.candidaturas })),

  detalhe: async (id: string, usuarioId: string) => {
    const servico = await servicoRepository.buscarPorId(id);
    if (!servico || (servico.status === "CANCELADO" && servico.autorId !== usuarioId)) throw naoEncontrado();
    return toServicoResposta(servico);
  },

  criar: async (usuarioId: string, dados: CriarServicoInput) => {
    const perfil = await servicoRepository.perfilDoUsuario(usuarioId);
    // conta que não existe mais: 401, como no módulo user (o front encerra a sessão)
    if (!perfil) throw new AppError("Usuário não encontrado", 401);
    if (!perfil.profileComplete) throw new AppError("Complete seu perfil para publicar um pedido", 403);
    const criado = await servicoRepository.criar({ ...dados, categoria: categoriaDoRotulo(dados.categoria), autorId: usuarioId });
    return toServicoResposta(criado);
  },

  atualizar: async (id: string, usuarioId: string, dados: AtualizarServicoInput) => {
    const servico = await servicoDoAutor(id, usuarioId);
    if (servico.status !== "ABERTO") throw new AppError("Só dá para editar um pedido aberto", 409);
    const { categoria, ...resto } = dados;
    const atualizado = await servicoRepository.atualizar(id, { ...resto, ...(categoria && { categoria: categoriaDoRotulo(categoria) }) });
    return toServicoResposta(atualizado);
  },

  // não apaga a linha: o histórico alimenta os KPIs (latência de contratação, volume).
  // Desde a 17B, um pedido em andamento também pode ser cancelado pelo autor.
  cancelar: async (id: string, usuarioId: string) => {
    const servico = await servicoDoAutor(id, usuarioId);
    if (servico.status === "CONCLUIDO") throw new AppError("Um pedido concluído não pode ser cancelado", 409);
    if (servico.status === "CANCELADO") return toServicoResposta(servico);
    return toServicoResposta(await servicoRepository.cancelar(id));
  },

  // Fase 17B: o autor marca como concluído um pedido em andamento (KPI: concluidoEm)
  concluir: async (id: string, usuarioId: string) => {
    await servicoDoAutor(id, usuarioId);
    const { count } = await servicoRepository.concluir(id);
    if (count === 0) throw new AppError("Só dá para concluir um pedido em andamento", 409);
    return toServicoResposta((await servicoRepository.buscarPorId(id))!);
  },
};

export default servicoService;
