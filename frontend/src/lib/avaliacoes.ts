import { api } from "@/lib/api";
import type { Avaliacao, ResumoUsuario } from "@/types/avaliacao";

// Cliente da API de avaliações (Fase 17D). Depois de avaliar, dê mutate na chave do pedido.

export const chaveAvaliacoesDoServico = (servicoId: string) => ["avaliacoes", servicoId] as const;
export const chaveResumoDoUsuario = (usuarioId: string) => ["usuarios/resumo", usuarioId] as const;

export const getAvaliacoesDoServico = (servicoId: string) =>
  api.get<{ avaliacoes: Avaliacao[] }>(`/servicos/${servicoId}/avaliacoes`).then((r) => r.data.avaliacoes);

// o resumo público do Perfil: colaborações, média e total
export const getResumoDoUsuario = (usuarioId: string) => api.get<ResumoUsuario>(`/usuarios/${usuarioId}/resumo`).then((r) => r.data);

export const avaliar = (servicoId: string, dados: { nota: number; comentario: string | null }) =>
  api.post<{ avaliacao: Avaliacao }>(`/servicos/${servicoId}/avaliacoes`, dados).then((r) => r.data.avaliacao);

// média com vírgula ("4,5"); sem avaliações, o mesmo traço dos outros números vazios
export const formatMedia = (media: number | null) =>
  media === null ? "–" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(media);
