import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/services/api";
import { FormData } from "@/schemas/registerFormSchema";

// tipa o formato de erro que sua API retorna
type BackendError = { message: string };

// tipa o formato de sucesso (exemplo, ajuste pro que sua rota retorna)
type BackendResponse = { id: string; fullName: string };

export function useRegisterColaborador() {
  return useMutation<BackendResponse, AxiosError<BackendError>, FormData>({
    mutationFn: async (data: FormData) => {
      const response = await api.post("/api/auth/register/colaborador", data);
      return response.data;
    },
  });
}