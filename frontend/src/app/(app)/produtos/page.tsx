"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLaptop, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { ChipRow } from "@/components/app/chip-row";
import { PageTitle } from "@/components/app/page-title";
import { ProdutoCard } from "@/components/app/produto-card";
import { ScrollRow } from "@/components/app/scroll-row";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { ctaButtonClass } from "@/components/ui/cta-button";
import { emBreve } from "@/lib/em-breve";
import { CATEGORIAS_PRODUTO, getDestaques, getProdutos, type CategoriaProduto, type Destaque } from "@/lib/mock/produtos";
import { cn } from "@/lib/utils";

// Faixa listrada do topo e da base dos banners (no mockup era roxa; segue o ciano da marca)
const LISTRA = "bg-[repeating-linear-gradient(135deg,var(--accent)_0_4px,transparent_4px_8px)]";

function DestaqueBanner({ destaque }: { destaque: Destaque }) {
  return (
    <article className="relative flex h-[130px] w-[86%] max-w-[341px] items-center overflow-hidden rounded-[10px] bg-surface-2 pl-[14px] sm:h-[160px] sm:w-[440px] sm:max-w-none sm:pl-6 lg:w-[480px]">
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-[6px]", LISTRA)} />
      <div aria-hidden className={cn("absolute inset-x-0 bottom-0 h-[6px]", LISTRA)} />
      <div className="relative z-10 min-w-0 flex-1">
        <p className="font-secondary text-[18px] leading-none font-semibold text-foreground italic sm:text-[22px]">{destaque.chamada}</p>
        <p className="mt-[6px] font-secondary text-[13px] leading-tight font-semibold text-foreground sm:text-[16px]">
          {destaque.titulo} <span className="text-accent-text">{destaque.realce}</span>
        </p>
        <button
          type="button"
          onClick={() => emBreve("O download do guia")}
          className={cn(ctaButtonClass, "mt-[10px] px-[14px] py-[3px] sm:mt-3 sm:px-5 sm:py-[5px] sm:text-[13px]")}
        >
          {destaque.cta}
        </button>
      </div>
      <div aria-hidden className="relative mr-[10px] flex h-[90px] w-[90px] shrink-0 items-end justify-center sm:mr-6 sm:h-[110px] sm:w-[110px]">
        <FontAwesomeIcon icon={faLaptop} className="text-[64px] text-foreground-secondary sm:text-[80px]" />
        <FontAwesomeIcon icon={faUserTie} className="absolute top-0 right-0 text-[34px] text-accent-text sm:text-[42px]" />
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

      <ChipRow label="Categorias" className="mt-[20px] justify-between gap-2 sm:mt-6 sm:justify-start sm:gap-8">
        {CATEGORIAS_PRODUTO.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={categoria === c}
            onClick={() => setCategoria(categoria === c ? null : c)}
            className={cn(
              "w-[64px] shrink-0 text-center font-secondary text-[10px] leading-[1.2] font-semibold transition-colors sm:w-auto sm:text-[13px] lg:text-[14px]",
              categoria === c ? "text-accent-text" : "text-foreground hover:text-accent-text"
            )}
          >
            {c}
          </button>
        ))}
      </ChipRow>

      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Livro de Programação" label="Buscar produtos" className="mt-[12px] sm:mt-5" />

      {filtrando ? (
        <section className="mt-[20px] sm:mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">
              {categoria ?? "Resultados"} <span className="text-muted-foreground">({resultados.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCategoria(null);
              }}
              className="font-secondary text-[12px] text-accent-text hover:text-foreground sm:text-[14px]"
            >
              Limpar filtros
            </button>
          </div>
          {resultados.length === 0 ? (
            <p className="mt-10 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">
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
            <ScrollRow label="Destaques" dots className="mt-[15px] sm:mt-6">
              {destaques.map((d) => (
                <DestaqueBanner key={d.id} destaque={d} />
              ))}
            </ScrollRow>
          )}
          {linhas.map((linha) => (
            <section key={linha.categoria} className="mt-[20px] sm:mt-10">
              <SectionHeader title={linha.categoria} onMore={() => setCategoria(linha.categoria)} />
              <ScrollRow label={linha.categoria} className="mt-[10px] sm:mt-4">
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
