"use client";

import useSWR from "swr";
import { ContentCard } from "@/components/ui/content-card";
import { chaveAvaliacoesDoUsuario, formatMedia, getAvaliacoesDoUsuario } from "@/lib/avaliacoes";
import { useAuthStore } from "@/stores/auth-store";
import { CompetenciasSection } from "./competencias-section";
import { CurriculoSection } from "./curriculo-section";
import { ProfileHero } from "./profile-hero";

// ⚠️ "Colaborações" e "Experiência" ainda sem backend: mostram zero até esses dados existirem.
// "Avaliações" é a média real das avaliações recebidas (Fase 17D); sem nenhuma, "–".
const PLACEHOLDERS = { colaboracoes: "00", experiencia: "00" };

// designs/New Perfil.png — cada seção editável abre o seu modal (components/app/perfil/)
export default function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  const avaliacoes = useSWR(user ? chaveAvaliacoesDoUsuario(user.id) : null, () => getAvaliacoesDoUsuario(user!.id));
  if (!user) return null; // o layout só renderiza a página com usuário carregado

  const estatisticas = [
    { label: "Colaborações", valor: PLACEHOLDERS.colaboracoes },
    { label: "Avaliações", valor: formatMedia(avaliacoes.data?.media ?? null) },
    { label: "Experiência", valor: PLACEHOLDERS.experiencia },
  ];

  return (
    <main className="mx-auto max-w-[760px] pb-4">
      <ProfileHero user={user} />

      <ContentCard className="mt-[16px] px-4 pt-[9px] pb-[8px] sm:mt-8 sm:py-4">
        <h2 className="text-center text-[20px] font-semibold text-foreground sm:text-[22px] lg:text-[24px]">Experiências Profissionais</h2>
        <dl className="mt-[12px] grid grid-cols-3 text-center">
          {estatisticas.map(({ label, valor }) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-[11px] text-foreground/90 sm:text-[13px]">{label}</dt>
              <dd className="text-[19px] leading-tight text-foreground sm:text-[22px]">{valor}</dd>
            </div>
          ))}
        </dl>
      </ContentCard>

      {user.perfil === "Colaborador" && (
        <>
          <CompetenciasSection user={user} />
          <CurriculoSection user={user} />
        </>
      )}
    </main>
  );
}
