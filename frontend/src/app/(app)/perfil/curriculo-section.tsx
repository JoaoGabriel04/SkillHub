"use client";

import { useState, type ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faDownload, faFileArrowUp, faPlay } from "@fortawesome/free-solid-svg-icons";
import { EditCurriculoDialog } from "@/components/app/perfil/edit-curriculo-dialog";
import { ContentCard } from "@/components/ui/content-card";
import type { User } from "@/types/user";
import { SectionTitle } from "./section-title";

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
      <ContentCard className="flex h-[45px] items-center gap-4 px-[14px] transition-colors group-hover:bg-white/[0.04]">
        <FontAwesomeIcon icon={busy ? faCircleNotch : icon} spin={busy} className="w-[22px] text-[18px] text-white" />
        <span className="text-[16px] font-semibold text-white">{label}</span>
      </ContentCard>
    </button>
  );
}

export function CurriculoSection({ user }: { user: User }) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <SectionTitle title="Currículo" onEdit={() => setEditOpen(true)} editLabel="Editar currículo" />

      <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2 sm:gap-[17px]">
        {user.curriculo ? (
          <>
            <ActionCard icon={faPlay} label="Visualizar Currículo" onClick={view} busy={busy === "view"} />
            <ActionCard icon={faDownload} label="Download" onClick={download} busy={busy === "download"} />
          </>
        ) : (
          <ActionCard icon={faFileArrowUp} label="Enviar currículo (PDF)" onClick={() => setEditOpen(true)} />
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff6b6b]">
          {error}
        </p>
      )}
      {editOpen && <EditCurriculoDialog user={user} open onOpenChange={setEditOpen} />}
    </section>
  );
}
