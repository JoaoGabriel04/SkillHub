import type { AutorResumo } from "@/types/servico";

// Avaliação entre as partes de um pedido concluído (Fase 17D), como a API devolve
export type Avaliacao = {
  id: string;
  nota: number; // 1 a 5
  comentario: string | null;
  createdAt: string; // ISO
  avaliador: AutorResumo | null; // null: quem avaliou excluiu a conta ("Usuário removido")
  avaliado: AutorResumo;
  servico: { id: string; titulo: string } | null; // null: o pedido foi apagado com a conta do autor
};

// GET /usuarios/:id/resumo: o resumo público do Perfil
export type ResumoUsuario = {
  colaboracoes: number; // pedidos concluídos em que a pessoa participou (autor ou colaborador)
  media: number | null; // uma casa decimal; null sem avaliações
  total: number;
};

// GET /usuarios/:id/avaliacoes: as avaliações recebidas, com média e total
export type AvaliacoesDoUsuario = {
  media: number | null; // uma casa decimal; null sem avaliações
  total: number;
  avaliacoes: Avaliacao[];
  nextCursor: string | null;
};
