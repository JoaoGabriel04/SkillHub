"use client";

import { useRef } from "react";
import Button1 from "@/components/Button1";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { Hex } from "@/components/motion/hex";
import { useEntered, usePageTransition } from "@/components/motion/page-transition";
import { BRILHO_LOGO_HOME, HEX_COLORS } from "@/lib/brand";
import { gsap, prefersReducedMotion, SCRAMBLE_CHARS, useGSAP } from "@/lib/gsap";

const SWARM = 42; // hexágonos que voam até o centro e "montam" o logo
const BURST = 18; // hexágonos que explodem ao clicar no logo

// designs/New Home.png
// Entrada: enxame de hexágonos converge → logo nasce com onda de choque → nome decodifica
// (ScrambleText) → borda do botão se desenha. Depois: logo flutua, inclina com o mouse, e
// clicar nele solta uma explosão de hexágonos com física.
export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const entered = useEntered();
  const { navigate } = usePageTransition();

  const { contextSafe } = useGSAP(
    () => {
      if (!entered) return;
      const title = root.current!.querySelector<HTMLElement>("[data-title]")!;

      if (prefersReducedMotion()) {
        gsap.set("[data-logo], [data-title], [data-cta]", { autoAlpha: 1 });
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      title.textContent = "";

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        "[data-swarm] > *",
        {
          autoAlpha: 0,
          x: () => gsap.utils.random(-vw * 0.6, vw * 0.6),
          y: () => gsap.utils.random(-vh * 0.6, vh * 0.6),
          rotation: () => gsap.utils.random(-240, 240),
          scale: () => gsap.utils.random(0.6, 1.8),
        },
        {
          autoAlpha: 1,
          x: () => gsap.utils.random(-34, 34),
          y: () => gsap.utils.random(-40, 40),
          rotation: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.in",
          stagger: { amount: 0.35, from: "random" },
        }
      )
        // o enxame implode e o logo nasce no lugar
        .to("[data-swarm] > *", { scale: 0, autoAlpha: 0, duration: 0.25, ease: "power2.in", stagger: { amount: 0.1 } })
        .fromTo(
          "[data-logo]",
          { autoAlpha: 0, scale: 0.3, rotation: -25 },
          { autoAlpha: 1, scale: 1, rotation: 0, duration: 1.3, ease: "elastic.out(1, 0.45)" },
          "<"
        )
        .fromTo(
          "[data-ring]",
          { autoAlpha: 0.9, scale: 0.6 },
          { autoAlpha: 0, scale: 3.4, duration: 1.1, ease: "expo.out", stagger: 0.14 },
          "<"
        )
        .fromTo(
          title,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 1.1,
            ease: "none",
            scrambleText: { text: "SkillHub", chars: SCRAMBLE_CHARS, revealDelay: 0.35, speed: 0.5, tweenLength: true },
          },
          "<0.25"
        )
        // borda do botão: abre do centro pras pontas, depois o texto chega
        .fromTo(
          "[data-cta]",
          { autoAlpha: 1, clipPath: "inset(0% 50% 0% 50%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power4.inOut" },
          "<0.45"
        )
        .from("[data-cta] .font-jersey-25", { autoAlpha: 0, letterSpacing: "0.6em", duration: 0.6 }, "<0.35")
        // ocioso: logo flutua e o brilho respira
        .to("[data-float-logo]", { y: -9, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 })
        .to(
          "[data-logo]",
          { filter: BRILHO_LOGO_HOME, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 },
          "<"
        );

      // inclinação 3D seguindo o mouse
      const rx = gsap.quickTo("[data-tilt]", "rotationX", { duration: 0.9, ease: "power3" });
      const ry = gsap.quickTo("[data-tilt]", "rotationY", { duration: 0.9, ease: "power3" });
      gsap.set("[data-tilt]", { transformPerspective: 700 });
      const onMove = (e: PointerEvent) => {
        ry(((e.clientX / window.innerWidth) * 2 - 1) * 22);
        rx(((e.clientY / window.innerHeight) * 2 - 1) * -18);
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: root, dependencies: [entered] }
  );

  // easter egg: o logo gira e cospe hexágonos com gravidade
  const burst = contextSafe(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo("[data-spin]", { rotation: 0 }, { rotation: 360, duration: 0.9, ease: "back.inOut(1.6)", overwrite: true });
    gsap.fromTo(
      "[data-burst] > *",
      { x: 0, y: 0, autoAlpha: 1, scale: () => gsap.utils.random(0.6, 1.4), rotation: 0 },
      {
        physics2D: {
          velocity: () => gsap.utils.random(260, 560),
          angle: () => gsap.utils.random(200, 340), // leque pra cima
          gravity: 900,
        },
        rotation: () => gsap.utils.random(-540, 540),
        autoAlpha: 0,
        duration: 1.4,
        ease: "power1.in",
        overwrite: true,
      }
    );
  });

  return (
    <div ref={root} className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center">
      <div data-tilt className="relative flex flex-col items-center [transform-style:preserve-3d]">
        <div data-float-logo className="relative">
          {/* ondas de choque */}
          {[0, 1].map((i) => (
            <div key={i} data-ring className="invisible absolute top-1/2 left-1/2 -translate-1/2 text-accent-text">
              <Hex size={120} strokeWidth={2} />
            </div>
          ))}
          <div data-swarm className="absolute top-1/2 left-1/2">
            {Array.from({ length: SWARM }, (_, i) => (
              <Hex
                key={i}
                size={10 + (i % 4) * 2}
                filled
                className="invisible absolute -translate-1/2"
                style={{ color: HEX_COLORS[i % HEX_COLORS.length] }}
              />
            ))}
          </div>
          <div data-burst className="pointer-events-none absolute top-1/2 left-1/2">
            {Array.from({ length: BURST }, (_, i) => (
              <Hex
                key={i}
                size={9 + (i % 3) * 3}
                filled
                className="invisible absolute -translate-1/2"
                style={{ color: HEX_COLORS[i % HEX_COLORS.length] }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={burst}
            aria-label="SkillHub"
            data-logo
            className="invisible relative block cursor-pointer"
          >
            <span data-spin className="block">
              <SkillHubLogo size={115} />
            </span>
          </button>
        </div>
        <p
          data-title
          className="invisible mt-[9px] min-h-8 bg-(image:--brand-title-gradient) bg-clip-text font-jersey-25 text-[32px] leading-none text-transparent"
        >
          SkillHub
        </p>
      </div>
      <div data-cta className="invisible mt-[50px]">
        <Button1
          size="md"
          handle={(e) => navigate("/login", { origin: e.detail ? { x: e.clientX, y: e.clientY } : e.currentTarget })}
        >
          Entrar
        </Button1>
      </div>
    </div>
  );
}
