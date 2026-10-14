"use client";

import { useRef } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

// Card de seleção de perfil (designs/Cadastro.png): 175×200, círculo de 77px,
// selecionado = borda/texto azul #0015ff, círculo preenchido e selo de check.
// A partir de md cresce pra 230×260 (telas maiores têm espaço de sobra).
// Animações: inclina em 3D seguindo o mouse; ao ser escolhido dá um "soco" elástico,
// o selo de check gira pra dentro, o ícone balança e um anel azul se expande do círculo.
type ProfileCardProps = {
  label: string;
  icon: IconDefinition;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  ribbon?: string; // faixa diagonal no canto (ex.: "Em produção")
};

export function ProfileCard({ label, icon, selected, onSelect, disabled = false, ribbon }: ProfileCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const wasSelected = useRef(selected);

  useGSAP(
    () => {
      if (selected && !wasSelected.current && !prefersReducedMotion()) {
        gsap
          .timeline()
          .fromTo(ref.current, { scale: 0.92 }, { scale: 1, duration: 0.7, ease: "elastic.out(1.1, 0.4)" })
          .fromTo("[data-check]", { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(3)" }, 0)
          .fromTo("[data-profile-icon]", { rotation: 0 }, { rotation: 18, duration: 0.6, ease: "shake" }, 0.05)
          .fromTo("[data-pulse]", { scale: 1, autoAlpha: 0.9 }, { scale: 1.9, autoAlpha: 0, duration: 0.7, ease: "expo.out" }, 0);
      }
      wasSelected.current = selected;
    },
    { scope: ref, dependencies: [selected] }
  );

  // inclinação 3D: o card "olha" pro ponteiro
  const { contextSafe } = useGSAP({ scope: ref });
  const onPointerMove = contextSafe((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    gsap.to(e.currentTarget, {
      rotationY: ((e.clientX - r.left) / r.width - 0.5) * 22,
      rotationX: ((e.clientY - r.top) / r.height - 0.5) * -22,
      transformPerspective: 800,
      duration: 0.5,
      ease: "power3.out",
    });
  });
  const onPointerLeave = contextSafe((e: React.PointerEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { rotationX: 0, rotationY: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
  });

  return (
    <button
      ref={ref}
      data-card
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex h-[200px] w-full max-w-[175px] flex-col items-center overflow-hidden rounded-[4px] bg-[#101010] transition-colors md:h-[260px] md:max-w-[230px]",
        disabled
          ? "cursor-not-allowed border-2 border-[#4a4a4a]"
          : selected
            ? "border-2 border-[#0015ff]"
            : "border-2 border-[#e3e3e3] hover:border-white"
      )}
    >
      {ribbon && (
        <span data-ribbon className="absolute top-[26px] -right-[42px] z-10 w-[170px] rotate-45 bg-accent py-[3px] text-center font-jersey-15 text-[14px] text-[#101010] shadow-[0_2px_6px_rgba(0,0,0,0.5)] md:top-[30px] md:-right-[40px] md:text-[16px]">
          {ribbon}
        </span>
      )}

      <span
        data-check
        className={cn(
          "absolute top-[5px] right-[5px] flex size-5 items-center justify-center rounded-full border-2 md:top-2 md:right-2 md:size-6",
          selected ? "border-[#0015ff] bg-[#e3e3e3] text-[#0015ff]" : "border-[#e3e3e3]",
          disabled && "hidden"
        )}
      >
        {selected && <FontAwesomeIcon icon={faCheck} className="text-[11px] md:text-[13px]" />}
      </span>

      <span
        className={cn(
          "relative mt-[46px] flex size-[77px] items-center justify-center rounded-full border-2 md:mt-[58px] md:size-[100px]",
          selected ? "border-[#0015ff] bg-[#e3e3e3] text-[#0015ff]" : "border-[#e3e3e3] text-[#e3e3e3]",
          disabled && "opacity-35"
        )}
      >
        <span data-pulse aria-hidden className="invisible absolute -inset-[2px] rounded-full border-2 border-[#0015ff]" />
        <span data-profile-icon className="flex">
          <FontAwesomeIcon icon={icon} className="text-[28px] md:text-[36px]" />
        </span>
      </span>

      <span className={cn(
          "mt-[25px] font-jersey-15 text-[17px] md:mt-[30px] md:text-[21px]",
          selected ? "text-[#0015ff]" : "text-white",
          disabled && "opacity-35"
        )}>
        {label}
      </span>
    </button>
  );
}
