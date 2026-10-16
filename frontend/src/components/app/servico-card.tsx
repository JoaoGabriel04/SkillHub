"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { ServicoModais, type ModalServico } from "@/components/app/servico-detalhe-dialog";
import { ContentCard } from "@/components/ui/content-card";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";
import type { Servico } from "@/types/servico";

// O que aparece à direita do autor, no lugar da distância:
// a etiqueta do pai ("Suas candidaturas"), as candidaturas pendentes ("Seus pedidos"), o status quando
// o pedido não está aberto, ou a distância (null até existir localização: some).
function etiquetaDoCard(servico: Servico, etiqueta?: string) {
  if (etiqueta) return etiqueta;
  const pendentes = servico.candidaturasPendentes ?? 0;
  if (servico.status === "Aberto" && pendentes > 0) return pendentes === 1 ? "1 candidatura" : `${pendentes} candidaturas`;
  if (servico.status !== "Aberto") return servico.status;
  return null;
}

// Card de pedido de serviço (designs/New Serviços.png): autor e distância, título, descrição e "Saiba Mais",
// que abre o detalhe do pedido (Fase 17B).
export function ServicoCard({ servico, className, etiqueta }: { servico: Servico; className?: string; etiqueta?: string }) {
  const [modal, setModal] = useState<ModalServico>(null);
  const destaque = etiquetaDoCard(servico, etiqueta);
  return (
    <>
      <ContentCard className={cn("flex h-[123px] w-[218px] flex-col px-[10px] pt-[9px] pb-[9px] font-secondary sm:h-auto sm:w-[260px] sm:p-3 lg:w-[290px]", className)}>
        <div className="flex items-center gap-[7px]">
          <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={22} className="sm:size-7!" />
          <span className="min-w-0 flex-1 truncate text-[10px] text-foreground sm:text-[12px] lg:text-[13px]">{servico.autor.fullName}</span>
          {destaque ? (
            <span className="shrink-0 text-[9px] text-accent-text sm:text-[11px] lg:text-[12px]">{destaque}</span>
          ) : (
            servico.distanciaKm !== null && (
              <span className="shrink-0 text-[9px] text-muted-foreground sm:text-[11px] lg:text-[12px]">à {servico.distanciaKm} km</span>
            )
          )}
        </div>
        <h3 className="mt-[12px] truncate text-[11px] font-semibold text-foreground sm:mt-3.5 sm:text-[14px] lg:text-[15px]">{servico.titulo}</h3>
        <p className="mt-[2px] line-clamp-2 text-[10px] leading-[1.35] text-foreground sm:mt-1 sm:mb-3 sm:text-[13px] lg:text-[14px]">{servico.descricao}</p>
        <CtaButton onClick={() => setModal("detalhe")} className="mt-auto h-[21px] w-full sm:h-7 lg:h-8">
          Saiba Mais
        </CtaButton>
      </ContentCard>
      <ServicoModais servico={servico} modal={modal} onModal={setModal} />
    </>
  );
}
