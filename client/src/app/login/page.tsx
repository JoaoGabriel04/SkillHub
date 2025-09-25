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
import api, { setAuthToken } from "@/services/api";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
  }, []);

  async function handleSubmit(e: React.FormEvent) {
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
  }

  return (
    <main className="w-full h-screen relative flex flex-col items-center">
      <LogoSkillHub ref={logoRef} />
      <div
        ref={bodyRef}
        className="w-full h-full flex flex-col items-center mt-30 lg:mt-40 px-12 opacity-0"
      >
        <h1 className="text-xl lg:text-4xl text-zinc-200 font-bold w-50 lg:w-100 text-center">
          Faça parte da nossa comunidade
        </h1>
        <form
          onSubmit={handleSubmit}
          className="w-full lg:w-100 mt-8 space-y-6 flex flex-col justify-center items-start"
        >
          <InputField
            id="email"
            name="email"
            label="Email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            id="senha"
            name="senha"
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
    </main>
  );
}
