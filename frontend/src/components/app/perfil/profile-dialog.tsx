"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
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
export function ProfileDialog({ open, onOpenChange, title, description, children, error, saving, onSubmit, submitLabel = "Salvar" }: ProfileDialogProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-[420px] gap-0 rounded-[24px] border border-glass-strong-border bg-glass-strong p-6 text-foreground ring-0 shadow-(--shadow-popover) backdrop-blur-[20px] sm:max-w-[420px]">
        <DialogTitle className="pr-6 text-[19px] leading-tight font-bold text-foreground">{title}</DialogTitle>
        <DialogDescription className="mt-1.5 font-secondary text-[13px] text-muted-foreground">{description}</DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5">
          {children}
          {error && (
            <p role="alert" className="mt-4 text-[13px] text-danger">
              {error}
            </p>
          )}
          {onSubmit && (
            <div className="mt-6 flex justify-end gap-3 text-[14px]">
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
        className="mt-1 w-full border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground [color-scheme:dark]"
        {...props}
      />
    </label>
  );
}
