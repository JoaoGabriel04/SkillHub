"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

// Transição entre páginas: uma colmeia de hexágonos (os mesmos do logo) cobre a tela
// a partir do ponto do clique, a rota troca por baixo e a colmeia se desfaz do centro
// pra fora numa onda ciano. Na primeira carga a tela já nasce coberta (splash) e só revela.
//
// Fases: intro (splash SSR) → idle ⇄ covering → covered → revealing → idle

type Phase = "intro" | "idle" | "covering" | "covered" | "revealing";
type Point = { x: number; y: number };
type NavigateOptions = { origin?: Point | Element | null; replace?: boolean };

type Cell = { x: number; y: number; s: number; glow: number; d: number; rgb: [number, number, number] };

type TransitionContext = {
  phase: Phase;
  navigate: (href: string, options?: NavigateOptions) => void;
};

const Ctx = createContext<TransitionContext | null>(null);

// Degradê do logo (designs/New Home.png): azul em cima, ciano e verde-água embaixo
const GRADIENT: [number, [number, number, number]][] = [
  [0, [26, 143, 227]],
  [0.5, [41, 195, 220]],
  [0.78, [59, 212, 204]],
  [1, [147, 231, 226]],
];
const DARK: [number, number, number] = [16, 16, 16];
const MIN_COVERED_MS = 320; // tempo mínimo com a tela coberta, pro logo não piscar
const FALLBACK_MS = 6000; // rota que nunca resolve não deixa a tela presa

function gradientAt(t: number): [number, number, number] {
  for (let i = 1; i < GRADIENT.length; i++) {
    const [stop, rgb] = GRADIENT[i];
    if (t <= stop) {
      const [prevStop, prev] = GRADIENT[i - 1];
      const k = (t - prevStop) / (stop - prevStop);
      return [0, 1, 2].map((c) => prev[c] + (rgb[c] - prev[c]) * k) as [number, number, number];
    }
  }
  return GRADIENT[GRADIENT.length - 1][1];
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // pointy-top, como os hexágonos do logo
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// quem marca data-page-exit (o <main> dos layouts) afunda junto com a saída
const pageExitTargets = () => gsap.utils.toArray<HTMLElement>("[data-page-exit]");

// distância normalizada (0..1) de cada célula até a origem, com um pouco de ruído pra onda não ficar geométrica demais
function measureFrom(cells: Cell[], origin: Point) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const max = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(w - origin.x, origin.y),
    Math.hypot(origin.x, h - origin.y),
    Math.hypot(w - origin.x, h - origin.y)
  );
  for (const c of cells) c.d = Math.hypot(c.x - origin.x, c.y - origin.y) / max + Math.random() * 0.07;
}

function resolveOrigin(origin: NavigateOptions["origin"]): Point {
  if (!origin) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  if ("getBoundingClientRect" in origin) {
    const r = origin.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return origin;
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhaseState] = useState<Phase>("intro");
  const phaseRef = useRef<Phase>("intro");
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<Cell[]>([]);
  const radiusRef = useRef(36);
  const coveredAtRef = useRef(0);
  const pendingRef = useRef<{ from: string; to: string } | null>(null);
  const fallbackRef = useRef<gsap.core.Tween | null>(null);
  const pulseRef = useRef<gsap.core.Tween | null>(null);
  const reducedRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const R = radiusRef.current;
    ctx.lineWidth = 1.25;
    for (const c of cellsRef.current) {
      if (c.s <= 0.01) continue;
      const g = Math.max(0, Math.min(1, c.glow));
      const [r, gr, b] = c.rgb;
      // ladrilho: escuro, tingido pela cor do logo enquanto a "onda" passa
      const k = g * 0.9;
      hexPath(ctx, c.x, c.y, R * c.s * 1.03);
      ctx.fillStyle = `rgb(${DARK[0] + (r - DARK[0]) * k},${DARK[1] + (gr - DARK[1]) * k},${DARK[2] + (b - DARK[2]) * k})`;
      ctx.fill();
      // favo interno: contorno fino que acende junto com a onda
      hexPath(ctx, c.x, c.y, R * c.s * 0.82);
      ctx.strokeStyle = `rgba(${r},${gr},${b},${0.14 + g * 0.75})`;
      ctx.stroke();
    }
  }, []);

  const buildGrid = useCallback(
    (scale: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const R = Math.max(26, Math.min(46, Math.min(w, h) / 13));
      radiusRef.current = R;
      const hw = Math.sqrt(3) * R; // largura de um hexágono pointy-top
      const vh = 1.5 * R; // distância vertical entre linhas
      const cells: Cell[] = [];
      for (let row = -1; row * vh < h + R; row++) {
        const offset = row % 2 ? hw / 2 : 0;
        for (let col = -1; col * hw < w + hw; col++) {
          const x = col * hw + offset;
          const y = row * vh;
          cells.push({ x, y, s: scale, glow: 0, d: 0, rgb: gradientAt(Math.max(0, Math.min(1, y / h))) });
        }
      }
      cellsRef.current = cells;
      draw();
    },
    [draw]
  );

  const startPulse = useCallback(() => {
    pulseRef.current?.kill();
    pulseRef.current = gsap.to(logoRef.current, {
      filter: "drop-shadow(0 0 22px rgba(59,212,204,0.85))",
      scale: 1.06,
      duration: 0.7,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }, []);

  const reveal = useCallback(() => {
    if (phaseRef.current !== "covered" && phaseRef.current !== "intro") return;
    fallbackRef.current?.kill();
    pendingRef.current = null;
    const wait = Math.max(0, coveredAtRef.current + MIN_COVERED_MS - performance.now()) / 1000;

    gsap.delayedCall(wait, () => {
      setPhase("revealing");
      pulseRef.current?.kill();
      // a página antiga pode ter deixado o layout borrado (ver cover)
      gsap.set(pageExitTargets(), { clearProps: "transform,filter,opacity" });

      const overlay = overlayRef.current!;
      overlay.style.animation = "none";
      gsap.set(overlay, { backgroundColor: "transparent" });

      const done = () => {
        setPhase("idle");
        gsap.set(overlay, { autoAlpha: 0 });
      };

      if (reducedRef.current) {
        gsap.to(overlay, { autoAlpha: 0, duration: 0.25, onComplete: done });
        return;
      }

      measureFrom(cellsRef.current, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const stagger = (i: number) => cellsRef.current[i].d * 0.5;
      gsap
        .timeline({ onUpdate: draw, onComplete: () => (draw(), done()) })
        .to(logoRef.current, { scale: 1.6, autoAlpha: 0, filter: "blur(6px)", duration: 0.35, ease: "power2.in" }, 0)
        .to(cellsRef.current, { glow: 1, duration: 0.14, ease: "power1.out", stagger }, 0.05)
        .to(cellsRef.current, { s: 0, duration: 0.42, ease: "power3.in", stagger }, 0.12);
    });
  }, [draw, setPhase]);

  const navigate = useCallback(
    (href: string, { origin, replace = false }: NavigateOptions = {}) => {
      const target = new URL(href, window.location.href);
      const go = () => (replace ? router.replace(href) : router.push(href));
      // durante uma transição (ou mesma URL) não empilha outra
      if (phaseRef.current !== "idle") return;
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;

      setPhase("covering");
      const overlay = overlayRef.current;
      const point = resolveOrigin(origin);

      const onCovered = () => {
        setPhase("covered");
        coveredAtRef.current = performance.now();
        pendingRef.current = { from: window.location.pathname, to: target.pathname };
        go();
        // só a query mudou: o pathname não muda, então não há sinal de "chegou"
        if (target.pathname === window.location.pathname) gsap.delayedCall(0.35, reveal);
        fallbackRef.current = gsap.delayedCall(FALLBACK_MS / 1000, reveal);
      };

      if (reducedRef.current) {
        gsap.fromTo(
          overlay,
          { autoAlpha: 0, backgroundColor: "#101010" },
          { autoAlpha: 1, duration: 0.2, onComplete: onCovered }
        );
        return;
      }

      buildGrid(0);
      measureFrom(cellsRef.current, point);
      gsap.set(overlay, { autoAlpha: 1, backgroundColor: "transparent" });
      gsap.set(logoRef.current, { autoAlpha: 0, scale: 0.4, filter: "blur(0px)" });

      const stagger = (i: number) => cellsRef.current[i].d * 0.42;
      gsap
        .timeline({ onUpdate: draw, onComplete: () => (onCovered(), startPulse()) })
        // a página que sai afunda e desfoca enquanto a colmeia avança
        .to(pageExitTargets(), { scale: 0.96, filter: "blur(6px)", opacity: 0.4, duration: 0.6, ease: "power2.in" }, 0)
        .fromTo(cellsRef.current, { glow: 1 }, { glow: 0, duration: 0.65, ease: "power2.out", stagger }, 0)
        .to(cellsRef.current, { s: 1, duration: 0.42, ease: "hexPop", stagger }, 0)
        .to(logoRef.current, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" }, ">-0.2");
    },
    [buildGrid, draw, reveal, router, setPhase, startPulse]
  );

  // splash da primeira carga: a colmeia já nasce inteira e se desfaz
  useGSAP(() => {
    reducedRef.current = prefersReducedMotion();
    buildGrid(1);
    coveredAtRef.current = performance.now();
    startPulse();
    reveal();
  }, []);

  // a rota nova montou por baixo da colmeia → revela
  useEffect(() => {
    const pending = pendingRef.current;
    if (pending && phaseRef.current === "covered" && pathname !== pending.from) reveal();
  }, [pathname, reveal]);

  // redimensionar no meio da cobertura recria a grade já cheia
  useEffect(() => {
    const onResize = () => {
      if (phaseRef.current === "covered") buildGrid(1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [buildGrid]);

  return (
    <Ctx.Provider value={{ phase, navigate }}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        // SSR: fundo sólido + logo = splash. Sem JS, o CSS some com ele (globals.css)
        className="page-transition-overlay fixed inset-0 z-[200] flex items-center justify-center bg-[#101010]"
        style={{ pointerEvents: phase === "idle" ? "none" : "auto" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        <div ref={logoRef} className="relative">
          <SkillHubLogo size={72} />
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function usePageTransition() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePageTransition precisa do PageTransitionProvider");
  return ctx;
}

// true a partir do momento em que a página fica visível (fim do splash ou início da revelação).
// Trava em true: animações de entrada rodam uma vez e não são revertidas quando a página sai.
export function useEntered() {
  const { phase } = usePageTransition();
  const visible = phase === "idle" || phase === "revealing";
  const [entered, setEntered] = useState(visible);
  if (visible && !entered) setEntered(true);
  return entered;
}

// <Link> que passa pela transição. Ctrl/Cmd/Shift/clique do meio seguem o comportamento normal.
export function TransitionLink({ href, onClick, replace, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { navigate } = usePageTransition();
  return (
    <Link
      href={href}
      replace={replace}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // clique de teclado (Enter) chega com detail 0 e coordenadas zeradas → centro do link
        navigate(href, { origin: e.detail ? { x: e.clientX, y: e.clientY } : e.currentTarget, replace });
      }}
      {...props}
    />
  );
}
