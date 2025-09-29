"use client";
import Button1 from "@/components/ButtonType1";
import gsap from "gsap";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function App() {
  const [vh, setVh] = useState("100vh");

  const router = useRouter();
  const boxRef = useRef(null);

  const handleFechar = () => {
    if (boxRef.current) {
      gsap.to(boxRef.current, {
        opacity: 0,
        y: -50,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => router.push("/login"), // desmonta só depois da animação
      });
    }
  };

  // animação de entrada
  useEffect(() => {
    if (boxRef.current) {
      gsap.fromTo(
        boxRef.current,
        { opacity: 0, y: -100 },
        { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }
      );
    }

    const updateVh = () => setVh(`${window.innerHeight}px`);
    updateVh();
    window.addEventListener("resize", updateVh);

    return () => window.removeEventListener("resize", updateVh);
  }, []); // só cuida da animação

  return (
    <main style={{ height: vh }} className="w-full bg-[url(/Backgrounds-01.png)] bg-cover bg-no-repeat">
      <div className="w-full h-full absolute top-0 left-0 bg-[#10101040]"></div>
      <section
        ref={boxRef}
        className="absolute top-0 left-0 z-10 w-full h-full flex flex-col justify-center items-center"
      >
        <Image
          src={"/Logo-Skillhub-refatored.png"}
          alt="logo-Skillhub"
          width={100}
          height={100}
          className="w-30 drop-shadow-[0px_0px_15px] drop-shadow-[#25B3E480] animate-pulse"
        />
        <h1 className="font-jersey text-transparent text-5xl tracking-wider mt-4 bg-linear-to-b from-[#25B3E4] via-[#3BD4CC] to-[#ffffff] bg-clip-text">
          SkillHub
        </h1>
        <p className="text-zinc-100/40 font-jersey mt-2">
          Juntos, somos mais fortes.
        </p>
        <p className="text-zinc-100/40 font-jersey mt-[-3px]">
          Perto, somos mais rápidos.
        </p>
        <Button1 handle={handleFechar} size="md"/>
      </section>
    </main>
  );
}
