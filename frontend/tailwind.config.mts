import type { Config } from "tailwindcss";

// Tokens do SKILLHUB_DESIGN_SYSTEM.md (Seção 6).
// Carregado pelo Tailwind v4 via `@config` em src/app/globals.css.
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: { DEFAULT: "#1a1a1a", light: "#222222" },
        surface: { DEFAULT: "#1b1b1b", light: "#282828" },
        accent: { DEFAULT: "#3bd4cc", from: "#29cffe", to: "#3bd4cc" },
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(180deg, #29cffe 0%, #3bd4cc 100%)",
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
