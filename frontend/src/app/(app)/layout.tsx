"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { PageContainer } from "@/components/app/page-container";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { useAuthStore } from "@/stores/auth-store";

// Área logada: exige sessão e perfil completo.
// Fundo: #101010 chapado (New Início.png); no Perfil, degradê vertical #101010 → #343434 (Perfil.png).
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
            ? "fixed inset-0 -z-10 bg-[linear-gradient(180deg,#101010_0%,#343434_100%)]"
            : "fixed inset-0 -z-10 bg-[#101010]"
        }
      />
      {ready ? (
        <>
          {/* pb: espaço pro menu inferior fixo não cobrir o fim do conteúdo */}
          <PageContainer className="flex-1 pb-[90px]">
            <AppHeader />
            {children}
          </PageContainer>
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
