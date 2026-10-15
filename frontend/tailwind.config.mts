import type { Config } from "tailwindcss";

// Fontes e o degradê da marca (SKILLHUB_DESIGN_SYSTEM.md, Seção 6; a paleta está na Seção 8).
// Carregado pelo Tailwind v4 via `@config` em src/app/globals.css.
export default {
  darkMode: "class",
  theme: {
    extend: {
      // cores vêm dos tokens de src/app/globals.css (@theme inline), não daqui
      backgroundImage: {
        "accent-gradient": "var(--brand-gradient)",
      },
      fontFamily: {
        // variáveis CSS geradas pelo next/font em src/app/layout.tsx
        sans: ["var(--font-inter)", "sans-serif"],
        secondary: ["var(--font-poppins)", "sans-serif"],
        "jersey-15": ["var(--font-jersey-15)", "sans-serif"],
        "jersey-20": ["var(--font-jersey-20)", "sans-serif"],
        "jersey-25": ["var(--font-jersey-25)", "sans-serif"],
      },
    },
  },
} satisfies Config;
