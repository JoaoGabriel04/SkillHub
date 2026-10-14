"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { SplitText } from "gsap/SplitText";

// Ponto único de registro dos plugins — todo componente animado importa daqui.
// Só no navegador: no SSR os plugins não registram e o CustomWiggle quebra.
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, CustomEase, CustomWiggle, Physics2DPlugin, ScrambleTextPlugin, SplitText);
  // Tremida de erro (formulário inválido, credenciais erradas)
  CustomWiggle.create("shake", { wiggles: 7, type: "easeOut" });
  // Curva "snap" da colmeia: sobe rápido e passa um pouco do ponto
  CustomEase.create("hexPop", "M0,0 C0.2,0 0.25,1.25 0.55,1.12 0.75,1.04 0.85,1 1,1");
}

// Caracteres do ScrambleText — combinam com a fonte pixelada (Jersey)
export const SCRAMBLE_CHARS = "01<>/{}#$%&*+=?";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, useGSAP, SplitText };
