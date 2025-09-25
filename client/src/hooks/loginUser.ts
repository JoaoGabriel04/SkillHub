import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/services/api";
import { FormData } from "@/schemas/loginSchema";
import { setAuthToken } from "@/services/api"; // ajuste para onde você guarda o token

type BackendError = { message: string };
type BackendResponse = { id: string; email: string; accessToken: string }; // acess token incluído

export function useLoginCliente() {
  return useMutation<BackendResponse, AxiosError<BackendError>, FormData>({
    mutationFn: async (data: FormData) => {
      const response = await api.post("/api/auth/login", data, {
        withCredentials: true, // se você usa cookies do backend
      });
      return response.data;
    },
    onSuccess: (data) => {
      // salva o token no client
      setAuthToken(data.accessToken);
    },
  });
}