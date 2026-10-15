import Image from "next/image";
import { AVATAR_CORES, AVATAR_INICIAL } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Foto do usuário (urlPhoto, Cloudinary) ou iniciais sobre uma cor derivada do nome.

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

function corDoNome(nome: string) {
  let hash = 0;
  for (const c of nome) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_CORES[hash % AVATAR_CORES.length];
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
      className={cn("flex shrink-0 items-center justify-center rounded-full font-secondary font-semibold", className)}
      style={{ width: size, height: size, backgroundColor: corDoNome(nome), color: AVATAR_INICIAL, fontSize: size * 0.36 }}
    >
      {iniciais(nome)}
    </span>
  );
}
