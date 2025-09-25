import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/services/api";
import { FormData } from "@/schemas/registerFormSchema";

type BackendError = { message: string };
type BackendResponse = { id: string; fullName: string }; // exemplo de resposta

export function useRegisterCliente() {
  return useMutation<BackendResponse, AxiosError<BackendError>, FormData>({
    mutationFn: async (data: FormData) => {
      const response = await api.post("/api/auth/register/cliente", data);
      return response.data;
    },
  });
}