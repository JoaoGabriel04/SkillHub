import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBook, faCode, faTrophy } from "@fortawesome/free-solid-svg-icons";

// ⚠️ DADOS DE EXEMPLO — o backend ainda não tem eventos nem listagem de colaboradores.
// Serviços e produtos do Início vêm de lib/mock (os mesmos das páginas Serviços e Produtos).

export type Evento = { id: string; titulo: string; descricao: string; cta: string; icon: IconDefinition; cor: string };
export type Pessoa = { id: string; nome: string };

export const eventos: Evento[] = [
  {
    id: "e1",
    titulo: "Novo Evento! 🎉",
    descricao: "A empresa TechSolutions está lançando agora um curso para desenvolvimento web.",
    cta: "Acesse Já",
    icon: faCode,
    cor: "from-[#29cffe] to-[#3bd4cc]",
  },
  {
    id: "e2",
    titulo: "Guia essencial 📚",
    descricao: "Como montar o seu portfólio online e conseguir os primeiros clientes na plataforma.",
    cta: "Ler agora",
    icon: faBook,
    cor: "from-[#1e3a8a] to-[#2563eb]",
  },
  {
    id: "e3",
    titulo: "Maratona Tech 🏆",
    descricao: "Inscrições abertas para a maratona de projetos. Monte seu time e concorra a créditos.",
    cta: "Inscrever-se",
    icon: faTrophy,
    cor: "from-[#b45309] to-[#f59e0b]",
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
