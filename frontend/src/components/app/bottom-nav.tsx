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

// Menu inferior flutuante (vidro escuro, SKILLHUB_DESIGN_SYSTEM.md 2.2): pílula de 405×58
// a 12px da base (mais baixa que os 75px do doc, a pedido; o mockup tem ~55px); item ativo em ciano #00fff2 com brilho.
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-3 z-40 mx-auto flex h-[58px] w-[calc(100%-32px)] max-w-[405px] items-center justify-around rounded-full border border-white/10 bg-[rgba(46,46,46,0.8)] px-3 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[20px]"
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
              active ? "text-[#00fff2]" : "text-[#d8d8d8] hover:text-white"
            )}
          >
            <FontAwesomeIcon
              icon={icon}
              className={cn("text-[20px]", active && "drop-shadow-[0_0_6px_rgba(0,255,242,0.7)]")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
