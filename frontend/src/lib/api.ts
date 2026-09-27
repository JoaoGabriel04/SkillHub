import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // envia o cookie refresh_token
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rotas em que um 401 é resposta final, não token expirado
const NO_REFRESH_ROUTES = ["/auth/login", "/auth/refresh", "/auth/logout"];

// Um único refresh em andamento, compartilhado por todas as requisições que tomarem 401 juntas
let refreshing: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  refreshing ??= axios
    .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then(({ data }) => {
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthRoute = NO_REFRESH_ROUTES.some((route) => config?.url?.startsWith(route));

    if (error.response?.status !== 401 || !config || config._retried || isAuthRoute) {
      throw error;
    }

    config._retried = true;
    try {
      const token = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch {
      useAuthStore.getState().clear();
      throw error;
    }
  }
);

// Mensagem do backend ({ error: "..." }) ou uma genérica
export function getApiErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (axios.isAxiosError<{ error?: string }>(err)) return err.response?.data?.error ?? fallback;
  return fallback;
}
