import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Visual do CTA, exportado para links com cara de botão (ex.: "Saiba Mais" do Início)
export const ctaButtonClass = cn(
  "rounded-[5px] bg-accent font-secondary text-[12px] font-semibold text-accent-foreground lg:text-[13px]",
  "shadow-(--shadow-cta)",
  "transition-colors hover:bg-accent-hover disabled:opacity-60"
);

// Botão principal (Figma: frame "Elements" > Button): o único botão de ação, texto escuro sobre o ciano.
export function CtaButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn(ctaButtonClass, className)} {...props} />;
}
