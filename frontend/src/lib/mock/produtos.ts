import { PESSOAS, unsplash, type AutorResumo } from "./pessoas";

// ⚠️ DADOS DE EXEMPLO (designs/New Produtos.png e New Início.png). Quando o backend ganhar o
// model Produto, getProdutos()/getDestaques() viram chamadas a /produtos e /produtos/destaques.

export const CATEGORIAS_PRODUTO = [
  "Arte e Decoração",
  "Alimentos e Bebidas",
  "Moda e Acessórios",
  "Serviços Digitais",
  "Educação e Apostilas",
] as const;
export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number];

export type Vendedor = AutorResumo & { jovemAprendiz: boolean };

export type Produto = {
  id: string;
  nome: string;
  preco: number; // em reais
  imagemUrl: string;
  categoria: CategoriaProduto;
  vendedor: Vendedor;
  createdAt: string; // ISO
};

// Banner do carrossel do topo (campanhas da plataforma)
export type Destaque = {
  id: string;
  chamada: string; // "Guia completo:"
  titulo: string; // "Como fazer venda de"
  realce: string; // trecho colorido do título
  cta: string;
};

const jovem = (p: AutorResumo): Vendedor => ({ ...p, jovemAprendiz: true });
const vendedor = (p: AutorResumo): Vendedor => ({ ...p, jovemAprendiz: false });
const criado = "2026-09-20T12:00:00.000Z";

export const PRODUTOS_MOCK: Produto[] = [
  {
    id: "p1",
    nome: "Pintura feita à mão",
    preco: 89.99,
    imagemUrl: unsplash("1578301978693-85fa9c0320b9"),
    categoria: "Arte e Decoração",
    vendedor: jovem(PESSOAS.alana),
    createdAt: criado,
  },
  {
    id: "p2",
    nome: "Casa de palito",
    preco: 99.99,
    imagemUrl: unsplash("1518780664697-55e3ad937233"),
    categoria: "Arte e Decoração",
    vendedor: jovem(PESSOAS.gustavo),
    createdAt: criado,
  },
  {
    id: "p3",
    nome: "Terço personalizado",
    preco: 49.99,
    imagemUrl: unsplash("1515562141207-7a88fb7ce338"),
    categoria: "Arte e Decoração",
    vendedor: jovem(PESSOAS.marina),
    createdAt: criado,
  },
  {
    id: "p4",
    nome: "Curso completo de introdução ao Office365",
    preco: 299.99,
    imagemUrl: unsplash("1498050108023-c5249f4df085"),
    categoria: "Educação e Apostilas",
    vendedor: vendedor(PESSOAS.olivia),
    createdAt: criado,
  },
  {
    id: "p5",
    nome: "Apostila para curso de administração",
    preco: 119.99,
    imagemUrl: unsplash("1513475382585-d06e58bcb0e0"),
    categoria: "Educação e Apostilas",
    vendedor: vendedor(PESSOAS.humberto),
    createdAt: criado,
  },
  {
    id: "p6",
    nome: "Curso de análise de dados para iniciantes",
    preco: 199.99,
    imagemUrl: unsplash("1551288049-bebda4e38f71"),
    categoria: "Educação e Apostilas",
    vendedor: vendedor(PESSOAS.francisco),
    createdAt: criado,
  },
  {
    id: "p7",
    nome: "Camisa Tech AOS",
    preco: 89.9,
    imagemUrl: unsplash("1523381210434-271e8be1f52b"),
    categoria: "Moda e Acessórios",
    vendedor: vendedor(PESSOAS.lucas),
    createdAt: criado,
  },
];

export const DESTAQUES_MOCK: Destaque[] = [
  { id: "d1", chamada: "Guia completo:", titulo: "Como fazer venda de", realce: "cursos online", cta: "Download" },
  { id: "d2", chamada: "Guia essencial:", titulo: "Como montar o seu", realce: "portfólio online", cta: "Download" },
];

export async function getProdutos(): Promise<Produto[]> {
  return Promise.resolve(PRODUTOS_MOCK);
}

export async function getDestaques(): Promise<Destaque[]> {
  return Promise.resolve(DESTAQUES_MOCK);
}
