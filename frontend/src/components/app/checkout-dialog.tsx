"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { ExtratoDialog } from "@/components/app/extrato-dialog";
import { creditos } from "@/components/app/pedido-foto";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { atualizarUsuario } from "@/lib/creditos";
import { erroPedido, finalizarCompra, revalidarPedidos } from "@/lib/pedidos";
import { cn } from "@/lib/utils";
import { OBSERVACAO_MAX } from "@/lib/validation/pedido";
import { useAuthStore } from "@/stores/auth-store";
import type { ProdutoDetalhe } from "@/types/produto";

export type ItemParaComprar = { produto: ProdutoDetalhe; quantidade: number };

type Props = {
  itens: ItemParaComprar[]; // só os disponíveis, com os dados relidos da API
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComprou?: (produtoIds: string[]) => void; // o carrinho tira os itens comprados
  onVoltar?: () => void; // volta ao carrinho (sem ele, "Voltar" só fecha)
  onDesatualizado?: () => void; // preço, estoque ou status mudou: o carrinho relê os produtos
};

const botaoSecundario = "rounded-[6px] px-3 py-2 text-[13px] text-foreground-secondary transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-50";

// Finalizar a compra (Fase 18B): um pedido por vendedor, numa só reserva de créditos. Os créditos ficam
// reservados até a confirmação do recebimento. O servidor confere de novo o preço, o estoque e o saldo.
export function CheckoutDialog({ itens, open, onOpenChange, onComprou, onVoltar, onDesatualizado }: Props) {
  const saldo = useAuthStore((s) => s.user?.credits ?? 0);
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [semSaldo, setSemSaldo] = useState(false);
  const [extrato, setExtrato] = useState(false);

  const grupos = Object.values(
    itens.reduce<Record<string, { vendedor: string; itens: number; subtotal: number }>>((acc, { produto, quantidade }) => {
      const g = (acc[produto.vendedor.id] ??= { vendedor: produto.vendedor.fullName, itens: 0, subtotal: 0 });
      g.itens += quantidade;
      g.subtotal += produto.preco * quantidade;
      return acc;
    }, {})
  );
  const total = grupos.reduce((t, g) => t + g.subtotal, 0);
  const faltam = Math.max(0, total - saldo);
  const insuficiente = semSaldo || faltam > 0;

  async function reservar() {
    setErro(null);
    setEnviando(true);
    try {
      const pedidos = await finalizarCompra(
        itens.map(({ produto, quantidade }) => ({ produtoId: produto.id, quantidade, precoEsperado: produto.preco })),
        observacao.trim() || undefined
      );
      onComprou?.(itens.map((i) => i.produto.id));
      await Promise.all([atualizarUsuario(), revalidarPedidos()]);
      toast.success(pedidos.length === 1 ? "Pedido feito" : `${pedidos.length} pedidos feitos`, {
        description: "Os créditos ficam reservados até você confirmar o recebimento.",
      });
      onOpenChange(false);
    } catch (err) {
      const e = erroPedido(err);
      const nome = itens.find((i) => i.produto.id === e?.produtoId)?.produto.nome;
      if (e?.code === "SALDO_INSUFICIENTE") {
        setSemSaldo(true);
        void atualizarUsuario();
      } else if (e?.code === "PRECO_ALTERADO") {
        setErro(`O preço de ${nome ?? "um produto"} mudou para ${creditos(e.precoAtual ?? 0)}. Confira o carrinho.`);
        onDesatualizado?.();
      } else if (e?.code === "ESGOTADO") {
        setErro(`${nome ?? "Um produto"} não tem mais a quantidade pedida (${e.estoque ?? 0} disponíveis). Confira o carrinho.`);
        onDesatualizado?.();
      } else if (e?.code === "INDISPONIVEL") {
        setErro(`${nome ?? "Um produto"} não está mais à venda. Confira o carrinho.`);
        onDesatualizado?.();
      } else setErro(e?.error ?? "Não foi possível finalizar a compra.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <ProfileDialog
        open={open && !extrato}
        onOpenChange={(o) => !enviando && onOpenChange(o)}
        title="Finalizar compra"
        description="Os créditos ficam reservados até você confirmar o recebimento."
        error={erro}
      >
        <dl className="flex flex-col gap-2 font-secondary">
          {grupos.map((g) => (
            <div key={g.vendedor} className="flex items-center justify-between gap-3 text-[13px]">
              <dt className="min-w-0 truncate text-foreground-secondary">
                {g.vendedor} · {g.itens} {g.itens === 1 ? "item" : "itens"}
              </dt>
              <dd className="shrink-0 text-foreground tabular-nums">{creditos(g.subtotal)}</dd>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-foreground/10 pt-2 text-[14px]">
            <dt className="font-semibold text-foreground">Total</dt>
            <dd className="font-semibold text-foreground tabular-nums">{creditos(total)}</dd>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <dt className="text-foreground-secondary">Seu saldo</dt>
            <dd className={cn("tabular-nums", insuficiente ? "text-danger" : "text-foreground")}>{creditos(saldo)}</dd>
          </div>
        </dl>

        {insuficiente ? (
          <div role="alert" className="mt-5 flex flex-col items-start gap-3 rounded-[10px] bg-foreground/[0.05] px-3 py-3 font-secondary">
            <p className="text-[13px] text-foreground">
              {faltam > 0 ? `Faltam ${creditos(faltam)} para esta compra.` : "Seu saldo não cobre esta compra."}
            </p>
            <button type="button" onClick={() => setExtrato(true)} className="text-[13px] text-accent-text hover:text-foreground">
              Ver extrato
            </button>
          </div>
        ) : (
          <>
            <label className="mt-5 block font-secondary">
              <span className="text-[12px] text-muted-foreground">Observação (opcional)</span>
              <textarea
                rows={2}
                maxLength={OBSERVACAO_MAX}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Algo que o vendedor precise saber"
                className="mt-1 w-full resize-none border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground"
              />
              <span className="block text-right text-[11px] text-muted-foreground tabular-nums">
                {observacao.length}/{OBSERVACAO_MAX}
              </span>
            </label>
            <p className="mt-2 font-secondary text-[12px] text-muted-foreground">O vendedor poderá falar com você pelo WhatsApp para combinar a entrega.</p>
          </>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 font-secondary">
          <button type="button" onClick={() => (onVoltar ? onVoltar() : onOpenChange(false))} disabled={enviando} className={botaoSecundario}>
            Voltar
          </button>
          {!insuficiente && (
            <CtaButton onClick={reservar} disabled={enviando || itens.length === 0} className="flex h-9 items-center gap-1.5 px-4">
              {enviando && <FontAwesomeIcon icon={faCircleNotch} spin />}
              Reservar {creditos(total)}
            </CtaButton>
          )}
        </div>
      </ProfileDialog>
      {extrato && <ExtratoDialog open onOpenChange={setExtrato} />}
    </>
  );
}
