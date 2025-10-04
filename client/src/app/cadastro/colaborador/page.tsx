"use client";
import Button1 from "@/components/ButtonType1";
import Button2 from "@/components/ButtonType2";
import InputField from "@/components/InputField/inputField";
import { useRegisterColaborador } from "@/hooks/registerColaborador";
import { FormData, registerFormSchema } from "@/schemas/registerFormSchema";
import { faPaperclip, faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

export default function CadastroColaborador() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { competencias: [] },
  });

  const competencias = watch("competencias") || [];

  const { mutate } = useRegisterColaborador();

  const [preview, setPreview] = useState<string | null>(null);
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [competencia, setCompetencia] = useState("");

  const adicionarCompetencia = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = competencia.trim();
    if (!trimmed) return;
    setValue("competencias", [...competencias, trimmed]);
    setCompetencia("");
  };

  const removerCompetencia = (index: number) => {
    const novaLista = competencias.filter((_, i) => i !== index);
    setValue("competencias", novaLista);
  };

  const onSubmit = (data: FormData) => {
    if (
      data.email !== data.confirmEmail ||
      data.password !== data.confirmPassword
    ) {
      alert("Email ou senha não coincidem.");
      return;
    }

    mutate(data, {
      onSuccess: () => {
        toast.success("Cadastro realizado com sucesso!");
        router.push("/c/dashboard");
      },
      onError: (error) => {
        toast.error(error.response?.data?.message ?? "Erro no cadastro");
      },
    });
  };

  // Refs para animação GSAP
  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!headerRef.current || !bodyRef.current) return;
    const tl = gsap.timeline({ defaults: { duration: 0.5 } });
    tl.fromTo(
      headerRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1 }
    ).fromTo(bodyRef.current, { opacity: 0 }, { opacity: 1 });
  }, []);

  // Limpeza do preview para evitar vazamento de memória
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleCurriculoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCurriculo(file);
  };

  return (
    <main className="w-full flex flex-col items-center bg-[url(/Backgrounds-01.png)] bg-cover bg-fixed">
      {/* Header */}
      <header
        ref={headerRef}
        className="w-full h-20 flex justify-between items-center py-2 px-4 lg:px-16 bg-dark-primary/30 shadow-md"
      >
        <Link href={"/"}>
          <Image
            src={"/Logo-Skillhub-refatored.png"}
            alt="logo-skillhub"
            width={100}
            height={100}
            className="w-10 animate-pulse"
          />
        </Link>
        <h1 className="text-2xl font-jersey25 text-zinc-200">Cadastro de Colaborador</h1>
      </header>

      {/* Form */}
      <section
        ref={bodyRef}
        className="lg:w-full md:w-md px-6 lg:px-10 mt-6 flex flex-col items-center py-4 opacity-0"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-4xl grid justify-start grid-cols-1 lg:grid-cols-2 lg:gap-y-8 lg:gap-x-8"
        >
          {/* Foto */}
          <div className="col-span-2 flex justify-center">
            <input
              type="file"
              id="photo"
              name="photo"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="photo"
              className="relative flex w-20 h-20 lg:w-28 lg:h-28 items-center justify-center bg-dark-primary border-2 border-zinc-100 rounded-full"
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={120}
                  height={120}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-zinc-400 text-xs lg:text-sm text-center">
                  Escolher foto
                </span>
              )}
              <div className="group w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 absolute bottom-0 right-0 flex justify-center items-center bg-[#0a0a0a] border-1 border-zinc-100 rounded-full cursor-pointer hover:bg-zinc-100 transition-colors">
                <FontAwesomeIcon
                  icon={faPencil}
                  className="text-zinc-200 text-xs sm:text-sm lg:text-md group-hover:text-dark-primary transition-colors"
                />
              </div>
            </label>
          </div>

          {/* Campos Pessoais */}
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4 mt-4">
            <h1 className="col-span-2 text-2xl font-jersey25 text-zinc-200 mb-2">
              Informações Pessoais
            </h1>
            <InputField
              id="fullName"
              label="Nome Completo"
              type="text"
              registerationNormal={register("fullName")}
              error={errors.fullName?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="phone"
              label="Telefone"
              type="text"
              registerationNormal={register("phone")}
              error={errors.phone?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="cpf"
              label="CPF (ex: 000.000.000-00)"
              type="text"
              registerationNormal={register("cpf")}
              error={errors.cpf?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="dataNascimento"
              label="Data de Nascimento"
              type="date"
              registerationNormal={register("dataNascimento")}
              error={errors.dataNascimento?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <div className="flex flex-col gap-1 text-zinc-200/60">
              <h2 className="text-lg font-jersey25 text-zinc-200">Seu Gênero:</h2>
              {["masc", "fem", "naosei"].map((g) => (
                <label key={g} htmlFor={g} className="ml-2 mt-2 cursor-pointer font-jersey20 text-lg tracking-wide">
                  <input
                    type="radio"
                    id={g}
                    value={g}
                    {...register("genero")}
                  />{" "}
                  {g === "masc"
                    ? "Masculino"
                    : g === "fem"
                    ? "Feminino"
                    : "Prefiro não dizer"}
                </label>
              ))}
              {errors.genero && (
                <span className="text-red-500 font-jersey20 text-md mt-1">
                  {errors.genero.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-y-4 lg:gap-y-8 text-zinc-200/60 mt-4 col-span-2 lg:col-span-1">
              <InputField
                id="cidade"
                label="Cidade"
                type="text"
                registerationNormal={register("cidade")}
                error={errors.cidade?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
              <InputField
                id="estado"
                label="Estado"
                type="text"
                registerationNormal={register("estado")}
                error={errors.estado?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
              <InputField
                id="cep"
                label="Seu CEP (ex: 00000-000)"
                type="text"
                registerationNormal={register("cep")}
                error={errors.cep?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
            </div>
          </div>

          {/* Conta */}
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4">
            <h1 className="col-span-2 text-2xl font-jersey25 text-zinc-200 mt-6 mb-2">
              Informações da Conta
            </h1>
            <InputField
              id="email"
              label="Email"
              type="email"
              registerationNormal={register("email")}
              error={errors.email?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="confirmEmail"
              label="Confirme seu Email"
              type="email"
              registerationNormal={register("confirmEmail")}
              error={errors.confirmEmail?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="password"
              label="Senha"
              type="password"
              registerationNormal={register("password")}
              error={errors.password?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="confirmPassword"
              label="Confirmar Senha"
              type="password"
              registerationNormal={register("confirmPassword")}
              error={errors.confirmPassword?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
          </div>

          {/* Competências */}
          <div className="w-full col-span-2 flex flex-col mt-4 py-2">
            <h1 className="text-zinc-200 text-2xl font-jersey25">Competências</h1>
            <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-4 mt-2 py-2">
              <input
                type="text"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="Adicione uma competência"
                className="w-full lg:w-100 p-2 bg-dark-secundary text-zinc-200/80 rounded-xs focus:outline-none placeholder:font-jersey15 placeholder:tracking-wide"
              />
              <Button1
                size="md"
                type="button"
                handle={adicionarCompetencia}
              >Adicionar Competência</Button1>
            </div>

            <ul className="w-full sm:w-1/2 mt-2 flex flex-col gap-4">
              {competencias.length > 0 ? (
                competencias.map((comp, index) => (
                  <li
                    key={index}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-2 text-lg font-jersey25 tracking-wide"
                  >
                    <input
                      value={comp}
                      onChange={(e) => {
                        const novaLista = [...competencias];
                        novaLista[index] = e.target.value;
                        setValue("competencias", novaLista);
                      }}
                      className="w-full sm:w-auto flex-1 bg-dark-primary border-1 border-zinc-100 text-zinc-200 px-4 py-2 focus:outline-none"
                    />
                    <Button2 size="sm" type="button" handle={() => removerCompetencia(index)}>Remover</Button2>
                  </li>
                ))
              ) : (
                <p className="text-zinc-400 text-md font-jersey20 mt-2">
                  Nenhuma competência adicionada.
                </p>
              )}
            </ul>
          </div>

          {/* Currículo */}
          <div className="w-full col-span-2 flex flex-col mt-4 py-2">
            <h1 className="text-zinc-200 text-2xl font-jersey25">Currículo</h1>
            <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-4 mt-2 py-2">
              <input
                type="file"
                id="curriculo"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleCurriculoChange}
              />
              <label
                htmlFor="curriculo"
                className="px-4 py-2 border-1 border-zinc-100 bg-dark-primary text-zinc-200 text-xl font-jersey15 cursor-pointer hover:text-dark-primary hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <FontAwesomeIcon icon={faPaperclip} className="mr-2" />
                Selecionar Currículo
              </label>
            </div>
            {curriculo && (
              <div className="mt-2 flex items-center gap-3 bg-dark-secundary p-2 rounded">
                <span className="text-2xl">
                  {curriculo.type === "application/pdf" ? "📄" : "📝"}
                </span>
                <span className="text-zinc-200 text-sm">{curriculo.name}</span>
                <span className="text-zinc-400 text-xs">
                  {(curriculo.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
            <span className="text-xs text-zinc-200/40">
              Aceito apenas: PDF ou Word (.pdf, .doc, .docx)
            </span>
          </div>

          {/* Botão */}
          <div className="col-span-2 flex justify-center mt-4">
            <Button1
              size="xl"
              type="submit"
            >
              Criar Conta
            </Button1>
          </div>
        </form>
      </section>
    </main>
  );
}
