import { z } from "zod";
import { enderecoFields } from "../auth/auth.schema.js";

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(3, "Nome completo obrigatório"),
    phone: z.string().min(10, "Telefone inválido"),
    genero: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"]),
    ...enderecoFields,
    competencias: z.array(z.string()),
  })
  .partial();

// contas só com OAuth não têm senha: o campo é exigido no service conforme o usuário
export const deleteAccountSchema = z.object({ password: z.string().optional() });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
