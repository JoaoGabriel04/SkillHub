"use client";

import { useId, useRef, type ComponentType, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTema } from "@/components/tema/tema-provider";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

// Curso do botão dentro do trilho: 48 de largura − 2×1 de borda − 2×2 de folga − 20 do botão
const CURSO = 22;
// Estrelas do trilho no escuro, no lado livre (o botão fica à direita); posição em px dentro do trilho
const ESTRELAS = [
  { left: 7, top: 6, size: 2.5 },
  { left: 15, top: 12, size: 1.5 },
  { left: 8, top: 16, size: 1.5 },
];

// Atalho de tema da sidebar: rótulo "Tema" e um switch "Tema escuro" (ligado = escuro). Grava uma
// escolha fixa; com "Sistema" vira Claro ou Escuro ("Sistema" só se escolhe em Configurações).
// O botão ciano desliza até o lado do tema (Sol à esquerda, Lua à direita): a bolha estica no caminho
// e assenta com rebote, o ícone que sai gira e some e o que entra gira e aparece. No trilho, a Lua
// discreta aparece no claro e estrelas piscam no escuro. Com "menos movimento", direto ao estado final.
export function AlternarTema({ className, Icone }: { className?: string; Icone: ComponentType<{ children: ReactNode }> }) {
  const { tema, definirPreferencia } = useTema();
  const escuro = tema === "escuro";
  const id = useId();
  const raiz = useRef<HTMLLabelElement>(null);
  const anterior = useRef<boolean | null>(null);

  useGSAP(
    () => {
      const veioDe = anterior.current;
      anterior.current = escuro;
      const fim = {
        botao: { x: escuro ? CURSO : 0 },
        bolha: { scaleX: 1 },
        luaTrilho: { autoAlpha: escuro ? 0 : 1 },
        sol: { autoAlpha: escuro ? 0 : 1, rotation: 0, scale: 1 },
        lua: { autoAlpha: escuro ? 1 : 0, rotation: 0, scale: 1 },
        estrelas: { autoAlpha: escuro ? 1 : 0, scale: 1 },
      };
      if (veioDe === null || veioDe === escuro || prefersReducedMotion()) {
        gsap.set("[data-botao]", fim.botao);
        gsap.set("[data-bolha]", fim.bolha);
        gsap.set("[data-lua-trilho]", fim.luaTrilho);
        gsap.set("[data-sol]", fim.sol);
        gsap.set("[data-lua]", fim.lua);
        gsap.set("[data-estrela]", fim.estrelas);
        return;
      }

      const [sai, entra] = escuro ? ["[data-sol]", "[data-lua]"] : ["[data-lua]", "[data-sol]"];
      gsap
        .timeline({ defaults: { overwrite: "auto" } })
        // o botão estica no caminho e assenta com rebote
        .to("[data-botao]", { x: fim.botao.x, duration: 0.55, ease: "back.out(1.7)" }, 0)
        .to("[data-bolha]", { keyframes: [{ scaleX: 1.35, duration: 0.14, ease: "power2.out" }, { scaleX: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" }] }, 0)
        .to("[data-lua-trilho]", { autoAlpha: fim.luaTrilho.autoAlpha, duration: 0.2 }, escuro ? 0 : 0.3)
        // o ícone que sai gira e encolhe; o que entra vem girando do outro lado
        .to(sai, { rotation: escuro ? 120 : -120, scale: 0.3, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 0)
        .fromTo(
          entra,
          { rotation: escuro ? -120 : 120, scale: 0.3, autoAlpha: 0 },
          { rotation: 0, scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2.5)" },
          0.18
        )
        // estrelas: acendem em sequência e piscam ao chegar no escuro; somem rápido no claro
        .to(
          "[data-estrela]",
          escuro
            ? { keyframes: [{ autoAlpha: 1, scale: 1.8, duration: 0.18 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }], stagger: 0.08 }
            : { autoAlpha: 0, scale: 0, duration: 0.2, stagger: 0.03 },
          escuro ? 0.3 : 0
        );
    },
    { scope: raiz, dependencies: [escuro] }
  );

  return (
    <label ref={raiz} htmlFor={id} className={cn("cursor-pointer", className)}>
      <Icone>
        <FontAwesomeIcon icon={escuro ? faMoon : faSun} className="text-[20px]" />
      </Icone>
      Tema
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={escuro}
        aria-label="Tema escuro"
        onClick={() => definirPreferencia(escuro ? "claro" : "escuro")}
        className="relative ml-auto h-[26px] w-[48px] shrink-0 rounded-full border border-glass-border bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* trilho: Lua discreta à direita no claro; estrelas à esquerda no escuro */}
        <FontAwesomeIcon
          data-lua-trilho
          icon={faMoon}
          aria-hidden
          className="invisible absolute top-1/2 right-[7px] -translate-y-1/2 text-[10px] text-muted-foreground"
        />
        {ESTRELAS.map((e, i) => (
          <span
            key={i}
            data-estrela
            aria-hidden
            className="invisible absolute rounded-full bg-foreground"
            style={{ left: e.left, top: e.top, width: e.size, height: e.size }}
          />
        ))}
        <span
          data-botao
          aria-hidden
          className="absolute top-[2px] left-[2px] flex size-5 items-center justify-center text-accent-foreground"
        >
          {/* a bolha estica sozinha: os ícones por cima não deformam */}
          <span data-bolha className="absolute inset-0 rounded-full bg-accent shadow-(--glow-coin)" />
          <FontAwesomeIcon data-sol icon={faSun} className="invisible absolute text-[11px]" />
          <FontAwesomeIcon data-lua icon={faMoon} className="invisible absolute text-[11px]" />
        </span>
      </button>
    </label>
  );
}
