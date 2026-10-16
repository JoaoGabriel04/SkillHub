"use client";

import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { TransitionLink, useNavPathname } from "@/components/motion/page-transition";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { NAV_ITENS, NAV_VIDRO, rotaAtiva } from "./navegacao";

// Início no meio da pílula, como no designs/New Início.png
const ITENS = [NAV_ITENS.servicos, NAV_ITENS.produtos, NAV_ITENS.inicio, NAV_ITENS.comunidade, NAV_ITENS.perfil];

// Menu inferior flutuante (SKILLHUB_PAGINAS_DESIGN.md, Seção 0): pílula de 405×58 a 12px da base,
// item ativo no ciano da marca (text-accent-text) com brilho. A partir de lg some: a Sidebar assume a navegação.
export function BottomNav() {
  const pathname = useNavPathname();
  const ref = useRef<HTMLElement>(null);
  const anterior = useRef<string | null>(null); // rota marcada antes (só a troca anima)

  // item novo (já no clique, antes de a rota trocar): o ícone dá um pulo
  useGSAP(
    () => {
      const de = anterior.current;
      anterior.current = pathname;
      // indo para Configurações (fora do menu) nenhum item fica ativo, e o GSAP avisaria "target not found"
      const icone = ref.current?.querySelector("[aria-current=page] svg");
      if (de === null || de === pathname || !icone || prefersReducedMotion()) return;
      gsap.fromTo(icone, { scale: 0.6, y: 4 }, { scale: 1, y: 0, duration: 0.5, ease: "back.out(3)" });
    },
    { scope: ref, dependencies: [pathname] }
  );

  return (
    <nav
      ref={ref}
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-3 z-40 mx-auto flex h-[58px] w-[calc(100%-32px)] max-w-[405px] items-center justify-around rounded-full px-3 lg:hidden",
        NAV_VIDRO
      )}
    >
      {ITENS.map(({ href, label, icon }) => {
        const active = rotaAtiva(pathname, href);
        return (
          <TransitionLink
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-[68px] flex-col items-center gap-[4px] font-secondary text-[10px] transition-colors",
              active ? "text-accent-text" : "text-foreground-secondary hover:text-foreground"
            )}
          >
            <FontAwesomeIcon
              icon={icon}
              className={cn("text-[20px]", active && "drop-shadow-(--glow-active)")}
            />
            {label}
          </TransitionLink>
        );
      })}
    </nav>
  );
}
