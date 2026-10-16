"use client";

import useSWRInfinite from "swr/infinite";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { formatCredits, getExtrato, type PaginaExtrato } from "@/lib/creditos";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

// chave de cada página: a anterior diz o cursor da próxima (null = acabou)
const chavePagina = (indice: number, anterior: PaginaExtrato | null) =>
  anterior && !anterior.nextCursor ? null : ["creditos/extrato", indice === 0 ? undefined : anterior!.nextCursor!];

// Extrato de créditos (Fase 17C), na casca dos modais do Perfil. Abre por Configurações ("Créditos e
// Pagamentos"), pelo "Ver extrato" do chip e pelo card de créditos da sidebar.
// Entrada e saída aparecem com sinal e texto, não só pela cor.
export function ExtratoDialog({ open, onOpenChange }: Props) {
  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(chavePagina, ([, cursor]) => getExtrato(cursor));
  const transacoes = data?.flatMap((p) => p.transacoes) ?? [];
  const temMais = !!data?.at(-1)?.nextCursor;

  return (
    <ProfileDialog open={open} onOpenChange={onOpenChange} title="Extrato de créditos" description="Tudo o que entrou e saiu do seu saldo, do mais recente ao mais antigo.">
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="font-secondary text-[13px] text-muted-foreground">Não foi possível carregar o extrato.</p>
          <CtaButton onClick={() => mutate()} className="h-8 px-4">
            Tentar de novo
          </CtaButton>
        </div>
      ) : isLoading ? (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[52px] animate-pulse rounded-[10px] bg-foreground/[0.06]" />
          ))}
        </ul>
      ) : transacoes.length === 0 ? (
        <p className="py-4 text-center font-secondary text-[13px] text-muted-foreground">Nenhuma movimentação ainda.</p>
      ) : (
        <>
          <ul className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
            {transacoes.map((t) => {
              const entrada = t.valor > 0;
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-[10px] bg-foreground/[0.05] px-3 py-2.5 font-secondary">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-foreground">{t.tipo}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t.servico?.titulo ?? (t.tipo === "Bônus" ? "Créditos concedidos pelo SkillHub" : "Pedido removido")} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-[14px] font-semibold tabular-nums", entrada ? "text-success" : "text-danger")}>
                      <span className="sr-only">{entrada ? "Entrada de " : "Saída de "}</span>
                      {entrada ? "+" : "−"}
                      {formatCredits(Math.abs(t.valor))}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">saldo {formatCredits(t.saldoApos)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {temMais && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setSize(size + 1)}
                disabled={isValidating}
                className="rounded-[6px] px-3 py-2 text-[13px] text-accent-text transition-colors hover:bg-foreground/10 disabled:opacity-50"
              >
                {isValidating ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </>
      )}
    </ProfileDialog>
  );
}
