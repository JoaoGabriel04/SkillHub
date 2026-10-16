import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Transacao } from "@/types/credito";
import type { User } from "@/types/user";

// Créditos (Fase 17C)

// O saldo é Int no banco (1 crédito = 1 unidade); a tela só formata com duas casas
export const formatCredits = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export type PaginaExtrato = { transacoes: Transacao[]; nextCursor: string | null };

export const getExtrato = (cursor?: string) =>
  api.get<PaginaExtrato>("/creditos/extrato", { params: { limit: 20, ...(cursor && { cursor }) } }).then((r) => r.data);

// O saldo vive no usuário do useAuthStore (sidebar e CreditsChip): depois de aceitar, concluir ou cancelar,
// relê o usuário pelo mesmo caminho do SessionProvider (/auth/me). Não existe um segundo estado de saldo.
export async function atualizarUsuario() {
  const { data } = await api.get<{ user: User }>("/auth/me");
  useAuthStore.getState().setUser(data.user);
}
