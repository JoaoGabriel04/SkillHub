import type { User } from "@prisma/client";

// Única forma de expor um usuário nas respostas de serviço, candidatura, extrato e avaliação
// (Fase 17, Seção 17.0): só id, nome e foto. Nunca e-mail, documentos, telefone, endereço etc.
export type AutorResumo = Pick<User, "id" | "fullName" | "urlPhoto">;

// Para o `select` do Prisma: o resto do usuário nem sai do banco nessas consultas
export const AUTOR_RESUMO_SELECT = { id: true, fullName: true, urlPhoto: true } as const;

export function toAutorResumo({ id, fullName, urlPhoto }: AutorResumo): AutorResumo {
  return { id, fullName, urlPhoto };
}
