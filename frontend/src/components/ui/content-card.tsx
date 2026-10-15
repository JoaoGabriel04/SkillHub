import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Card de conteúdo (Figma: frame "Elements" > Card). Valores exatos — não arredondar.
// Para inputs e pills (busca, chips de filtro) o padrão é o GlassCard.
export function ContentCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-glass-border bg-card-fill",
        "shadow-(--shadow-card)",
        className
      )}
      {...props}
    />
  );
}
