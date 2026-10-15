import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBook, faCode, faTrophy } from "@fortawesome/free-solid-svg-icons";
import type { EventoFundo } from "@/lib/brand";

// ⚠️ DADOS DE EXEMPLO — o backend ainda não tem eventos nem listagem de colaboradores.
// Serviços e produtos do Início vêm de lib/mock (os mesmos das páginas Serviços e Produtos).

export type Evento = { id: string; titulo: string; descricao: string; cta: string; icon: IconDefinition; fundo: EventoFundo };
export type Pessoa = { id: string; nome: string };

export const eventos: Evento[] = [
  {
    id: "e1",
    titulo: "Novo Evento! 🎉",
    descricao: "A empresa TechSolutions está lançando agora um curso para desenvolvimento web.",
    cta: "Acesse Já",
    icon: faCode,
    fundo: "ciano",
  },
  {
    id: "e2",
    titulo: "Guia essencial 📚",
    descricao: "Como montar o seu portfólio online e conseguir os primeiros clientes na plataforma.",
    cta: "Ler agora",
    icon: faBook,
    fundo: "azul",
  },
  {
    id: "e3",
    titulo: "Maratona Tech 🏆",
    descricao: "Inscrições abertas para a maratona de projetos. Monte seu time e concorra a créditos.",
    cta: "Inscrever-se",
    icon: faTrophy,
    fundo: "petroleo",
  },
];

export const colaboradores: Pessoa[] = [
  { id: "c1", nome: "Lucas Andrade" },
  { id: "c2", nome: "Rafael Moura" },
  { id: "c3", nome: "Beatriz Lima" },
  { id: "c4", nome: "Camila Rocha" },
  { id: "c5", nome: "Diego Nunes" },
  { id: "c6", nome: "Fernanda Alves" },
  { id: "c7", nome: "Gustavo Reis" },
  { id: "c8", nome: "Helena Prado" },
];
