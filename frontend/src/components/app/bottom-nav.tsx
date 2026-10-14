"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { NAV_ITENS, NAV_VIDRO, rotaAtiva } from "./navegacao";

// Início no meio da pílula, como no designs/New Início.png
const ITENS = [NAV_ITENS.servicos, NAV_ITENS.produtos, NAV_ITENS.inicio, NAV_ITENS.comunidade, NAV_ITENS.perfil];

// Menu inferior flutuante (SKILLHUB_PAGINAS_DESIGN.md, Seção 0): pílula de 405×58 a 12px da base,
// item ativo no accent #3bd4cc com brilho. A partir de lg some: a Sidebar assume a navegação.
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-3 z-40 mx-auto flex h-[58px] w-[calc(100%-32px)] max-w-[405px] items-center justify-around rounded-full px-3 lg:hidden",
        NAV_VIDRO
      )}
    >
      {ITENS.map(({ href, label, icon }) => {
        const active = rotaAtiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-[68px] flex-col items-center gap-[4px] font-secondary text-[10px] transition-colors",
              active ? "text-[#3bd4cc]" : "text-[#d8d8d8] hover:text-white"
            )}
          >
            <FontAwesomeIcon
              icon={icon}
              className={cn("text-[20px]", active && "drop-shadow-[0_0_6px_rgba(59,212,204,0.7)]")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
