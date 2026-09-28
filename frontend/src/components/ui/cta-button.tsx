import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Visual do CTA, exportado para links com cara de botão (ex.: "Saiba Mais" do Início)
export const ctaButtonClass = cn(
  "rounded-[5px] bg-[#3bd4cc] font-secondary text-[10px] font-semibold text-white",
  "shadow-[inset_0_-2px_4px_rgba(0,0,0,0.35),inset_0_4px_4px_rgba(255,255,255,0.30)]",
  "transition-[filter] hover:brightness-110 disabled:opacity-60"
);

// Botão CTA cyan (Figma: frame "Elements" > Button).
export function CtaButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn(ctaButtonClass, className)} {...props} />;
}
