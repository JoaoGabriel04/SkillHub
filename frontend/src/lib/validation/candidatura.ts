import { z } from "zod";

// Mesmas regras do backend (modules/candidatura/candidatura.schema.ts). O valor vem do campo como texto;
// vazio = aceita a remuneração do pedido.
export const candidaturaSchema = z.object({
  mensagem: z
    .string()
    .trim()
    .min(10, "A mensagem precisa ter ao menos 10 caracteres")
    .max(500, "A mensagem pode ter no máximo 500 caracteres"),
  valorProposto: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "Informe um número inteiro de créditos")
    .transform((v) => (v === "" ? null : Number(v))),
});
