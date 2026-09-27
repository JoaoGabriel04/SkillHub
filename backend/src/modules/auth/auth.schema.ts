import { z } from "zod";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export const enderecoFields = {
  cep: z.string().regex(cepRegex, "CEP deve estar no formato 00000-000"),
  rua: z.string().min(2, "Rua obrigatória"),
  numero: z.string().trim().min(1, "Número obrigatório (use S/N se não houver)").max(10),
  // "" do formulário vira ausente → fica null no banco
  complemento: z.string().trim().max(100).optional().transform((v) => v || undefined),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2),
  estado: z.string().length(2, "UF deve ter 2 letras"),
};

export const registerSchema = z.object({
  fullName: z.string().min(3, "Nome completo obrigatório"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().regex(cpfRegex, "CPF deve estar no formato 000.000.000-00"),
  dataNascimento: z.coerce.date(),
  genero: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"]),
  ...enderecoFields,
  email: z.string().email(),
  confirmEmail: z.string().email(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
});

export const registerEmpresaSchema = z.object({
  fullName: z.string().min(2, "Razão social / nome fantasia obrigatório"),
  cnpj: z.string().regex(cnpjRegex, "CNPJ deve estar no formato 00.000.000/0000-00"),
  phone: z.string().min(10, "Telefone inválido"),
  ...enderecoFields,
  email: z.string().email(),
  confirmEmail: z.string().email(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterEmpresaInput = z.infer<typeof registerEmpresaSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
});

export const resetTokenSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
});

export const resetPasswordSchema = resetTokenSchema
  .extend({
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().default(true),
});

// Usado só na tela de finalização pós-OAuth — o perfil ainda não foi escolhido,
// então o formato exigido dos campos muda conforme a opção selecionada.

const pessoaFisicaFields = {
  fullName: z.string().min(3, "Nome completo obrigatório"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().regex(cpfRegex, "CPF deve estar no formato 000.000.000-00"),
  dataNascimento: z.coerce.date(),
  genero: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"]),
  ...enderecoFields,
};

export const completeProfileSchema = z.discriminatedUnion("perfil", [
  z.object({ perfil: z.literal("Cliente"), ...pessoaFisicaFields }),
  z.object({
    perfil: z.literal("Colaborador"),
    ...pessoaFisicaFields,
    competencias: z.array(z.string()).min(1, "Informe ao menos uma competência"),
  }),
  z.object({
    perfil: z.literal("Empresa"),
    fullName: z.string().min(2, "Razão social / nome fantasia obrigatório"),
    cnpj: z.string().regex(cnpjRegex, "CNPJ deve estar no formato 00.000.000/0000-00"),
    phone: z.string().min(10, "Telefone inválido"),
    ...enderecoFields,
  }),
]);

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
