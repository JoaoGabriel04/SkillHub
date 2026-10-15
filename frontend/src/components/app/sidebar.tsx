"use client";

import { useRef, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faGear } from "@fortawesome/free-solid-svg-icons";
import { LogOut } from "lucide-react";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { TransitionLink, useNavPathname } from "@/components/motion/page-transition";
import { ContentCard } from "@/components/ui/content-card";
import { useLogout } from "@/hooks/use-logout";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { formatCredits, useCountUp } from "./credits-chip";
import { NAV_ITENS, NAV_VIDRO, rotaAtiva } from "./navegacao";

// No desktop o Início abre a lista (no menu inferior ele fica no meio)
const ITENS = [NAV_ITENS.inicio, NAV_ITENS.servicos, NAV_ITENS.produtos, NAV_ITENS.comunidade, NAV_ITENS.perfil];

// ring-inset: a área rolável cortaria um anel por fora
const itemBase =
  "flex h-11 shrink-0 items-center gap-3 rounded-[12px] border px-4 font-secondary text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset";
const itemInativo = "border-transparent text-[rgb(212,233,255)] hover:bg-white/5 hover:text-white";
const caixaAtiva = "border-[rgba(59,212,204,0.4)] bg-[rgba(59,212,204,0.12)]";
const itemClass = (active: boolean) => cn(itemBase, active ? cn(caixaAtiva, "text-[#3bd4cc]") : itemInativo);
// No menu a caixa do ativo é uma peça só ([data-indicator]) que desliza até o item novo
const navItemClass = (active: boolean) =>
  cn(itemBase, "relative", active ? "border-transparent text-[#3bd4cc]" : itemInativo);
const iconClass = (active: boolean) => cn("text-[20px]", active && "drop-shadow-[0_0_6px_rgba(59,212,204,0.7)]");

// Caixa fixa pros ícones: FontAwesome (1.25em) e Lucide têm larguras diferentes e desalinhariam os rótulos
function Icone({ children }: { children: ReactNode }) {
  return <span className="flex w-[25px] shrink-0 justify-center">{children}</span>;
}

// Navegação do desktop (lg+), designs/New Início - Desktop.png (node 719:131): substitui o menu inferior
// e o AppHeader. Fica presa à viewport enquanto a página rola; numa tela baixa, a parte de cima rola
// e a Conta (Configurações, Sair) continua sempre visível.
export function Sidebar() {
  const pathname = useNavPathname();
  const credits = useAuthStore((s) => s.user?.credits ?? 0);
  const shown = useCountUp(credits);
  const sair = useLogout();
  const naConfig = rotaAtiva(pathname, "/configuracoes");
  const navRef = useRef<HTMLElement>(null);
  const anterior = useRef<string | null>(null); // rota marcada antes (a troca só anima quando ela muda)

  // Caixa do item ativo: desliza até o destino assim que o clique acontece (a rota troca depois).
  // Vindo de Configurações (fora desta lista) ela aparece no lugar em vez de deslizar; o ícone novo dá um pulo.
  useGSAP(
    () => {
      const de = anterior.current;
      anterior.current = pathname;
      const anima = de !== null && de !== pathname && !prefersReducedMotion();
      const indicador = "[data-indicator]";
      const ativo = navRef.current!.querySelector<HTMLElement>("[aria-current=page]");
      if (!ativo) {
        gsap.to(indicador, { autoAlpha: 0, duration: anima ? 0.2 : 0, overwrite: true });
        return;
      }
      const lugar = { y: ativo.offsetTop, height: ativo.offsetHeight };
      if (anima && ITENS.some((item) => rotaAtiva(de, item.href))) {
        gsap.to(indicador, { ...lugar, autoAlpha: 1, duration: 0.45, ease: "expo.out", overwrite: true });
      } else {
        gsap.set(indicador, lugar);
        gsap.to(indicador, { autoAlpha: 1, duration: anima ? 0.25 : 0, overwrite: true });
      }
      if (anima) {
        gsap.fromTo(ativo.querySelector("svg"), { scale: 0.6, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
      }
    },
    { scope: navRef, dependencies: [pathname] }
  );

  return (
    <aside
      aria-label="Barra lateral"
      className={cn(
        "sticky top-4 hidden h-[calc(100dvh-32px)] w-[248px] shrink-0 flex-col self-start rounded-[28px] px-5 pt-6 pb-5 lg:flex",
        NAV_VIDRO
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto [scrollbar-width:thin]">
        <TransitionLink
          href="/inicio"
          aria-label="SkillHub, ir para o Início"
          className="flex shrink-0 items-center gap-3 rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <SkillHubLogo size={38} />
          <span className="text-[22px] font-bold text-white">SkillHub</span>
        </TransitionLink>

        <ContentCard className="shrink-0 px-4 py-3">
          <p className="font-secondary text-[11px] text-[#9f9f9f]">Seus créditos</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex size-[24px] items-center justify-center rounded-full bg-accent-gradient shadow-[0_0_10px_rgba(59,212,204,0.45)]">
              <FontAwesomeIcon icon={faCoins} className="text-[12px] text-[#101010]" />
            </span>
            <span aria-hidden className="font-jersey-15 text-[24px] leading-none text-white tabular-nums">
              {formatCredits(shown)}
            </span>
            <span className="sr-only">{formatCredits(credits)}</span>
          </div>
        </ContentCard>

        <p className="shrink-0 font-secondary text-[11px] font-medium tracking-[0.12em] text-[#9f9f9f]">MENU</p>

        <nav ref={navRef} aria-label="Navegação principal" className="relative flex flex-col gap-1">
          <span aria-hidden data-indicator className={cn("invisible absolute inset-x-0 top-0 rounded-[12px] border", caixaAtiva)} />
          {ITENS.map(({ href, label, icon }) => {
            const active = rotaAtiva(pathname, href);
            return (
              <TransitionLink key={href} href={href} aria-current={active ? "page" : undefined} className={navItemClass(active)}>
                <Icone>
                  <FontAwesomeIcon icon={icon} className={iconClass(active)} />
                </Icone>
                {label}
              </TransitionLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-5 h-px shrink-0 bg-white/10" />

      <div className="mt-5 flex shrink-0 flex-col gap-1">
        <TransitionLink
          href="/configuracoes"
          aria-current={naConfig ? "page" : undefined}
          className={itemClass(naConfig)}
        >
          <Icone>
            <FontAwesomeIcon icon={faGear} className={iconClass(naConfig)} />
          </Icone>
          Configurações
        </TransitionLink>
        <button type="button" onClick={(e) => sair(e.currentTarget)} className={cn(itemClass(false), "w-full text-left")}>
          <Icone>
            <LogOut aria-hidden size={20} />
          </Icone>
          Sair
        </button>
      </div>
    </aside>
  );
}
