"use client";
import InputField from "@/components/InputField/inputField";
import { useRegisterCliente } from "@/hooks/registerClient";
import { FormData, registerFormSchema } from "@/schemas/registerFormSchema";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

export default function CadastroCliente() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(registerFormSchema),
  });

  const { mutate } = useRegisterCliente();

  const onSubmit = (data: FormData) => {
    console.log(data)
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
        router.push("/u/dashboard");
      },
      onError: (error) => {
        toast.error(error.response?.data?.message ?? "Erro no cadastro");
      },
    });
  };

  const [preview, setPreview] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!headerRef.current || !bodyRef.current) return;
    const header = headerRef.current;
    const body = bodyRef.current;
    const tl = gsap.timeline({ defaults: { duration: 0.5 } });
    tl.fromTo(header, { y: -100, opacity: 0 }, { y: 0, opacity: 1 }).fromTo(
      body,
      { opacity: 0 },
      { opacity: 1 }
    );
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <main className="w-full flex flex-col items-center">
      <header
        ref={headerRef}
        className="w-full h-20 flex justify-between items-center py-2 px-4 lg:px-16 bg-theme shadow-md"
      >
        <Link href={"/"}>
          <Image
            src={"/Skillhub-Logotipo.png"}
            alt="logo-skillhub"
            width={100}
            height={100}
            className="w-10"
          />
        </Link>
        <h1 className="text-md text-zinc-200 font-bold">Cadastro de Cliente</h1>
      </header>

      <section
        ref={bodyRef}
        className="lg:w-full md:w-md px-6 lg:px-10 mt-6 flex flex-col items-center py-4 opacity-0"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-4xl grid justify-start grid-cols-1 lg:grid-cols-2 lg:gap-y-6 lg:gap-x-8"
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
              className="relative flex w-20 h-20 lg:w-28 lg:h-28 items-center justify-center bg-dark-secundary rounded-full"
            >
              {/*Vai ver se tem Conteúdo no Preview e se tiver adiciona a imagem selecionada*/}
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
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 absolute bottom-0 right-0 flex justify-center items-center bg-[#0a0a0a] rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <FontAwesomeIcon
                  icon={faPencil}
                  className="text-zinc-200 text-xs sm:text-sm lg:text-md"
                />
              </div>
            </label>
          </div>

          {/* Campos de Informação */}
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4 mt-4">
            <h1 className="col-span-2 text-lg font-bold text-zinc-200 mb-2">
              Informações Pessoais
            </h1>
            <InputField
              id="fullName"
              label="Nome Completo"
              type="text"
              registerationNormal={register("fullName")}
              error={errors.fullName?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="phone"
              label="Telefone"
              type="text"
              registerationNormal={register("phone")}
              error={errors.phone?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="cpf"
              label="CPF (ex: 000.000.000-00)"
              type="text"
              registerationNormal={register("cpf")}
              error={errors.cpf?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="dataNascimento"
              label="Data de Nascimento"
              type="date"
              registerationNormal={register("dataNascimento")}
              error={errors.dataNascimento?.message}
              className="col-span-2 lg:col-span-1"
            />
            <div className="flex flex-col gap-1 text-zinc-200/60">
              <h2 className="text-md text-zinc-200">Seu Gênero:</h2>
              <label htmlFor="masc" className="ml-2 mt-2 cursor-pointer">
                <input
                  type="radio"
                  id="masc"
                  value="masc"
                  {...register("genero")}
                />{" "}
                Masculino
              </label>
              <label htmlFor="fem" className="ml-2 cursor-pointer">
                <input
                  type="radio"
                  id="fem"
                  value="fem"
                  {...register("genero")}
                />{" "}
                Feminino
              </label>
              <label htmlFor="naosei" className="ml-2 cursor-pointer">
                <input
                  type="radio"
                  id="naosei"
                  value="naosei"
                  {...register("genero")}
                />{" "}
                Prefiro não dizer
              </label>
              {errors.genero && (
                <span className="text-red-500 text-xs mt-1">
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
              />
              <InputField
                id="estado"
                label="Estado"
                type="text"
                registerationNormal={register("estado")}
                error={errors.estado?.message}
              />
              <InputField
                id="cep"
                label="Seu CEP (ex: 00000-000)"
                type="text"
                registerationNormal={register("cep")}
                error={errors.cep?.message}
              />
            </div>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4">
            <h1 className="col-span-2 text-lg font-bold text-zinc-200 mt-6 mb-2">
              Informações da Conta
            </h1>
            <InputField
              id="email"
              label="Email"
              type="email"
              registerationNormal={register("email")}
              error={errors.email?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="confirmEmail"
              label="Confirme seu Email"
              type="email"
              registerationNormal={register("confirmEmail")}
              error={errors.confirmEmail?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="password"
              label="Senha"
              type="password"
              registerationNormal={register("password")}
              error={errors.password?.message}
              className="col-span-2 lg:col-span-1"
            />
            <InputField
              id="confirmPassword"
              label="Confirmar Senha"
              type="password"
              registerationNormal={register("confirmPassword")}
              error={errors.confirmPassword?.message}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Botão de Confirmar */}
          <div className="col-span-2 flex justify-center mt-4">
            <button
              type="submit"
              className="w-full lg:w-80 h-10 bg-blue-600 hover:bg-blue-500 text-md text-zinc-200 font-bold rounded-sm cursor-pointer"
            >
              Criar Conta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
