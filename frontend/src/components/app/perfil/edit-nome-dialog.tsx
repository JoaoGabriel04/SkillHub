"use client";

import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { maskPhone } from "@/lib/masks";
import { GENEROS } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";
import { DialogField, ProfileDialog } from "./profile-dialog";

type Props = { user: User; open: boolean; onOpenChange: (open: boolean) => void };

// Dados pessoais: nome, telefone e (pessoa física) gênero — campos aceitos por PATCH /user.
// O pai monta o modal com key a cada abertura, então o formulário sempre começa dos valores atuais.
export function EditNomeDialog({ user, open, onOpenChange }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(maskPhone(user.phone ?? ""));
  const [genero, setGenero] = useState(user.genero ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pessoaFisica = user.perfil !== "Empresa";

  async function save() {
    const nome = fullName.trim();
    if (nome.length < 3) return setError("O nome precisa ter ao menos 3 letras.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Informe um telefone com DDD.");

    // só manda o que mudou
    const body: Record<string, string> = {};
    if (nome !== user.fullName) body.fullName = nome;
    if (phone !== maskPhone(user.phone ?? "")) body.phone = phone;
    if (pessoaFisica && genero && genero !== user.genero) body.genero = genero;
    if (Object.keys(body).length === 0) return onOpenChange(false);

    setError(null);
    setSaving(true);
    try {
      const { data } = await api.patch<{ user: User }>("/user", body);
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
      title="Dados pessoais"
      description="Como você aparece para os outros usuários."
      error={error}
      saving={saving}
      onSubmit={save}
    >
      <div className="flex flex-col gap-5">
        <DialogField label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" autoFocus />
        <DialogField
          label="Telefone"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
        />
        {pessoaFisica && (
          <label className="block">
            <span className="text-[12px] text-[#9f9f9f]">Gênero</span>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="mt-1 w-full cursor-pointer border-b border-[#a0a0a0] bg-transparent pb-2 text-[15px] text-white outline-none focus:border-white [color-scheme:dark]"
            >
              <option value="" disabled>
                Selecione
              </option>
              {GENEROS.map((g) => (
                <option key={g} value={g} className="bg-[#101010]">
                  {g}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </ProfileDialog>
  );
}
