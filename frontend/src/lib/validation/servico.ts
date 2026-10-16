import { z } from "zod";
import { CATEGORIAS_SERVICO } from "@/types/servico";

// Mesmas regras do backend (modules/servico/servico.schema.ts), para o formulário avisar antes de enviar.
// Os campos vêm do formulário como texto; remuneração e prazo vazios = "a combinar" e "sem prazo".
export const novoServicoSchema = z.object({
  titulo: z.string().trim().min(3, "O título precisa ter ao menos 3 caracteres").max(80, "O título pode ter no máximo 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter ao menos 10 caracteres")
    .max(1000, "A descrição pode ter no máximo 1000 caracteres"),
  categoria: z.enum(CATEGORIAS_SERVICO, { message: "Escolha uma categoria" }),
  remuneracao: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "Informe um número inteiro de créditos")
    .transform((v) => (v === "" ? null : Number(v))),
  // data do <input type="date"> (AAAA-MM-DD): vale até o fim do dia, então "hoje" ainda é futuro
  prazo: z
    .string()
    .refine((v) => v === "" || new Date(`${v}T23:59:59`).getTime() > Date.now(), "O prazo precisa ser uma data futura")
    .transform((v) => (v === "" ? null : new Date(`${v}T23:59:59`).toISOString())),
});
