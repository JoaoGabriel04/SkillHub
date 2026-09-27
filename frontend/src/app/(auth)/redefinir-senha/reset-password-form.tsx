"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faLinkSlash, faLock } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/Button1";
import { AuthTitle, FormAlert, LineInput } from "@/components/auth/auth-ui";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { api, getApiErrorMessage } from "@/lib/api";
import { fieldErrors, resetPasswordSchema } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";

type LinkState = { status: "checking" } | { status: "valid" } | { status: "invalid"; message: string };

const MISSING_TOKEN = "Este link está incompleto. Abra o link do e-mail de novo ou peça um novo.";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [link, setLink] = useState<LinkState>(token ? { status: "checking" } : { status: "invalid", message: MISSING_TOKEN });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // avisa já ao abrir se o link expirou ou foi usado, antes de a pessoa digitar a senha
  useEffect(() => {
    if (!token) return;
    api
      .post("/auth/reset-password/check", { token })
      .then(() => setLink({ status: "valid" }))
      .catch((err) => setLink({ status: "invalid", message: getApiErrorMessage(err, "Link inválido ou expirado.") }));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, ...parsed.data });
      // o backend encerrou as sessões antigas; descarta também a desta aba, se houver
      useAuthStore.getState().clear();
      router.replace("/login?senha=redefinida");
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Não foi possível redefinir a senha."));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center pt-6 pb-10">
      <SkillHubLogo size={65} />
      <AuthTitle className="mt-[48px]">Crie uma nova senha</AuthTitle>

      {link.status === "checking" && (
        <FontAwesomeIcon icon={faCircleNotch} spin aria-label="Verificando o link" className="mt-[69px] text-[28px] text-[#8a8a8a]" />
      )}

      {link.status === "invalid" && (
        <div className="mt-[48px] flex w-full max-w-[318px] flex-col items-center text-center">
          <FontAwesomeIcon icon={faLinkSlash} className="text-[40px] text-[#ff6b6b]" />
          <p role="alert" className="mt-6 text-[18px] leading-snug text-white">
            {link.message}
          </p>
          <Link href="/esqueci-senha" className="mt-6 text-[16px] text-accent hover:underline">
            Pedir um novo link
          </Link>
        </div>
      )}

      {link.status === "valid" && (
        <form onSubmit={handleSubmit} noValidate className="mt-[69px] flex w-full max-w-[318px] flex-col">
          <LineInput
            type="password"
            placeholder="Nova senha"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((errs) => ({ ...errs, password: "" }));
            }}
            error={errors.password}
            icon={<FontAwesomeIcon icon={faLock} className="text-[17px]" />}
          />
          <LineInput
            type="password"
            placeholder="Confirmar nova senha"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((errs) => ({ ...errs, confirmPassword: "" }));
            }}
            error={errors.confirmPassword}
            icon={<FontAwesomeIcon icon={faLock} className="text-[17px]" />}
            className="mt-[43px]"
          />

          <div className="mt-[17px] min-h-[20px]">
            <FormAlert>{formError}</FormAlert>
          </div>

          <Button1 type="submit" size="lg" disabled={submitting} className="mx-auto mt-[12px]">
            {submitting ? "Salvando..." : "Salvar nova senha"}
          </Button1>
        </form>
      )}

      <Link href="/login" className="mt-[48px] text-[15px] text-accent hover:underline">
        Voltar para o login
      </Link>
    </div>
  );
}
