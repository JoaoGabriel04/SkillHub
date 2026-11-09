import type { AutorResumo } from "@/types/servico";

// Produto da loja como a API devolve (Fase 18A). O vendedor vem só com id, nome e foto.
// Preço em créditos. Premissa do piloto, só para o indicador de renda: 1 crédito = R$ 1,00 (a validar com o professor).

export const CATEGORIAS_PRODUTO = [
  "Arte e Decoração",
  "Alimentos e Bebidas",
  "Moda e Acessórios",
  "Serviços Digitais",
  "Educação e Apostilas",
] as const;
export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number];

export type StatusProduto = "Ativo" | "Pausado";

// GET /produtos (e /produtos/meus, que acrescenta status e whatsappAtivo)
export type ProdutoResumo = {
  id: string;
  nome: string;
  preco: number; // em créditos
  estoque: number; // 0 = esgotado (continua visível)
  categoria: CategoriaProduto;
  digital: boolean;
  capaUrl: string | null;
  vendedor: AutorResumo;
  createdAt: string; // ISO
  status?: StatusProduto; // só em /produtos/meus
  whatsappAtivo?: boolean; // só em /produtos/meus
};

export type ImagemProduto = { id: string; url: string; ordem: number };

// GET /produtos/:id, POST e PATCH
export type ProdutoDetalhe = ProdutoResumo & {
  descricao: string;
  status: StatusProduto;
  whatsappAtivo: boolean;
  imagens: ImagemProduto[]; // a primeira é a capa
  vendedorReputacao: { media: number | null; total: number };
  contatoDisponivel: boolean; // ativo, contato ligado e vendedor com telefone (o telefone nunca vem)
  updatedAt: string;
};
