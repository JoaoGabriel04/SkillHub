"use client";

import { useState } from "react";
import { mutate } from "swr";
import { ShoppingCart } from "lucide-react";
import { CarrinhoDialog, chaveCarrinho } from "@/components/app/carrinho-dialog";
import { CheckoutDialog, type ItemParaComprar } from "@/components/app/checkout-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { useCarrinho, useCarrinhoStore } from "@/stores/carrinho-store";

// Botão do carrinho no título de Produtos (Fase 18B), com a contagem de itens. Abre o carrinho e, dele, o checkout.
export function BotaoCarrinho() {
  const usuarioId = useAuthStore((s) => s.user?.id);
  const itens = useCarrinho(usuarioId);
  const remover = useCarrinhoStore((s) => s.remover);
  const [etapa, setEtapa] = useState<null | "carrinho" | "checkout">(null);
  const [paraComprar, setParaComprar] = useState<ItemParaComprar[]>([]);
  const quantidade = itens.reduce((t, i) => t + i.quantidade, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setEtapa("carrinho")}
        aria-label={quantidade ? `Carrinho: ${quantidade} ${quantidade === 1 ? "item" : "itens"}` : "Carrinho vazio"}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/10 sm:size-9"
      >
        <ShoppingCart size={20} aria-hidden />
        {quantidade > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-secondary text-[10px] leading-none font-semibold text-accent-foreground tabular-nums"
          >
            {quantidade > 99 ? "99+" : quantidade}
          </span>
        )}
      </button>
      {etapa === "carrinho" && usuarioId && (
        <CarrinhoDialog
          itens={itens}
          usuarioId={usuarioId}
          open
          onOpenChange={(o) => !o && setEtapa(null)}
          onFinalizar={(lista) => {
            setParaComprar(lista);
            setEtapa("checkout");
          }}
        />
      )}
      {etapa === "checkout" && (
        <CheckoutDialog
          itens={paraComprar}
          open
          onOpenChange={(o) => !o && setEtapa(null)}
          onVoltar={() => setEtapa("carrinho")}
          onComprou={(ids) => remover(ids)}
          // a mensagem fica no checkout; o "Voltar" leva ao carrinho já relido
          onDesatualizado={() => void mutate(chaveCarrinho(itens.map((i) => i.produtoId)))}
        />
      )}
    </>
  );
}
