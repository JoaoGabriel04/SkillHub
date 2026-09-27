"use client";

import { useEffect, type ReactNode } from "react";
import { api, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

// Na primeira carga tenta recuperar a sessão pelo cookie refresh_token.
export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { status, accessToken, setUser, clear } = useAuthStore.getState();
    if (status !== "loading") return;

    (async () => {
      try {
        if (!accessToken) await refreshAccessToken();
        const { data } = await api.get<{ user: User }>("/auth/me");
        setUser(data.user);
      } catch {
        // login/cadastro podem ter criado a sessão enquanto isso — não derrubar
        if (useAuthStore.getState().status === "loading") clear();
      }
    })();
  }, []);

  return children;
}
