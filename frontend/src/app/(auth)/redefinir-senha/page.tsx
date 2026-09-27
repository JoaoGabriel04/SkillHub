import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

// o token vai na URL: não repassar a URL como Referer para nenhum recurso externo
export const metadata: Metadata = { referrer: "no-referrer" };

// Link do e-mail de recuperação: /redefinir-senha?token=...
// Sem mockup: segue o visual do Login (designs/Login.png).
export default async function RedefinirSenhaPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : null} />;
}
