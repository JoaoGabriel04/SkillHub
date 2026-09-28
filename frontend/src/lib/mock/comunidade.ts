import { PESSOAS, type AutorResumo } from "./pessoas";

// ⚠️ DADOS DE EXEMPLO (designs/New Comunidade.png). Quando o backend ganhar o model
// Postagem, getPostagens() vira `api.get<Postagem[]>("/postagens").then((r) => r.data)`.

export const TAGS_COMUNIDADE = ["Doações", "Empregos", "Eventos", "Mini Cursos"] as const;
export type TagComunidade = (typeof TAGS_COMUNIDADE)[number];

// Um único model com discriminador: cada seção da tela é um tipo de postagem.
export type TipoPostagem = "feed" | "duvida" | "evento" | "historia";

export type Postagem = {
  id: string;
  tipo: TipoPostagem;
  titulo: string | null; // o feed não tem título
  conteudo: string;
  autor: AutorResumo;
  tags: TagComunidade[];
  dataEvento: string | null; // ISO, só para tipo "evento"
  createdAt: string; // ISO
};

const minutosAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const POSTAGENS_MOCK: Postagem[] = [
  {
    id: "c1",
    tipo: "feed",
    titulo: null,
    conteudo:
      "Estou precisando de alguém que tenha experiência com edição de vídeo para me ajudar a melhorar um material que gravei. Preciso de cortes simples, ajustes de áudio e talvez uma vinheta curta no início. Quem tiver interesse, por favor me avisa!",
    autor: PESSOAS.lucas,
    tags: ["Empregos"],
    dataEvento: null,
    createdAt: minutosAtras(20),
  },
  {
    id: "c2",
    tipo: "duvida",
    titulo: "Qual o melhor software para fazer sites?",
    conteudo: "",
    autor: PESSOAS.rodrigo,
    tags: [],
    dataEvento: null,
    createdAt: minutosAtras(60),
  },
  {
    id: "c3",
    tipo: "duvida",
    titulo: "Qual a melhor forma de fazer um bolo?",
    conteudo: "",
    autor: PESSOAS.rodrigo,
    tags: [],
    dataEvento: null,
    createdAt: minutosAtras(30),
  },
  ...(
    [
      ["c4", "Aulão de Inglês", "2025-09-18", ["Eventos", "Mini Cursos"]],
      ["c5", "Palestra sobre IAs", "2025-10-06", ["Eventos"]],
      ["c6", "Aulão de Redação", "2025-10-04", ["Eventos", "Mini Cursos"]],
      ["c7", "Mentoria sobre carreira", "2025-11-09", ["Eventos"]],
    ] as const
  ).map(
    ([id, titulo, data, tags]): Postagem => ({
      id,
      tipo: "evento",
      titulo,
      conteudo: "",
      autor: PESSOAS.marina,
      tags: [...tags],
      dataEvento: `${data}T12:00:00.000Z`,
      createdAt: minutosAtras(24 * 60),
    })
  ),
  {
    id: "c8",
    tipo: "historia",
    titulo: "Consegui um emprego, pessoal!",
    conteudo:
      "Consegui um emprego, pessoal! Estou muito feliz e queria compartilhar essa conquista com vocês. Foi um caminho cheio de aprendizados, e a ajuda da comunidade fez toda a diferença, desde dicas até palavras de incentivo. Agora começa uma nova fase, cheia de desafios e oportunidades...",
    autor: PESSOAS.beatriz,
    tags: ["Empregos"],
    dataEvento: null,
    createdAt: minutosAtras(3 * 60),
  },
];

export async function getPostagens(): Promise<Postagem[]> {
  return Promise.resolve(POSTAGENS_MOCK);
}
