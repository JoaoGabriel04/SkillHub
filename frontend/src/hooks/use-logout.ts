import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// Sair: encerra a sessão no backend (falha de rede não impede), limpa a sessão local e volta ao login.
// Usado pelas Configurações e pela Sidebar.
export function useLogout() {
  const router = useRouter();
  return async function sair() {
    await api.post("/auth/logout").catch(() => {});
    useAuthStore.getState().clear();
    router.replace("/login");
  };
}
