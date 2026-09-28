import type { NextConfig } from "next";

// Em produção (Vercel) o navegador fala com o backend pelo próprio domínio do site:
// /api/* é repassado para BACKEND_URL. Assim o cookie refresh_token é "primário" e não cai
// no bloqueio de cookies de terceiros (Safari, Firefox). Sem BACKEND_URL (docker compose),
// o frontend chama o backend direto pelo NEXT_PUBLIC_API_URL.
const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return BACKEND_URL ? [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }] : [];
  },
  images: {
    // 90 só pro fundo das telas de entrada: gradiente suave estoura em blocos a 75
    qualities: [75, 90],
    // fotos de perfil (urlPhoto) vêm do Cloudinary; as dos dados de exemplo (lib/mock), do Unsplash
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
