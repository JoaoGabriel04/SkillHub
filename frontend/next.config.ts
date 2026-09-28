import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
