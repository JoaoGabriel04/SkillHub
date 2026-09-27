"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/Button1";
import { AuthTitle, FormAlert, LineInput } from "@/components/auth/auth-ui";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { api, getApiErrorMessage } from "@/lib/api";
import { fieldErrors, forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);
    setError(undefined);

    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", parsed.data);
      setSentTo(parsed.data.email);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Não foi possível enviar o link. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center pt-6 pb-10">
      <SkillHubLogo size={65} />
      <AuthTitle className="mt-[48px]">Esqueceu a senha?</AuthTitle>

      {sentTo ? (
        // A mensagem não confirma se o e-mail tem conta (o backend também não revela)
        <div role="status" className="mt-[48px] flex w-full max-w-[318px] flex-col items-center text-center">
          <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="text-[44px] text-accent" />
          <p className="mt-6 text-[18px] leading-snug text-white">
            Se houver uma conta com <span className="break-all text-accent">{sentTo}</span>, enviamos um link para
            criar uma nova senha.
          </p>
          <p className="mt-3 text-[15px] leading-snug text-[#8f8f8f]">
            O link vale por 30 minutos. Não chegou? Confira a caixa de spam.
          </p>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="mt-6 text-[15px] text-[#8a8a8a] hover:text-white"
          >
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-[24px] flex w-full max-w-[318px] flex-col">
          <p className="text-center text-[16px] leading-snug text-[#8f8f8f]">
            Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
          </p>
          <LineInput
            type="email"
            placeholder="Email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(undefined);
            }}
            error={error}
            icon={<FontAwesomeIcon icon={faEnvelope} className="text-[17px]" />}
            className="mt-[43px]"
          />

          <div className="mt-[17px] min-h-[20px]">
            <FormAlert>{formError}</FormAlert>
          </div>

          <Button1 type="submit" size="lg" disabled={submitting} className="mx-auto mt-[12px]">
            {submitting ? "Enviando..." : "Enviar link"}
          </Button1>
        </form>
      )}

      <Link href="/login" className="mt-[48px] text-[15px] text-accent hover:underline">
        Voltar para o login
      </Link>
    </div>
  );
}
