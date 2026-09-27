"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

type Props = { token: string | null; needsSetup: boolean; error: string | null };

export function OAuthCallback({ token, needsSetup, error }: Props) {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (error || !token) {
      router.replace(`/login?erro=${error ?? "google_falhou"}`);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{ user: User }>("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        useAuthStore.getState().setSession(token, data.user);
        // replace: o token sai da URL e do histórico
        router.replace(needsSetup || !data.user.profileComplete ? "/cadastro?completar=1" : "/inicio");
      } catch {
        router.replace("/login?erro=google_falhou");
      }
    })();
  }, [token, needsSetup, error, router]);

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-6">
      <SkillHubLogo size={65} className="animate-pulse" />
      <p className="text-[17px] text-[#8a8a8a]">Entrando...</p>
    </div>
  );
}
