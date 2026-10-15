// Regra de cor do SkillHub (SKILLHUB_DESIGN_SYSTEM.md, Seção 8). Sem dependências.
// Uso: npm run check:cores   (sai com código 1 se algo reprovar)
//
// 1. Nenhuma cor escrita à mão em src/: #hex, rgb()/rgba() e classes da paleta fixa do Tailwind
//    (text-white, bg-black/35, bg-zinc-100...). Vale também para comentários, para a regra ser simples.
//    Exceções: src/app/globals.css (onde os tokens moram) e src/lib/brand.ts (cores de marca em JS).
// 2. Os tokens do globals.css batem com os valores validados em scripts/check-contrast.mjs,
//    e a cor da barra do navegador (COR_BARRA, lib/brand.ts) com o --background de cada tema.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const SRC = join(RAIZ, "src");
const EXCECOES = new Set(["app/globals.css", "lib/brand.ts"]);

const CORES = "white|black|zinc|neutral|gray|slate|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PROPRIEDADES = "text|bg|border|ring|ring-offset|fill|stroke|from|to|via|outline|decoration|divide|shadow|drop-shadow|caret";
const REGRAS = [
  ["hex", /#[0-9a-fA-F]{3,8}(?![\w-])/g],
  ["rgb()", /(?<![a-zA-Z])rgba?\(/g],
  ["paleta do Tailwind", new RegExp(`(?<![\\w-])(?:${PROPRIEDADES})-(?:${CORES})(?:-\\d{2,3})?(?![\\w-])`, "g")],
];

const arquivos = (dir) =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(tsx?|css)$/.test(nome) ? [caminho] : [];
  });

let falhas = 0;
const falha = (msg) => {
  falhas++;
  console.log(`FALHA ${msg}`);
};

// 1. cores escritas à mão
for (const arquivo of arquivos(SRC)) {
  const rel = relative(SRC, arquivo);
  if (EXCECOES.has(rel)) continue;
  readFileSync(arquivo, "utf8")
    .split("\n")
    .forEach((linha, i) => {
      for (const [tipo, regra] of REGRAS) {
        for (const m of linha.matchAll(regra)) falha(`src/${rel}:${i + 1}  ${tipo}: ${m[0]}`);
      }
    });
}

// 2. sincronia dos tokens com o validador de contraste
const contraste = readFileSync(join(RAIZ, "scripts/check-contrast.mjs"), "utf8");
const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
const TOKEN = {
  bg: "--background", surface: "--surface", surface2: "--surface-2",
  text: "--foreground", textSecondary: "--foreground-secondary", textMuted: "--muted-foreground",
  accent: "--accent", onAccent: "--accent-foreground", accentText: "--accent-text", accentHover: "--accent-hover",
  danger: "--danger", dangerFill: "--danger-fill", onDanger: "--danger-fill-foreground",
  success: "--success", warning: "--warning", border: "--border-input",
};
const bloco = (texto, inicio) => {
  const i = texto.indexOf(inicio);
  return i < 0 ? "" : texto.slice(i, texto.indexOf("}", i));
};
// No CSS, o bloco cujo seletor é só `seletor` (pula listas como ":root,\n.dark {", que só têm os derivados)
const blocoCss = (texto, seletor) => {
  for (let i = texto.indexOf(seletor); i >= 0; i = texto.indexOf(seletor, i + 1)) {
    if (i === 0 || (texto[i - 1] === "\n" && texto[i - 2] !== ",")) return texto.slice(i, texto.indexOf("}", i));
  }
  return "";
};
const variaveis = (texto) => Object.fromEntries([...texto.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const valores = (texto) => Object.fromEntries([...texto.matchAll(/(\w+):\s*"(#[0-9a-fA-F]{6})"/g)].map((m) => [m[1], m[2]]));

for (const [tema, seletor] of [["dark", ".dark {"], ["light", ":root {"]]) {
  const esperado = valores(bloco(contraste, `${tema}: {`));
  const atual = variaveis(blocoCss(css, seletor));
  for (const [chave, token] of Object.entries(TOKEN)) {
    if (!esperado[chave]) falha(`check-contrast.mjs sem o valor "${chave}" no tema ${tema}`);
    else if (atual[token]?.toLowerCase() !== esperado[chave].toLowerCase())
      falha(`tema ${tema}: ${token} é ${atual[token] ?? "(ausente)"} no globals.css, mas ${esperado[chave]} no check-contrast.mjs`);
  }
}
const marca = readFileSync(join(SRC, "lib/brand.ts"), "utf8");
const barra = marca.match(/COR_BARRA = \{ escuro: "(#[0-9a-fA-F]{6})", claro: "(#[0-9a-fA-F]{6})" \}/);
for (const [tema, seletor, cor] of [["escuro", ".dark {", barra?.[1]], ["claro", ":root {", barra?.[2]]]) {
  const fundo = variaveis(blocoCss(css, seletor))["--background"];
  if (!cor || cor.toLowerCase() !== fundo?.toLowerCase())
    falha(`COR_BARRA.${tema} (${cor ?? "ausente"}) em src/lib/brand.ts difere do --background do tema (${fundo})`);
}
const avataresContraste = contraste.match(/AVATARES = \[([^\]]+)\]/)?.[1];
const avataresMarca = marca.match(/AVATAR_CORES = \[([^\]]+)\]/)?.[1];
if (!avataresContraste || avataresContraste.replace(/\s/g, "") !== avataresMarca?.replace(/\s/g, ""))
  falha("as cores dos avatares em src/lib/brand.ts diferem das validadas em check-contrast.mjs");

console.log(falhas ? `\n${falhas} problema(s) de cor.` : "Nenhuma cor escrita à mão e tokens em sincronia com o check-contrast.mjs.");
process.exit(falhas ? 1 : 0);
