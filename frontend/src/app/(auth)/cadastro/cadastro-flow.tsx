"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faBuilding, faChevronLeft, faCircleNotch, faUsers } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/Button1";
import { AuthTitle, FormAlert, LineInput, LineSelect } from "@/components/auth/auth-ui";
import { ProfileCard } from "@/components/auth/profile-card";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { GlassCard } from "@/components/ui/glass-card";
import { api, getApiErrorMessage } from "@/lib/api";
import { CepNotFoundError, fetchCep } from "@/lib/cep";
import { maskCep, maskCnpj, maskCpf, maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";
import {
  competenciasSchema,
  contaSchema,
  empresaSchema,
  fieldErrors,
  GENEROS,
  pessoaFisicaSchema,
  UFS,
} from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { Perfil, User } from "@/types/user";

// Empresa: backend pronto (/auth/register/empresa), mas o perfil ainda não está liberado no produto
const PERFIS: { value: Perfil; icon: IconDefinition; emProducao?: boolean }[] = [
  { value: "Cliente", icon: faUsers },
  { value: "Colaborador", icon: faBriefcase },
  { value: "Empresa", icon: faBuilding, emProducao: true },
];

const REGISTER_ROUTE: Record<Perfil, string> = {
  Cliente: "/auth/register/cliente",
  Colaborador: "/auth/register/colaborador",
  Empresa: "/auth/register/empresa",
};

const EMPTY_FORM = {
  fullName: "", cpf: "", cnpj: "", dataNascimento: "", genero: "", phone: "", cep: "", rua: "", numero: "", complemento: "", bairro: "",
  cidade: "", estado: "", competencias: "", email: "", confirmEmail: "", password: "", confirmPassword: "",
};
type FormValues = typeof EMPTY_FORM;

const MASKS: Partial<Record<keyof FormValues, (v: string) => string>> = {
  cpf: maskCpf,
  cnpj: maskCnpj,
  cep: maskCep,
  phone: maskPhone,
};

export function CadastroFlow({ completar }: { completar: boolean }) {
  const router = useRouter();
  const { status, user, setSession, setUser } = useAuthStore();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [step, setStep] = useState<"perfil" | "dados">("perfil");
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cepLookedUp, setCepLookedUp] = useState<string | null>(null); // último CEP já consultado

  // completar exige estar logado e com perfil pendente; cadastro normal exige estar deslogado
  useEffect(() => {
    if (status === "loading") return;
    if (completar && status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && (!completar || user?.profileComplete)) router.replace("/inicio");
  }, [completar, status, user, router]);

  const field = (name: keyof FormValues) => ({
    // ?? "": estado antigo preservado pelo hot reload pode não ter campos novos
    value: values[name] ?? "",
    error: errors[name],
    onChange: (e: { target: { value: string } }) => {
      const mask = MASKS[name];
      const value = mask ? mask(e.target.value) : e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      if (errors[name]) setErrors((errs) => ({ ...errs, [name]: "" }));
    },
  });

  // CEP completo → BrasilAPI preenche rua, bairro, cidade e UF (continuam editáveis).
  // Rua/bairro vazios na resposta (CEP único de cidade pequena) não apagam o que o usuário digitou.
  // Mudou o CEP no meio da consulta → a anterior é cancelada pelo cleanup.
  // Falha de rede não bloqueia: o usuário só preenche na mão.
  const cepDigits = values.cep.replace(/\D/g, "");
  const cepLoading = cepDigits.length === 8 && cepLookedUp !== cepDigits;

  useEffect(() => {
    if (cepDigits.length !== 8) return;
    const controller = new AbortController();
    fetchCep(cepDigits, controller.signal)
      .then(({ rua, bairro, cidade, estado }) => {
        setValues((v) => ({ ...v, rua: rua || v.rua, bairro: bairro || v.bairro, cidade, estado }));
        setErrors((errs) => ({
          ...errs,
          ...(rua && { rua: "" }),
          ...(bairro && { bairro: "" }),
          cidade: "",
          estado: "",
        }));
      })
      .catch((err) => {
        if (err instanceof CepNotFoundError) setErrors((errs) => ({ ...errs, cep: "CEP não encontrado" }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCepLookedUp(cepDigits);
      });
    return () => controller.abort();
  }, [cepDigits]);

  function goToDados() {
    // nome vindo do Google/Discord já preenche o campo
    if (completar && user?.fullName) setValues((v) => (v.fullName ? v : { ...v, fullName: user.fullName }));
    setStep("dados");
  }

  function validate(): Record<string, unknown> | null {
    const isEmpresa = perfil === "Empresa";
    const schemas = [
      isEmpresa ? empresaSchema : pessoaFisicaSchema,
      ...(completar ? [] : [contaSchema]),
      ...(completar && perfil === "Colaborador" ? [competenciasSchema] : []),
    ];
    const input = {
      ...values,
      competencias: values.competencias.split(",").map((c) => c.trim()).filter(Boolean),
    };

    let data: Record<string, unknown> = {};
    let errs: Record<string, string> = {};
    for (const schema of schemas) {
      const result = schema.safeParse(input);
      if (result.success) data = { ...data, ...result.data };
      else errs = { ...errs, ...fieldErrors(result.error) };
    }
    setErrors(errs);
    return Object.keys(errs).length ? null : data;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!perfil) return;
    setFormError(null);

    const data = validate();
    if (!data) return;

    setSubmitting(true);
    try {
      if (completar) {
        const res = await api.patch<{ user: User }>("/user/complete-profile", { perfil, ...data });
        setUser(res.data.user);
      } else {
        const res = await api.post<{ user: User; accessToken: string }>(REGISTER_ROUTE[perfil], data);
        setSession(res.data.accessToken, res.data.user);
      }
      router.replace("/inicio");
    } catch (err) {
      // erros de validação do backend vêm com o campo: { details: [{ field, message }] }
      const details = (err as { response?: { data?: { details?: { field: string; message: string }[] } } })
        .response?.data?.details;
      if (details?.length) setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      setFormError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (step === "perfil") {
    return (
      <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col items-center pt-[17px] pb-10 md:pt-10">
        <SkillHubLogo size={65} />
        <AuthTitle className="mt-[50px] max-w-[360px] md:mt-14 md:max-w-[620px] md:text-[32px]">
          Escolha como você quer se comportar dentro do SkillHub
        </AuthTitle>

        {/* mobile: 2 + 1 como no mockup; md+: os três lado a lado */}
        <div
          role="radiogroup"
          aria-label="Perfil"
          className="mt-[118px] grid w-full max-w-[361px] grid-cols-2 gap-[11px] md:mt-16 md:max-w-[730px] md:grid-cols-3 md:gap-5"
        >
          {PERFIS.map(({ value, icon, emProducao }) => (
            <div
              key={value}
              className={cn("flex justify-center", value === "Empresa" && "col-span-2 md:col-span-1")}
            >
              <ProfileCard
                label={value}
                icon={icon}
                selected={perfil === value}
                onSelect={() => setPerfil(value)}
                disabled={emProducao}
                ribbon={emProducao ? "Em produção" : undefined}
              />
            </div>
          ))}
        </div>

        <Button1 size="lg" disabled={!perfil} handle={goToDados} className="mt-[66px] md:mt-14">
          Continuar
        </Button1>

        {!completar && (
          <p className="mt-8 text-[15px] text-[#8a8a8a] md:text-[17px]">
            Já tem conta?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
    );
  }

  const isEmpresa = perfil === "Empresa";

  // Grade de 4 colunas: no mobile quase tudo ocupa a linha inteira; a partir de md
  // os campos curtos dividem a linha (CPF | nascimento | gênero, cidade | UF...)
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center pt-[17px] pb-12 md:pt-10 md:pb-16">
      <div className="relative flex w-full justify-center">
        <button
          type="button"
          onClick={() => setStep("perfil")}
          aria-label="Voltar para a escolha de perfil"
          className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center gap-2 p-2 text-[#8a8a8a] hover:text-white"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[18px]" />
          <span className="hidden text-[17px] md:inline">Voltar</span>
        </button>
        <SkillHubLogo size={65} />
      </div>

      <AuthTitle className="mt-[40px] md:mt-10 md:text-[32px]">
        {completar ? "Complete seu cadastro" : "Crie sua conta"}
      </AuthTitle>
      <p className="mt-2 text-[17px] text-accent md:text-[19px]">{perfil}</p>

      <GlassCard className="mt-10 w-full max-w-[318px] max-md:border-0 max-md:bg-transparent max-md:shadow-none max-md:backdrop-blur-none md:max-w-none md:px-12 md:py-10">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10 md:gap-12">
          <FormSection title={isEmpresa ? "Dados da empresa" : "Dados pessoais"}>
            {isEmpresa ? (
              <>
                <LineInput
                  placeholder="Razão social ou nome fantasia"
                  autoComplete="organization"
                  className="col-span-4 md:col-span-2"
                  {...field("fullName")}
                />
                <LineInput placeholder="CNPJ" inputMode="numeric" className="col-span-4 md:col-span-2" {...field("cnpj")} />
              </>
            ) : (
              <>
                <LineInput placeholder="Nome completo" autoComplete="name" className="col-span-4" {...field("fullName")} />
                <LineInput placeholder="CPF" inputMode="numeric" className="col-span-4 md:col-span-2" {...field("cpf")} />
                <LineInput
                  type="date"
                  aria-label="Data de nascimento"
                  max={new Date().toISOString().slice(0, 10)}
                  className="col-span-2 md:col-span-1"
                  {...field("dataNascimento")}
                />
                <LineSelect placeholder="Gênero" options={GENEROS} className="col-span-2 md:col-span-1" {...field("genero")} />
              </>
            )}
            {completar && perfil === "Colaborador" && (
              <LineInput
                placeholder="Competências (separadas por vírgula)"
                className="col-span-4"
                {...field("competencias")}
              />
            )}
          </FormSection>

          <FormSection title="Contato e endereço">
            <LineInput placeholder="Telefone" type="tel" autoComplete="tel" className="col-span-4 md:col-span-2" {...field("phone")} />
            <LineInput
              placeholder="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              className="col-span-4 md:col-span-2"
              icon={cepLoading && <FontAwesomeIcon icon={faCircleNotch} spin className="text-[15px]" />}
              aria-busy={cepLoading}
              {...field("cep")}
            />
            <LineInput placeholder="Rua" autoComplete="address-line1" className="col-span-3 md:col-span-2" {...field("rua")} />
            <LineInput placeholder="Nº" aria-label="Número" maxLength={10} className="col-span-1" {...field("numero")} />
            <LineInput
              placeholder="Complemento (opcional)"
              autoComplete="address-line2"
              maxLength={100}
              className="col-span-4 md:col-span-1"
              {...field("complemento")}
            />
            <LineInput placeholder="Bairro" autoComplete="address-level3" className="col-span-4 md:col-span-2" {...field("bairro")} />
            <LineInput placeholder="Cidade" autoComplete="address-level2" className="col-span-3 md:col-span-1" {...field("cidade")} />
            <LineSelect placeholder="UF" options={UFS} className="col-span-1" {...field("estado")} />
          </FormSection>

          {!completar && (
            <FormSection title="Acesso">
              <LineInput type="email" placeholder="Email" autoComplete="email" className="col-span-4 md:col-span-2" {...field("email")} />
              <LineInput
                type="email"
                placeholder="Confirmar email"
                autoComplete="email"
                className="col-span-4 md:col-span-2"
                {...field("confirmEmail")}
              />
              <LineInput
                type="password"
                placeholder="Senha"
                autoComplete="new-password"
                className="col-span-4 md:col-span-2"
                {...field("password")}
              />
              <LineInput
                type="password"
                placeholder="Confirmar senha"
                autoComplete="new-password"
                className="col-span-4 md:col-span-2"
                {...field("confirmPassword")}
              />
            </FormSection>
          )}

          <div className="flex flex-col items-center gap-5">
            <FormAlert>{formError}</FormAlert>
            <Button1 type="submit" size="lg" disabled={submitting}>
              {submitting ? "Salvando..." : completar ? "Concluir cadastro" : "Criar conta"}
            </Button1>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  const id = `secao-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-6 text-[15px] text-[#8a8a8a] md:mb-8 md:text-[17px]">
        {title}
      </h2>
      <div className="grid grid-cols-4 gap-x-5 gap-y-[30px] md:gap-x-10 md:gap-y-9">{children}</div>
    </section>
  );
}
