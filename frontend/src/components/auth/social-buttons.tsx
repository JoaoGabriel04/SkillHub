import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { API_URL } from "@/lib/api";

// Login social: navega direto pro backend, que redireciona pro provedor
// e volta em /auth/callback com o token.
export function SocialButtons() {
  return (
    <div className="flex justify-center gap-[33px]">
      <a
        href={`${API_URL}/auth/google`}
        aria-label="Entrar com Google"
        className="flex h-[50px] w-[85px] items-center justify-center rounded-[6px] bg-[#e3e3e3] text-[#101010] transition-opacity hover:opacity-85"
      >
        <FontAwesomeIcon icon={faGoogle} className="text-[30px]" />
      </a>
      <a
        href={`${API_URL}/auth/discord`}
        aria-label="Entrar com Discord"
        className="flex h-[50px] w-[85px] items-center justify-center rounded-[6px] border border-[#e3e3e3] bg-[#101010] text-white transition-colors hover:bg-[#1d1d1d]"
      >
        <FontAwesomeIcon icon={faDiscord} className="text-[30px]" />
      </a>
    </div>
  );
}
