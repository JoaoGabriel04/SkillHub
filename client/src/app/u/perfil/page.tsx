"use client";
import { useUserStore } from "@/stores/userInfo";
import {
  faArrowLeft,
  faCamera,
  faDownload,
  faPencil,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import gsap from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Perfil() {
  const router = useRouter();
  const { fullName, perfil, competencias, curriculo, fetchUser } = useUserStore();

  const headerRef = useRef(null);

  useEffect(() => {
    fetchUser().catch(() => {
      router.push("/login");
    });
  }, [fetchUser]);

  useEffect(() => {
    const header = headerRef.current;

    const tl = gsap.timeline({ defaults: { duration: 1 } });
    tl.fromTo(header, { opacity: 0 }, { opacity: 1 });
  }, []);

  return (
    <main className="w-full min-h-screen flex flex-col bg-linear-to-b from-zinc-700/60 via-dark-primary/80 to-dark-primary">
      <header
        ref={headerRef}
        className="relative w-full h-10 lg:h-16 flex justify-center items-center border-b-1 border-zinc-700"
      >
        <Link href={"/u"} className="cursor-pointer">
          <FontAwesomeIcon
            icon={faArrowLeft}
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 lg:text-2xl text-zinc-100"
          />
        </Link>
        <h1 className="text-zinc-100 text-xl font-bold">Perfil</h1>
      </header>

      <section className="flex flex-col items-center px-4 py-6 lg:px-[500px]">

        {/* Seção de Foto de Perfil */}
        <div className="relative w-25 lg:w-35 h-25 lg:h-35 rounded-full bg-zinc-950 border-1 border-zinc-100">
          <button className="group w-7 h-7 absolute bottom-0 right-0 bg-zinc-950 border-1 border-zinc-100 rounded-full cursor-pointer hover:bg-zinc-100 transition-colors">
            <FontAwesomeIcon
              icon={faCamera}
              className="text-zinc-100 group-hover:text-dark-primary transition-colors"
            />
          </button>
        </div>

        {/* Seção de Informações Pessoais */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-zinc-100 text-lg lg:text-2xl font-bold">
              {fullName}
            </h1>
            <FontAwesomeIcon
              icon={faPencil}
              className="text-zinc-100/40 text-xs"
            />
          </div>
          <h2 className="text-zinc-100/60 text-sm lg:text-lg">{perfil}</h2>
        </div>

        {/* Seção de Experiências Profissionais */}
        <div className="w-full h-25 lg:h-40 bg-dark-secundary shadow-md mt-4 rounded-md py-1 lg:py-2 lg:pb-3 px-4 lg:px-10 flex flex-col justify-between items-center">
          <h1 className="text-zinc-100 lg:text-2xl text-center font-semibold">
            Experiências Profissionais
          </h1>
          <div className="w-full flex justify-between items-center">
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-zinc-100/80 text-xl lg:text-4xl">0</h1>
              <span className="text-zinc-100/80 text-[10px] lg:text-sm">
                Colaborações
              </span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-zinc-100/80 text-xl lg:text-4xl">0</h1>
              <span className="text-zinc-100/80 text-[10px] lg:text-sm">
                Avaliações
              </span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-zinc-100/80 text-xl lg:text-4xl">0</h1>
              <span className="text-zinc-100/80 text-[10px] lg:text-sm">
                Experiência
              </span>
            </div>
          </div>
        </div>

        {/* Seção de Qualidades */}
        <div className="w-full mt-6 lg:mt-10">
          <div className="flex justify-between items-center">
            <h1 className="text-zinc-100 text-sm lg:text-2xl font-medium">Qualidades</h1>
            <FontAwesomeIcon icon={faPencil} className="text-zinc-100/40 text-xs lg:text-lg"/>
          </div>
          {competencias && competencias.length > 0 ? (
            <ul className="flex flex-col gap-3 mt-2">
              {competencias.map((competencia, index)=>(
                <li key={index} className="w-full h-12 flex items-center px-3 bg-zinc-800 text-zinc-100 text-sm font-bold rounded">{competencia}</li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-100/60 text-xs lg:text-lg mt-4">Nenhuma qualidade encontrada.</p>
          )}
        </div>

        {/* Seção de Currículo */}
        <div className="w-full mt-6 lg:mt-10">
          <div className="flex justify-between items-center">
            <h1 className="text-zinc-100 text-sm lg:text-2xl font-medium">Currículo</h1>
            <FontAwesomeIcon icon={faPencil} className="text-zinc-100/40 text-xs lg:text-lg"/>
          </div>
          {curriculo ? (
            <div className="mt-4 space-y-4">
              <div className="w-full h-12 px-2 flex items-center gap-2 text-zinc-100 font-semibold bg-zinc-800 rounded">
                <FontAwesomeIcon icon={faPlay} />
                Visualizar currículo
              </div>
              <div className="w-full h-12 px-2 flex items-center gap-2 text-zinc-100 font-semibold bg-zinc-800 rounded">
                <FontAwesomeIcon icon={faDownload} />
                Download do currículo
              </div>
            </div>
          ) : (
            <p className="text-zinc-100/60 text-xs lg:text-lg mt-4">Nenhum currículo encontrado.</p>
          )}
        </div>
      </section>
    </main>
  );
}
