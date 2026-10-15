"use client";

import { useRef, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleHalfStroke, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTema } from "@/components/tema/tema-provider";
import { PREFERENCIAS, type PreferenciaTema } from "@/lib/tema";
import { cn } from "@/lib/utils";

const OPCOES: Record<PreferenciaTema, { label: string; icon: typeof faSun }> = {
  claro: { label: "Claro", icon: faSun },
  escuro: { label: "Escuro", icon: faMoon },
  sistema: { label: "Sistema", icon: faCircleHalfStroke },
};

// Grupo de rádio da linha "Aparência" de Configurações: só a opção marcada entra no Tab,
// as setas (e Home/End) trocam de opção, como num grupo de rádio nativo.
export function SeletorTema({ rotuloId, className }: { rotuloId: string; className?: string }) {
  const { preferencia, definirPreferencia } = useTema();
  const grupo = useRef<HTMLDivElement>(null);

  function escolher(proxima: PreferenciaTema) {
    definirPreferencia(proxima);
    grupo.current?.querySelector<HTMLButtonElement>(`[data-opcao="${proxima}"]`)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = PREFERENCIAS.indexOf(preferencia);
    const n = PREFERENCIAS.length;
    const destino = {
      ArrowRight: (i + 1) % n,
      ArrowDown: (i + 1) % n,
      ArrowLeft: (i - 1 + n) % n,
      ArrowUp: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    escolher(PREFERENCIAS[destino]);
  }

  return (
    <div ref={grupo} role="radiogroup" aria-labelledby={rotuloId} onKeyDown={onKeyDown} className={cn("flex gap-2", className)}>
      {PREFERENCIAS.map((opcao) => {
        const marcada = opcao === preferencia;
        return (
          <button
            key={opcao}
            type="button"
            role="radio"
            aria-checked={marcada}
            tabIndex={marcada ? 0 : -1}
            data-opcao={opcao}
            onClick={() => escolher(opcao)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full border px-3 font-secondary text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[14px]",
              marcada
                ? "border-accent-soft-border bg-accent-soft text-accent-text"
                : "border-glass-border text-foreground-secondary hover:text-foreground"
            )}
          >
            <FontAwesomeIcon icon={OPCOES[opcao].icon} aria-hidden className="text-[13px]" />
            {OPCOES[opcao].label}
          </button>
        );
      })}
    </div>
  );
}

// Texto do estado atual (a escolha não é dita só pela cor da opção marcada)
export function useDescricaoTema() {
  const { preferencia, tema } = useTema();
  return preferencia === "sistema" ? `Em uso: Sistema (agora ${tema})` : `Em uso: ${OPCOES[preferencia].label}`;
}
