"use client";

import { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { ProdutoModais, type ModalProduto } from "@/components/app/produto-detalhe-dialog";
import { ScrollRow } from "@/components/app/scroll-row";
import { ContentCard } from "@/components/ui/content-card";
import { chaveProdutos, getProdutos, type FiltrosProdutos } from "@/lib/produtos";
import { cn } from "@/lib/utils";
import type { ProdutoResumo } from "@/types/produto";
import { GRADE_XL } from "./grade";

const FILTROS: FiltrosProdutos = { limit: 8 };
const LARGURA = "w-[176px] sm:w-[210px] lg:w-[240px] xl:w-auto";

// Card do Início (o do mockup): o clique abre o detalhe do produto (Fase 18A; antes levava a /produtos)
function CardProdutoInicio({ produto, className, acimaDaDobra }: { produto: ProdutoResumo; className?: string; acimaDaDobra: boolean }) {
  const [modal, setModal] = useState<ModalProduto>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setModal("detalhe")}
        className={cn("group text-left transition-transform hover:-translate-y-1", LARGURA, className)}
      >
        <ContentCard className="flex flex-col overflow-hidden font-secondary">
          <div className="relative h-[199px] bg-surface-2 sm:h-[236px] lg:h-[270px] xl:h-[236px]">
            {produto.capaUrl && (
              <Image
                src={produto.capaUrl}
                alt={produto.nome}
                fill
                loading={acimaDaDobra ? "eager" : undefined} // no desktop, os 2 cards são a maior imagem da tela (LCP)
                sizes="(min-width: 1280px) 182px, (min-width: 1024px) 240px, (min-width: 640px) 210px, 176px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="px-3 py-[10px]">
            <h3 className="truncate text-[13px] text-foreground sm:text-[14px] lg:text-[15px]">{produto.nome}</h3>
            <p className="mt-[2px] text-[13px] font-semibold text-accent-text sm:text-[14px] lg:text-[15px]">{produto.preco} créditos</p>
          </div>
        </ContentCard>
      </button>
      <ProdutoModais produto={produto} modal={modal} onModal={setModal} />
    </>
  );
}

// Seção "Produtos Relevantes" do Início com os produtos reais (Fase 18A): o mesmo markup da Fase 16.2
// (carrossel abaixo de xl; a partir de xl, 2 numa coluna de 380px). Mais recentes de outros vendedores.
// Esqueleto ao carregar; sem produtos (ou se a API falhar), a seção não aparece, como a de Serviços.
export function ProdutosRelevantes() {
  const { data: produtos, isLoading } = useSWR(chaveProdutos(FILTROS), ([, filtros]) => getProdutos(filtros));
  if (!isLoading && !produtos?.length) return null;

  return (
    <section className="mt-[20px] sm:mt-10 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-0">
      <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">Produtos Relevantes</h2>
      <ScrollRow label="Produtos" className="mt-[20px]" trilhaClassName={cn(GRADE_XL, "xl:gap-4")}>
        {!produtos
          ? [0, 1, 2].map((i) => (
              <ContentCard key={i} aria-hidden className={cn("h-[260px] animate-pulse sm:h-[300px] lg:h-[334px] xl:h-[300px]", LARGURA, i >= 2 && "xl:hidden")} />
            ))
          : produtos.map((produto, i) => <CardProdutoInicio key={produto.id} produto={produto} acimaDaDobra={i < 2} className={cn(i >= 2 && "xl:hidden")} />)}
      </ScrollRow>
    </section>
  );
}
