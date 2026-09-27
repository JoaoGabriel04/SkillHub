"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/Button1";
import { AuthTitle, FormAlert, LineInput } from "@/components/auth/auth-ui";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { api, getApiErrorMessage } from "@/lib/api";
import { fieldErrors, loginSchema } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

export function LoginForm({ oauthError, notice }: { oauthError: string | null; notice: string | null }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(oauthError);
  const [submitting, setSubmitting] = useState(false);

  // já logado → não faz sentido ficar no login
  useEffect(() => {
    if (status === "authenticated") router.replace("/inicio");
  }, [status, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setSubmitting(true);
    try {
      const { data } = await api.post<{ user: User; accessToken: string }>("/auth/login", {
        ...parsed.data,
        remember,
      });
      setSession(data.accessToken, data.user);
      router.replace(data.user.profileComplete ? "/inicio" : "/cadastro?completar=1");
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center pt-6 pb-10">
      <SkillHubLogo size={65} />
      <AuthTitle className="mt-[48px]">Entre agora com sua conta</AuthTitle>

      <form onSubmit={handleSubmit} noValidate className="mt-[69px] flex w-full max-w-[318px] flex-col">
        <LineInput
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((errs) => ({ ...errs, email: "" }));
          }}
          error={errors.email}
          icon={<FontAwesomeIcon icon={faUser} className="text-[17px]" />}
        />
        <LineInput
          type="password"
          placeholder="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((errs) => ({ ...errs, password: "" }));
          }}
          error={errors.password}
          icon={<FontAwesomeIcon icon={faLock} className="text-[17px]" />}
          className="mt-[43px]"
        />

        <div className="mt-[10px] flex items-center justify-between text-[12px] text-[#8a8a8a]">
          <label className="flex cursor-pointer items-center gap-[6px]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[10px] cursor-pointer appearance-none border border-[#8a8a8a] checked:border-accent checked:bg-accent"
            />
            Lembre de mim
          </label>
          <Link
            href={email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : "/esqueci-senha"}
            className="hover:text-white"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <div className="mt-[17px] min-h-[20px]">
          {formError ? (
            <FormAlert>{formError}</FormAlert>
          ) : (
            notice && (
              <p role="status" className="text-center font-jersey-15 text-[15px] text-[#b3b3b3]">
                {notice}
              </p>
            )
          )}
        </div>

        <Button1 type="submit" size="lg" disabled={submitting} className="mx-auto mt-[12px]">
          {submitting ? "Entrando..." : "Entrar"}
        </Button1>
      </form>

      <p className="mt-[43px] text-[17px] text-[#8f8f8f]">Tente também:</p>
      <div className="mt-[53px]">
        <SocialButtons />
      </div>

      <p className="mt-[48px] text-[15px] text-[#8a8a8a]">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-accent hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
