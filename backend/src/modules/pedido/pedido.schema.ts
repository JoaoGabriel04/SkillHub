import { z } from "zod";

// Checkout (Fase 18B): de 1 a 20 produtos distintos (decisão D13), de 1 a 99 de cada, com o preço que a pessoa viu
// (precoEsperado: se mudou, 409 PRECO_ALTERADO, para ninguém pagar um valor que não viu).
const item = z.object({
  produtoId: z.uuid("Produto inválido"),
  quantidade: z.number({ message: "A quantidade precisa ser um número inteiro" }).int("A quantidade precisa ser um número inteiro").min(1, "A quantidade mínima é 1").max(99, "A quantidade máxima é 99"),
  precoEsperado: z.number({ message: "Informe o preço que você viu" }).int("O preço precisa ser um número inteiro").min(1, "O preço precisa ser de ao menos 1 crédito"),
});

export const checkoutSchema = z.object({
  itens: z
    .array(item, { message: "Informe os itens" })
    .min(1, "Escolha ao menos 1 produto")
    .max(20, "No máximo 20 produtos por compra")
    .refine((itens) => new Set(itens.map((i) => i.produtoId)).size === itens.length, "O mesmo produto aparece duas vezes"),
  observacao: z
    .string({ message: "Observação inválida" })
    .trim()
    .max(300, "A observação pode ter no máximo 300 caracteres")
    .optional()
    .transform((v) => v || undefined),
});

export const listarPedidosSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid("Cursor inválido").optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ListarPedidosInput = z.infer<typeof listarPedidosSchema>;
