import { usePageTransition } from "@/components/motion/page-transition";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// Sair: encerra a sessão no backend (falha de rede não impede) e volta ao login pela transição de página.
// A sessão local só é limpa com a tela coberta: antes disso o guard do layout logado já mandaria pro /login sem animação.
// Usado pelas Configurações e pela Sidebar; origin = elemento clicado (a colmeia nasce dele).
export function useLogout() {
  const { navigate } = usePageTransition();
  return async function sair(origin?: Element | null) {
    await api.post("/auth/logout").catch(() => {});
    navigate("/login", { replace: true, origin, onCovered: () => useAuthStore.getState().clear() });
  };
}
