import { z } from "zod";

// Espelha backend/src/modules/auth/auth.schema.ts — mesmas regras, mensagens pro usuário.

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cepRegex = /^\d{5}-\d{3}$/;

export const GENEROS = ["Masculino", "Feminino", "Outro", "Prefiro não informar"] as const;
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mínimo de 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" });

const endereco = {
  phone: z.string().min(14, "Telefone inválido"),
  cep: z.string().regex(cepRegex, "CEP inválido"),
  rua: z.string().trim().min(2, "Informe a rua"),
  numero: z.string().trim().min(1, "Informe o nº ou S/N").max(10, "Máximo de 10 caracteres"),
  complemento: z.string().trim().max(100, "Máximo de 100 caracteres"),
  bairro: z.string().trim().min(2, "Informe o bairro"),
  cidade: z.string().min(2, "Informe a cidade"),
  estado: z.enum(UFS, "Selecione a UF"),
};

export const pessoaFisicaSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo"),
  cpf: z.string().regex(cpfRegex, "CPF inválido"),
  dataNascimento: z.string().min(1, "Informe a data de nascimento"),
  genero: z.enum(GENEROS, "Selecione o gênero"),
  ...endereco,
});

export const empresaSchema = z.object({
  fullName: z.string().min(2, "Informe a razão social ou nome fantasia"),
  cnpj: z.string().regex(cnpjRegex, "CNPJ inválido"),
  ...endereco,
});

export const contaSchema = z
  .object({
    email: z.email("E-mail inválido"),
    confirmEmail: z.string(),
    password: z.string().min(6, "Mínimo de 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.email === d.confirmEmail, { path: ["confirmEmail"], message: "Os e-mails não coincidem" })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" });

export const competenciasSchema = z.object({
  competencias: z.array(z.string()).min(1, "Informe ao menos uma competência"),
});

// { campo: "primeira mensagem" } a partir de um erro do Zod
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    out[key] ??= issue.message;
  }
  return out;
}
