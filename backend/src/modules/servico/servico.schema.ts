import { z } from "zod";
import { ROTULOS_CATEGORIA } from "./categoria.map.js";

const campos = {
  titulo: z.string().trim().min(3, "O título precisa ter ao menos 3 caracteres").max(80, "O título pode ter no máximo 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter ao menos 10 caracteres")
    .max(1000, "A descrição pode ter no máximo 1000 caracteres"),
  categoria: z.enum(ROTULOS_CATEGORIA, { message: "Categoria inválida" }),
  // em créditos; null = "a combinar"
  remuneracao: z.number().int("A remuneração precisa ser um número inteiro de créditos").min(0, "A remuneração não pode ser negativa").nullable(),
  // ISO; null = sem prazo
  prazo: z.coerce
    .date({ message: "Prazo inválido" })
    .refine((d) => d.getTime() > Date.now(), "O prazo precisa ser uma data futura")
    .nullable(),
};

export const criarServicoSchema = z.object({
  ...campos,
  remuneracao: campos.remuneracao.optional().default(null),
  prazo: campos.prazo.optional().default(null),
});

export const atualizarServicoSchema = z.object(campos).partial();

export const listarServicosSchema = z.object({
  categoria: z.enum(ROTULOS_CATEGORIA, { message: "Categoria inválida" }).optional(),
  q: z.string().trim().max(100).optional(),
  cidade: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid("Cursor inválido").optional(),
});

export type CriarServicoInput = z.infer<typeof criarServicoSchema>;
export type AtualizarServicoInput = z.infer<typeof atualizarServicoSchema>;
export type ListarServicosInput = z.infer<typeof listarServicosSchema>;
