"use client";

import { useState } from "react";
import { PedidoDetalheDialog } from "@/components/app/pedido-detalhe-dialog";
import { creditos, FotoDoPedido, nomeDoPedido } from "@/components/app/pedido-foto";
import type { PedidoResumo } from "@/types/pedido";

// Card de pedido nas linhas "Suas compras" e "Suas vendas" (Fase 18B): as medidas do ProdutoCard, com a capa do
// primeiro item, "nome (+N)", o total e o status. O clique abre o detalhe do pedido.
export function PedidoCard({ pedido, acimaDaDobra }: { pedido: PedidoResumo; acimaDaDobra?: boolean }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="group flex w-[180px] flex-col text-left font-secondary sm:w-[210px] lg:w-[240px]">
        <div className="relative h-[135px] w-full overflow-hidden rounded-[2px] border-[6px] border-surface-2 bg-surface-2 sm:h-[158px] lg:h-[180px]">
          <FotoDoPedido src={pedido.capaUrl} alt={pedido.primeiroItem} eager={acimaDaDobra} sizes="(min-width: 1024px) 240px, (min-width: 640px) 210px, 180px" />
        </div>
        <p className="mt-[4px] line-clamp-2 text-[11px] leading-[1.3] text-foreground sm:mt-1.5 sm:text-[13px] lg:text-[14px]">
          {nomeDoPedido(pedido)} - {creditos(pedido.total)}
        </p>
        <span className="mt-[2px] text-[10px] text-muted-foreground transition-colors group-hover:text-foreground sm:text-[12px] lg:text-[13px]">
          <span className="text-accent-text">{pedido.status} · </span>
          Ver detalhes
        </span>
      </button>
      {aberto && <PedidoDetalheDialog pedidoId={pedido.id} resumo={pedido} open onOpenChange={setAberto} />}
    </>
  );
}
