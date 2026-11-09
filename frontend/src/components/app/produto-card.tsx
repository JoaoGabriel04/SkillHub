"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
import { ProdutoModais, type ModalProduto } from "@/components/app/produto-detalhe-dialog";
import { cn } from "@/lib/utils";
import type { ProdutoResumo } from "@/types/produto";

// "Pausado" (só nos seus produtos) ou "Esgotado" (estoque 0: continua visível, Fase 18, decisão 5)
function etiquetaDoCard(produto: ProdutoResumo) {
  if (produto.status === "Pausado") return "Pausado";
  if (produto.estoque === 0) return "Esgotado";
  return null;
}

// Card de produto (designs/New Produtos.png): foto emoldurada, "nome - preço" e "Ver detalhes", que abre o
// detalhe (Fase 18A). O "(Jovem aprendiz)" do mockup saiu: o dado não existe (Fase 18, decisão 3).
// acimaDaDobra: os primeiros cards da página carregam a foto sem lazy (é a maior imagem visível, o LCP)
export function ProdutoCard({ produto, className, acimaDaDobra }: { produto: ProdutoResumo; className?: string; acimaDaDobra?: boolean }) {
  const [modal, setModal] = useState<ModalProduto>(null);
  const etiqueta = etiquetaDoCard(produto);
  return (
    <>
      <button
        type="button"
        onClick={() => setModal("detalhe")}
        className={cn("group flex w-[180px] flex-col text-left font-secondary sm:w-[210px] lg:w-[240px]", className)}
      >
        <div className="relative h-[135px] w-full overflow-hidden sm:h-[158px] lg:h-[180px] rounded-[2px] border-[6px] border-surface-2 bg-surface-2">
          {produto.capaUrl ? (
            <Image
              src={produto.capaUrl}
              alt={produto.nome}
              fill
              loading={acimaDaDobra ? "eager" : undefined}
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 210px, 180px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <FontAwesomeIcon icon={faBagShopping} aria-hidden className="absolute inset-0 m-auto text-[32px] text-muted-foreground" />
          )}
        </div>
        <p className="mt-[4px] line-clamp-2 text-[11px] leading-[1.3] text-foreground sm:mt-1.5 sm:text-[13px] lg:text-[14px]">
          {produto.nome} - {produto.preco} {produto.preco === 1 ? "crédito" : "créditos"}
        </p>
        <span className="mt-[2px] text-[10px] text-muted-foreground transition-colors group-hover:text-foreground sm:text-[12px] lg:text-[13px]">
          {etiqueta && <span className="text-accent-text">{etiqueta} · </span>}
          Ver detalhes
        </span>
      </button>
      <ProdutoModais produto={produto} modal={modal} onModal={setModal} />
    </>
  );
}
