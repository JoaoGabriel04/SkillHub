import { api } from "@/lib/api";
import type { Candidatura, MinhaCandidatura } from "@/types/candidatura";

// Cliente da API de candidaturas (Fase 17B). Depois de qualquer ação, chame revalidarServicos (lib/servicos).

export const chaveCandidaturasDoServico = (servicoId: string) => ["candidaturas", servicoId] as const;
export const CHAVE_MINHAS_CANDIDATURAS = "candidaturas/minhas";

export const getCandidaturasDoServico = (servicoId: string) =>
  api.get<{ candidaturas: Candidatura[] }>(`/servicos/${servicoId}/candidaturas`).then((r) => r.data.candidaturas);

export const getMinhasCandidaturas = () =>
  api.get<{ candidaturas: MinhaCandidatura[] }>("/candidaturas/minhas").then((r) => r.data.candidaturas);

export const candidatar = (servicoId: string, dados: { mensagem: string; valorProposto: number | null }) =>
  api.post<{ candidatura: Candidatura }>(`/servicos/${servicoId}/candidaturas`, dados).then((r) => r.data.candidatura);

export const retirarCandidatura = (id: string) => api.patch<{ candidatura: Candidatura }>(`/candidaturas/${id}/retirar`).then((r) => r.data.candidatura);

export const aceitarCandidatura = (id: string) => api.post<{ candidatura: Candidatura }>(`/candidaturas/${id}/aceitar`).then((r) => r.data.candidatura);
