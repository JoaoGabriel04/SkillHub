"use client";
import Button1 from "@/components/ButtonType1";
import InputField from "@/components/InputField/inputField";
import { OrgFormData, registerOrgSchema } from "@/schemas/registerOrgSchema";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

export default function CadastroEmpresa() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgFormData>({
    resolver: zodResolver(registerOrgSchema),
  });

  const onSubmit = (data: OrgFormData) => {
    console.log(data);
    toast.success("Cadastro realizado com sucesso!");
  };

  const [preview, setPreview] = useState<string | null>(null);

  // Refs para animação do GSAP
  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);

  // Animação de entrada com GSAP
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
    <main className="w-full flex flex-col items-center bg-[url(/Backgrounds-01.png)] bg-cover bg-fixed">
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
        <h1 className="text-2xl font-jersey25 text-zinc-200">
          Cadastro de Empresa
        </h1>
      </header>

      <section
        ref={bodyRef}
        className="lg:w-full md:w-md px-6 lg:px-10 mt-6 flex flex-col items-center py-4 opacity-0"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-4xl grid justify-start grid-cols-1 lg:grid-cols-2 lg:gap-y-8 lg:gap-x-8"
        >
          {/* Campo para inserir Foto */}
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

          {/* Campos de Informação */}
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4 mt-4">
            <h1 className="col-span-2 text-2xl font-jersey25 text-zinc-200 mb-2">
              Informações da Empresa
            </h1>
            <InputField
              id="nomeEmpresa"
              label="Nome da Empresa"
              type="text"
              registerationorg={register("nomeEmpresa")}
              error={errors.nomeEmpresa?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="cnpj"
              label="CNPJ (ex: 00.000.000/0000-00)"
              type="text"
              registerationorg={register("cnpj")}
              error={errors.cnpj?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <div className="col-span-2 grid grid-cols-2 gap-x-4">
              <InputField
                id="contato"
                label="Contato"
                type="text"
                registerationorg={register("contato")}
                error={errors.contato?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
              <InputField
                id="setor"
                label="Setor"
                type="text"
                registerationorg={register("setor")}
                error={errors.setor?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-y-6 gap-x-4">
              <InputField
                id="cidade"
                label="Cidade"
                type="text"
                registerationorg={register("cidade")}
                error={errors.cidade?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
              <InputField
                id="estado"
                label="Estado"
                type="text"
                registerationorg={register("estado")}
                error={errors.estado?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
              <InputField
                id="cep"
                label="Seu CEP (ex: 00000-000)"
                type="text"
                registerationorg={register("cep")}
                error={errors.cep?.message}
                className="col-span-2 lg:col-span-1 mb-4"
              />
            </div>
            <InputField
              id="website"
              label="Website (opcional)"
              type="text"
              registerationorg={register("website")}
              error={errors.website?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="redesSociais"
              label="Redes Sociais (opcional)"
              type="text"
              registerationorg={register("redesSociais")}
              error={errors.redesSociais?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <div className="col-span-2 flex flex-col">
              <h1 className="text-zinc-200/80 text-2xl font-jersey25 mb-2">
                Descrição da Empresa
              </h1>
              <textarea
                id="descricao"
                className="w-full h-30 text-zinc-200 bg-dark-primary border-1 border-zinc-100 placeholder:text-zinc-200/40 placeholder:font-jersey25 placeholder:tracking-wide focus:outline-none p-2 resize-none"
                placeholder="Digite a descrição da empresa..."
                {...register("descricao")}
              ></textarea>
              {errors.descricao?.message && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.descricao?.message}
                </span>
              )}
            </div>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-y-4 lg:gap-y-8 gap-x-4">
            <h1 className="col-span-2 text-2xl font-jersey25 text-zinc-200 mt-6 mb-2">
              Informações da Conta
            </h1>
            <InputField
              id="email"
              label="Email"
              type="email"
              registerationorg={register("email")}
              error={errors.email?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="confirmEmail"
              label="Confirme seu Email"
              type="email"
              registerationorg={register("confirmEmail")}
              error={errors.confirmEmail?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="password"
              label="Senha"
              type="password"
              registerationorg={register("password")}
              error={errors.password?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
            <InputField
              id="confirmPassword"
              label="Confirmar Senha"
              type="password"
              registerationorg={register("confirmPassword")}
              error={errors.confirmPassword?.message}
              className="col-span-2 lg:col-span-1 mb-4"
            />
          </div>

          {/* Botão de Confirmar */}
          <div className="col-span-2 flex justify-center mt-4">
            <Button1 size="lg" type="submit">
              Criar Conta
            </Button1>
          </div>
        </form>
      </section>
    </main>
  );
}
