"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { GlassCard } from "@/components/ui/glass-card";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";

type FilterChipProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
};

// Chip de filtro com menu (Organizar/Categoria/Remuneração/Prazo em designs/New Serviços.png).
// Pílula de vidro; quando há valor escolhido, mostra o valor e ganha a borda no accent.
// Clicar de novo na opção escolhida limpa o filtro. O menu vai num portal com posição fixa:
// a linha de chips rola na horizontal e cortaria um menu absoluto.
export function FilterChip<T extends string>({ label, options, value, onChange }: FilterChipProps<T>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;
  const close = useCallback(() => setPos(null), []);
  useDismiss([ref, menuRef], open, close);

  // rolar a página ou a linha de chips desalinha o menu: fecha
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  function toggle() {
    if (open || !ref.current) return close();
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 190)) });
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3bd4cc]"
      >
        <GlassCard
          className={cn(
            "flex h-[29px] items-center gap-[6px] rounded-full px-[10px] text-[15px] text-[#c9c9c9] transition-colors hover:text-white sm:h-[34px] sm:px-3 lg:h-9 lg:text-[16px]",
            value && "border-[#3bd4cc]/70 text-white"
          )}
        >
          {value ?? label}
          <FontAwesomeIcon icon={faChevronDown} className={cn("text-[11px] transition-transform", open && "rotate-180")} />
        </GlassCard>
      </button>
      {pos &&
        createPortal(
          <div ref={menuRef} style={pos} className="fixed z-50">
            <GlassCard variant="dark" role="listbox" aria-label={label} className="w-max min-w-[170px] rounded-[16px] p-1.5">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onClick={() => {
                    onChange(option === value ? null : option);
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-secondary text-[13px] text-white sm:text-[14px] transition-colors hover:bg-white/10"
                >
                  {option}
                  {option === value && <FontAwesomeIcon icon={faCheck} className="ml-auto text-[11px] text-[#3bd4cc]" />}
                </button>
              ))}
            </GlassCard>
          </div>,
          document.body
        )}
    </div>
  );
}
