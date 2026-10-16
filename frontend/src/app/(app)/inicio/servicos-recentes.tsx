"use client";

import { useState } from "react";
import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { ScrollRow } from "@/components/app/scroll-row";
import { ServicoCardEsqueleto } from "@/components/app/servico-card-esqueleto";
import { ServicoModais, type ModalServico } from "@/components/app/servico-detalhe-dialog";
import { TransitionLink } from "@/components/motion/page-transition";
import { ContentCard } from "@/components/ui/content-card";
import { ctaButtonClass } from "@/components/ui/cta-button";
import { chaveServicos, getServicos, type FiltrosServicos } from "@/lib/servicos";
import { cn } from "@/lib/utils";
import type { Servico } from "@/types/servico";
import { GRADE_XL } from "./grade";

const FILTROS: FiltrosServicos = { limit: 8 };

// Card do Início (o do mockup, maior que o ServicoCard): "Saiba Mais" abre o detalhe do pedido (Fase 17B)
function CardServicoInicio({ servico, className }: { servico: Servico; className?: string }) {
  const [modal, setModal] = useState<ModalServico>(null);
  return (
    <>
      <ContentCard
        className={cn(
          "flex h-[159px] w-[302px] flex-col px-[11px] pt-[11px] pb-[12px] font-secondary sm:h-[184px] sm:w-[340px] sm:p-4 lg:w-[370px] xl:w-auto",
          className
        )}
      >
        <div className="flex items-center gap-[10px]">
          <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={39} className="sm:size-11!" />
          <h3 className="truncate text-[15px] text-foreground sm:text-[17px]">{servico.autor.fullName}</h3>
        </div>
        <p className="mt-[16px] line-clamp-2 text-justify text-[12px] leading-[1.25] text-foreground sm:text-left sm:text-[14px]">
          {servico.descricao}
        </p>
        <button type="button" onClick={() => setModal("detalhe")} className={cn(ctaButtonClass, "mt-auto flex h-[27px] items-center justify-center sm:h-8")}>
          Saiba Mais
        </button>
      </ContentCard>
      <ServicoModais servico={servico} modal={modal} onModal={setModal} />
    </>
  );
}

// Seção "Serviços" do Início com os pedidos reais (Fase 17A): o mesmo markup da Fase 16.2
// (carrossel abaixo de xl, 2 lado a lado a partir de xl). Esqueleto ao carregar; sem pedidos
// (ou se a API falhar), a seção não aparece. A lista completa, com erro e "tentar de novo", fica em /servicos.
export function ServicosRecentes() {
  const { data: servicos, isLoading } = useSWR(chaveServicos(FILTROS), ([, filtros]) => getServicos(filtros));
  if (!isLoading && !servicos?.length) return null;

  return (
    <section className="mt-[32px] sm:mt-12 xl:col-start-1 xl:mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">Serviços</h2>
        <TransitionLink href="/servicos" aria-label="Ver todos os serviços" className="text-muted-foreground transition-colors hover:text-foreground">
          <FontAwesomeIcon icon={faArrowRight} className="text-[17px] sm:text-[20px]" />
        </TransitionLink>
      </div>
      <ScrollRow label="Serviços" className="mt-[20px]" trilhaClassName={GRADE_XL}>
        {!servicos
          ? [0, 1, 2].map((i) => (
              <ServicoCardEsqueleto key={i} className={cn("h-[159px] w-[302px] sm:h-[184px] sm:w-[340px] lg:w-[370px] xl:w-auto", i >= 2 && "xl:hidden")} />
            ))
          : servicos.map((servico, i) => <CardServicoInicio key={servico.id} servico={servico} className={cn(i >= 2 && "xl:hidden")} />)}
      </ScrollRow>
    </section>
  );
}
