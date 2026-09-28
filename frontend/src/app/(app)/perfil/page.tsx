"use client";

import { ContentCard } from "@/components/ui/content-card";
import { useAuthStore } from "@/stores/auth-store";
import { CompetenciasSection } from "./competencias-section";
import { CurriculoSection } from "./curriculo-section";
import { ProfileHero } from "./profile-hero";

// ⚠️ Estatísticas ainda sem backend (não há colaborações, avaliações nem experiências
// registradas) — mostram zero até esses dados existirem.
const ESTATISTICAS = [
  { label: "Colaborações", valor: "00" },
  { label: "Avaliações", valor: "–" },
  { label: "Experiência", valor: "00" },
];

// designs/New Perfil.png — cada seção editável abre o seu modal (components/app/perfil/)
export default function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null; // o layout só renderiza a página com usuário carregado

  return (
    <main className="mx-auto max-w-[760px] pb-4">
      <ProfileHero user={user} />

      <ContentCard className="mt-[16px] px-4 pt-[9px] pb-[8px] md:mt-8 md:py-4">
        <h2 className="text-center text-[20px] font-semibold text-white md:text-[22px]">Experiências Profissionais</h2>
        <dl className="mt-[12px] grid grid-cols-3 text-center">
          {ESTATISTICAS.map(({ label, valor }) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-[11px] text-white/90 md:text-[13px]">{label}</dt>
              <dd className="text-[19px] leading-tight text-white md:text-[22px]">{valor}</dd>
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
