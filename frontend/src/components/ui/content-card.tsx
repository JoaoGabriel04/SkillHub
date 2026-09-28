import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Card de conteúdo (Figma: frame "Elements" > Card). Valores exatos — não arredondar.
// Para inputs e pills (busca, chips de filtro) o padrão é o GlassCard.
export function ContentCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[#B0B0B0]/[0.33] bg-black/30",
        "shadow-[2px_4px_4px_rgba(0,0,0,0.20),inset_0_-4px_4px_rgba(0,0,0,0.40),inset_0_6px_5px_rgba(255,255,255,0.05)]",
        className
      )}
      {...props}
    />
  );
}
