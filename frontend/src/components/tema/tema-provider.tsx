"use client";

import { createContext, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  aplicarTema,
  assinarTema,
  definirPreferencia,
  lerPreferencia,
  resolverTema,
  SNAPSHOT_SERVIDOR,
  snapshotTema,
  type PreferenciaTema,
  type Tema,
} from "@/lib/tema";

type TemaContexto = {
  preferencia: PreferenciaTema;
  tema: Tema; // o aplicado (com "sistema", o que o sistema pede agora)
  definirPreferencia: (preferencia: PreferenciaTema) => void;
};

const Ctx = createContext<TemaContexto | null>(null);

// O script do <head> já aplicou o tema antes da primeira pintura; aqui o React acompanha as trocas.
// Na hidratação o snapshot é o do servidor (tema padrão) e logo vira o real, sem erro de hidratação.
export function TemaProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(assinarTema, snapshotTema, () => SNAPSHOT_SERVIDOR);
  const [preferencia, tema] = snapshot.split(":") as [PreferenciaTema, Tema];

  // Aplica lendo a preferência real, não o snapshot: na hidratação o snapshot ainda é o do servidor.
  // Também corrige o Strict Mode do dev, que remonta e devolve ao <html> só a classe do JSX
  // (guia "Preventing flash before hydration" do Next 16).
  useLayoutEffect(() => {
    aplicarTema(resolverTema(lerPreferencia()));
  }, [snapshot]);

  return <Ctx.Provider value={{ preferencia, tema, definirPreferencia }}>{children}</Ctx.Provider>;
}

export function useTema() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTema precisa do TemaProvider");
  return ctx;
}
