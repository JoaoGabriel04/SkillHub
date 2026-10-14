import type { ReactNode } from "react";
import { AuthBackground } from "@/components/auth/auth-background";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthBackground />
      {/* largura máxima fica por página: Home/Login seguem a coluna de 440px do mockup, o cadastro se expande.
          data-page-exit: afunda/desfoca quando a transição de página cobre a tela */}
      <main data-page-exit className="flex min-h-dvh w-full flex-col px-4 font-jersey-15">
        {children}
      </main>
    </>
  );
}
