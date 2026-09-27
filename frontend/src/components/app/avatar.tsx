import Image from "next/image";
import { cn } from "@/lib/utils";

// Foto do usuário (urlPhoto, Cloudinary) ou iniciais sobre uma cor derivada do nome.
const CORES = ["#2f6f8f", "#7c4a8f", "#8f5a2f", "#2f8f6a", "#8f2f4a", "#4a5a8f", "#6a8f2f", "#8f7a2f"];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

function corDoNome(nome: string) {
  let hash = 0;
  for (const c of nome) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[hash % CORES.length];
}

type AvatarProps = { nome: string; src?: string | null; size: number; className?: string };

export function Avatar({ nome, src, size, className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={nome}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={nome}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-secondary font-semibold text-white", className)}
      style={{ width: size, height: size, backgroundColor: corDoNome(nome), fontSize: size * 0.36 }}
    >
      {iniciais(nome)}
    </span>
  );
}
