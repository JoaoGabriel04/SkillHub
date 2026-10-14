import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Coluna das páginas logadas (SKILLHUB_RESPONSIVO_DESKTOP.md, Seção 2). Até sm fica nos 440px do
// Figma com o padding mobile de 23px; a partir daí cresce em estágios. Em lg+ divide a linha com a
// Sidebar (24px em cima e à direita, 32px de gap vem do layout) e para nos 1200px.
// Quem sangra até a borda (ScrollRow, linhas de chips) usa -mx-[23px] só abaixo de sm.
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[440px] px-[23px] sm:max-w-2xl sm:px-8 lg:max-w-[1200px] lg:pt-6 lg:pr-6 lg:pl-0", className)}>
      {children}
    </div>
  );
}
