"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Magnetic } from "@/components/motion/magnetic";
import { API_URL } from "@/lib/api";

// Login social: navega direto pro backend, que redireciona pro provedor
// e volta em /auth/callback com o token. data-social: a página anima a entrada; Magnetic puxa pro mouse.
export function SocialButtons() {
  return (
    <div className="flex justify-center gap-[33px]">
      <Magnetic>
        <a
          data-social
          href={`${API_URL}/auth/google`}
          aria-label="Entrar com Google"
          className="flex h-[50px] w-[85px] items-center justify-center rounded-[6px] bg-foreground text-background transition-colors hover:bg-foreground-secondary"
        >
          <FontAwesomeIcon icon={faGoogle} className="text-[30px]" />
        </a>
      </Magnetic>
      <Magnetic>
        <a
          data-social
          href={`${API_URL}/auth/discord`}
          aria-label="Entrar com Discord"
          className="flex h-[50px] w-[85px] items-center justify-center rounded-[6px] border border-foreground bg-background text-foreground transition-colors hover:bg-surface-2"
        >
          <FontAwesomeIcon icon={faDiscord} className="text-[30px]" />
        </a>
      </Magnetic>
    </div>
  );
}
