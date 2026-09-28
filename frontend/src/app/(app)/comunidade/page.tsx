"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Avatar } from "@/components/app/avatar";
import { ChipRow } from "@/components/app/chip-row";
import { PageTitle } from "@/components/app/page-title";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { SectionHeader } from "@/components/app/section-header";
import { ContentCard } from "@/components/ui/content-card";
import { GlassCard } from "@/components/ui/glass-card";
import { emBreve } from "@/lib/em-breve";
import { getPostagens, TAGS_COMUNIDADE, type Postagem, type TagComunidade } from "@/lib/mock/comunidade";
import { cn } from "@/lib/utils";

const tempoRelativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

// "há 30 minutos", "há 1 hora", "há 2 dias"
function haQuanto(iso: string) {
  const minutos = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutos) < 60) return tempoRelativo.format(minutos, "minute");
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return tempoRelativo.format(horas, "hour");
  return tempoRelativo.format(Math.round(horas / 24), "day");
}

const formatData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

// designs/New Comunidade.png — busca, tags (filtram), feed, dúvidas e eventos lado a lado, histórias de sucesso.
export default function ComunidadePage() {
  const { data: postagens } = useSWR("postagens", getPostagens);
  const [busca, setBusca] = useState("");
  const [tag, setTag] = useState<TagComunidade | null>(null);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca);
    return (postagens ?? []).filter(
      (p) =>
        (!termo || normalizar(`${p.titulo ?? ""} ${p.conteudo} ${p.autor.fullName} ${p.tags.join(" ")}`).includes(termo)) &&
        (!tag || p.tags.includes(tag))
    );
  }, [postagens, busca, tag]);

  const doTipo = (tipo: Postagem["tipo"]) => visiveis.filter((p) => p.tipo === tipo);
  const feed = doTipo("feed");
  const duvidas = doTipo("duvida");
  const eventos = doTipo("evento");
  const historias = doTipo("historia");

  return (
    <main className="pb-4">
      <PageTitle>Comunidade</PageTitle>
      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Eventos" label="Buscar na comunidade" className="mt-[33px] sm:mt-8" />

      <ChipRow label="Tags" className="mt-[15px] gap-[10px] sm:mt-5">
        {TAGS_COMUNIDADE.map((t) => (
          <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className="shrink-0">
            <GlassCard
              className={cn(
                "flex h-[29px] items-center rounded-[5px] px-[10px] text-[15px] text-[#d9d9d9] transition-colors hover:text-white sm:h-[34px] sm:px-3 lg:h-9 lg:text-[16px]",
                tag === t && "border-[#3bd4cc]/70 text-white"
              )}
            >
              {t}
            </GlassCard>
          </button>
        ))}
      </ChipRow>

      {postagens && visiveis.length === 0 && (
        <p className="mt-12 text-center font-secondary text-[13px] text-[#8a8a8a] sm:text-[15px]">Nenhuma postagem encontrada.</p>
      )}

      {feed.length > 0 && (
        <section className="mt-[20px] sm:mt-8">
          <SectionHeader title="Feed de Postagens" onMore={() => emBreve("O feed completo")} />
          <div className="mt-[10px] grid gap-[12px] sm:mt-4">
            {feed.map((p) => (
              <ContentCard key={p.id} className="flex flex-col gap-[14px] px-[12px] pt-[12px] pb-[10px] sm:gap-4 sm:p-5">
                <p className="font-secondary text-[12px] leading-[1.35] text-[#d9d9d9] sm:text-[14px] lg:text-[15px]">{p.conteudo}</p>
                <Avatar nome={p.autor.fullName} src={p.autor.urlPhoto} size={30} className="sm:size-10!" />
              </ContentCard>
            ))}
          </div>
        </section>
      )}

      {(duvidas.length > 0 || eventos.length > 0) && (
        <div className="mt-[25px] grid grid-cols-2 gap-[21px] sm:mt-10 sm:gap-8">
          <section>
            <SectionHeader title="Dúvidas" onMore={() => emBreve("A lista de dúvidas")} />
            <ul className="mt-[10px] flex flex-col gap-[12px] sm:mt-4">
              {duvidas.map((p) => (
                <li key={p.id}>
                  <ContentCard className="px-[6px] pt-[5px] pb-[4px] font-secondary sm:px-3 sm:py-2.5">
                    <h3 className="line-clamp-2 text-[11px] leading-[1.3] font-semibold text-white sm:text-[14px] lg:text-[15px]">{p.titulo}</h3>
                    <p className="mt-[3px] flex justify-between gap-2 text-[8px] text-[#8a8a8a] sm:mt-1 sm:text-[11px] lg:text-[12px]">
                      <span className="truncate">{p.autor.fullName}</span>
                      <span className="shrink-0">{haQuanto(p.createdAt)}</span>
                    </p>
                  </ContentCard>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <SectionHeader title="Eventos" onMore={() => emBreve("A agenda de eventos")} />
            <ul className="mt-[10px] flex flex-col gap-[10px] sm:mt-4 sm:gap-3">
              {eventos.map((p) => (
                <li key={p.id}>
                  <ContentCard className="flex h-[22px] items-center gap-[6px] px-[10px] font-secondary sm:h-9 sm:gap-2.5 sm:px-3.5">
                    <span aria-hidden className="size-[4px] shrink-0 rounded-full bg-white sm:size-[6px]" />
                    <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white sm:text-[14px] lg:text-[15px]">{p.titulo}</h3>
                    {p.dataEvento && <time dateTime={p.dataEvento} className="shrink-0 text-[8px] text-white sm:text-[12px]">{formatData(p.dataEvento)}</time>}
                  </ContentCard>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {historias.length > 0 && (
        <section className="mt-[25px] sm:mt-10">
          <SectionHeader title="Histórias de sucesso" onMore={() => emBreve("As histórias de sucesso")} />
          <div className="mt-[10px] grid gap-[12px] sm:mt-4">
            {historias.map((p) => (
              <ContentCard key={p.id} className="px-[18px] pt-[8px] pb-[12px] font-secondary sm:px-6 sm:pt-4 sm:pb-5">
                <div className="flex items-center gap-[8px]">
                  <Avatar nome={p.autor.fullName} src={p.autor.urlPhoto} size={38} className="sm:size-12!" />
                  <h3 className="text-[14px] font-semibold text-white sm:text-[17px] lg:text-[18px]">{p.titulo}</h3>
                </div>
                <p className="mt-[10px] line-clamp-4 text-[12px] leading-[1.35] text-[#d9d9d9] sm:mt-3 sm:text-[14px] lg:text-[15px]">{p.conteudo}</p>
              </ContentCard>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
