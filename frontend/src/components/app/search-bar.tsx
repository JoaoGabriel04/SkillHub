"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
};

// Busca das páginas do menu: pílula de vidro (GlassCard) com lupa à direita
export function SearchBar({ value, onChange, placeholder, label, className }: SearchBarProps) {
  return (
    <GlassCard className={cn("flex h-[35px] items-center gap-3 rounded-full pr-[14px] pl-[16px] focus-within:border-[#3bd4cc]/60", className)}>
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent font-secondary text-[12px] text-white outline-none placeholder:text-[#8a8a8a] [&::-webkit-search-cancel-button]:hidden"
      />
      <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden className="text-[16px] text-[#c9c9c9]" />
    </GlassCard>
  );
}

// Normaliza para busca sem acento e sem diferenciar maiúsculas
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
