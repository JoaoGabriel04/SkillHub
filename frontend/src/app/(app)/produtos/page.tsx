"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLaptop, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { PageTitle } from "@/components/app/page-title";
import { ProdutoCard } from "@/components/app/produto-card";
import { ScrollRow } from "@/components/app/scroll-row";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { emBreve } from "@/lib/em-breve";
import { CATEGORIAS_PRODUTO, getDestaques, getProdutos, type CategoriaProduto, type Destaque } from "@/lib/mock/produtos";
import { cn } from "@/lib/utils";

// Faixa listrada roxa do topo e da base dos banners do mockup
const LISTRA = "bg-[repeating-linear-gradient(135deg,#8b5cf6_0_4px,transparent_4px_8px)]";

function DestaqueBanner({ destaque }: { destaque: Destaque }) {
  return (
    <article className="relative flex h-[130px] w-[86%] max-w-[341px] items-center overflow-hidden rounded-[10px] bg-[#f4f4f8] pl-[14px] md:w-[calc((100%-21px)/2)] md:max-w-none">
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-[6px]", LISTRA)} />
      <div aria-hidden className={cn("absolute inset-x-0 bottom-0 h-[6px]", LISTRA)} />
      <div className="relative z-10 min-w-0 flex-1">
        <p className="font-secondary text-[18px] leading-none font-semibold text-[#1e1b4b] italic">{destaque.chamada}</p>
        <p className="mt-[6px] font-secondary text-[13px] leading-tight font-semibold text-[#1e1b4b]">
          {destaque.titulo} <span className="text-[#8b5cf6]">{destaque.realce}</span>
        </p>
        <button
          type="button"
          onClick={() => emBreve("O download do guia")}
          className="mt-[10px] rounded-[3px] bg-[#f26b3a] px-[14px] py-[3px] font-secondary text-[11px] font-semibold text-white transition-[filter] hover:brightness-110"
        >
          {destaque.cta}
        </button>
      </div>
      <div aria-hidden className="relative mr-[10px] flex h-[90px] w-[90px] shrink-0 items-end justify-center">
        <FontAwesomeIcon icon={faLaptop} className="text-[64px] text-[#475569]" />
        <FontAwesomeIcon icon={faUserTie} className="absolute top-0 right-0 text-[34px] text-[#3b82f6]" />
      </div>
    </article>
  );
}

// designs/New Produtos.png — atalhos de categoria no topo (filtram), busca, banners e uma linha por categoria.
export default function ProdutosPage() {
  const { data: produtos } = useSWR("produtos", getProdutos);
  const { data: destaques } = useSWR("produtos/destaques", getDestaques);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<CategoriaProduto | null>(null);

  const filtrando = Boolean(busca.trim() || categoria);
  const resultados = useMemo(() => {
    const termo = normalizar(busca);
    return (produtos ?? []).filter(
      (p) =>
        (!termo || normalizar(`${p.nome} ${p.vendedor.fullName} ${p.categoria}`).includes(termo)) &&
        (!categoria || p.categoria === categoria)
    );
  }, [produtos, busca, categoria]);

  const linhas = CATEGORIAS_PRODUTO.map((c) => ({ categoria: c, itens: (produtos ?? []).filter((p) => p.categoria === c) })).filter(
    (linha) => linha.itens.length > 0
  );

  return (
    <main className="pb-4">
      <PageTitle>Produtos</PageTitle>

      <nav aria-label="Categorias" className="-mx-[23px] mt-[20px] flex justify-between gap-2 overflow-x-auto px-[23px] [scrollbar-width:none] md:mx-0 md:justify-start md:gap-8 md:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORIAS_PRODUTO.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={categoria === c}
            onClick={() => setCategoria(categoria === c ? null : c)}
            className={cn(
              "w-[64px] shrink-0 text-center font-secondary text-[10px] leading-[1.2] font-semibold transition-colors md:w-auto",
              categoria === c ? "text-[#3bd4cc]" : "text-white hover:text-[#3bd4cc]"
            )}
          >
            {c}
          </button>
        ))}
      </nav>

      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Livro de Programação" label="Buscar produtos" className="mt-[12px]" />

      {filtrando ? (
        <section className="mt-[20px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-[#d9d9d9] md:text-[17px]">
              {categoria ?? "Resultados"} <span className="text-[#8a8a8a]">({resultados.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCategoria(null);
              }}
              className="font-secondary text-[12px] text-[#3bd4cc] hover:text-white"
            >
              Limpar filtros
            </button>
          </div>
          {resultados.length === 0 ? (
            <p className="mt-10 text-center font-secondary text-[13px] text-[#8a8a8a]">
              {categoria && !busca.trim() ? "Ainda não há produtos nessa categoria." : "Nenhum produto encontrado."}
            </p>
          ) : (
            <ul className="mt-[18px] grid grid-cols-2 gap-x-[20px] gap-y-[18px] sm:grid-cols-3 lg:grid-cols-5">
              {resultados.map((p) => (
                <li key={p.id}>
                  <ProdutoCard produto={p} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {destaques && (
            <ScrollRow label="Destaques" dots className="mt-[15px]">
              {destaques.map((d) => (
                <DestaqueBanner key={d.id} destaque={d} />
              ))}
            </ScrollRow>
          )}
          {linhas.map((linha) => (
            <section key={linha.categoria} className="mt-[20px] md:mt-8">
              <SectionHeader title={linha.categoria} onMore={() => setCategoria(linha.categoria)} />
              <ScrollRow label={linha.categoria} className="mt-[10px]">
                {linha.itens.map((p) => (
                  <ProdutoCard key={p.id} produto={p} />
                ))}
              </ScrollRow>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
