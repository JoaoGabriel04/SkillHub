import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBook,
  faChartLine,
  faCode,
  faHeadphones,
  faKeyboard,
  faMicrochip,
  faMobileScreen,
  faShirt,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";

// ⚠️ DADOS DE EXEMPLO — o backend ainda não tem eventos, serviços, produtos
// nem listagem de colaboradores. Trocar por chamadas à API quando existirem.

export type Evento = { id: string; titulo: string; descricao: string; cta: string; icon: IconDefinition; cor: string };
export type Pessoa = { id: string; nome: string };
export type Servico = { id: string; autor: string; descricao: string };
export type Produto = { id: string; nome: string; preco: number; icon: IconDefinition };

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

export const servicos: Servico[] = [
  { id: "s1", autor: "Caetano Santos", descricao: "Estou precisando de um pequeno serviço, para a formatação do meu computador." },
  { id: "s2", autor: "José Pereira", descricao: "Minha máquina de lavar parou de funcionar, preciso de alguém para dar uma olhada." },
  { id: "s3", autor: "Marina Costa", descricao: "Procuro alguém para criar a identidade visual da minha confeitaria." },
  { id: "s4", autor: "Paulo Henrique", descricao: "Preciso configurar a rede Wi-Fi do escritório e instalar duas impressoras." },
  { id: "s5", autor: "Ana Beatriz", descricao: "Busco aulas particulares de Excel para montar planilhas de controle financeiro." },
];

export const produtos: Produto[] = [
  { id: "p1", nome: "Camisa Tech AOS", preco: 89.9, icon: faShirt },
  { id: "p2", nome: "Teclado mecânico", preco: 249.9, icon: faKeyboard },
  { id: "p3", nome: "Headset gamer", preco: 179.9, icon: faHeadphones },
  { id: "p4", nome: "Kit Arduino", preco: 129.9, icon: faMicrochip },
  { id: "p5", nome: "Capa de celular", preco: 39.9, icon: faMobileScreen },
  { id: "p6", nome: "Curso de análise de dados", preco: 199.9, icon: faChartLine },
];
