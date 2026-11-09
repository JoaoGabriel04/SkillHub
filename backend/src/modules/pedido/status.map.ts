import type { ParteDoPedido, StatusPedidoProduto } from "@prisma/client";

// A API fala em rótulos; o banco guarda o enum (Fase 18B), como nos serviços e produtos.
export const ROTULO_STATUS_PEDIDO = {
  AGUARDANDO_ENVIO: "Aguardando envio",
  ENVIADO: "Enviado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
} as const satisfies Record<StatusPedidoProduto, string>;

export const ROTULO_PARTE = { COMPRADOR: "Comprador", VENDEDOR: "Vendedor" } as const satisfies Record<ParteDoPedido, string>;

// pedido em aberto: a reserva está presa e o contato pelo WhatsApp vale
export const STATUS_ABERTOS: StatusPedidoProduto[] = ["AGUARDANDO_ENVIO", "ENVIADO"];
