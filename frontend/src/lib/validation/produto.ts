import { z } from "zod";
import { CATEGORIAS_PRODUTO } from "@/types/produto";

// Mesmas regras do backend (modules/produto/produto.schema.ts), para o formulário avisar antes de enviar.
// Preço e estoque vêm do formulário como texto.
const inteiro = (mensagem: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), mensagem)
    .transform(Number);

export const produtoSchema = z.object({
  nome: z.string().trim().min(3, "O nome precisa ter ao menos 3 caracteres").max(80, "O nome pode ter no máximo 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter ao menos 10 caracteres")
    .max(1000, "A descrição pode ter no máximo 1000 caracteres"),
  categoria: z.enum(CATEGORIAS_PRODUTO, { message: "Escolha uma categoria" }),
  preco: inteiro("Informe um número inteiro de créditos").pipe(z.number().min(1, "O preço precisa ser de ao menos 1 crédito")),
  estoque: inteiro("Informe um número inteiro").pipe(z.number().max(9999, "O estoque pode ser de no máximo 9999")),
  digital: z.boolean(),
  whatsappAtivo: z.boolean(),
});

// Fotos: as mesmas regras do upload do Perfil (o servidor confere de novo, inclusive o conteúdo)
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FOTO_MB = 5;
export const MAX_FOTOS = 4;

export function erroDaFoto(arquivo: File): string | null {
  if (!TIPOS_FOTO.includes(arquivo.type)) return "Use imagens JPEG, PNG ou WEBP.";
  if (arquivo.size > MAX_FOTO_MB * 1024 * 1024) return `Cada imagem deve ter até ${MAX_FOTO_MB}MB.`;
  return null;
}
