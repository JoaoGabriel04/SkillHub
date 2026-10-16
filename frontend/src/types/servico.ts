import type { User } from "@/types/user";

// Pedido de serviço como a API devolve (GET /servicos, Fase 17A). O autor vem só com id, nome e foto.
export type AutorResumo = Pick<User, "id" | "fullName" | "urlPhoto">;

export const CATEGORIAS_SERVICO = ["Educação", "Tecnologia", "Design e Arte", "Reparos e Manutenção"] as const;
export type CategoriaServico = (typeof CATEGORIAS_SERVICO)[number];

export type StatusServico = "Aberto" | "Em andamento" | "Concluído" | "Cancelado";

export type Servico = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaServico;
  autor: AutorResumo;
  distanciaKm: number | null; // null até existir localização (o card esconde)
  remuneracao: number | null; // em créditos; null = "a combinar"
  valorCombinado: number | null; // depois de aceitar, o proposto pela candidatura aceita; antes, igual à remuneração
  prazo: string | null; // ISO; null = sem prazo
  status: StatusServico;
  colaborador: AutorResumo | null; // quem foi aceito (Fase 17B); null enquanto aberto
  aceitoEm: string | null; // ISO
  concluidoEm: string | null; // ISO
  createdAt: string; // ISO
  candidaturasPendentes?: number; // só em /servicos/meus
  avaliacaoPendente?: boolean; // Fase 17D, só em /servicos/meus e /candidaturas/minhas: concluído e você ainda não avaliou
};
