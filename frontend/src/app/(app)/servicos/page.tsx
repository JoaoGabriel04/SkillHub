"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ChipRow } from "@/components/app/chip-row";
import { FilterChip } from "@/components/app/filter-chip";
import { PageTitle } from "@/components/app/page-title";
import { ScrollRow } from "@/components/app/scroll-row";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { ServicoCard } from "@/components/app/servico-card";
import { CATEGORIAS_SERVICO, getServicos, type CategoriaServico, type Servico } from "@/lib/mock/servicos";

const RAIO_AREA_KM = 5;

const ORGANIZAR = ["Mais próximos", "Mais recentes", "Maior remuneração"] as const;
const REMUNERACAO = ["Até 100 créditos", "De 100 a 300 créditos", "Acima de 300 créditos", "A combinar"] as const;
const PRAZO = ["Até 3 dias", "Até 7 dias", "Até 30 dias", "Sem prazo"] as const;

type Organizar = (typeof ORGANIZAR)[number];
type Remuneracao = (typeof REMUNERACAO)[number];
type Prazo = (typeof PRAZO)[number];

const ORDENACAO: Record<Organizar, (a: Servico, b: Servico) => number> = {
  "Mais próximos": (a, b) => a.distanciaKm - b.distanciaKm,
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

// designs/New Serviços.png — sem filtro: "na sua área" + uma linha por categoria;
// com busca/filtro (ou ao tocar na seta de uma linha): lista única de resultados.
export default function ServicosPage() {
  const { data: servicos } = useSWR("servicos", getServicos);
  const [busca, setBusca] = useState("");
  const [organizar, setOrganizar] = useState<Organizar | null>(null);
  const [categoria, setCategoria] = useState<CategoriaServico | null>(null);
  const [remuneracao, setRemuneracao] = useState<Remuneracao | null>(null);
  const [prazo, setPrazo] = useState<Prazo | null>(null);
  const [soNaArea, setSoNaArea] = useState(false);

  const ordenados = useMemo(
    () => (servicos && organizar ? [...servicos].sort(ORDENACAO[organizar]) : (servicos ?? [])),
    [servicos, organizar]
  );

  const filtrando = Boolean(busca.trim() || categoria || remuneracao || prazo || soNaArea);
  const resultados = useMemo(() => {
    const termo = normalizar(busca);
    return ordenados.filter(
      (s) =>
        (!termo || normalizar(`${s.titulo} ${s.descricao} ${s.autor.fullName} ${s.categoria}`).includes(termo)) &&
        (!categoria || s.categoria === categoria) &&
        (!remuneracao || atendeRemuneracao(s, remuneracao)) &&
        (!prazo || atendePrazo(s, prazo)) &&
        (!soNaArea || s.distanciaKm <= RAIO_AREA_KM)
    );
  }, [ordenados, busca, categoria, remuneracao, prazo, soNaArea]);

  function limparFiltros() {
    setBusca("");
    setCategoria(null);
    setRemuneracao(null);
    setPrazo(null);
    setSoNaArea(false);
  }

  const naArea = ordenados.filter((s) => s.distanciaKm <= RAIO_AREA_KM).sort(organizar ? ORDENACAO[organizar] : ORDENACAO["Mais próximos"]);
  const linhas: { titulo: string; itens: Servico[]; abrir: () => void }[] = [
    { titulo: "Serviços na sua área", itens: naArea, abrir: () => setSoNaArea(true) },
    ...CATEGORIAS_SERVICO.map((c) => ({
      titulo: c as string,
      itens: ordenados.filter((s) => s.categoria === c),
      abrir: () => setCategoria(c),
    })),
  ].filter((linha) => linha.itens.length > 0);

  return (
    <main className="pb-4">
      <PageTitle>Serviços</PageTitle>
      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Aulas de Matemática" label="Buscar serviços" className="mt-[33px] sm:mt-8" />

      <ChipRow label="Filtros" className="mt-[15px] gap-[5px] pb-1 sm:mt-5 sm:gap-2">
        <FilterChip label="Organizar" options={ORGANIZAR} value={organizar} onChange={setOrganizar} />
        <FilterChip label="Categoria" options={CATEGORIAS_SERVICO} value={categoria} onChange={setCategoria} />
        <FilterChip label="Remuneração" options={REMUNERACAO} value={remuneracao} onChange={setRemuneracao} />
        <FilterChip label="Prazo" options={PRAZO} value={prazo} onChange={setPrazo} />
      </ChipRow>

      {!servicos ? null : filtrando ? (
        <section className="mt-[20px] sm:mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] text-[#d9d9d9] sm:text-[18px] lg:text-[20px]">
              {soNaArea ? "Serviços na sua área" : "Resultados"}{" "}
              <span className="text-[#8a8a8a]">({resultados.length})</span>
            </h2>
            <button type="button" onClick={limparFiltros} className="font-secondary text-[12px] text-[#3bd4cc] hover:text-white sm:text-[14px]">
              Limpar filtros
            </button>
          </div>
          {resultados.length === 0 ? (
            <p className="mt-10 text-center font-secondary text-[13px] text-[#8a8a8a] sm:text-[15px]">Nenhum serviço encontrado.</p>
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
        linhas.map((linha) => (
          <section key={linha.titulo} className="mt-[20px] sm:mt-10">
            <SectionHeader title={linha.titulo} onMore={linha.abrir} />
            <ScrollRow label={linha.titulo} className="mt-[10px] sm:mt-4">
              {linha.itens.map((s) => (
                <ServicoCard key={s.id} servico={s} />
              ))}
            </ScrollRow>
          </section>
        ))
      )}
    </main>
  );
}
