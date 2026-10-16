import { z } from "zod";

export const avaliarSchema = z.object({
  nota: z
    .number({ error: "Escolha uma nota de 1 a 5" })
    .int("A nota precisa ser um número inteiro de 1 a 5")
    .min(1, "A nota precisa ser de 1 a 5")
    .max(5, "A nota precisa ser de 1 a 5"),
  // opcional; vazio vira null
  comentario: z
    .string()
    .trim()
    .max(500, "O comentário pode ter no máximo 500 caracteres")
    .nullable()
    .optional()
    .transform((c) => c || null),
});

export const listarAvaliacoesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid("Cursor inválido").optional(),
});

export type AvaliarInput = z.infer<typeof avaliarSchema>;
export type ListarAvaliacoesInput = z.infer<typeof listarAvaliacoesSchema>;
