"use client";
import InputField from "../../components/InputField/inputField";
import Link from "next/link";
import SocialLogin from "./_components/socialLogin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebook,
  faGoogle,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import LogoSkillHub from "@/components/LogoSkillHub";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormData, loginFormSchema } from "@/schemas/loginSchema";
import { useLoginCliente } from "@/hooks/loginUser";
import { useUserStore } from "@/stores/userInfo";
import LoadingSpinner from "@/components/LoadingSpinner";
import { faCheck, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import Button1 from "@/components/ButtonType1";

export default function Login() {
  const [vh, setVh] = useState("100vh");

  const router = useRouter();
  const { fetchUser, loading } = useUserStore();

  const { mutate, isPending } = useLoginCliente();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: FormData) => {
    mutate(data, {
      onSuccess: () => {
        toast.success("Login realizado com sucesso!");
        router.push("/redirect");
      },
      onError: (error) => {
        toast.error(error.response?.data?.message ?? "Erro no login");
      },
    });
  };

  const logoRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    const logo = logoRef.current;
    const body = bodyRef.current;

    const tl = gsap.timeline({ defaults: { duration: 1 } });

    tl.fromTo(
      logo,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 }
    ).fromTo(
      body,
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5 },
      "-=0.2"
    );

    const updateVh = () => setVh(`${window.innerHeight}px`);
    updateVh();
    window.addEventListener("resize", updateVh);
    return () => window.removeEventListener("resize", updateVh);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // opcional: você pode até chamar fetchUser pra carregar dados do usuário
      fetchUser()
        .then(() => {
          router.push("/redirect"); // redireciona se o token existe
        })
        .catch(() => {
          // se o token estiver inválido, permanece na tela de login
          localStorage.removeItem("access_token");
        });
    }
  }, [router]);

  if (loading) return <LoadingSpinner />;

  return (
    <main
      style={{ height: vh }}
      className="w-full relative flex flex-col items-center bg-[url(/Backgrounds-01.png)] bg-cover bg-no-repeat"
    >
      <LogoSkillHub ref={logoRef} />
      <div
        ref={bodyRef}
        className="w-full h-full flex flex-col items-center mt-30 lg:mt-40 px-12 opacity-0"
      >
        <h1 className="text-xl lg:text-4xl text-zinc-200 font-jersey15 w-full text-center">
          Entre agora com sua conta
        </h1>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full lg:w-100 mt-16 flex flex-col justify-center items-start"
        >
          <InputField
            id="email"
            label="Email"
            icon={faUser}
            type="text"
            {...register("email")}
            error={errors.email?.message}
            className="mb-10"
          />
          <InputField
            id="senha"
            label="Senha"
            icon={faLock}
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <div className="w-full flex justify-between items-center mt-2 mb-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="hidden peer" />
              <label htmlFor="remember" className="w-4 h-4 flex justify-center items-center border-2 rounded border-zinc-200 text-transparent peer-checked:bg-dark-primary peer-checked:text-zinc-200 transition-colors cursor-pointer">
                <FontAwesomeIcon icon={faCheck} className="text-[10px]"/>
              </label>
              <label htmlFor="remember" className="text-xs text-zinc-200/60 cursor-pointer">
                Lembre-se de mim
              </label>
            </div>
            <Link
              href={"/"}
              className="text-sm font-jersey20 tracking-wide text-zinc-200/80"
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="w-full mt-10 flex justify-center">
            <Button1 size="lg" type="submit">Entrar agora</Button1>
          </div>
        </form>
        <div className="w-full flex flex-col items-center justify-center">
          <span className="text-zinc-200 text-lg font-jersey20 font-medium mt-4 block">
            Não tem uma conta?{" "}
            <Link href={"/cadastro"} className="text-blue-500 hover:underline">
              Cadastre-se
            </Link>
          </span>
          <div className="w-full flex flex-col items-center justify-center mt-12 gap-4">
            <h2 className="text-lg font-jersey25 font-regular text-zinc-200/80">
              Entre também com:
            </h2>
            <div className="w-full flex items-center justify-center gap-6">
              <SocialLogin>
                <FontAwesomeIcon
                  icon={faGoogle}
                  className="group-hover:text-[#EA4335]"
                />
              </SocialLogin>
              <SocialLogin>
                <FontAwesomeIcon
                  icon={faFacebook}
                  className="group-hover:text-blue-700"
                />
              </SocialLogin>
              <SocialLogin>
                <FontAwesomeIcon
                  icon={faLinkedin}
                  className="group-hover:text-sky-600"
                />
              </SocialLogin>
            </div>
          </div>
        </div>
      </div>
      {isPending && (
        <div className="absolute w-full h-screen flex justify-center items-center bg-black/60">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
        </div>
      )}
    </main>
  );
}
