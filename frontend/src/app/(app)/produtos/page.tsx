"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLaptop, faPlus, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { BotaoCarrinho } from "@/components/app/botao-carrinho";
import { ChipRow } from "@/components/app/chip-row";
import { PageTitle } from "@/components/app/page-title";
import { PedidoCard } from "@/components/app/pedido-card";
import { ProdutoCard } from "@/components/app/produto-card";
import { ProdutoCardEsqueleto } from "@/components/app/produto-card-esqueleto";
import { PublicarProdutoDialog } from "@/components/app/publicar-produto-dialog";
import { ScrollRow } from "@/components/app/scroll-row";
import { SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { ContentCard } from "@/components/ui/content-card";
import { CtaButton, ctaButtonClass } from "@/components/ui/cta-button";
import { emBreve } from "@/lib/em-breve";
import { getDestaques, type Destaque } from "@/lib/mock/produtos";
import { CHAVE_COMPRAS, CHAVE_VENDAS, getCompras, getVendas } from "@/lib/pedidos";
import { CHAVE_MEUS_PRODUTOS, chaveProdutos, getMeusProdutos, getProdutos, type FiltrosProdutos } from "@/lib/produtos";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { CATEGORIAS_PRODUTO, type CategoriaProduto } from "@/types/produto";

// Faixa listrada do topo e da base dos banners (no mockup era roxa; segue o ciano da marca, --stripe por tema)
const LISTRA = "bg-[repeating-linear-gradient(135deg,var(--stripe)_0_4px,transparent_4px_8px)]";
const POR_LINHA = 12; // produtos por linha de categoria (a seta abre a categoria inteira)
const LIMITE = 50; // o máximo por requisição da API; "carregar mais" fica para quando o volume justificar

function DestaqueBanner({ destaque }: { destaque: Destaque }) {
  return (
    <article className="relative flex h-[130px] w-[86%] max-w-[341px] items-center overflow-hidden rounded-[10px] bg-banner pl-[14px] shadow-(--banner-shadow) sm:h-[160px] sm:w-[440px] sm:max-w-none sm:pl-6 lg:w-[480px]">
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

// Busca só depois que a pessoa para de digitar, para não pedir à API a cada tecla
function useDebounce<T>(valor: T, ms = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

const buscarProdutos = ([, filtros]: ReturnType<typeof chaveProdutos>) => getProdutos(filtros);
// as linhas por categoria: uma requisição por categoria (decisão D10), cada linha com os mais recentes dela
const CHAVE_LINHAS = ["produtos", "linhas"] as const;
const buscarLinhas = () => Promise.all(CATEGORIAS_PRODUTO.map((categoria) => getProdutos({ categoria, limit: POR_LINHA })));

function LinhaEsqueleto() {
  return (
    <section className="mt-[20px] sm:mt-10" aria-busy>
      <span className="block h-4 w-40 animate-pulse rounded bg-foreground/10" />
      <ScrollRow label="Carregando" className="mt-[10px] sm:mt-4">
        {[0, 1, 2].map((i) => (
          <ProdutoCardEsqueleto key={i} />
        ))}
      </ScrollRow>
    </section>
  );
}

function ErroAoCarregar({ onTentar, oQue = "os produtos", className = "mt-12" }: { onTentar: () => void; oQue?: string; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <p className="font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Não foi possível carregar {oQue}.</p>
      <CtaButton onClick={onTentar} className="h-8 px-4">
        Tentar de novo
      </CtaButton>
    </div>
  );
}

// designs/New Produtos.png — atalhos de categoria no topo (filtram), busca, banners e uma linha por categoria.
// Fase 18A: dados da API (GET /produtos). Categoria e busca vão na requisição. Quem vende (Colaborador e Empresa)
// tem "Publicar" e a linha "Seus produtos" (GET /produtos/meus), no padrão de "Seus pedidos" dos Serviços.
export default function ProdutosPage() {
  const perfil = useAuthStore((s) => s.user?.perfil);
  const vende = perfil === "Colaborador" || perfil === "Empresa";
  const { data: destaques } = useSWR("produtos/destaques", getDestaques);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<CategoriaProduto | null>(null);
  const [publicando, setPublicando] = useState(false);
  const termo = useDebounce(busca.trim());

  const filtrando = Boolean(busca.trim() || categoria);
  const filtros: FiltrosProdutos = { limit: LIMITE, ...(categoria && { categoria }), ...(termo && { busca: termo }) };
  const resultados = useSWR(filtrando ? chaveProdutos(filtros) : null, buscarProdutos, { keepPreviousData: true });
  const porCategoria = useSWR(filtrando ? null : CHAVE_LINHAS, buscarLinhas);
  const meus = useSWR(vende ? CHAVE_MEUS_PRODUTOS : null, getMeusProdutos);
  // Fase 18B: compras (todos compram) e vendas (só quem vende); as linhas só aparecem com ao menos 1 (decisão D10)
  const compras = useSWR(CHAVE_COMPRAS, getCompras);
  const vendas = useSWR(vende ? CHAVE_VENDAS : null, getVendas);
  const lista = filtrando ? resultados : porCategoria;

  const linhas = CATEGORIAS_PRODUTO.map((c, i) => ({ categoria: c, itens: porCategoria.data?.[i] ?? [] })).filter((linha) => linha.itens.length > 0);
  // fotos sem lazy nas 2 primeiras linhas com cards (compras, vendas, Seus produtos e/ou categorias), até 6 por linha:
  // é o que cabe na primeira tela (2 linhas no celular, até 6 cards a 1920px), e qualquer uma dessas fotos pode ser o LCP
  const linhasNaDobra = [
    ...(compras.data?.length ? ["Suas compras"] : []),
    ...(vende && vendas.data?.length ? ["Suas vendas"] : []),
    ...(vende && meus.data?.length ? ["Seus produtos"] : []),
    ...linhas.map((l) => l.categoria),
  ].slice(0, 2);
  const naDobra = (linha: string, i: number) => linhasNaDobra.includes(linha) && i < 6;

  return (
    <main className="pb-4">
      <div className="flex items-end justify-between gap-3">
        <PageTitle>Produtos</PageTitle>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <BotaoCarrinho />
          {vende && (
            <CtaButton onClick={() => setPublicando(true)} className="flex h-8 shrink-0 items-center gap-2 px-3 sm:h-9 sm:px-4">
              <FontAwesomeIcon icon={faPlus} className="text-[11px] sm:text-[12px]" />
              Publicar
            </CtaButton>
          )}
        </div>
      </div>

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

      {lista.error ? (
        <ErroAoCarregar onTentar={() => lista.mutate()} />
      ) : filtrando ? (
        <section className="mt-[20px] sm:mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">
              {categoria ?? "Resultados"} {resultados.data && <span className="text-muted-foreground">({resultados.data.length})</span>}
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
          {!resultados.data ? (
            <ul aria-busy className="mt-[18px] grid grid-cols-2 gap-x-[20px] gap-y-[18px] sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <ProdutoCardEsqueleto className="w-full" />
                </li>
              ))}
            </ul>
          ) : resultados.data.length === 0 ? (
            <p className="mt-10 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">
              {categoria && !busca.trim() ? "Ainda não há produtos nessa categoria." : "Nenhum produto encontrado."}
            </p>
          ) : (
            <ul className="mt-[18px] grid grid-cols-2 gap-x-[20px] gap-y-[18px] sm:grid-cols-3 lg:grid-cols-5">
              {resultados.data.map((p, i) => (
                <li key={p.id}>
                  <ProdutoCard produto={p} className="w-full" acimaDaDobra={i < 10} />
                  {/* 10 sem lazy: o que cabe na 1ª tela (2 linhas de 5 no desktop, 4-5 de 2 no celular) */}
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
          {[
            { titulo: "Suas compras", r: compras },
            { titulo: "Suas vendas", r: vendas },
          ].map(({ titulo, r }) =>
            r.error ? (
              <section key={titulo} className="mt-[20px] sm:mt-10">
                <SectionHeader title={titulo} />
                <ErroAoCarregar onTentar={() => r.mutate()} oQue={titulo === "Suas compras" ? "suas compras" : "suas vendas"} className="mt-4" />
              </section>
            ) : r.isLoading ? (
              <LinhaEsqueleto key={titulo} />
            ) : r.data?.length ? (
              <section key={titulo} className="mt-[20px] sm:mt-10">
                <SectionHeader title={titulo} />
                <ScrollRow label={titulo} className="mt-[10px] sm:mt-4">
                  {r.data.map((p, i) => (
                    <PedidoCard key={p.id} pedido={p} acimaDaDobra={naDobra(titulo, i)} />
                  ))}
                </ScrollRow>
              </section>
            ) : null
          )}
          {/* "Seus produtos" sem produtos: o lugar fica visível, com o convite para publicar o primeiro */}
          {vende && meus.data?.length === 0 && (
            <section className="mt-[20px] sm:mt-10">
              <SectionHeader title="Seus produtos" />
              <ContentCard className="mt-[10px] flex flex-col items-start gap-3 px-4 py-4 font-secondary sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[13px] text-foreground-secondary sm:text-[14px]">
                  Você ainda não publicou nenhum produto. Tem algo para vender? Publique e ele aparece aqui.
                </p>
                <CtaButton onClick={() => setPublicando(true)} className="flex h-8 shrink-0 items-center gap-2 px-4">
                  <FontAwesomeIcon icon={faPlus} className="text-[11px] sm:text-[12px]" />
                  Publicar produto
                </CtaButton>
              </ContentCard>
            </section>
          )}
          {vende && !!meus.data?.length && (
            <section className="mt-[20px] sm:mt-10">
              <SectionHeader title="Seus produtos" />
              <ScrollRow label="Seus produtos" className="mt-[10px] sm:mt-4">
                {meus.data.map((p, i) => (
                  <ProdutoCard key={p.id} produto={p} acimaDaDobra={naDobra("Seus produtos", i)} />
                ))}
              </ScrollRow>
            </section>
          )}
          {!porCategoria.data ? (
            <>
              <LinhaEsqueleto />
              <LinhaEsqueleto />
            </>
          ) : linhas.length === 0 ? (
            <p className="mt-12 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Ainda não há produtos à venda.</p>
          ) : (
            linhas.map((linha) => (
              <section key={linha.categoria} className="mt-[20px] sm:mt-10">
                <SectionHeader title={linha.categoria} onMore={() => setCategoria(linha.categoria)} />
                <ScrollRow label={linha.categoria} className="mt-[10px] sm:mt-4">
                  {linha.itens.map((p, i) => (
                    <ProdutoCard key={p.id} produto={p} acimaDaDobra={naDobra(linha.categoria, i)} />
                  ))}
                </ScrollRow>
              </section>
            ))
          )}
        </>
      )}

      {/* montado só enquanto aberto: o formulário sempre começa vazio */}
      {publicando && <PublicarProdutoDialog open onOpenChange={setPublicando} />}
    </main>
  );
}
