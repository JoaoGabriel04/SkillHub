"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faGear } from "@fortawesome/free-solid-svg-icons";
import { LogOut } from "lucide-react";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { ContentCard } from "@/components/ui/content-card";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { formatCredits, useCountUp } from "./credits-chip";
import { NAV_ITENS, NAV_VIDRO, rotaAtiva } from "./navegacao";

// No desktop o Início abre a lista (no menu inferior ele fica no meio)
const ITENS = [NAV_ITENS.inicio, NAV_ITENS.servicos, NAV_ITENS.produtos, NAV_ITENS.comunidade, NAV_ITENS.perfil];

// ring-inset: a área rolável cortaria um anel por fora
const itemClass = (active: boolean) =>
  cn(
    "flex h-11 shrink-0 items-center gap-3 rounded-[12px] border px-4 font-secondary text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
    active
      ? "border-[rgba(59,212,204,0.4)] bg-[rgba(59,212,204,0.12)] text-[#3bd4cc]"
      : "border-transparent text-[rgb(212,233,255)] hover:bg-white/5 hover:text-white"
  );
const iconClass = (active: boolean) =>
  cn("w-[22px] shrink-0 text-[20px]", active && "drop-shadow-[0_0_6px_rgba(59,212,204,0.7)]");

// Navegação do desktop (lg+), designs/New Início - Desktop.png (node 719:131): substitui o menu inferior
// e o AppHeader. Fica presa à viewport enquanto a página rola; numa tela baixa, a parte de cima rola
// e a Conta (Configurações, Sair) continua sempre visível.
export function Sidebar() {
  const pathname = usePathname();
  const credits = useAuthStore((s) => s.user?.credits ?? 0);
  const shown = useCountUp(credits);
  const sair = useLogout();
  const naConfig = rotaAtiva(pathname, "/configuracoes");

  return (
    <aside
      aria-label="Barra lateral"
      className={cn(
        "sticky top-4 hidden h-[calc(100dvh-32px)] w-[248px] shrink-0 flex-col self-start rounded-[28px] px-5 pt-6 pb-5 lg:flex",
        NAV_VIDRO
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto [scrollbar-width:thin]">
        <Link
          href="/inicio"
          aria-label="SkillHub, ir para o Início"
          className="flex shrink-0 items-center gap-3 rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <SkillHubLogo size={38} />
          <span className="text-[22px] font-bold text-white">SkillHub</span>
        </Link>

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

        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {ITENS.map(({ href, label, icon }) => {
            const active = rotaAtiva(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
                <FontAwesomeIcon icon={icon} className={iconClass(active)} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-5 h-px shrink-0 bg-white/10" />

      <div className="mt-5 flex shrink-0 flex-col gap-1">
        <Link
          href="/configuracoes"
          aria-current={naConfig ? "page" : undefined}
          className={itemClass(naConfig)}
        >
          <FontAwesomeIcon icon={faGear} className={iconClass(naConfig)} />
          Configurações
        </Link>
        <button type="button" onClick={sair} className={cn(itemClass(false), "w-full text-left")}>
          <LogOut aria-hidden className="w-[22px] shrink-0" size={20} />
          Sair
        </button>
      </div>
    </aside>
  );
}
