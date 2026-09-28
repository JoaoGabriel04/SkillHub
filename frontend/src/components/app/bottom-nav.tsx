"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faGlobe, faHouse, faScrewdriverWrench, faUser } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/servicos", label: "Serviços", icon: faScrewdriverWrench },
  { href: "/produtos", label: "Produtos", icon: faBagShopping },
  { href: "/inicio", label: "Início", icon: faHouse },
  { href: "/comunidade", label: "Comunidade", icon: faGlobe },
  { href: "/perfil", label: "Perfil", icon: faUser },
];

// Menu inferior flutuante (SKILLHUB_PAGINAS_DESIGN.md, Seção 0): pílula de 405×58 a 12px da base,
// fundo de vidro só com insets (sem brilho colorido); item ativo no accent #3bd4cc com brilho.
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-3 z-40 mx-auto flex h-[58px] w-[calc(100%-32px)] max-w-[405px] items-center lg:max-w-[520px] justify-around rounded-full border border-[#b0b0b0]/[0.33] bg-black/35 px-3 backdrop-blur-[3px] shadow-[inset_0_-4px_4px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(255,255,255,0.10)]"
    >
      {ITENS.map(({ href, label, icon }) => {
        const active = pathname === href;
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
