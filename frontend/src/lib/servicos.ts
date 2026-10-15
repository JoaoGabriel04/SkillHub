import { mutate } from "swr";
import { api } from "@/lib/api";
import type { CategoriaServico, Servico } from "@/types/servico";

// Cliente da API de Serviços (Fase 17A). Não fica em lib/api/: já existe lib/api.ts,
// e uma pasta com o mesmo nome deixaria o import "@/lib/api" ambíguo.

export type FiltrosServicos = { categoria?: CategoriaServico; q?: string; cidade?: string; limit?: number };
export type NovoServico = Pick<Servico, "titulo" | "descricao" | "categoria" | "remuneracao" | "prazo">;

// Chaves do SWR: a lista inclui os filtros, então cada combinação tem o próprio cache
export const chaveServicos = (filtros: FiltrosServicos) => ["servicos", filtros] as const;
export const CHAVE_MEUS_SERVICOS = "servicos/meus";

export const getServicos = (filtros: FiltrosServicos) =>
  api.get<{ servicos: Servico[]; nextCursor: string | null }>("/servicos", { params: filtros }).then((r) => r.data.servicos);

export const getMeusServicos = () => api.get<{ servicos: Servico[] }>("/servicos/meus").then((r) => r.data.servicos);

export const getServico = (id: string) => api.get<{ servico: Servico }>(`/servicos/${id}`).then((r) => r.data.servico);

export const criarServico = (dados: NovoServico) => api.post<{ servico: Servico }>("/servicos", dados).then((r) => r.data.servico);

// Depois de publicar (e, na 17B, editar ou cancelar): recarrega todas as listas de serviços
export const revalidarServicos = () =>
  mutate((chave) => chave === CHAVE_MEUS_SERVICOS || (Array.isArray(chave) && chave[0] === "servicos"));
