// Contato com o vendedor por link do WhatsApp (Fase 18A, Seção 3.5). O telefone do perfil é privado:
// só sai daqui, dentro do link, e só pela rota GET /produtos/:id/contato.

// Só os dígitos; com 10 ou 11 (DDD + número), o 55 do Brasil na frente. Já com 55 (12 ou 13 dígitos), como está.
// Qualquer outro formato conta como "sem telefone", para não gerar um link quebrado.
export function normalizarTelefone(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

export const linkWhatsapp = (telefone: string, nomeProduto: string) =>
  `https://wa.me/${telefone}?text=${encodeURIComponent(`Olá, vi seu produto ${nomeProduto} no SkillHub e tenho interesse.`)}`;
