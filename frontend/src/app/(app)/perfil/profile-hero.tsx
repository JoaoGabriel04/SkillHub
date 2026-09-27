"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCheck, faCircleNotch, faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/user";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;

// designs/Perfil.png: curva cinza atrás da foto (140px, anel cinza), selo azul de câmera,
// nome em negrito com lápis e o perfil logo abaixo.
export function ProfileHero({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.fullName);
  const [savingName, setSavingName] = useState(false);
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

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const fullName = name.trim();
    if (fullName.length < 3) return setError("O nome precisa ter ao menos 3 letras.");
    if (fullName === user.fullName) return setEditingName(false);

    setError(null);
    setSavingName(true);
    try {
      const { data } = await api.patch<{ user: User }>("/user", { fullName });
      setUser(data.user);
      setEditingName(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o nome."));
    } finally {
      setSavingName(false);
    }
  }

  function cancelName() {
    setName(user.fullName);
    setEditingName(false);
    setError(null);
  }

  return (
    <section className="flex flex-col items-center">
      <div className="relative -mx-[23px] mt-[88px] flex w-[calc(100%+46px)] justify-center md:mx-0 md:mt-[40px] md:w-full">
        <svg
          aria-hidden
          viewBox="0 0 440 130"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[18px] h-[130px] w-full"
        >
          <defs>
            <linearGradient id="curva" x1="0" x2="1">
              <stop offset="0" stopColor="#6f6f6f" />
              <stop offset="0.5" stopColor="#9a9a9a" />
              <stop offset="1" stopColor="#6f6f6f" />
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
          <div className="rounded-full border-[3px] border-[#8f8f8f] bg-[#101010]">
            <Avatar nome={user.fullName} src={user.urlPhoto} size={134} />
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
              <FontAwesomeIcon icon={faCircleNotch} spin className="text-[28px] text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Trocar foto de perfil"
            className="absolute right-0 bottom-[3px] flex size-[35px] items-center justify-center rounded-full bg-[#63a6ff] text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform hover:scale-110 disabled:opacity-70"
          >
            <FontAwesomeIcon icon={faCamera} className="text-[16px]" />
          </button>
          <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(",")} onChange={handleAvatar} className="hidden" />
        </div>
      </div>

      <div className="mt-[64px] flex min-h-[26px] max-w-full items-center justify-center gap-3 px-4">
        {editingName ? (
          <form onSubmit={saveName} className="flex items-center gap-2">
            <input
              autoFocus
              aria-label="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && cancelName()}
              className="w-[260px] max-w-[60vw] border-b border-[#a0a0a0] bg-transparent text-center text-[19px] font-bold text-white outline-none focus:border-white"
            />
            <button type="submit" disabled={savingName} aria-label="Salvar nome" className="text-accent hover:text-white">
              <FontAwesomeIcon icon={savingName ? faCircleNotch : faCheck} spin={savingName} />
            </button>
            <button type="button" onClick={cancelName} aria-label="Cancelar edição" className="text-[#8a8a8a] hover:text-white">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </form>
        ) : (
          <>
            <h1 className="text-center text-[19px] leading-tight font-bold text-white md:text-[24px]">{user.fullName}</h1>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              aria-label="Editar nome"
              className="text-[#8a8a8a] transition-colors hover:text-white"
            >
              <FontAwesomeIcon icon={faPen} className="text-[13px]" />
            </button>
          </>
        )}
      </div>
      <p className="mt-[2px] text-[14px] leading-tight text-[#8a8a8a]">{user.perfil}</p>
      {error && (
        <p role="alert" className="mt-2 text-center text-[13px] text-[#ff6b6b]">
          {error}
        </p>
      )}
    </section>
  );
}
