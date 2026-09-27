"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faDownload, faFileArrowUp, faPlay } from "@fortawesome/free-solid-svg-icons";
import { GlassCard } from "@/components/ui/glass-card";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";
import { SectionTitle } from "./section-title";

const MAX_MB = 5;

// O Cloudinary serve o currículo sem extensão como application/octet-stream (a conta bloqueia
// entrega de ".pdf"). Baixamos os bytes e os tratamos como PDF aqui no navegador.
async function fetchPdf(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Currículo indisponível (${res.status})`);
  return new Blob([await res.arrayBuffer()], { type: "application/pdf" });
}

function ActionCard({ icon, label, onClick, busy }: { icon: IconDefinition; label: ReactNode; onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="group w-full text-left disabled:opacity-70">
      <GlassCard className="flex h-[45px] items-center gap-4 px-[14px] transition-colors group-hover:bg-[#595959]/25">
        <FontAwesomeIcon icon={busy ? faCircleNotch : icon} spin={busy} className="w-[22px] text-[18px] text-white" />
        <span className="text-[16px] font-semibold text-white">{label}</span>
      </GlassCard>
    </button>
  );
}

export function CurriculoSection({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return setError("Envie o currículo em PDF.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`O arquivo deve ter até ${MAX_MB}MB.`);

    setError(null);
    setBusy("upload");
    try {
      const body = new FormData();
      body.append("curriculo", file);
      const { data } = await api.post<{ user: User }>("/user/curriculo", body);
      setUser(data.user);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível enviar o currículo."));
    } finally {
      setBusy(null);
    }
  }

  async function view() {
    if (!user.curriculo) return;
    // abre a aba já no clique (senão o bloqueador de pop-up barra) e carrega o PDF depois
    const tab = window.open("", "_blank");
    setBusy("view");
    try {
      const blob = await fetchPdf(user.curriculo);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Não foi possível abrir o currículo.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    if (!user.curriculo) return;
    setBusy("download");
    try {
      const url = URL.createObjectURL(await fetchPdf(user.curriculo));
      const link = document.createElement("a");
      link.href = url;
      link.download = `curriculo-${user.fullName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível baixar o currículo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-[26px]">
      <SectionTitle
        title="Currículo"
        onEdit={user.curriculo ? () => fileRef.current?.click() : undefined}
        editLabel="Enviar novo currículo"
      />
      <input ref={fileRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />

      <div className="mt-[16px] grid gap-[12px] md:grid-cols-2 md:gap-[17px]">
        {user.curriculo ? (
          <>
            <ActionCard icon={faPlay} label="Visualizar Currículo" onClick={view} busy={busy === "view"} />
            <ActionCard icon={faDownload} label="Download" onClick={download} busy={busy === "download"} />
          </>
        ) : (
          <ActionCard
            icon={faFileArrowUp}
            label="Enviar currículo (PDF)"
            onClick={() => fileRef.current?.click()}
            busy={busy === "upload"}
          />
        )}
      </div>
      {busy === "upload" && user.curriculo && <p className="mt-2 text-[13px] text-[#b3b3b3]">Enviando novo currículo...</p>}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff6b6b]">
          {error}
        </p>
      )}
    </section>
  );
}
