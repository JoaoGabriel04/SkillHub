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

export default function Login() {
  const [vh, setVh] = useState("100vh");

  const router = useRouter();

  const { mutate, isPending } = useLoginCliente();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: FormData) => {
    console.log(data);
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

  {
    /*async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (email.trim() === "" || password.trim() === "") {
        toast.error("Por favor, preencha todos os campos.");
        return;
      }

      try {
        const response = await api.post(
          "/api/auth/login",
          { email, password },
          {
            withCredentials: true,
          }
        );

        setAuthToken(response.data.accessToken);

        console.log(
          "Token definido após login:",
          api.defaults.headers.common["Authorization"]
        );

        console.log(response.data);
        toast.success(response.data.message);
        setEmail("");
        setPassword("");
        setTimeout(() => {
          router.push("/redirect");
        }, 2000);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.log(error);
          toast.error("Erro ao fazer login");
        } else {
          console.log("Erro desconhecido:", error);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro ao fazer login:", error.message);
      } else {
        console.error("Erro desconhecido ao fazer login.");
      }
    }
  }*/
  }

  return (
    <main
      style={{ height: vh }}
      className="w-full relative flex flex-col items-center"
    >
      <LogoSkillHub ref={logoRef} />
      <div
        ref={bodyRef}
        className="w-full h-full flex flex-col items-center mt-30 lg:mt-40 px-12 opacity-0"
      >
        <h1 className="text-xl lg:text-4xl text-zinc-200 font-bold w-50 lg:w-100 text-center">
          Faça parte da nossa comunidade
        </h1>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full lg:w-100 mt-8 space-y-6 flex flex-col justify-center items-start"
        >
          <InputField
            id="email"
            label="Email"
            type="text"
            {...register("email")}
            error={errors.email?.message}
          />
          <InputField
            id="senha"
            label="Senha"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <button
            type="submit"
            className="w-full py-2 lg:py-3 bg-dark-primary text-zinc-200 font-bold shadow-primary rounded-sm cursor-pointer hover:bg-blue-600                                                                                                    not-even:transition-all"
          >
            Fazer Login
          </button>
        </form>
        <div className="w-full flex flex-col items-center justify-center">
          <span className="text-zinc-200 text-sm font-medium mt-4 block">
            Não tem uma conta?{" "}
            <Link href={"/cadastro"} className="text-blue-500 hover:underline">
              Cadastre-se
            </Link>
          </span>
          <div className="w-full flex flex-col items-center justify-center mt-12 gap-4">
            <h2 className="text-sm font-regular text-zinc-200/80">
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
                  className="group-hover:text-zinc-50"
                />
              </SocialLogin>
            </div>
          </div>
        </div>
      </div>
      {isPending && (
        <div className="absolute w-full h-screen bg-black/60">

        </div>
      )}
    </main>
  );
}
