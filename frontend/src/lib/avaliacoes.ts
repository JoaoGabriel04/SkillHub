import { api } from "@/lib/api";
import type { Avaliacao, AvaliacoesDoUsuario } from "@/types/avaliacao";

// Cliente da API de avaliações (Fase 17D). Depois de avaliar, dê mutate na chave do pedido.

export const chaveAvaliacoesDoServico = (servicoId: string) => ["avaliacoes", servicoId] as const;
export const chaveAvaliacoesDoUsuario = (usuarioId: string) => ["avaliacoes/usuario", usuarioId] as const;

export const getAvaliacoesDoServico = (servicoId: string) =>
  api.get<{ avaliacoes: Avaliacao[] }>(`/servicos/${servicoId}/avaliacoes`).then((r) => r.data.avaliacoes);

// o Perfil só precisa de média e total: uma avaliação por página basta
export const getAvaliacoesDoUsuario = (usuarioId: string, limit = 1) =>
  api.get<AvaliacoesDoUsuario>(`/usuarios/${usuarioId}/avaliacoes`, { params: { limit } }).then((r) => r.data);

export const avaliar = (servicoId: string, dados: { nota: number; comentario: string | null }) =>
  api.post<{ avaliacao: Avaliacao }>(`/servicos/${servicoId}/avaliacoes`, dados).then((r) => r.data.avaliacao);

// média com vírgula ("4,5"); sem avaliações, o mesmo traço dos outros números vazios
export const formatMedia = (media: number | null) =>
  media === null ? "–" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(media);
