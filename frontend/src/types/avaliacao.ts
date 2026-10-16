import type { AutorResumo } from "@/types/servico";

// Avaliação entre as partes de um pedido concluído (Fase 17D), como a API devolve
export type Avaliacao = {
  id: string;
  nota: number; // 1 a 5
  comentario: string | null;
  createdAt: string; // ISO
  avaliador: AutorResumo;
  avaliado: AutorResumo;
  servico: { id: string; titulo: string };
};

// GET /usuarios/:id/avaliacoes: o resumo público das avaliações recebidas
export type AvaliacoesDoUsuario = {
  media: number | null; // uma casa decimal; null sem avaliações
  total: number;
  avaliacoes: Avaliacao[];
  nextCursor: string | null;
};
