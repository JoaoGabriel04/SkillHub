import type { ReactNode } from "react";
import Image from "next/image";

// Fundo das telas de entrada: public/Backgrounds-01.png em "cover" centralizado —
// é o recorte que aparece nos mockups mobile (designs/New Home.png, Login.png, Cadastro.png).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="fixed inset-0 -z-10 bg-[#101010]">
        <Image
          src="/Backgrounds-01.png"
          alt=""
          fill
          // em tela retrato o "cover" estica a imagem (3840×2496) até ~154% da altura em largura
          sizes="max(100vw, 154vh)"
          quality={90}
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center"
        />
      </div>
      {/* largura máxima fica por página: Home/Login seguem a coluna de 440px do mockup, o cadastro se expande */}
      <main className="flex min-h-dvh w-full flex-col px-4 font-jersey-15">{children}</main>
    </>
  );
}
