import {z} from "zod";

export const registerOrgSchema = z.object({
  nomeEmpresa: z.string().min(1, "O nome da empresa é obrigatório."),
  cnpj: z
    .string()
    .min(1, "O CNPJ é obrigatório.")
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "Formato de CNPJ inválido."),
  contato: z.string().min(1, "O contato é obrigatório."),
  setor: z.string().min(1, "O setor é obrigatório."),
  cidade: z.string().min(1, "A cidade é obrigatória."),
  estado: z.string().min(1, "O estado é obrigatório."),
  cep: z
    .string()
    .min(1, "O CEP é obrigatório.")
    .regex(/^\d{5}-\d{3}$/, "Formato de CEP inválido."),
  website: z.url("URL inválida").optional().or(z.literal("")),
  redesSociais: z.string().optional().or(z.literal("")),
  descricao: z.string().min(1, "A descrição é obrigatória."),
  email: z.email("Email inválido").min(1, "O email é obrigatório."),
  confirmEmail: z.string().min(1, "A confirmação de email é obrigatória."),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória."),
})

export type OrgFormData = z.infer<typeof registerOrgSchema>;