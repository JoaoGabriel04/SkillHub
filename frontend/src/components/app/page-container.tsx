import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Coluna das páginas logadas (SKILLHUB_RESPONSIVO_DESKTOP.md, Seção 2). Até sm fica nos 440px do
// Figma com o padding mobile de 23px; a partir daí cresce em estágios.
// Quem sangra até a borda (ScrollRow, linhas de chips) usa -mx-[23px] só abaixo de sm.
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[440px] px-[23px] sm:max-w-2xl sm:px-8 lg:max-w-5xl lg:px-12 xl:max-w-6xl", className)}>
      {children}
    </div>
  );
}
