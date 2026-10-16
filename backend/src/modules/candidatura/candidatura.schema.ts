import { z } from "zod";

export const candidatarSchema = z.object({
  mensagem: z
    .string()
    .trim()
    .min(10, "A mensagem precisa ter ao menos 10 caracteres")
    .max(500, "A mensagem pode ter no máximo 500 caracteres"),
  // em créditos; null = aceita a remuneração do pedido
  valorProposto: z
    .number()
    .int("O valor precisa ser um número inteiro de créditos")
    .min(0, "O valor não pode ser negativo")
    .nullable()
    .optional()
    .default(null),
});

export type CandidatarInput = z.infer<typeof candidatarSchema>;
