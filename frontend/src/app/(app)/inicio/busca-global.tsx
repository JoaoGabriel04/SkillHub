"use client";

import { useState } from "react";
import { SearchBar } from "@/components/app/search-bar";
import { emBreve } from "@/lib/em-breve";
import { cn } from "@/lib/utils";

// Busca do topo do Início no desktop (designs/New Início - Desktop.png). Ainda não existe busca global
// nem endpoint para ela: ao enviar, avisa "em breve" (não filtra o mock nem finge resultados).
// É Client Component porque o SearchBar é controlado; a página continua Server Component.
export function BuscaGlobal({ className }: { className?: string }) {
  const [busca, setBusca] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        emBreve("A busca global");
      }}
      className={cn("hidden xl:block", className)}
    >
      <SearchBar value={busca} onChange={setBusca} placeholder="Buscar no SkillHub" label="Buscar no SkillHub" className="w-[340px]" />
    </form>
  );
}
