"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/Button1";
import { AuthTitle, FormAlert, LineInput } from "@/components/auth/auth-ui";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { TransitionLink, useEntered, usePageTransition } from "@/components/motion/page-transition";
import { gsap, prefersReducedMotion, SCRAMBLE_CHARS, SplitText, useGSAP } from "@/lib/gsap";
import { api, getApiErrorMessage } from "@/lib/api";
import { fieldErrors, loginSchema } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

export function LoginForm({ oauthError, notice }: { oauthError: string | null; notice: string | null }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const { navigate } = usePageTransition();
  const entered = useEntered();
  const root = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);
  const loggingIn = useRef(false); // o login já navega com transição; o redirect abaixo é só pra quem chega logado

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(oauthError);
  const [submitting, setSubmitting] = useState(false);

  // já logado → não faz sentido ficar no login
  useEffect(() => {
    if (status === "authenticated" && !loggingIn.current) router.replace("/inicio");
  }, [status, router]);

  // Entrada: logo cai girando, título sobe letra a letra, linhas dos campos se desenham,
  // botão abre do centro, "Tente também" decodifica e os botões sociais saltam.
  useGSAP(
    () => {
      if (!entered || prefersReducedMotion()) return;
      const split = SplitText.create("[data-title]", { type: "words,chars" });
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-logo]", { autoAlpha: 0, y: -60, rotation: -120, scale: 0.4, duration: 1, ease: "back.out(1.8)" })
        .from(
          split.chars,
          {
            autoAlpha: 0,
            yPercent: 120,
            rotationX: -90,
            transformOrigin: "50% 100%",
            duration: 0.6,
            ease: "back.out(2)",
            stagger: 0.02,
          },
          "<0.25"
        )
        .from("[data-field]", { autoAlpha: 0, y: 26, duration: 0.6, stagger: 0.12 }, "<0.3")
        .from(
          "[data-line]",
          { scaleX: 0, transformOrigin: "0% 50%", duration: 0.8, ease: "expo.out", stagger: 0.12 },
          "<0.1"
        )
        .from("[data-row]", { autoAlpha: 0, y: 10, duration: 0.5 }, "<0.3")
        .fromTo(
          "[data-cta]",
          { clipPath: "inset(0% 50% 0% 50%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power4.inOut", clearProps: "clipPath" },
          "<0.1"
        )
        .fromTo(
          "[data-try]",
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.9,
            ease: "none",
            scrambleText: { text: "Tente também:", chars: SCRAMBLE_CHARS, revealDelay: 0.25 },
          },
          "<0.3"
        )
        .from(
          "[data-social]",
          { autoAlpha: 0, scale: 0, rotation: -25, y: 30, duration: 0.8, ease: "back.out(2.6)", stagger: 0.12 },
          "<0.2"
        )
        .from("[data-footer]", { autoAlpha: 0, y: 14, duration: 0.6 }, "<0.3");
    },
    { scope: root, dependencies: [entered] }
  );

  // credencial errada: o formulário inteiro "nega com a cabeça" e a mensagem decodifica
  useGSAP(
    () => {
      if (!formError || !entered || prefersReducedMotion()) return;
      gsap.fromTo("[data-form]", { x: 0 }, { x: 12, duration: 0.6, ease: "shake", clearProps: "x" });
      gsap.to("[data-alert] [role=alert]", {
        duration: 0.6,
        ease: "none",
        scrambleText: { text: formError, chars: SCRAMBLE_CHARS, revealDelay: 0.15 },
      });
    },
    { scope: root, dependencies: [formError] }
  );

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
      loggingIn.current = true;
      setSession(data.accessToken, data.user);
      navigate(data.user.profileComplete ? "/inicio" : "/cadastro?completar=1", {
        replace: true,
        origin: submitRef.current,
      });
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div ref={root} className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center pt-6 pb-10">
      <div data-logo>
        <SkillHubLogo size={65} />
      </div>
      <AuthTitle data-title className="mt-[48px]">
        Entre agora com sua conta
      </AuthTitle>

      <form data-form onSubmit={handleSubmit} noValidate className="mt-[69px] flex w-full max-w-[318px] flex-col">
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

        <div data-row className="mt-[10px] flex items-center justify-between text-[12px] text-muted-foreground">
          <label className="flex cursor-pointer items-center gap-[6px]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[10px] cursor-pointer appearance-none border border-field checked:border-accent checked:bg-accent"
            />
            Lembre de mim
          </label>
          <TransitionLink
            href={email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : "/esqueci-senha"}
            className="hover:text-foreground"
          >
            Esqueceu a senha?
          </TransitionLink>
        </div>

        <div data-alert className="mt-[17px] min-h-[20px]">
          {formError ? (
            <FormAlert>{formError}</FormAlert>
          ) : (
            notice && (
              <p role="status" className="text-center font-jersey-15 text-[15px] text-foreground-secondary">
                {notice}
              </p>
            )
          )}
        </div>

        <div ref={submitRef} data-cta className="mx-auto mt-[12px]">
          <Button1 type="submit" size="lg" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button1>
        </div>
      </form>

      <p data-try className="mt-[43px] text-[17px] text-muted-foreground">
        Tente também:
      </p>
      <div className="mt-[53px]">
        <SocialButtons />
      </div>

      <p data-footer className="mt-[48px] text-[15px] text-muted-foreground">
        Não tem conta?{" "}
        <TransitionLink href="/cadastro" className="text-accent-text hover:underline">
          Cadastre-se
        </TransitionLink>
      </p>
    </div>
  );
}
