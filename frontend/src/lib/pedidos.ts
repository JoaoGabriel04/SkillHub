import axios from "axios";
import { mutate } from "swr";
import { api } from "@/lib/api";
import type { ErroPedido, PedidoDetalhe, PedidoResumo } from "@/types/pedido";

// Cliente da API de Pedidos (Fase 18B), no padrão de lib/produtos.ts.

export type ItemCheckout = { produtoId: string; quantidade: number; precoEsperado: number };

export const CHAVE_COMPRAS = "pedidos/compras";
export const CHAVE_VENDAS = "pedidos/vendas";
export const chavePedido = (id: string) => ["pedido", id] as const;

export const getCompras = () => api.get<{ pedidos: PedidoResumo[] }>("/pedidos/compras", { params: { limit: 50 } }).then((r) => r.data.pedidos);
export const getVendas = () => api.get<{ pedidos: PedidoResumo[] }>("/pedidos/vendas", { params: { limit: 50 } }).then((r) => r.data.pedidos);
export const getPedido = (id: string) => api.get<{ pedido: PedidoDetalhe }>(`/pedidos/${id}`).then((r) => r.data.pedido);

export const finalizarCompra = (itens: ItemCheckout[], observacao?: string) =>
  api.post<{ pedidos: PedidoDetalhe[] }>("/pedidos", { itens, ...(observacao && { observacao }) }).then((r) => r.data.pedidos);

const acao = (id: string, nome: "enviar" | "confirmar-recebimento" | "cancelar") =>
  api.post<{ pedido: PedidoDetalhe }>(`/pedidos/${id}/${nome}`).then((r) => r.data.pedido);
export const enviarPedido = (id: string) => acao(id, "enviar");
export const confirmarRecebimento = (id: string) => acao(id, "confirmar-recebimento");
export const cancelarPedido = (id: string) => acao(id, "cancelar");

export const getContatoPedido = (id: string) => api.get<{ url: string }>(`/pedidos/${id}/contato`).then((r) => r.data.url);

// corpo de um 409 do checkout (code, produtoId, precoAtual...), para a tela apontar o produto
export function erroPedido(err: unknown): ErroPedido | null {
  return axios.isAxiosError<ErroPedido>(err) && err.response?.data?.error ? err.response.data : null;
}

// Depois de comprar, enviar, confirmar ou cancelar: compras, vendas, o pedido aberto e os produtos (o estoque mudou)
export const revalidarPedidos = () =>
  mutate(
    (chave) =>
      chave === CHAVE_COMPRAS ||
      chave === CHAVE_VENDAS ||
      chave === "produtos/meus" ||
      (Array.isArray(chave) && ["pedido", "produtos", "produto"].includes(chave[0]))
  );
