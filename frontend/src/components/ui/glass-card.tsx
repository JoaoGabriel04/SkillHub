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
          "rounded-[16px] backdrop-blur-[16px] bg-[#595959]/15 border border-[#B0B0B0]/[0.33] shadow-[inset_0_4px_4px_rgba(255,255,255,0.10),inset_0_-4px_4px_rgba(0,0,0,0.25)]",
        variant === "dark" &&
          "rounded-[24px] backdrop-blur-[20px] bg-[rgba(28,28,28,0.92)] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    />
  );
}
