"use client";

import { useState, type FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faCode, faComputer, faPaintbrush, faPlus, faStar, faXmark } from "@fortawesome/free-solid-svg-icons";
import { GlassCard } from "@/components/ui/glass-card";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
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
  const setUser = useAuthStore((s) => s.setUser);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(user.competencias);
  const [nova, setNova] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(event: FormEvent) {
    event.preventDefault();
    const valor = nova.trim();
    if (!valor) return;
    if (draft.some((c) => c.toLowerCase() === valor.toLowerCase())) return setError("Essa qualidade já está na lista.");
    setDraft((d) => [...d, valor]);
    setNova("");
    setError(null);
  }

  async function save() {
    if (draft.length === 0) return setError("Informe ao menos uma qualidade.");
    setSaving(true);
    try {
      const { data } = await api.patch<{ user: User }>("/user", { competencias: draft });
      setUser(data.user);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setDraft(user.competencias);
    setNova("");
    setError(null);
    setEditing(true);
  }

  return (
    <section className="mt-[27px]">
      <SectionTitle title="Qualidades" onEdit={editing ? undefined : startEditing} editLabel="Editar qualidades" />

      {editing ? (
        <GlassCard className="mt-[16px] p-4">
          <ul className="flex flex-wrap gap-2">
            {draft.map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-2 pl-3 text-[14px] text-white">
                {c}
                <button
                  type="button"
                  onClick={() => setDraft((d) => d.filter((x) => x !== c))}
                  aria-label={`Remover ${c}`}
                  className="text-[#b3b3b3] hover:text-white"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-[12px]" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={add} className="mt-4 flex items-center gap-3 border-b border-[#a0a0a0] pb-2 focus-within:border-white">
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              placeholder="Nova qualidade (ex.: Designer)"
              maxLength={40}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#8a8a8a]"
            />
            <button type="submit" aria-label="Adicionar qualidade" className="text-accent hover:text-white">
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </form>
          {error && <p role="alert" className="mt-2 text-[13px] text-[#ff6b6b]">{error}</p>}
          <div className="mt-4 flex justify-end gap-3 text-[14px]">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-[#b3b3b3] hover:text-white">
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-[4px] bg-accent px-4 py-1 font-semibold text-[#101010] hover:brightness-110 disabled:opacity-60"
            >
              {saving && <FontAwesomeIcon icon={faCircleNotch} spin />}
              Salvar
            </button>
          </div>
        </GlassCard>
      ) : user.competencias.length === 0 ? (
        // cadastro por e-mail não pede qualidades: o perfil começa vazio
        <button type="button" onClick={startEditing} className="group mt-[16px] w-full text-left">
          <GlassCard className="flex h-[45px] items-center gap-4 px-[14px] transition-colors group-hover:bg-[#595959]/25">
            <FontAwesomeIcon icon={faPlus} className="w-[22px] text-[18px] text-white" />
            <span className="text-[16px] font-semibold text-white">Adicionar qualidades</span>
          </GlassCard>
        </button>
      ) : (
        <ul className="mt-[16px] grid gap-[17px] md:grid-cols-2">
          {user.competencias.map((c) => (
            <li key={c}>
              <GlassCard className="flex min-h-[74px] items-center gap-4 px-[14px] py-4">
                <FontAwesomeIcon icon={iconeDa(c)} className="w-[26px] text-[22px] text-white" />
                <span className="text-[16px] font-semibold text-white">{c}</span>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
