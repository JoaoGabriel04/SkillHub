import type { AutorResumo, Servico } from "@/types/servico";

// Candidatura a um pedido de serviço (Fase 17B), como a API devolve
export type StatusCandidatura = "Pendente" | "Aceita" | "Recusada" | "Retirada";

type CandidaturaBase = {
  id: string;
  mensagem: string;
  valorProposto: number | null; // em créditos; null = aceita a remuneração do pedido
  status: StatusCandidatura;
  createdAt: string; // ISO
};

// GET /servicos/:id/candidaturas (só o autor do pedido)
export type Candidatura = CandidaturaBase & { colaborador: AutorResumo };

// GET /candidaturas/minhas (o colaborador): com o resumo do serviço
export type MinhaCandidatura = CandidaturaBase & { servico: Servico };
