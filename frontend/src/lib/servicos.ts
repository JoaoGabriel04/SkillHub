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

// Fase 17B: o autor edita (só aberto), cancela (aberto ou em andamento) e conclui (em andamento)
export const atualizarServico = (id: string, dados: Partial<NovoServico>) =>
  api.patch<{ servico: Servico }>(`/servicos/${id}`, dados).then((r) => r.data.servico);
export const cancelarServico = (id: string) => api.delete<{ servico: Servico }>(`/servicos/${id}`).then((r) => r.data.servico);
export const concluirServico = (id: string) => api.post<{ servico: Servico }>(`/servicos/${id}/concluir`).then((r) => r.data.servico);

// Detalhe de um pedido (o diálogo do "Saiba Mais" mantém o próprio cache, para refletir as ações)
export const chaveServico = (id: string) => ["servico", id] as const;

// Depois de publicar, editar, cancelar, concluir ou mexer numa candidatura: recarrega tudo o que
// depende de serviços e candidaturas (listas, "Seus pedidos", "Suas candidaturas" e o detalhe aberto)
export const revalidarServicos = () =>
  mutate(
    (chave) =>
      chave === CHAVE_MEUS_SERVICOS ||
      chave === "candidaturas/minhas" ||
      (Array.isArray(chave) && ["servicos", "servico", "candidaturas"].includes(chave[0]))
  );
