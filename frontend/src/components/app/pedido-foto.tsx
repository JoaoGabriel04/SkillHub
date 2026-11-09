"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
import type { PedidoResumo } from "@/types/pedido";

// Auxiliares de pedido (Fase 18B), usados pelo card e pelo detalhe.

export const creditos = (n: number) => `${n} ${n === 1 ? "crédito" : "créditos"}`;
export const nomeDoPedido = (p: Pick<PedidoResumo, "primeiroItem" | "outrosItens">) =>
  p.outrosItens > 0 ? `${p.primeiroItem} (+${p.outrosItens})` : p.primeiroItem;

// Foto do snapshot do pedido. Sem foto, ou com a foto que saiu do armazenamento (produto removido, Fase 18B,
// decisão D7), aparece o ícone de sacola, como no card de produto sem capa.
export function FotoDoPedido({ src, alt, sizes, eager }: { src: string | null; alt: string; sizes: string; eager?: boolean }) {
  const [quebrou, setQuebrou] = useState(false);
  return src && !quebrou ? (
    <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? "eager" : undefined} onError={() => setQuebrou(true)} className="object-cover" />
  ) : (
    <FontAwesomeIcon icon={faBagShopping} aria-hidden className="absolute inset-0 m-auto text-[24px] text-muted-foreground" />
  );
}
