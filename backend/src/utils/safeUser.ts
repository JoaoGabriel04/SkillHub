import type { User } from "@prisma/client";

// Resposta pública do usuário: nunca expõe o hash, só se a conta tem senha
// (contas só com Google/Discord não têm; o front usa isso para pedir ou não a senha).
// passwordChangedAt também fica de fora: é detalhe interno da sessão, o front não usa.
export function toSafeUser({ password, passwordChangedAt: _changed, ...user }: User) {
  return { ...user, hasPassword: password !== null };
}
