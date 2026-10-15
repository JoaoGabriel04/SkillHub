"use client";

import type { ComponentType, ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTema } from "@/components/tema/tema-provider";

// Atalho da sidebar: troca para o tema oposto ao aplicado e grava como escolha fixa
// (com "Sistema", vira Claro ou Escuro; "Sistema" só se escolhe em Configurações).
// O texto diz o que o clique faz. `Icone` é a caixa de ícone da sidebar, para alinhar com os outros itens.
export function AlternarTema({ className, Icone }: { className?: string; Icone: ComponentType<{ children: ReactNode }> }) {
  const { tema, definirPreferencia } = useTema();
  const proximo = tema === "escuro" ? "claro" : "escuro";
  return (
    <button type="button" onClick={() => definirPreferencia(proximo)} className={className}>
      <Icone>
        <FontAwesomeIcon icon={proximo === "claro" ? faSun : faMoon} className="text-[20px]" />
      </Icone>
      {proximo === "claro" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
