"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FormAlert, LineInput } from "@/components/auth/auth-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { api, getApiErrorMessage } from "@/lib/api";
import type { User } from "@/types/user";

// Contas só com Google/Discord não têm senha: a confirmação é digitar esta palavra
const CONFIRM_WORD = "EXCLUIR";

export function DeleteAccountDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const titleId = useId();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = user.hasPassword ? value.length > 0 : value.trim().toUpperCase() === CONFIRM_WORD;

  // Esc fecha, exceto durante a exclusão
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.delete("/user", { data: user.hasPassword ? { password: value } : {} });
      // Navegação completa, não router.replace: descarta o token em memória e evita que o
      // guard do layout (status "unauthenticated" → /login) engula o aviso na URL.
      window.location.replace("/login?conta=excluida");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível excluir a conta."));
      setSubmitting(false);
    }
  }

  // portal: o menu da engrenagem usa backdrop-filter, que prenderia o position:fixed dentro dele
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <GlassCard
        variant="dark"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[400px] p-6"
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-[20px] text-[#ff6b6b]" />
          <h2 id={titleId} className="text-[19px] font-bold text-white">
            Excluir conta
          </h2>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-[#c9c9c9]">
          Esta ação é <strong className="text-white">permanente</strong>. Seu perfil, sua foto, seu currículo e
          seus créditos serão apagados e não poderão ser recuperados.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <label className="text-[13px] text-[#9f9f9f]" htmlFor={`${titleId}-input`}>
            {user.hasPassword ? (
              "Digite sua senha para confirmar"
            ) : (
              <>
                Digite <strong className="text-white">{CONFIRM_WORD}</strong> para confirmar
              </>
            )}
          </label>
          <LineInput
            id={`${titleId}-input`}
            autoFocus
            type={user.hasPassword ? "password" : "text"}
            autoComplete={user.hasPassword ? "current-password" : "off"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2"
          />

          <div className="mt-4 min-h-[20px]">
            <FormAlert>{error}</FormAlert>
          </div>

          <div className="mt-4 flex justify-end gap-3 text-[14px]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-[6px] px-4 py-2 text-[#c9c9c9] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 rounded-[6px] bg-[#d93b3b] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#e54848] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <FontAwesomeIcon icon={faCircleNotch} spin />}
              Excluir conta
            </button>
          </div>
        </form>
      </GlassCard>
    </div>,
    document.body
  );
}
