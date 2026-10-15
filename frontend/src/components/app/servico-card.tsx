"use client";

import { Avatar } from "@/components/app/avatar";
import { ContentCard } from "@/components/ui/content-card";
import { CtaButton } from "@/components/ui/cta-button";
import { emBreve } from "@/lib/em-breve";
import { cn } from "@/lib/utils";
import type { Servico } from "@/types/servico";

// Card de pedido de serviço (designs/New Serviços.png): autor e distância, título, descrição e "Saiba Mais".
// Sem distância (null até existir localização, Fase 17A), o "à X km" some.
export function ServicoCard({ servico, className }: { servico: Servico; className?: string }) {
  return (
    <ContentCard className={cn("flex h-[123px] w-[218px] flex-col px-[10px] pt-[9px] pb-[9px] font-secondary sm:h-auto sm:w-[260px] sm:p-3 lg:w-[290px]", className)}>
      <div className="flex items-center gap-[7px]">
        <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={22} className="sm:size-7!" />
        <span className="min-w-0 flex-1 truncate text-[10px] text-foreground sm:text-[12px] lg:text-[13px]">{servico.autor.fullName}</span>
        {/* "Seus pedidos" traz também os não abertos: o status aparece no lugar da distância */}
        {servico.status !== "Aberto" ? (
          <span className="shrink-0 text-[9px] text-accent-text sm:text-[11px] lg:text-[12px]">{servico.status}</span>
        ) : (
          servico.distanciaKm !== null && (
            <span className="shrink-0 text-[9px] text-muted-foreground sm:text-[11px] lg:text-[12px]">à {servico.distanciaKm} km</span>
          )
        )}
      </div>
      <h3 className="mt-[12px] truncate text-[11px] font-semibold text-foreground sm:mt-3.5 sm:text-[14px] lg:text-[15px]">{servico.titulo}</h3>
      <p className="mt-[2px] line-clamp-2 text-[10px] leading-[1.35] text-foreground sm:mt-1 sm:mb-3 sm:text-[13px] lg:text-[14px]">{servico.descricao}</p>
      <CtaButton onClick={() => emBreve("A página do serviço")} className="mt-auto h-[21px] w-full sm:h-7 lg:h-8">
        Saiba Mais
      </CtaButton>
    </ContentCard>
  );
}
