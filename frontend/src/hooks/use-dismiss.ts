import { useEffect, type RefObject } from "react";

type Refs = RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[];

// Fecha um popover ao clicar fora do(s) elemento(s) ou apertar Esc.
// Aceita vários refs para popovers renderizados em portal (fora do elemento que os abre).
export function useDismiss(refs: Refs, open: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(refs) ? refs : [refs];
    const onClick = (e: MouseEvent) => {
      if (!list.some((ref) => ref.current?.contains(e.target as Node))) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // refs em array literal mudam a cada render; os .current é que importam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss]);
}
