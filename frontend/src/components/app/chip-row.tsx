"use client";

import { useRef, type ReactNode } from "react";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { cn } from "@/lib/utils";

// Fileira de chips/atalhos que rola na horizontal quando não cabe (filtros de Serviços, categorias
// de Produtos, tags da Comunidade). Mesmo sangramento do ScrollRow no mobile; arrasta com o mouse.
export function ChipRow({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useDragScroll(ref);
  return (
    <div
      ref={ref}
      role={label ? "group" : undefined}
      aria-label={label}
      className={cn(
        "-mx-[23px] flex overflow-x-auto px-[23px] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}
