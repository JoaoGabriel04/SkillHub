"use client";

import { useLayoutEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  error?: string | null;
  saving?: boolean;
  onSubmit?: () => void; // sem onSubmit: modal só com ações próprias (sem Cancelar/Salvar)
  submitLabel?: string;
};

// Casca dos modais de edição do Perfil (SKILLHUB_PAGINAS_DESIGN.md, Seção 4): Dialog do shadcn
// com o vidro escuro do design system, título, erro da API e Cancelar/Salvar.
//
// Altura máxima e rolagem interna (Fase 18B): a caixa nunca passa de 100dvh - 2rem (dvh: a barra do navegador do
// celular não corta). O título, a descrição e o X ficam fixos no topo, e o Cancelar/Salvar no rodapé; só o conteúdo
// rola. Num modal que cabe na janela, nada muda (mesma altura, mesmo espaçamento e os mesmos pixels, sem barra):
// - a área do conteúdo avança sobre o padding da caixa (-mx-6) e devolve o mesmo padding (pl-6 e pr-6). O espaço de
//   cima (antes, o mt-5 do form) vira o pt-5 dela, e o de baixo (o padding da caixa, ou o mt-6 do rodapé) vira o pb-6;
// - a rolagem (overflow-y-auto, a calha de 6px e o pr-[18px], que somam os mesmos 24px) só liga quando o conteúdo
//   passa da altura. Um overflow ligado à toa muda o desenho do Chromium (arredondamento de frações de pixel nos
//   cantos e nas bordas), e a comparação byte a byte acusaria. Pelo mesmo motivo a caixa não tem overflow-hidden: é
//   a própria área, com os cantos de baixo arredondados, que recorta o conteúdo rolado;
// - flex! (e não flex): o cn do projeto só junta classes, e o DialogContent do shadcn já traz "grid".
export function ProfileDialog({ open, onOpenChange, title, description, children, error, saving, onSubmit, submitLabel = "Salvar" }: ProfileDialogProps) {
  // em estado (callback ref), e não useRef: o portal do Radix só monta o conteúdo na renderização seguinte,
  // e o efeito precisa rodar de novo quando os elementos aparecem
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const [conteudo, setConteudo] = useState<HTMLDivElement | null>(null);
  const [rola, setRola] = useState(false);

  // liga a rolagem só quando o conteúdo passa da altura da área (antes da pintura, para não piscar)
  useLayoutEffect(() => {
    if (!area || !conteudo) return;
    const medir = () => setRola(area.scrollHeight > area.clientHeight + 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(area);
    observador.observe(conteudo);
    return () => observador.disconnect();
  }, [area, conteudo]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[420px] flex! flex-col gap-0 rounded-[24px] border border-glass-strong-border bg-glass-strong p-6 text-foreground ring-0 shadow-(--shadow-popover) backdrop-blur-[20px] sm:max-w-[420px]">
        <DialogTitle className="shrink-0 pr-6 text-[19px] leading-tight font-bold text-foreground">{title}</DialogTitle>
        <DialogDescription className="mt-1.5 shrink-0 font-secondary text-[13px] text-muted-foreground">{description}</DialogDescription>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div
            ref={setArea}
            className={cn(
              "-mx-6 min-h-0 flex-1 pt-5 pb-6 pl-6",
              rola ? "rolagem-modal overflow-y-auto pr-[18px]" : "pr-6",
              !onSubmit && "-mb-6 rounded-b-[23px]" // sem rodapé, a área chega ao fundo: os cantos de dentro da borda de 1px
            )}
          >
            <div ref={setConteudo}>
              {children}
              {error && (
                <p role="alert" className="mt-4 text-[13px] text-danger">
                  {error}
                </p>
              )}
            </div>
          </div>
          {onSubmit && (
            <div className="flex shrink-0 justify-end gap-3 text-[14px]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="rounded-[6px] px-4 py-2 text-foreground-secondary transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-[6px] bg-accent px-4 py-2 font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {saving && <FontAwesomeIcon icon={faCircleNotch} spin />}
                {submitLabel}
              </button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Campo com rótulo e só a linha de baixo, no padrão dos formulários do app (Inter, não Jersey)
export function DialogField({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <input
        className="mt-1 w-full border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground"
        {...props}
      />
    </label>
  );
}
