// Valida os pares texto/fundo da paleta do SkillHub (WCAG 2.x). Sem dependências.
// Uso: node scripts/check-contrast.mjs   (sai com código 1 se algum par reprovar)
// Mantenha os valores abaixo IGUAIS aos tokens de src/app/globals.css.

const T = {
  dark: {
    bg: "#101010", surface: "#0c0c0c", surface2: "#1b1b1b",
    text: "#f2f4f4", textSecondary: "#b8c0bf", textMuted: "#8f9897",
    accent: "#3bd4cc", onAccent: "#08201e", accentText: "#3bd4cc", accentHover: "#62e0d9",
    danger: "#ff7b7b", dangerFill: "#c62f2f", onDanger: "#ffffff",
    success: "#4ade80", warning: "#f5b942",
    border: "#6b7574",
  },
  light: {
    bg: "#f4f7f7", surface: "#ffffff", surface2: "#e9efee",
    text: "#0f1a19", textSecondary: "#3f4f4d", textMuted: "#5a6866",
    accent: "#3bd4cc", onAccent: "#08201e", accentText: "#0a736e", accentHover: "#62e0d9",
    danger: "#b3261e", dangerFill: "#c62f2f", onDanger: "#ffffff",
    success: "#137a3f", warning: "#8a5a00",
    border: "#76837f",
  },
};

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [primeiro plano, fundo, descrição, mínimo]  (4.5 = texto, 3 = ícone/borda/anel de foco)
const pairs = (t) => [
  [t.text, t.bg, "texto principal na página", 4.5],
  [t.text, t.surface, "texto principal no card", 4.5],
  [t.textSecondary, t.bg, "texto secundário na página", 4.5],
  [t.textSecondary, t.surface, "texto secundário no card", 4.5],
  [t.textMuted, t.bg, "texto discreto na página", 4.5],
  [t.textMuted, t.surface, "texto discreto no card", 4.5],
  [t.text, t.surface2, "texto principal em superfície elevada (surface-2)", 4.5],
  [t.textSecondary, t.surface2, "texto secundário em surface-2", 4.5],
  [t.textMuted, t.surface2, "texto discreto em surface-2", 4.5],
  [t.accentText, t.surface2, "link e item ativo em surface-2", 4.5],
  [t.onAccent, t.accent, "texto do botão principal", 4.5],
  [t.onAccent, t.accentHover, "texto do botão principal (hover)", 4.5],
  [t.accentText, t.bg, "link e item ativo na página", 4.5],
  [t.accentText, t.surface, "link e item ativo no card", 4.5],
  [t.danger, t.bg, "erro em texto na página", 4.5],
  [t.danger, t.surface, "erro em texto no card", 4.5],
  [t.onDanger, t.dangerFill, "texto do botão perigoso", 4.5],
  [t.success, t.surface, "sucesso em texto", 4.5],
  [t.warning, t.surface, "aviso em texto", 4.5],
  [t.accentText, t.bg, "anel de foco / ícone ativo", 3],
  [t.border, t.bg, "borda de campo de formulário (sublinhado dos inputs)", 3],
];

let falhas = 0;
for (const [nome, t] of Object.entries(T)) {
  console.log(`\n== tema ${nome}`);
  for (const [fg, bg, desc, min] of pairs(t)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) falhas++;
    console.log(`${ok ? "OK   " : "FALHA"} ${r.toFixed(2).padStart(5)} (min ${min})  ${desc}: ${fg} em ${bg}`);
  }
}
// Cores de identidade dos avatares (iniciais brancas)
const AVATARES = ["#2f6f8f", "#8f5a2f", "#4a5a8f", "#7c4a8f", "#8f2f4a", "#2a7553"];
console.log("\n== avatares (iniciais brancas)");
for (const c of AVATARES) {
  const r = ratio("#ffffff", c);
  if (r < 4.5) falhas++;
  console.log(`${r >= 4.5 ? "OK   " : "FALHA"} ${r.toFixed(2).padStart(5)}  #ffffff em ${c}`);
}
console.log(falhas ? `\n${falhas} par(es) reprovado(s).` : "\nTodos os pares passaram.");
process.exit(falhas ? 1 : 0);
