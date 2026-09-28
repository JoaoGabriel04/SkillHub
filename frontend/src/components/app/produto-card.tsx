"use client";

import Image from "next/image";
import { emBreve } from "@/lib/em-breve";
import { cn } from "@/lib/utils";
import type { Produto } from "@/lib/mock/produtos";

const formatPreco = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Card de produto (designs/New Produtos.png): foto emoldurada, "nome - vendedor (Jovem aprendiz) - preço"
// e "Ver detalhes". Só quem é jovem aprendiz tem o nome exibido, como no mockup.
export function ProdutoCard({ produto, className }: { produto: Produto; className?: string }) {
  const { vendedor } = produto;
  return (
    <button
      type="button"
      onClick={() => emBreve("A página do produto")}
      className={cn("group flex w-[180px] flex-col text-left font-secondary sm:w-[210px] lg:w-[240px]", className)}
    >
      <div className="relative h-[135px] w-full overflow-hidden sm:h-[158px] lg:h-[180px] rounded-[2px] border-[6px] border-[#2e2e2e] bg-[#2e2e2e]">
        <Image
          src={produto.imagemUrl}
          alt={produto.nome}
          fill
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 210px, 180px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-[4px] line-clamp-2 text-[11px] leading-[1.3] text-white sm:mt-1.5 sm:text-[13px] lg:text-[14px]">
        {produto.nome}
        {vendedor.jovemAprendiz && ` - ${vendedor.fullName} (Jovem aprendiz)`} - {formatPreco(produto.preco)}
      </p>
      <span className="mt-[2px] text-[10px] text-[#8a8a8a] transition-colors group-hover:text-white sm:text-[12px] lg:text-[13px]">Ver detalhes</span>
    </button>
  );
}
