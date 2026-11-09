import { z } from "zod";
import { ROTULOS_CATEGORIA_PRODUTO } from "./categoria.map.js";

// O POST (e o PATCH com fotos) chega em multipart: todo campo vem como texto. Estes conversores aceitam
// o texto e o tipo do JSON, e texto vazio conta como ausente (senão "" viraria 0 e passaria como estoque).
const vazioViraAusente = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const inteiro = (mensagem: string) =>
  z.preprocess((v) => {
    const valor = vazioViraAusente(v);
    return typeof valor === "string" ? Number(valor) : valor;
  }, z.number({ message: mensagem }).int(mensagem));
const booleano = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : vazioViraAusente(v)), z.boolean({ message: "Use true ou false" }));

const campos = {
  nome: z.string().trim().min(3, "O nome precisa ter ao menos 3 caracteres").max(80, "O nome pode ter no máximo 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter ao menos 10 caracteres")
    .max(1000, "A descrição pode ter no máximo 1000 caracteres"),
  categoria: z.enum(ROTULOS_CATEGORIA_PRODUTO, { message: "Categoria inválida" }),
  // em créditos (Fase 18, Seção 3.1)
  preco: inteiro("O preço precisa ser um número inteiro de créditos").pipe(z.number().min(1, "O preço precisa ser de ao menos 1 crédito")),
  // 0 = esgotado; o teto evita valores absurdos (decisão D15 do PLANO_18A)
  estoque: inteiro("O estoque precisa ser um número inteiro").pipe(
    z.number().min(0, "O estoque não pode ser negativo").max(9999, "O estoque pode ser de no máximo 9999")
  ),
  digital: booleano,
  whatsappAtivo: booleano,
};

export const criarProdutoSchema = z.object({
  ...campos,
  digital: campos.digital.optional().default(false),
  whatsappAtivo: campos.whatsappAtivo.optional().default(true),
});

// Fotos no PATCH: a lista final, em ordem (a primeira é a capa). Cada item é o id de uma foto que já existe
// ou "nova:N" (o N-ésimo arquivo enviado em "fotos"). Sem a lista, as fotos não mudam (decisão D14).
const imagens = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  },
  z.array(z.string({ message: "Lista de fotos inválida" }), { message: "Lista de fotos inválida" }).min(1, "Envie de 1 a 4 fotos").max(4, "Envie no máximo 4 fotos")
);

// vendedorId (ou qualquer outro campo) no corpo é descartado: o dono nunca muda
export const atualizarProdutoSchema = z
  .object({ ...campos, status: z.enum(["Ativo", "Pausado"], { message: "Status inválido" }), imagens })
  .partial();

export const listarProdutosSchema = z.object({
  categoria: z.enum(ROTULOS_CATEGORIA_PRODUTO, { message: "Categoria inválida" }).optional(),
  busca: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid("Cursor inválido").optional(),
});

export type CriarProdutoInput = z.infer<typeof criarProdutoSchema>;
export type AtualizarProdutoInput = z.infer<typeof atualizarProdutoSchema>;
export type ListarProdutosInput = z.infer<typeof listarProdutosSchema>;
