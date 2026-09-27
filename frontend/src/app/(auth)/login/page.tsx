import { LoginForm } from "./login-form";

const OAUTH_ERRORS: Record<string, string> = {
  google_falhou: "Não foi possível entrar com o Google. Tente novamente.",
  discord_falhou: "Não foi possível entrar com o Discord. Tente novamente.",
};

// designs/Login.png
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro, conta, senha } = await searchParams;
  const oauthError = typeof erro === "string" ? (OAUTH_ERRORS[erro] ?? null) : null;
  const notice =
    conta === "excluida"
      ? "Sua conta foi excluída."
      : senha === "redefinida"
        ? "Senha redefinida. Entre com a nova senha."
        : null;
  return <LoginForm oauthError={oauthError} notice={notice} />;
}
