import {create} from "zustand";
import api from "@/services/api";
import {toast} from "react-toastify"
import { AxiosError } from "axios";

type UserStore = {
  _id: string;
  fullName: string;
  phone: string;
  cpf: string;
  dataNascimento: string;
  genero: string;
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  perfil: string;
  urlPhoto?: string;
  competencias?: string[];
  curriculo?: string;
  loading: boolean;
  error: string | null;

  fetchUser: ()=> Promise<void>;
  setUser: (user: Partial<UserStore>) => void;
}

export const useUserStore = create<UserStore>((set)=>({
  _id: "",
  fullName: "",
  phone: "",
  cpf: "",
  dataNascimento: "",
  genero: "",
  cidade: "",
  estado: "",
  cep: "",
  email: "",
  perfil: "",
  competencias: [],
  loading: false,
  error: null,

  fetchUser: async () => {
    set({ loading: true, error: null});
    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        if (!token) {
          set({ loading: false, error: "Token não encontrado" });
          return;
        }
      }
      const res = await api.get("/api/user");

      set({
        _id: res.data._id,
        fullName: res.data.fullName,
        phone: res.data.phone,
        cpf: res.data.cpf,
        dataNascimento: res.data.dataNascimento,
        genero: res.data.genero,
        cidade: res.data.cidade,
        estado: res.data.estado,
        cep: res.data.cep,
        email: res.data.email,
        perfil: res.data.perfil,
        competencias: res.data.competencias,
        loading: false,
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error("❌ Erro na requisição:", err);
        const message = err.response?.data?.message || "Erro ao buscar usuário";
        toast.error(message);
        set({
          error: message,
          loading: false,
        });
      } else {
        console.error("❌ Erro inesperado:", err);
        toast.error("Erro inesperado ao buscar usuário");
        set({
          error: "Erro inesperado ao buscar usuário",
          loading: false,
        });
      }
    }
  },

  setUser: (user) => set(user),
}))