import { ForgotPasswordForm } from "./forgot-password-form";

// Sem mockup: segue o visual do Login (designs/Login.png). ?email= vem preenchido pelo link do login.
export default async function EsqueciSenhaPage({ searchParams }: PageProps<"/esqueci-senha">) {
  const { email } = await searchParams;
  return <ForgotPasswordForm initialEmail={typeof email === "string" ? email : ""} />;
}
