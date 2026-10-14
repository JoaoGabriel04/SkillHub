"use client";

import { useRef } from "react";
import Image from "next/image";
import { Hex } from "@/components/motion/hex";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

// Hexágonos soltos no fundo. Posições fixas (nada de Math.random no render → sem mismatch de hidratação);
// depth = quanto cada um acompanha o mouse (paralaxe em camadas).
const FLOATERS = [
  { left: "8%", top: "14%", size: 46, depth: 0.6, opacity: 0.22 },
  { left: "82%", top: "9%", size: 30, depth: 1.2, opacity: 0.3 },
  { left: "90%", top: "38%", size: 64, depth: 0.4, opacity: 0.14 },
  { left: "14%", top: "62%", size: 26, depth: 1.4, opacity: 0.32 },
  { left: "70%", top: "72%", size: 52, depth: 0.7, opacity: 0.18 },
  { left: "36%", top: "86%", size: 20, depth: 1.6, opacity: 0.35 },
  { left: "4%", top: "88%", size: 70, depth: 0.3, opacity: 0.1 },
  { left: "54%", top: "4%", size: 18, depth: 1.8, opacity: 0.3 },
  { left: "60%", top: "44%", size: 14, depth: 2, opacity: 0.28, filled: true },
  { left: "26%", top: "30%", size: 12, depth: 2.2, opacity: 0.3, filled: true },
  { left: "88%", top: "86%", size: 16, depth: 1.9, opacity: 0.3, filled: true },
];

// Fundo das telas de entrada: public/Backgrounds-01.png em "cover" centralizado —
// é o recorte que aparece nos mockups mobile (designs/New Home.png, Login.png, Cadastro.png).
// Por cima: deriva lenta da imagem, hexágonos flutuando, paralaxe e um holofote ciano que segue o mouse.
export function AuthBackground() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set("[data-float]", { autoAlpha: 1 });
        return;
      }

      // Ken Burns: a imagem respira bem devagar
      gsap.fromTo(
        "[data-bg]",
        { scale: 1.08 },
        { scale: 1.16, xPercent: -1.5, yPercent: 1, duration: 22, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );

      // cada hexágono flutua e gira no seu ritmo
      gsap.utils.toArray<HTMLElement>("[data-float]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 0.4 },
          { autoAlpha: 1, scale: 1, duration: 1.4, ease: "back.out(2)", delay: gsap.utils.random(0.2, 1.2) }
        );
        gsap.to(el, {
          y: gsap.utils.random(-70, -25),
          x: gsap.utils.random(-20, 20),
          rotation: gsap.utils.random(-90, 90),
          duration: gsap.utils.random(6, 12),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      // paralaxe + holofote: quickTo reaproveita um tween só por propriedade (barato a cada pointermove)
      const layers = gsap.utils.toArray<HTMLElement>("[data-depth]").map((el) => ({
        depth: Number(el.dataset.depth),
        x: gsap.quickTo(el, "x", { duration: 1.4, ease: "power3" }),
        y: gsap.quickTo(el, "y", { duration: 1.4, ease: "power3" }),
      }));
      const bgX = gsap.quickTo("[data-bg-layer]", "x", { duration: 2, ease: "power3" });
      const bgY = gsap.quickTo("[data-bg-layer]", "y", { duration: 2, ease: "power3" });
      const spotX = gsap.quickTo("[data-spot]", "x", { duration: 0.8, ease: "power3" });
      const spotY = gsap.quickTo("[data-spot]", "y", { duration: 0.8, ease: "power3" });
      gsap.set("[data-spot]", { x: window.innerWidth / 2, y: window.innerHeight / 2 });

      const onMove = (e: PointerEvent) => {
        // -1..1 a partir do centro
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        bgX(nx * -14);
        bgY(ny * -10);
        for (const l of layers) {
          l.x(nx * -22 * l.depth);
          l.y(ny * -22 * l.depth);
        }
        spotX(e.clientX);
        spotY(e.clientY);
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: root }
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#101010]">
      <div data-bg-layer className="absolute -inset-6">
        <div data-bg className="absolute inset-0">
          <Image
            src="/Backgrounds-01.png"
            alt=""
            fill
            // em tela retrato o "cover" estica a imagem (3840×2496) até ~154% da altura em largura
            sizes="max(100vw, 154vh)"
            quality={90}
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center"
          />
        </div>
      </div>

      {/* holofote: centro em (x, y) do mouse; mix-blend-screen só clareia */}
      <div
        data-spot
        className="absolute top-0 left-0 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,212,204,0.10)_0%,rgba(41,195,220,0.04)_40%,transparent_70%)] mix-blend-screen"
      />

      {FLOATERS.map(({ left, top, size, depth, opacity, filled }, i) => (
        <div key={i} data-depth={depth} className="absolute" style={{ left, top, opacity }}>
          <div data-float className="invisible text-accent">
            <Hex size={size} filled={filled} />
          </div>
        </div>
      ))}
    </div>
  );
}
