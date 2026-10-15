"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { PageContainer } from "@/components/app/page-container";
import { Sidebar } from "@/components/app/sidebar";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { useAuthStore } from "@/stores/auth-store";

// Área logada: exige sessão e perfil completo.
// Fundo: --background chapado (New Início.png); no Perfil, degradê vertical --bg-profile-from → --bg-profile-to (Perfil.png).
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuthStore();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user && !user.profileComplete) router.replace("/cadastro?completar=1");
  }, [status, user, router]);

  const ready = status === "authenticated" && user?.profileComplete;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div
        aria-hidden
        className={
          pathname === "/perfil"
            ? "fixed inset-0 -z-10 bg-[linear-gradient(180deg,var(--bg-profile-from)_0%,var(--bg-profile-to)_100%)]"
            : "fixed inset-0 -z-10 bg-background"
        }
      />
      {ready ? (
        <>
          {/* lg+: sidebar à esquerda e a coluna da página ao lado (designs/New Início - Desktop.png) */}
          <div className="flex flex-1 flex-col lg:flex-row lg:gap-8 lg:p-4">
            <Sidebar />
            {/* pb: espaço pro menu inferior fixo não cobrir o fim do conteúdo (no desktop não há menu inferior) */}
            {/* data-page-exit: afunda/desfoca quando a transição de página cobre a tela; a sidebar fica parada */}
            {/* lg:min-w-0: sem isso a coluna cresce até a largura dos carrosséis e a página rola de lado.
                lg:overflow-x-clip corta sem criar contêiner de rolagem; fica só aqui, porque overflow num
                ancestral da sidebar desligaria o sticky (receita da Seção 16.1). A rolagem é a da janela. */}
            <div data-page-exit className="flex flex-1 flex-col lg:min-w-0 lg:overflow-x-clip">
              <PageContainer className="flex-1 pb-[90px] lg:pb-6">
                <AppHeader />
                {children}
              </PageContainer>
            </div>
          </div>
          <BottomNav />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <SkillHubLogo size={48} className="animate-pulse" />
        </div>
      )}
    </div>
  );
}
