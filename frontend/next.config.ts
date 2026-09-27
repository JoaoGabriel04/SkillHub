import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 só pro fundo das telas de entrada: gradiente suave estoura em blocos a 75
    qualities: [75, 90],
    // fotos de perfil (urlPhoto) vêm do Cloudinary
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
