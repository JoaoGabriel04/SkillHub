"use client";

import { Avatar } from "@/components/app/avatar";
import { ContentCard } from "@/components/ui/content-card";
import { CtaButton } from "@/components/ui/cta-button";
import { emBreve } from "@/lib/em-breve";
import { cn } from "@/lib/utils";
import type { Servico } from "@/lib/mock/servicos";

// Card de pedido de serviço (designs/New Serviços.png): autor e distância, título, descrição e "Saiba Mais"
export function ServicoCard({ servico, className }: { servico: Servico; className?: string }) {
  return (
    <ContentCard className={cn("flex h-[123px] w-[218px] flex-col px-[10px] pt-[9px] pb-[9px] font-secondary", className)}>
      <div className="flex items-center gap-[7px]">
        <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={22} />
        <span className="min-w-0 flex-1 truncate text-[10px] text-white">{servico.autor.fullName}</span>
        <span className="shrink-0 text-[9px] text-[#8a8a8a]">à {servico.distanciaKm} km</span>
      </div>
      <h3 className="mt-[12px] truncate text-[11px] font-semibold text-white">{servico.titulo}</h3>
      <p className="mt-[2px] line-clamp-2 text-[10px] leading-[1.35] text-[#e0e0e0]">{servico.descricao}</p>
      <CtaButton onClick={() => emBreve("A página do serviço")} className="mt-auto h-[21px] w-full">
        Saiba Mais
      </CtaButton>
    </ContentCard>
  );
}
