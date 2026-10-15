"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { TransitionLink, useNavPathname } from "@/components/motion/page-transition";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { CreditsChip } from "./credits-chip";

// designs/New Início.png: logo 38px, chip de créditos (ver CreditsChip) e engrenagem,
// que leva para /configuracoes (lá ficam Sair e, em Privacidade e Segurança, Excluir conta).
// A partir de lg some: logo, créditos e Configurações moram na Sidebar.
export function AppHeader() {
  const pathname = useNavPathname();
  const user = useAuthStore((s) => s.user);
  const naConfig = pathname === "/configuracoes";

  return (
    <header className="flex items-center justify-between pt-[15px] lg:hidden">
      <SkillHubLogo size={38} />

      <div className="flex items-center gap-[20px]">
        <CreditsChip credits={user?.credits ?? 0} />

        <TransitionLink
          href="/configuracoes"
          aria-label="Configurações"
          aria-current={naConfig ? "page" : undefined}
          className={cn(
            "flex rounded-full transition-transform outline-none hover:rotate-45 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#101010]",
            naConfig ? "text-[#3bd4cc]" : "text-white"
          )}
        >
          <FontAwesomeIcon icon={faGear} className="text-[23px]" />
        </TransitionLink>
      </div>
    </header>
  );
}
