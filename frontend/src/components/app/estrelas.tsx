"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const NOTAS = [1, 2, 3, 4, 5] as const;
const nomeDa = (n: number) => `${n} ${n === 1 ? "estrela" : "estrelas"}`;
// a vazia é a mesma faStar sólida apagada (o pacote free-regular, com a vazada, não está instalado)
const cor = (cheia: boolean) => (cheia ? "text-accent-text" : "text-foreground/20");

// Nota de 1 a 5 só para leitura (Fase 17D)
export function Estrelas({ nota, className }: { nota: number; className?: string }) {
  return (
    <span role="img" aria-label={`${nota} de 5 estrelas`} className={cn("inline-flex gap-0.5 text-[13px]", className)}>
      {NOTAS.map((n) => (
        <FontAwesomeIcon key={n} icon={faStar} aria-hidden className={cor(n <= nota)} />
      ))}
    </span>
  );
}

// Escolha da nota: grupo de rádio (as setas mudam a nota, só a marcada entra no Tab), como o SeletorTema.
// O hover mostra a nota antes do clique. value 0 = nenhuma escolhida.
export function SeletorEstrelas({ value, onChange, rotulo }: { value: number; onChange: (nota: number) => void; rotulo: string }) {
  const [hover, setHover] = useState(0);
  const grupo = useRef<HTMLDivElement>(null);
  const mostrada = hover || value;

  function escolher(nota: number) {
    onChange(nota);
    grupo.current?.querySelector<HTMLButtonElement>(`[data-nota="${nota}"]`)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const destino = {
      ArrowRight: Math.min(5, value + 1),
      ArrowUp: Math.min(5, value + 1),
      ArrowLeft: Math.max(1, value - 1),
      ArrowDown: Math.max(1, value - 1),
      Home: 1,
      End: 5,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    escolher(destino);
  }

  return (
    <div ref={grupo} role="radiogroup" aria-label={rotulo} onKeyDown={onKeyDown} onMouseLeave={() => setHover(0)} className="flex gap-1">
      {NOTAS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={nomeDa(n)}
          tabIndex={n === (value || 1) ? 0 : -1}
          data-nota={n}
          onClick={() => escolher(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded-[4px] p-0.5 text-[22px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <FontAwesomeIcon icon={faStar} aria-hidden className={cor(n <= mostrada)} />
        </button>
      ))}
    </div>
  );
}
