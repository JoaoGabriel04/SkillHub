"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faGear, faRightFromBracket, faUserXmark } from "@fortawesome/free-solid-svg-icons";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { GlassCard } from "@/components/ui/glass-card";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const formatCredits = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

// designs/New Início.png: logo 38px, chip de créditos (moeda + caixa com borda) e engrenagem
export function AppHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    clear();
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between pt-[15px]">
      <SkillHubLogo size={38} />

      <div className="flex items-center gap-[25px]">
        <div className="flex items-center" title="Seus créditos">
          <FontAwesomeIcon icon={faCoins} className="relative z-10 text-[22px] text-[#c9c9c9]" />
          <span className="-ml-[6px] flex h-[23px] min-w-[73px] items-center justify-end border border-[#e3e3e3] px-2 font-jersey-15 text-[17px] text-white">
            <span className="sr-only">Créditos: </span>
            {formatCredits(user?.credits ?? 0)}
          </span>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Configurações"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex rounded-full text-white transition-transform outline-none hover:rotate-45 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#101010]"
          >
            <FontAwesomeIcon icon={faGear} className="text-[23px]" />
          </button>
          {menuOpen && (
            <GlassCard variant="dark" role="menu" className="absolute top-9 right-0 z-50 w-48 p-2">
              <p className="truncate px-3 pt-1 pb-2 font-secondary text-xs text-[#9f9f9f]">{user?.email}</p>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-secondary text-sm text-white transition-colors hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="text-[#9f9f9f]" />
                Sair
              </button>
              <div className="mx-3 my-1 border-t border-white/10" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-secondary text-sm text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10"
              >
                <FontAwesomeIcon icon={faUserXmark} />
                Excluir conta
              </button>
            </GlassCard>
          )}
          {deleteOpen && user && <DeleteAccountDialog user={user} onClose={() => setDeleteOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
