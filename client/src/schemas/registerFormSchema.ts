import { z } from "zod";

export const registerFormSchema = z.object({
  fullName: z.string().min(1, "O nome completo é obrigatório."),
  phone: z.string().min(1, "O telefone é obrigatório."),
  cpf: z
    .string()
    .min(1, "O CPF é obrigatório.")
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Formato de CPF inválido."),
  dataNascimento: z.string().min(1, "A data de nascimento é obrigatória."),
  genero: z.enum(["masc", "fem", "naosei"], {
    message: "O gênero é obrigatório.",
  }),
  cidade: z.string().min(1, "A cidade é obrigatória."),
  estado: z.string().min(1, "O estado é obrigatório."),
  cep: z
    .string()
    .min(1, "O CEP é obrigatório.")
    .regex(/^\d{5}-\d{3}$/, "Formato de CEP inválido."),
  email: z.email("Email inválido").min(1, "O email é obrigatório."),
  confirmEmail: z.string().min(1, "A confirmação de email é obrigatória."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória."),
  competencias: z.array(z.string()).optional(),
});

export type FormData = z.infer<typeof registerFormSchema>;
