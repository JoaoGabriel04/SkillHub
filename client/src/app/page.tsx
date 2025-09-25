"use client"
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Home() {

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      <main className="overflow-hidden bg-linear-to-b from-dark-primary to-dark-secundary">
        <motion.div
          initial={{opacity: 0, y: 100}}
          animate={{opacity:1, y:0}}
          exit={{opacity:0, y:100}}
          transition={{duration: 1}}
          className="w-full h-screen flex flex-col justify-center items-center"
        >
          <Image
            src={"/Skillhub-Logotipo.png"}
            alt="logo-skillhub"
            width={300}
            height={300}
            className="lg:w-45 w-30 mb-4"
            priority
          />
          <h1 className="text-2xl lg:text-5xl font-bold tracking-wider mb-2 bg-linear-to-b from-[#25B3E4] to-[#6FFFBC] bg-clip-text text-transparent">
            SkillHub
          </h1>
          <p className="text-sm lg:text-md text-zinc-400/80">Juntos, somos mais fortes.</p>
          <p className="text-sm lg:text-md text-zinc-400/80">Perto, somos mais rápidos.</p>
          <Link
            href={"/login"}
            className="px-16 py-3 mt-8 bg-dark-primary text-xs lg:text-lg text-[#63a6ff] font-bold shadow-[0px_2px_7px_1px_#101010] rounded-sm hover:bg-[#242424] transition-all"
          >
            Entre Agora
          </Link>
        </motion.div>
      </main>
    </AnimatePresence>,
    document.body
  );
}
