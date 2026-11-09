"use client";

import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { creditos, FotoDoPedido, nomeDoPedido } from "@/components/app/pedido-foto";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { getApiErrorMessage } from "@/lib/api";
import { atualizarUsuario } from "@/lib/creditos";
import { cancelarPedido, chavePedido, confirmarRecebimento, enviarPedido, getContatoPedido, getPedido, revalidarPedidos } from "@/lib/pedidos";
import { cn } from "@/lib/utils";
import type { PedidoDetalhe, PedidoResumo } from "@/types/pedido";

type Props = { pedidoId: string; resumo?: PedidoResumo; open: boolean; onOpenChange: (open: boolean) => void };
type Confirmando = null | "cancelar" | "confirmar";

// base sem cor: o cn do projeto (pacote "cn") só junta classes, não resolve conflito de cor
const botaoBase = "rounded-[6px] px-3 py-2 text-[13px] transition-colors hover:bg-foreground/10 disabled:opacity-50";
const botaoSecundario = cn(botaoBase, "text-foreground-secondary hover:text-foreground");
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-foreground/10 pt-4">
      <h3 className="text-[14px] font-semibold text-foreground">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// Linha do tempo: feito, enviado (ou entregue, se tudo é digital) e recebido; cancelado no lugar do que faltou
function LinhaDoTempo({ pedido }: { pedido: PedidoDetalhe }) {
  const digital = pedido.itens.length > 0 && pedido.itens.every((i) => i.digital);
  const passos: { rotulo: string; em: string | null }[] = [
    { rotulo: "Pedido feito", em: pedido.createdAt },
    { rotulo: digital ? "Entregue" : "Enviado", em: pedido.enviadoEm },
    ...(pedido.canceladoEm
      ? [{ rotulo: `Cancelado ${pedido.canceladoPor === "Vendedor" ? "pelo vendedor" : "pelo comprador"}`, em: pedido.canceladoEm }]
      : [{ rotulo: "Recebido", em: pedido.concluidoEm }]),
  ].filter((p) => !(pedido.canceladoEm && p.em === null)); // cancelado: some o passo que não aconteceu
  return (
    <ol className="flex flex-col gap-2 font-secondary">
      {passos.map((p) => (
        <li key={p.rotulo} className="flex items-center gap-2.5 text-[13px]">
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full border-2", p.em ? "border-accent bg-accent" : "border-foreground/30")} />
          <span className={p.em ? "text-foreground" : "text-muted-foreground"}>{p.rotulo}</span>
          <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">{p.em ? quando(p.em) : "—"}</span>
        </li>
      ))}
    </ol>
  );
}

// Detalhe de um pedido de produtos (Fase 18B), na casca dos modais do Perfil. As ações dependem de quem abre:
// - comprador: cancelar (antes do envio, ou depois se o vendedor excluiu a conta, decisão D5) e confirmar o recebimento;
// - vendedor: marcar como enviado (ou entregue) e cancelar (antes ou depois do envio).
// A outra parte aparece só com nome, foto, cidade e bairro. O telefone só chega ao navegador no clique do contato.
export function PedidoDetalheDialog({ pedidoId, resumo, open, onOpenChange }: Props) {
  const { data: pedido, error, mutate } = useSWR(chavePedido(pedidoId), () => getPedido(pedidoId));
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Confirmando>(null);

  async function executar(acao: string, fazer: () => Promise<PedidoDetalhe>, sucesso: string) {
    setErro(null);
    setOcupado(acao);
    try {
      await mutate(await fazer(), { revalidate: false });
      setConfirmando(null);
      await Promise.all([revalidarPedidos(), atualizarUsuario()]);
      toast.success(sucesso);
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível concluir a ação."));
      void mutate(); // o pedido pode ter mudado (outra parte agiu): mostra o estado atual
    } finally {
      setOcupado(null);
    }
  }

  // A aba abre já no clique (antes da resposta), senão o navegador bloqueia o pop-up (como no detalhe do produto)
  async function falar() {
    const aba = window.open("", "_blank");
    setErro(null);
    setOcupado("contato");
    try {
      const url = await getContatoPedido(pedidoId);
      if (aba) {
        aba.opener = null;
        aba.location.href = url;
      } else window.open(url, "_blank", "noopener");
    } catch (err) {
      aba?.close();
      setErro(getApiErrorMessage(err, "Não foi possível abrir o contato."));
    } finally {
      setOcupado(null);
    }
  }

  const base = pedido ?? resumo;
  const comprador = base?.papel === "comprador";
  const titulo = base ? `Pedido de ${nomeDoPedido(base)}` : "Pedido";
  const descricao = base ? `${comprador ? "Compra" : "Venda"} · ${base.status}` : "";
  const carregando = (acao: string) => ocupado === acao && <FontAwesomeIcon icon={faCircleNotch} spin />;
  const outro = comprador ? "vendedor" : "comprador";
  const aberto = pedido && (pedido.status === "Aguardando envio" || pedido.status === "Enviado");
  const digital = !!pedido?.itens.length && pedido.itens.every((i) => i.digital);

  const podeCancelar =
    pedido &&
    (comprador
      ? pedido.status === "Aguardando envio" || (pedido.status === "Enviado" && pedido.outraParte === null)
      : pedido.status === "Aguardando envio" || pedido.status === "Enviado");
  const podeConfirmar = pedido && comprador && pedido.status === "Enviado" && pedido.outraParte !== null;
  const podeEnviar = pedido && !comprador && pedido.status === "Aguardando envio";

  return (
    <ProfileDialog open={open} onOpenChange={(o) => !ocupado && onOpenChange(o)} title={titulo} description={descricao} error={erro}>
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="font-secondary text-[13px] text-muted-foreground">Não foi possível carregar o pedido.</p>
          <CtaButton onClick={() => mutate()} className="h-8 px-4">
            Tentar de novo
          </CtaButton>
        </div>
      ) : !pedido ? (
        <div aria-busy className="flex animate-pulse flex-col gap-3">
          <span className="h-4 w-1/2 rounded bg-foreground/10" />
          <span className="h-12 w-full rounded bg-foreground/10" />
          <span className="h-12 w-full rounded bg-foreground/10" />
        </div>
      ) : (
        <>
          <LinhaDoTempo pedido={pedido} />

          <Secao titulo="Itens">
            <ul className="flex flex-col gap-2 font-secondary">
              {pedido.itens.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="relative size-[44px] shrink-0 overflow-hidden rounded-[6px] bg-surface-2">
                    <FotoDoPedido src={item.imagemUrl} alt="" sizes="44px" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{item.nome}</span>
                  <span className="shrink-0 text-[12px] text-foreground-secondary tabular-nums">
                    {item.quantidade} × {creditos(item.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex items-center justify-between font-secondary">
              <dt className="text-[13px] text-foreground-secondary">Total</dt>
              <dd className="text-[14px] font-semibold text-foreground tabular-nums">{creditos(pedido.total)}</dd>
            </dl>
          </Secao>

          <Secao titulo={comprador ? "Vendedor" : "Comprador"}>
            {pedido.outraParte ? (
              <div className="flex items-center gap-2.5 font-secondary">
                <Avatar nome={pedido.outraParte.fullName} src={pedido.outraParte.urlPhoto} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-foreground">{pedido.outraParte.fullName}</p>
                  {pedido.outraParteLocal && (pedido.outraParteLocal.cidade || pedido.outraParteLocal.bairro) && (
                    <p className="truncate text-[12px] text-muted-foreground">
                      {[pedido.outraParteLocal.cidade, pedido.outraParteLocal.bairro].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-secondary text-[13px] text-muted-foreground">Usuário removido</p>
            )}
            {pedido.observacao && (
              <p className="mt-3 font-secondary text-[13px] leading-relaxed whitespace-pre-line text-foreground-secondary">
                <span className="text-muted-foreground">Observação: </span>
                {pedido.observacao}
              </p>
            )}
            {aberto && pedido.contatoDisponivel && (
              <CtaButton onClick={falar} disabled={!!ocupado} className="mt-4 flex h-9 w-full items-center justify-center gap-2">
                {carregando("contato") || <FontAwesomeIcon icon={faWhatsapp} className="text-[15px]" />}
                Falar com o {outro}
              </CtaButton>
            )}
          </Secao>

          {(podeCancelar || podeConfirmar || podeEnviar) && (
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-foreground/10 pt-4 font-secondary">
              {confirmando ? (
                <>
                  <span className="mr-auto text-[13px] text-foreground-secondary">
                    {confirmando === "cancelar"
                      ? "Cancelar este pedido? Os créditos voltam para o comprador e o estoque é devolvido."
                      : `Confirmar o recebimento? Os ${creditos(pedido.total)} vão para o vendedor.`}
                  </span>
                  <button type="button" onClick={() => setConfirmando(null)} disabled={!!ocupado} className={botaoSecundario}>
                    Voltar
                  </button>
                  {confirmando === "cancelar" ? (
                    <button
                      type="button"
                      onClick={() => executar("cancelar", () => cancelarPedido(pedido.id), "Pedido cancelado")}
                      disabled={!!ocupado}
                      className="flex items-center gap-1.5 rounded-[6px] bg-danger-fill px-3 py-2 text-[13px] font-semibold text-danger-fill-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
                    >
                      {carregando("cancelar")}
                      Sim, cancelar
                    </button>
                  ) : (
                    <CtaButton
                      onClick={() => executar("confirmar", () => confirmarRecebimento(pedido.id), "Recebimento confirmado")}
                      disabled={!!ocupado}
                      className="flex h-9 items-center gap-1.5 px-4"
                    >
                      {carregando("confirmar")}
                      Sim, confirmar
                    </CtaButton>
                  )}
                </>
              ) : (
                <>
                  {podeCancelar && (
                    <button type="button" onClick={() => setConfirmando("cancelar")} disabled={!!ocupado} className={cn(botaoBase, "text-danger")}>
                      Cancelar pedido
                    </button>
                  )}
                  {podeEnviar && (
                    <CtaButton
                      onClick={() => executar("enviar", () => enviarPedido(pedido.id), digital ? "Pedido marcado como entregue" : "Pedido marcado como enviado")}
                      disabled={!!ocupado}
                      className="flex h-9 items-center gap-1.5 px-4"
                    >
                      {carregando("enviar")}
                      {digital ? "Marcar como entregue" : "Marcar como enviado"}
                    </CtaButton>
                  )}
                  {podeConfirmar && (
                    <CtaButton onClick={() => setConfirmando("confirmar")} disabled={!!ocupado} className="flex h-9 items-center px-4">
                      Confirmar recebimento
                    </CtaButton>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </ProfileDialog>
  );
}
