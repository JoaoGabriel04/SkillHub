import Image from "next/image";
import { cn } from "@/lib/utils";

// Logo oficial (public/Logo-Skillhub.png, 873×999). O brilho ciano ao redor
// vem dos mockups em designs/ — o PNG não tem.
// size = largura exibida em px (o Next gera só as resoluções necessárias pra ela)
export function SkillHubLogo({ size, className }: { size: number; className?: string }) {
  return (
    <Image
      src="/Logo-Skillhub.png"
      alt="SkillHub"
      width={873}
      height={999}
      sizes={`${size}px`}
      loading="eager"
      style={{ width: size }}
      className={cn("h-auto drop-shadow-[0_0_6px_rgba(41,195,220,0.45)]", className)}
    />
  );
}
