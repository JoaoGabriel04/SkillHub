"use client";

import { useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";
import { ProfileDialog } from "./profile-dialog";

type Props = { user: User; open: boolean; onOpenChange: (open: boolean) => void };

// Qualidades (competencias: string[] no schema — só o nome, sem descrição).
// O pai monta o modal com key a cada abertura, então a lista sempre começa da salva.
export function EditQualidadesDialog({ user, open, onOpenChange }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const [draft, setDraft] = useState<string[]>(user.competencias);
  const [nova, setNova] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add() {
    const valor = nova.trim();
    if (!valor) return;
    if (draft.some((c) => c.toLowerCase() === valor.toLowerCase())) return setError("Essa qualidade já está na lista.");
    setDraft((d) => [...d, valor]);
    setNova("");
    setError(null);
  }

  // Enter no campo adiciona a qualidade em vez de enviar o formulário (que salva)
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  }

  async function save() {
    const lista = nova.trim() && !draft.includes(nova.trim()) ? [...draft, nova.trim()] : draft;
    if (lista.length === 0) return setError("Informe ao menos uma qualidade.");
    setSaving(true);
    try {
      const { data } = await api.patch<{ user: User }>("/user", { competencias: lista });
      setUser(data.user);
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Qualidades"
      description="As áreas em que você oferece seus serviços."
      error={error}
      saving={saving}
      onSubmit={save}
    >
      {draft.length > 0 ? (
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
      ) : (
        <p className="text-[13px] text-[#8a8a8a]">Nenhuma qualidade ainda.</p>
      )}
      <div className="mt-4 flex items-center gap-3 border-b border-[#a0a0a0] pb-2 focus-within:border-white">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nova qualidade (ex.: Designer)"
          aria-label="Nova qualidade"
          maxLength={40}
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#8a8a8a]"
        />
        <button type="button" onClick={add} aria-label="Adicionar qualidade" className="text-[#3bd4cc] hover:text-white">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </ProfileDialog>
  );
}
