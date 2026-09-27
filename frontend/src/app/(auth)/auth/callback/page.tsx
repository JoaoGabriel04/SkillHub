import { OAuthCallback } from "./oauth-callback";

// Destino do redirect do backend após Google/Discord:
// ?token=<accessToken>[&setup=1]  ou  ?error=google_falhou|discord_falhou
export default async function CallbackPage({ searchParams }: PageProps<"/auth/callback">) {
  const { token, setup, error } = await searchParams;
  return (
    <OAuthCallback
      token={typeof token === "string" ? token : null}
      needsSetup={setup === "1"}
      error={typeof error === "string" ? error : null}
    />
  );
}
