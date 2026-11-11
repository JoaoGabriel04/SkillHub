"use client";

import Link from "next/link";
import useSWR from "swr";
import { Minus, Plus, Trash } from "lucide-react";
import { creditos, FotoDoPedido } from "@/components/app/pedido-foto";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { getProduto } from "@/lib/produtos";
import { cn } from "@/lib/utils";
import { MAX_QUANTIDADE, useCarrinhoStore, type ItemCarrinho } from "@/stores/carrinho-store";
import type { ItemParaComprar } from "@/components/app/checkout-dialog";
import type { ProdutoDetalhe } from "@/types/produto";

type Props = {
  itens: ItemCarrinho[];
  usuarioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalizar: (itens: ItemParaComprar[]) => void;
};

// Uma linha do carrinho com os dados relidos: indisponível (pausado, removido, esgotado ou do próprio usuário)
// fica fora do total; quantidade acima do estoque atual é reduzida na tela, com o aviso.
type Linha = { item: ItemCarrinho; produto: ProdutoDetalhe | null; quantidade: number; disponivel: boolean; reduzida: boolean };

// Os produtos do carrinho, relidos da API ao abrir (decisão D12): 404 vira "indisponível". A chave começa com
// "produtos", então revalidarProdutos e revalidarPedidos também a recarregam.
export const chaveCarrinho = (ids: string[]) => ["produtos", "carrinho", ids.join(",")] as const;
export const lerCarrinho = (ids: string[]) => Promise.all(ids.map((id) => getProduto(id).catch(() => null)));

const botaoIcone =
  "flex size-7 items-center justify-center rounded-[6px] text-foreground-secondary transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";

export function CarrinhoDialog({ itens, usuarioId, open, onOpenChange, onFinalizar }: Props) {
  const ids = itens.map((i) => i.produtoId);
  const { data: produtos, error, mutate } = useSWR(open && ids.length ? chaveCarrinho(ids) : null, () => lerCarrinho(ids));
  const definirQuantidade = useCarrinhoStore((s) => s.definirQuantidade);
  const remover = useCarrinhoStore((s) => s.remover);

  const linhas: Linha[] = itens.map((item, i) => {
    const produto = produtos?.[i] ?? null;
    const disponivel = !!produto && produto.status === "Ativo" && produto.estoque > 0 && produto.vendedor.id !== usuarioId;
    const quantidade = disponivel ? Math.min(item.quantidade, produto!.estoque) : item.quantidade;
    return { item, produto, quantidade, disponivel, reduzida: disponivel && quantidade < item.quantidade };
  });
  const grupos = Object.values(
    linhas.reduce<Record<string, { vendedor: string; linhas: Linha[] }>>((acc, l) => {
      const id = l.produto?.vendedor.id ?? l.item.vendedorId;
      (acc[id] ??= { vendedor: l.produto?.vendedor.fullName ?? "Vendedor", linhas: [] }).linhas.push(l);
      return acc;
    }, {})
  );
  const disponiveis = linhas.filter((l) => l.disponivel);
  const total = disponiveis.reduce((t, l) => t + l.produto!.preco * l.quantidade, 0);
  const vendedores = new Set(disponiveis.map((l) => l.produto!.vendedor.id)).size;
  const qtdItens = itens.reduce((t, i) => t + i.quantidade, 0);
  const descricao = itens.length
    ? `${qtdItens} ${qtdItens === 1 ? "item" : "itens"}${vendedores > 1 ? ` de ${vendedores} vendedores` : ""}`
    : "Os produtos que você escolher aparecem aqui.";

  return (
    <ProfileDialog open={open} onOpenChange={onOpenChange} title="Carrinho" description={descricao}>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center font-secondary">
          <p className="text-[13px] text-muted-foreground">Seu carrinho está vazio.</p>
          <Link href="/produtos" onClick={() => onOpenChange(false)} className="text-[13px] text-accent-text hover:text-foreground">
            Ver produtos
          </Link>
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="font-secondary text-[13px] text-muted-foreground">Não foi possível carregar o carrinho.</p>
          <CtaButton onClick={() => mutate()} className="h-8 px-4">
            Tentar de novo
          </CtaButton>
        </div>
      ) : !produtos ? (
        <ul aria-busy className="flex flex-col gap-2">
          {itens.map((i) => (
            <li key={i.produtoId} className="h-[52px] animate-pulse rounded-[10px] bg-foreground/[0.06]" />
          ))}
        </ul>
      ) : (
        <>
          <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-1 font-secondary">
            {grupos.map((g) => {
              const subtotal = g.linhas.filter((l) => l.disponivel).reduce((t, l) => t + l.produto!.preco * l.quantidade, 0);
              return (
                <section key={g.vendedor + g.linhas[0].item.produtoId} aria-label={`Itens de ${g.vendedor}`}>
                  <h3 className="border-b border-foreground/10 pb-1.5 text-[12px] font-semibold text-foreground-secondary">{g.vendedor}</h3>
                  <ul className="mt-2 flex flex-col gap-2.5">
                    {g.linhas.map((l) => (
                      <li key={l.item.produtoId} className="flex items-center gap-3">
                        <div className={cn("relative size-[44px] shrink-0 overflow-hidden rounded-[6px] bg-surface-2", !l.disponivel && "opacity-50")}>
                          <FotoDoPedido src={l.produto?.imagens[0]?.url ?? l.item.capaUrl} alt="" sizes="44px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-[13px]", l.disponivel ? "text-foreground" : "text-muted-foreground")}>{l.produto?.nome ?? l.item.nome}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {l.disponivel ? creditos(l.produto!.preco) : "Indisponível"}
                            {l.reduzida && <span className="text-accent-text"> · Só há {l.produto!.estoque} disponíveis</span>}
                          </p>
                        </div>
                        {l.disponivel && (
                          <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Quantidade de ${l.produto!.nome}`}>
                            <button
                              type="button"
                              aria-label="Diminuir"
                              disabled={l.quantidade <= 1}
                              onClick={() => definirQuantidade(l.item.produtoId, l.quantidade - 1)}
                              className={botaoIcone}
                            >
                              <Minus size={14} aria-hidden />
                            </button>
                            <span className="w-6 text-center text-[13px] text-foreground tabular-nums">{l.quantidade}</span>
                            <button
                              type="button"
                              aria-label="Aumentar"
                              disabled={l.quantidade >= Math.min(l.produto!.estoque, MAX_QUANTIDADE)}
                              onClick={() => definirQuantidade(l.item.produtoId, l.quantidade + 1)}
                              className={botaoIcone}
                            >
                              <Plus size={14} aria-hidden />
                            </button>
                          </div>
                        )}
                        <button type="button" aria-label={`Tirar ${l.produto?.nome ?? l.item.nome} do carrinho`} onClick={() => remover([l.item.produtoId])} className={botaoIcone}>
                          <Trash size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {subtotal > 0 && (
                    <p className="mt-2 flex justify-between text-[12px] text-foreground-secondary">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{creditos(subtotal)}</span>
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          <p className="mt-4 flex justify-between border-t border-foreground/10 pt-3 font-secondary text-[14px] font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{creditos(total)}</span>
          </p>
          <div className="mt-5 flex items-center justify-end gap-2 font-secondary">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-[6px] px-3 py-2 text-[13px] text-foreground-secondary transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              Continuar comprando
            </button>
            <CtaButton
              disabled={disponiveis.length === 0}
              onClick={() => onFinalizar(disponiveis.map((l) => ({ produto: l.produto!, quantidade: l.quantidade })))}
              className="h-9 px-4"
            >
              Finalizar compra
            </CtaButton>
          </div>
        </>
      )}
    </ProfileDialog>
  );
}
