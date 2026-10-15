// Cores de marca que não cabem num token CSS (SKILLHUB_DESIGN_SYSTEM.md, Seção 8).
// Único lugar do src, além do globals.css, com cor literal: o canvas e o GSAP precisam do valor,
// e os degradês decorativos são classes que o Tailwind lê deste arquivo.
// Nada aqui leva texto por cima, então é igual nos dois temas.

type Rgb = [number, number, number];

// Escala dos hexágonos (logo, colmeia da transição, enxame da Home), do azul ao verde-água
export const HEX_COLORS = ["#1a8fe3", "#29c3dc", "#3bd4cc", "#93e7e2"] as const;

// Degradê da colmeia, de cima para baixo da tela (designs/New Home.png)
export const COLMEIA_GRADIENTE: [number, Rgb][] = [
  [0, [26, 143, 227]],
  [0.5, [41, 195, 220]],
  [0.78, [59, 212, 204]],
  [1, [147, 231, 226]],
];
// Ladrilho da colmeia antes de a onda tingir: o fundo escuro da marca (#101010)
export const COLMEIA_ESCURO: Rgb = [16, 16, 16];
export const FUNDO_ESCURO = "#101010";

// Cor da barra do navegador (meta theme-color) por tema: o --background de cada um (check-cores.mjs confere)
export const COR_BARRA = { escuro: "#101010", claro: "#f4f7f7" } as const;

// Brilhos animados pelo GSAP (filter)
export const BRILHO_LOGO_TRANSICAO = "drop-shadow(0 0 22px rgba(59,212,204,0.85))";
export const BRILHO_LOGO_HOME = "drop-shadow(0 0 18px rgba(59,212,204,0.55))";

// String de cor para o canvas
export const rgbCss = ([r, g, b]: Rgb, alpha?: number) =>
  alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;

// Cores de identidade dos avatares: todas com 4,5:1 ou mais com a inicial branca (check-contrast.mjs)
export const AVATAR_CORES = ["#2f6f8f", "#8f5a2f", "#4a5a8f", "#7c4a8f", "#8f2f4a", "#2a7553"] as const;
// Inicial sempre branca (não segue o tema: as cores acima foram validadas com branco)
export const AVATAR_INICIAL = "#ffffff";

// Blocos de ícone dos eventos do Início, na família da marca. `icone`: cor do ícone sobre o degradê.
export const EVENTO_FUNDOS = {
  ciano: { fundo: "bg-accent-gradient", icone: "text-accent-foreground" },
  azul: { fundo: "bg-[linear-gradient(135deg,#1a8fe3_0%,#29c3dc_100%)]", icone: "text-foreground" },
  petroleo: { fundo: "bg-[linear-gradient(135deg,#0a736e_0%,#0e9f97_100%)]", icone: "text-foreground" },
} as const;
export type EventoFundo = keyof typeof EVENTO_FUNDOS;
