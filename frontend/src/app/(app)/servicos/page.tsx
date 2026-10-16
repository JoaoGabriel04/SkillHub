"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { ChipRow } from "@/components/app/chip-row";
import { FilterChip } from "@/components/app/filter-chip";
import { PageTitle } from "@/components/app/page-title";
import { PublicarServicoDialog } from "@/components/app/publicar-servico-dialog";
import { ScrollRow } from "@/components/app/scroll-row";
import { SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { ServicoCard } from "@/components/app/servico-card";
import { ServicoCardEsqueleto } from "@/components/app/servico-card-esqueleto";
import { ContentCard } from "@/components/ui/content-card";
import { CtaButton } from "@/components/ui/cta-button";
import { CHAVE_MEUS_SERVICOS, chaveServicos, getMeusServicos, getServicos, type FiltrosServicos } from "@/lib/servicos";
import { CHAVE_MINHAS_CANDIDATURAS, getMinhasCandidaturas } from "@/lib/candidaturas";
import { useAuthStore } from "@/stores/auth-store";
import { CATEGORIAS_SERVICO, type CategoriaServico, type Servico } from "@/types/servico";

// "Mais próximos" volta quando existir distância (Fase 17A: distanciaKm é null)
const ORGANIZAR = ["Mais recentes", "Maior remuneração"] as const;
const REMUNERACAO = ["Até 100 créditos", "De 100 a 300 créditos", "Acima de 300 créditos", "A combinar"] as const;
const PRAZO = ["Até 3 dias", "Até 7 dias", "Até 30 dias", "Sem prazo"] as const;
const LIMITE = 50; // o máximo por requisição da API; "carregar mais" fica para quando o volume justificar

type Organizar = (typeof ORGANIZAR)[number];
type Remuneracao = (typeof REMUNERACAO)[number];
type Prazo = (typeof PRAZO)[number];

const ORDENACAO: Record<Organizar, (a: Servico, b: Servico) => number> = {
  "Mais recentes": (a, b) => b.createdAt.localeCompare(a.createdAt),
  "Maior remuneração": (a, b) => (b.remuneracao ?? -1) - (a.remuneracao ?? -1),
};

function atendeRemuneracao(s: Servico, filtro: Remuneracao) {
  const r = s.remuneracao;
  if (filtro === "A combinar") return r === null;
  if (r === null) return false;
  if (filtro === "Até 100 créditos") return r <= 100;
  if (filtro === "De 100 a 300 créditos") return r > 100 && r <= 300;
  return r > 300;
}

function atendePrazo(s: Servico, filtro: Prazo) {
  if (filtro === "Sem prazo") return s.prazo === null;
  if (s.prazo === null) return false;
  const dias = (new Date(s.prazo).getTime() - Date.now()) / 86_400_000;
  return dias <= { "Até 3 dias": 3, "Até 7 dias": 7, "Até 30 dias": 30 }[filtro];
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

const buscarServicos = ([, filtros]: ReturnType<typeof chaveServicos>) => getServicos(filtros);

function LinhaEsqueleto() {
  return (
    <section className="mt-[20px] sm:mt-10" aria-busy>
      <span className="block h-4 w-40 animate-pulse rounded bg-foreground/10" />
      <ScrollRow label="Carregando" className="mt-[10px] sm:mt-4">
        {[0, 1, 2].map((i) => (
          <ServicoCardEsqueleto key={i} />
        ))}
      </ScrollRow>
    </section>
  );
}

// designs/New Serviços.png — sem filtro: "Seus pedidos" (sempre visível; vazio, convida a publicar), "na sua área"
// (mesma cidade) e uma linha por
// categoria; com busca/filtro (ou ao tocar na seta de uma linha): lista única de resultados.
// Fase 17A: dados da API (GET /servicos). Categoria, busca e cidade vão na requisição; remuneração,
// prazo e ordem filtram no cliente o que veio (a API da 17A não tem esses filtros).
export default function ServicosPage() {
  const cidade = useAuthStore((s) => s.user?.cidade ?? null);
  const ehColaborador = useAuthStore((s) => s.user?.perfil === "Colaborador");
  const [busca, setBusca] = useState("");
  const [organizar, setOrganizar] = useState<Organizar | null>(null);
  const [categoria, setCategoria] = useState<CategoriaServico | null>(null);
  const [remuneracao, setRemuneracao] = useState<Remuneracao | null>(null);
  const [prazo, setPrazo] = useState<Prazo | null>(null);
  const [soNaArea, setSoNaArea] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const termo = useDebounce(busca.trim());

  const filtrando = Boolean(busca.trim() || categoria || remuneracao || prazo || soNaArea);
  const filtros: FiltrosServicos = {
    limit: LIMITE,
    ...(categoria && { categoria }),
    ...(termo && { q: termo }),
    ...(soNaArea && cidade && { cidade }),
  };
  const lista = useSWR(chaveServicos(filtros), buscarServicos);
  // linha "Serviços na sua área": pedidos de quem mora na mesma cidade (sem distância ainda)
  const naArea = useSWR(!filtrando && cidade ? chaveServicos({ limit: LIMITE, cidade }) : null, buscarServicos);
  const meus = useSWR(CHAVE_MEUS_SERVICOS, getMeusServicos);
  // Fase 17B: só colaboradores se candidatam, então só eles têm "Suas candidaturas"
  const minhas = useSWR(ehColaborador ? CHAVE_MINHAS_CANDIDATURAS : null, getMinhasCandidaturas);

  const ordem = ORDENACAO[organizar ?? "Mais recentes"];
  const resultados = useMemo(
    () =>
      (lista.data ?? [])
        .filter((s) => (!remuneracao || atendeRemuneracao(s, remuneracao)) && (!prazo || atendePrazo(s, prazo)))
        .sort(ordem),
    [lista.data, remuneracao, prazo, ordem]
  );

  function limparFiltros() {
    setBusca("");
    setCategoria(null);
    setRemuneracao(null);
    setPrazo(null);
    setSoNaArea(false);
  }

  // "Seus pedidos" não tem seta: a lista inteira já está na linha (editar e cancelar pela tela vêm na 17B)
  const linhas: { titulo: string; itens: Servico[]; abrir?: () => void; etiquetas?: Record<string, string> }[] = [
    ...(meus.data?.length ? [{ titulo: "Seus pedidos", itens: [...meus.data].sort(ordem) }] : []),
    // o card mostra o status da candidatura no lugar da distância; a aceita, num pedido concluído, mostra
    // "Não avaliado" até o colaborador avaliar e "Concluído" depois (Fase 17D)
    ...(minhas.data?.length
      ? [
          {
            titulo: "Suas candidaturas",
            itens: minhas.data.map((c) => c.servico),
            etiquetas: Object.fromEntries(
              minhas.data.map((c) => [
                c.servico.id,
                c.status === "Aceita" && c.servico.status === "Concluído"
                  ? c.servico.avaliacaoPendente
                    ? "Não avaliado"
                    : "Concluído"
                  : `Candidatura ${c.status.toLowerCase()}`,
              ])
            ),
          },
        ]
      : []),
    { titulo: "Serviços na sua área", itens: [...(naArea.data ?? [])].sort(ordem), abrir: () => setSoNaArea(true) },
    ...CATEGORIAS_SERVICO.map((c) => ({
      titulo: c as string,
      itens: resultados.filter((s) => s.categoria === c),
      abrir: () => setCategoria(c),
    })),
  ].filter((linha) => linha.itens.length > 0);

  return (
    <main className="pb-4">
      <div className="flex items-end justify-between gap-3">
        <PageTitle>Serviços</PageTitle>
        <CtaButton onClick={() => setPublicando(true)} className="flex h-8 shrink-0 items-center gap-2 px-3 sm:h-9 sm:px-4">
          <FontAwesomeIcon icon={faPlus} className="text-[11px] sm:text-[12px]" />
          Publicar
        </CtaButton>
      </div>
      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Aulas de Matemática" label="Buscar serviços" className="mt-[33px] sm:mt-8" />

      <ChipRow label="Filtros" className="mt-[15px] gap-[5px] pb-1 sm:mt-5 sm:gap-2">
        <FilterChip label="Organizar" options={ORGANIZAR} value={organizar} onChange={setOrganizar} />
        <FilterChip label="Categoria" options={CATEGORIAS_SERVICO} value={categoria} onChange={setCategoria} />
        <FilterChip label="Remuneração" options={REMUNERACAO} value={remuneracao} onChange={setRemuneracao} />
        <FilterChip label="Prazo" options={PRAZO} value={prazo} onChange={setPrazo} />
      </ChipRow>

      {lista.error ? (
        <div role="alert" className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Não foi possível carregar os pedidos.</p>
          <CtaButton onClick={() => lista.mutate()} className="h-8 px-4">
            Tentar de novo
          </CtaButton>
        </div>
      ) : !lista.data ? (
        <>
          <LinhaEsqueleto />
          <LinhaEsqueleto />
        </>
      ) : filtrando ? (
        <section className="mt-[20px] sm:mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">
              {soNaArea ? "Serviços na sua área" : "Resultados"}{" "}
              <span className="text-muted-foreground">({resultados.length})</span>
            </h2>
            <button type="button" onClick={limparFiltros} className="font-secondary text-[12px] text-accent-text hover:text-foreground sm:text-[14px]">
              Limpar filtros
            </button>
          </div>
          {resultados.length === 0 ? (
            <p className="mt-10 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Nenhum pedido encontrado.</p>
          ) : (
            <ul className="mt-[18px] grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
              {resultados.map((s) => (
                <li key={s.id}>
                  <ServicoCard servico={s} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* "Seus pedidos" sem pedidos: o lugar fica visível, com o convite para publicar o primeiro */}
          {meus.data?.length === 0 && (
            <section className="mt-[20px] sm:mt-10">
              <SectionHeader title="Seus pedidos" />
              <ContentCard className="mt-[10px] flex flex-col items-start gap-3 px-4 py-4 font-secondary sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[13px] text-foreground-secondary sm:text-[14px]">
                  Você ainda não publicou nenhum pedido. Precisa de alguém para um serviço? Publique e ele aparece aqui.
                </p>
                <CtaButton onClick={() => setPublicando(true)} className="flex h-8 shrink-0 items-center gap-2 px-4">
                  <FontAwesomeIcon icon={faPlus} className="text-[11px] sm:text-[12px]" />
                  Publicar pedido
                </CtaButton>
              </ContentCard>
            </section>
          )}
          {linhas.length === 0 ? (
            <p className="mt-12 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Nenhum pedido encontrado.</p>
          ) : (
            linhas.map((linha) => (
              <section key={linha.titulo} className="mt-[20px] sm:mt-10">
                <SectionHeader title={linha.titulo} onMore={linha.abrir} />
                <ScrollRow label={linha.titulo} className="mt-[10px] sm:mt-4">
                  {linha.itens.map((s) => (
                    <ServicoCard key={s.id} servico={s} etiqueta={linha.etiquetas?.[s.id]} />
                  ))}
                </ScrollRow>
              </section>
            ))
          )}
        </>
      )}

      {/* montado só enquanto aberto: o formulário sempre começa vazio */}
      {publicando && <PublicarServicoDialog open onOpenChange={setPublicando} />}
    </main>
  );
}
