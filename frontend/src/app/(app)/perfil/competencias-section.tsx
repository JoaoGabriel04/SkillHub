"use client";

import { useState } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faComputer, faPaintbrush, faPlus, faStar } from "@fortawesome/free-solid-svg-icons";
import { EditQualidadesDialog } from "@/components/app/perfil/edit-qualidades-dialog";
import { ContentCard } from "@/components/ui/content-card";
import type { User } from "@/types/user";
import { SectionTitle } from "./section-title";

// Ícone pela palavra-chave da competência (o backend guarda só o texto)
const ICONES: [RegExp, IconDefinition][] = [
  [/design|arte|gr[aá]fic|ilustra/i, faPaintbrush],
  [/t[eé]cnic|inform[aá]tic|computa|hardware|manuten/i, faComputer],
  [/desenvolv|program|dev|software|web/i, faCode],
];
const iconeDa = (competencia: string) => ICONES.find(([re]) => re.test(competencia))?.[1] ?? faStar;

export function CompetenciasSection({ user }: { user: User }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="mt-[27px]">
      <SectionTitle title="Qualidades" onEdit={() => setEditOpen(true)} editLabel="Editar qualidades" />

      {user.competencias.length === 0 ? (
        // cadastro por e-mail não pede qualidades: o perfil começa vazio
        <button type="button" onClick={() => setEditOpen(true)} className="group mt-[16px] w-full text-left">
          <ContentCard className="flex h-[45px] items-center gap-4 px-[14px] transition-colors group-hover:bg-white/[0.04]">
            <FontAwesomeIcon icon={faPlus} className="w-[22px] text-[18px] text-white" />
            <span className="text-[16px] font-semibold text-white">Adicionar qualidades</span>
          </ContentCard>
        </button>
      ) : (
        <ul className="mt-[16px] grid gap-[17px] md:grid-cols-2">
          {user.competencias.map((c) => (
            <li key={c}>
              <ContentCard className="flex min-h-[74px] items-center gap-4 px-[14px] py-4">
                <FontAwesomeIcon icon={iconeDa(c)} className="w-[26px] text-[22px] text-white" />
                <span className="text-[16px] font-semibold text-white">{c}</span>
              </ContentCard>
            </li>
          ))}
        </ul>
      )}

      {/* montado só enquanto aberto: a lista sempre começa da salva */}
      {editOpen && <EditQualidadesDialog user={user} open onOpenChange={setEditOpen} />}
    </section>
  );
}
