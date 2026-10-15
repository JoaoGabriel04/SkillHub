import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "light" | "dark"; // light = cards de conteúdo, dark = menu/superfícies escuras
};

// Valores exatos do Figma (SKILLHUB_DESIGN_SYSTEM.md, Seção 2).
// Raios e blur em px explícitos: o tema do shadcn redefine a escala rounded-*
// (rounded-2xl viraria 18px) e backdrop-blur-md é 12px, não 16px.
export function GlassCard({ variant = "light", className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        variant === "light" &&
          "rounded-[16px] backdrop-blur-[16px] bg-glass border border-glass-border shadow-(--shadow-glass)",
        variant === "dark" &&
          "rounded-[24px] backdrop-blur-[20px] bg-glass-strong border border-glass-strong-border shadow-(--shadow-popover)",
        className
      )}
      {...props}
    />
  );
}
