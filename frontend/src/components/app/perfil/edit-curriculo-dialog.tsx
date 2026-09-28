"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faFileArrowUp, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";
import { ProfileDialog } from "./profile-dialog";

const MAX_MB = 5;

type Props = { user: User; open: boolean; onOpenChange: (open: boolean) => void };

// Currículo: envia/substitui o PDF por POST /user/curriculo (endpoint já existente).
export function EditCurriculoDialog({ user, open, onOpenChange }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (file.type !== "application/pdf") return setError("Envie o currículo em PDF.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`O arquivo deve ter até ${MAX_MB}MB.`);

    setError(null);
    setSending(true);
    try {
      const body = new FormData();
      body.append("curriculo", file);
      const { data } = await api.post<{ user: User }>("/user/curriculo", body);
      setUser(data.user);
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível enviar o currículo."));
    } finally {
      setSending(false);
    }
  }

  return (
    <ProfileDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Currículo"
      description={`Envie seu currículo em PDF, com até ${MAX_MB}MB.`}
      error={error}
      saving={sending}
    >
      <div className="flex items-center gap-3 rounded-[10px] bg-white/[0.05] px-4 py-3">
        <FontAwesomeIcon icon={faFilePdf} className="text-[22px] text-[#9f9f9f]" />
        <p className="text-[13px] text-[#c9c9c9]">{user.curriculo ? "Você já tem um currículo enviado." : "Nenhum currículo enviado ainda."}</p>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
      <div className="mt-6 flex justify-end gap-3 text-[14px]">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={sending}
          className="rounded-[6px] px-4 py-2 text-[#c9c9c9] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          className="flex items-center gap-2 rounded-[6px] bg-[#3bd4cc] px-4 py-2 font-semibold text-[#101010] transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          <FontAwesomeIcon icon={sending ? faCircleNotch : faFileArrowUp} spin={sending} />
          {user.curriculo ? "Substituir PDF" : "Escolher PDF"}
        </button>
      </div>
    </ProfileDialog>
  );
}
