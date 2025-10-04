"use client";
import {
  faBriefcase,
  faBuilding,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import PerfilBtn from "./_components/perfilBtn";
import { useRouter } from "next/navigation";
import LogoSkillHub from "@/components/LogoSkillHub";
import Button1 from "@/components/ButtonType1";

export default function Cadastro() {
  const [vh, setVh] = useState("100vh");

  const route = useRouter();
  const [cargo, setCargo] = useState("cliente");

  const logoRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef(null);
  const b1Ref = useRef<HTMLLabelElement>(null);
  const b2Ref = useRef<HTMLLabelElement>(null);
  const b3Ref = useRef<HTMLLabelElement>(null);
  const btnContinuarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const logo = logoRef.current;
    const title = titleRef.current;
    const b1 = b1Ref.current;
    const b2 = b2Ref.current;
    const b3 = b3Ref.current;
    const btnContinuar = btnContinuarRef.current;

    const tl = gsap.timeline({
      defaults: { duration: 0.5, ease: "back.inOut" },
    });

    tl.fromTo(logo, { y: -100, opacity: 0 }, { y: 0, opacity: 1 })
      .fromTo(title, { x: -100, opacity: 0 }, { x: 0, opacity: 1 })
      .fromTo(
        b1,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, delay: 0.5 },
        "-=0.4"
      )
      .fromTo(b2, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1 }, "-=0.4")
      .fromTo(b3, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1 }, "-=0.4")
      .fromTo(btnContinuar, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 });

    const updateVh = () => setVh(`${window.innerHeight}px`);
    updateVh();
    window.addEventListener("resize", updateVh);
    return () => window.removeEventListener("resize", updateVh);
  }, []);

  function handleContinuar() {
    if (cargo === "cliente") {
      route.push("/cadastro/cliente");
    }
    if (cargo === "colaborador") {
      route.push("/cadastro/colaborador");
    }
    if (cargo === "empresa") {
      route.push("/cadastro/empresa");
    }
  }

  return (
    <main
      style={{ height: vh }}
      className="w-full max-h-screen relative flex flex-col items-center px-10 bg-[url(/Backgrounds-01.png)] bg-cover"
    >
      <LogoSkillHub ref={logoRef} />
      <div className="w-full flex flex-col items-center mt-30 lg:mt-50">
        <h1
          className="w-80 lg:w-130 text-2xl lg:text-4xl font-jersey15 text-zinc-200 text-center opacity-0"
          ref={titleRef}
        >
          Escolha como você quer se comportar dentro do SkillHub
        </h1>
        <div className="w-full flex flex-wrap justify-center gap-8 mt-12">
          <PerfilBtn
            icon={faUsers}
            title="Cliente"
            opcao="cliente"
            ref={b1Ref}
            checked={cargo === "cliente"}
            onChange={() => setCargo("cliente")}
          />
          <PerfilBtn
            icon={faBriefcase}
            title="Colaborador"
            opcao="colaborador"
            ref={b2Ref}
            checked={cargo === "colaborador"}
            onChange={() => setCargo("colaborador")}
          />
          <PerfilBtn
            icon={faBuilding}
            title="Empresa"
            opcao="empresa"
            ref={b3Ref}
            checked={cargo === "empresa"}
            onChange={() => setCargo("empresa")}
          />
        </div>
      </div>
      <div className="w-full flex justify-center items-center mt-12">
        <Button1 type="submit" size="lg" ref={btnContinuarRef} handle={handleContinuar}>Continuar</Button1>
      </div>
    </main>
  );
}
