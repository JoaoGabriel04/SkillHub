"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCircleNotch, faPen } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { EditNomeDialog } from "@/components/app/perfil/edit-nome-dialog";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;

// designs/Perfil.png: curva cinza atrás da foto (140px, anel cinza), selo azul de câmera,
// nome em negrito com lápis (abre o modal de dados pessoais) e o perfil logo abaixo.
export function ProfileHero({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setError("Use uma imagem JPEG, PNG ou WEBP.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`A imagem deve ter até ${MAX_MB}MB.`);

    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const { data } = await api.post<{ user: User }>("/user/avatar", body);
      setUser(data.user);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível enviar a foto."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="flex flex-col items-center">
      <div className="relative -mx-[23px] mt-[88px] flex w-[calc(100%+46px)] justify-center sm:mx-0 sm:mt-[40px] sm:w-full">
        <svg
          aria-hidden
          viewBox="0 0 440 130"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[18px] h-[130px] w-full"
        >
          <defs>
            <linearGradient id="curva" x1="0" x2="1">
              <stop offset="0" style={{ stopColor: "var(--curve-from)" }} />
              <stop offset="0.5" style={{ stopColor: "var(--curve-mid)" }} />
              <stop offset="1" style={{ stopColor: "var(--curve-from)" }} />
            </linearGradient>
          </defs>
          <path
            d="M-5 75 C 45 30, 110 25, 170 55 S 290 130, 330 108 S 410 72, 445 45"
            fill="none"
            stroke="url(#curva)"
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative">
          <div className="rounded-full border-[3px] border-muted-foreground bg-background">
            <Avatar nome={user.fullName} src={user.urlPhoto} size={134} />
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/55">
              <FontAwesomeIcon icon={faCircleNotch} spin className="text-[28px] text-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Trocar foto de perfil"
            className="absolute right-0 bottom-[3px] flex size-[35px] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-(--shadow-badge) transition-transform hover:scale-110 disabled:opacity-70"
          >
            <FontAwesomeIcon icon={faCamera} className="text-[16px]" />
          </button>
          <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(",")} onChange={handleAvatar} className="hidden" />
        </div>
      </div>

      <div className="mt-[64px] flex min-h-[26px] max-w-full items-center justify-center gap-3 px-4">
        <h1 className="text-center text-[19px] leading-tight font-bold text-foreground sm:text-[24px] lg:text-[28px]">{user.fullName}</h1>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="Editar dados pessoais"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <FontAwesomeIcon icon={faPen} className="text-[13px]" />
        </button>
      </div>
      <p className="mt-[2px] text-[14px] leading-tight text-muted-foreground">{user.perfil}</p>
      {error && (
        <p role="alert" className="mt-2 text-center text-[13px] text-danger">
          {error}
        </p>
      )}
      {/* montado só enquanto aberto: o formulário sempre começa dos dados atuais */}
      {editOpen && <EditNomeDialog user={user} open onOpenChange={setEditOpen} />}
    </section>
  );
}
