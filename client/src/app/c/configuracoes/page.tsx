"use client";
import SearchInput from "@/components/SearchInput";
import {
  faBell,
  faChevronLeft,
  faCommentDots,
  faDoorOpen,
  faPalette,
  faShieldHalved,
  faTag,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import OptionLink from "./_components/OptionLink";
import { useRouter } from "next/navigation";
import api from "@/services/api";

const options = [
  { title: "Perfil", icon: faUser, url: "/c/perfil" },
  { title: "Compras e Assinaturas", icon: faTag, url: "/c" },
  { title: "Temas", icon: faPalette, url: "/c" },
  { title: "Feedback", icon: faCommentDots, url: "/c" },
  { title: "Notificações", icon: faBell, url: "/c" },
  { title: "Central de Segurança", icon: faShieldHalved, url: "/c" },
];

export default function Configuracoes() {

  const router = useRouter();

  const bodyRef = useRef(null);

  useEffect(() => {
    const body = bodyRef.current;
    const tl = gsap.timeline({ defaults: { duration: 1 } });
    tl.fromTo(body, { opacity: 0, x: -50 }, { opacity: 1, x: 0 });
  }, []);

  const logout = async () => {
    console.log("Clicou!")
    try {
      await api.post('/api/auth/logout'); // remove cookie
    } catch (error) {
      console.error('Erro ao fazer logout no servidor', error);
    }

    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
    router.push('/'); // redireciona
  };

  return (
    <main ref={bodyRef} className="p-3 opacity-0">
      <header className="w-full flex items-center gap-4">
        <Link href={"/c"}>
          <FontAwesomeIcon
            icon={faChevronLeft}
            className="text-2xl text-zinc-200/60"
          />
        </Link>
        <h1 className="text-xl text-zinc-200/60 font-semibold">
          Configurações
        </h1>
      </header>
      <SearchInput />
      <div className="mt-8">
        <ul className="flex flex-col gap-4">
          {options.map((option, index) => (
            <OptionLink
              key={index}
              title={option.title}
              icon={option.icon}
              url={option.url}
            />
          ))}
          <button onClick={logout} className="w-full flex justify-between">
            <div className="flex justify-center items-center gap-2">
              <FontAwesomeIcon
                icon={faDoorOpen}
                className="text-xl text-red-500/80"
              />
              <h1 className="text-lg text-red-500/80">Sair</h1>
            </div>
          </button>
        </ul>
      </div>
    </main>
  );
}
