import { PESSOAS, type AutorResumo } from "./pessoas";

// ⚠️ DADOS DE EXEMPLO (designs/New Serviços.png e New Início.png). Quando o backend ganhar o
// model Servico, getServicos() vira `api.get<Servico[]>("/servicos").then((r) => r.data)`.

export const CATEGORIAS_SERVICO = ["Educação", "Tecnologia", "Design e Arte", "Reparos e Manutenção"] as const;
export type CategoriaServico = (typeof CATEGORIAS_SERVICO)[number];

// Pedido de serviço publicado por um usuário; colaboradores respondem a ele.
export type Servico = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaServico;
  autor: AutorResumo;
  distanciaKm: number; // calculada pelo backend a partir do CEP de quem consulta
  remuneracao: number | null; // em créditos; null = "a combinar"
  prazo: string | null; // ISO; null = sem prazo
  createdAt: string; // ISO
};

const dias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const SERVICOS_MOCK: Servico[] = [
  {
    id: "s1",
    titulo: "Arte para criação de um cardápio",
    descricao: "Estou precisando de um cardápio para o meu restaurante",
    categoria: "Design e Arte",
    autor: PESSOAS.carlos,
    distanciaKm: 1,
    remuneracao: 150,
    prazo: dias(10),
    createdAt: dias(-1),
  },
  {
    id: "s2",
    titulo: "Manutenção de ar-condicionado",
    descricao: "Estou precisando limpar o meu ar-condicionado",
    categoria: "Reparos e Manutenção",
    autor: PESSOAS.lindalva,
    distanciaKm: 2,
    remuneracao: 120,
    prazo: dias(5),
    createdAt: dias(-2),
  },
  {
    id: "s3",
    titulo: "Aula de reforço",
    descricao: "Estou precisando que alguém dê aula de matemática para meu filho.",
    categoria: "Educação",
    autor: PESSOAS.humberto,
    distanciaKm: 10,
    remuneracao: 80,
    prazo: null,
    createdAt: dias(-3),
  },
  {
    id: "s4",
    titulo: "Aula de música",
    descricao: "Alguém que possa me ensinar a tocar bateria.",
    categoria: "Educação",
    autor: PESSOAS.bruna,
    distanciaKm: 6,
    remuneracao: null,
    prazo: null,
    createdAt: dias(-4),
  },
  {
    id: "s5",
    titulo: "Edição de vídeo",
    descricao: "Edição de vídeo simples para divulgação em redes sociais.",
    categoria: "Tecnologia",
    autor: PESSOAS.francisco,
    distanciaKm: 1,
    remuneracao: 200,
    prazo: dias(7),
    createdAt: dias(-1),
  },
  {
    id: "s6",
    titulo: "Criação de site",
    descricao: "Site para vendas de produtos da minha loja virtual de maquiagem",
    categoria: "Tecnologia",
    autor: PESSOAS.olivia,
    distanciaKm: 8,
    remuneracao: 600,
    prazo: dias(30),
    createdAt: dias(-5),
  },
  {
    id: "s7",
    titulo: "Formatação de computador",
    descricao: "Estou precisando de um pequeno serviço, para a formatação do meu computador.",
    categoria: "Tecnologia",
    autor: PESSOAS.caetano,
    distanciaKm: 3,
    remuneracao: 100,
    prazo: dias(3),
    createdAt: dias(0),
  },
  {
    id: "s8",
    titulo: "Conserto de máquina de lavar",
    descricao: "Minha máquina de lavar parou de funcionar, preciso de alguém para dar uma olhada.",
    categoria: "Reparos e Manutenção",
    autor: PESSOAS.jose,
    distanciaKm: 4,
    remuneracao: null,
    prazo: dias(2),
    createdAt: dias(0),
  },
];

export async function getServicos(): Promise<Servico[]> {
  return Promise.resolve(SERVICOS_MOCK);
}
