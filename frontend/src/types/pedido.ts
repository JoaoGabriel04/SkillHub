import type { AutorResumo } from "@/types/servico";

// Pedido de produtos como a API devolve (Fase 18B). Um pedido por vendedor em cada checkout; total em créditos,
// reservado do comprador até a confirmação do recebimento (paga o vendedor) ou o cancelamento (estorna).

export type StatusPedido = "Aguardando envio" | "Enviado" | "Concluído" | "Cancelado";
export type Papel = "comprador" | "vendedor";

// GET /pedidos/compras e /pedidos/vendas
export type PedidoResumo = {
  id: string;
  status: StatusPedido;
  total: number;
  createdAt: string; // ISO
  enviadoEm: string | null;
  concluidoEm: string | null;
  canceladoEm: string | null;
  papel: Papel; // de quem pediu a lista
  primeiroItem: string;
  outrosItens: number;
  capaUrl: string | null;
  outraParte: AutorResumo | null; // null: a conta foi excluída
};

export type ItemPedido = {
  id: string;
  produtoId: string | null; // null: o produto não existe mais (o snapshot continua)
  nome: string;
  precoUnitario: number;
  quantidade: number;
  imagemUrl: string | null;
  digital: boolean;
};

// GET /pedidos/:id, POST /pedidos e as ações
export type PedidoDetalhe = PedidoResumo & {
  itens: ItemPedido[];
  observacao: string | null;
  canceladoPor: "Comprador" | "Vendedor" | null;
  outraParteLocal: { cidade: string | null; bairro: string | null } | null; // só cidade e bairro, nunca o endereço
  contatoDisponivel: boolean; // pedido em aberto e a outra parte com telefone (o telefone nunca vem)
};

// erros do checkout que apontam um produto (409)
export type CodigoErroPedido = "PRECO_ALTERADO" | "ESGOTADO" | "INDISPONIVEL" | "SALDO_INSUFICIENTE" | "CONFLITO";
export type ErroPedido = { error: string; code?: CodigoErroPedido; produtoId?: string; precoAtual?: number; estoque?: number };
