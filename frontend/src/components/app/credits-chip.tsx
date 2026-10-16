"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faChevronRight, faCoins, faReceipt, faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons";
import { ExtratoDialog } from "@/components/app/extrato-dialog";
import { TransitionLink } from "@/components/motion/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { useDismiss } from "@/hooks/use-dismiss";
import { formatCredits } from "@/lib/creditos";

// formatCredits mora em lib/creditos (o extrato também usa); fica reexportado aqui para quem já importava do chip
export { formatCredits };

// Anima o número do valor anterior até o novo (ease-out); sem animação se o usuário pede menos movimento.
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - t0) / duration, 1);
      const current = start + (target - start) * (1 - (1 - t) ** 3);
      from.current = current;
      setValue(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const ATALHOS = [
  { href: "/servicos", label: "Contratar serviços", icon: faScrewdriverWrench },
  { href: "/produtos", label: "Comprar produtos", icon: faBagShopping },
];

// Chip de créditos do header: pílula de vidro claro (SKILLHUB_DESIGN_SYSTEM.md 2.1) com moeda
// no degradê de marca e valor em Jersey, como no designs/New Início.png. Abre um resumo do saldo.
export function CreditsChip({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false);
  const [extrato, setExtrato] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const shown = useCountUp(credits);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Créditos: ${formatCredits(credits)}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="group flex h-[30px] items-center gap-2 rounded-full border border-glass-border bg-glass pr-3 pl-[3px] shadow-(--shadow-glass) backdrop-blur-[16px] transition-colors outline-none hover:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-expanded:border-accent/60"
      >
        <span className="flex size-[24px] items-center justify-center rounded-full bg-accent-gradient shadow-(--glow-coin) transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
          <FontAwesomeIcon icon={faCoins} className="text-[12px] text-accent-foreground" />
        </span>
        <span aria-hidden className="min-w-[38px] text-right font-jersey-15 text-[19px] leading-none text-foreground tabular-nums">
          {formatCredits(shown)}
        </span>
      </button>

      {open && (
        <GlassCard variant="dark" role="dialog" aria-label="Seu saldo" className="absolute top-10 right-0 z-50 w-64 p-4">
          <p className="font-secondary text-xs text-muted-foreground">Seu saldo</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-gradient shadow-(--glow-coin-lg)">
              <FontAwesomeIcon icon={faCoins} className="text-[18px] text-accent-foreground" />
            </span>
            <p className="font-jersey-20 text-[36px] leading-none text-foreground tabular-nums">
              {formatCredits(credits)}
              <span className="ml-1.5 font-secondary text-xs text-muted-foreground">créditos</span>
            </p>
          </div>

          <p className="mt-3 font-secondary text-xs leading-relaxed text-muted-foreground">
            Créditos são a moeda do SkillHub: use-os para contratar serviços e comprar produtos.
          </p>

          <div className="my-3 border-t border-foreground/10" />

          <nav className="flex flex-col">
            {ATALHOS.map(({ href, label, icon }) => (
              <TransitionLink
                key={href}
                href={href}
                onClick={close}
                className="group/item flex items-center gap-3 rounded-lg px-2 py-2 font-secondary text-sm text-foreground transition-colors hover:bg-foreground/10"
              >
                <FontAwesomeIcon icon={icon} className="w-4 text-accent-text" />
                {label}
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="ml-auto text-[10px] text-muted-foreground transition-transform group-hover/item:translate-x-0.5"
                />
              </TransitionLink>
            ))}
            {/* Fase 17C: extrato aprovado no plano (diálogo) */}
            <button
              type="button"
              onClick={() => {
                close();
                setExtrato(true);
              }}
              className="group/item flex items-center gap-3 rounded-lg px-2 py-2 text-left font-secondary text-sm text-foreground transition-colors hover:bg-foreground/10"
            >
              <FontAwesomeIcon icon={faReceipt} className="w-4 text-accent-text" />
              Ver extrato
              <FontAwesomeIcon
                icon={faChevronRight}
                className="ml-auto text-[10px] text-muted-foreground transition-transform group-hover/item:translate-x-0.5"
              />
            </button>
          </nav>
        </GlassCard>
      )}
      {extrato && <ExtratoDialog open onOpenChange={setExtrato} />}
    </div>
  );
}
