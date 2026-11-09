import { cn } from "@/lib/utils";

// Estado "carregando" das linhas de produto: a moldura da foto e duas linhas de texto (sem spinner),
// nas medidas do ProdutoCard, como o ServicoCardEsqueleto faz para os serviços.
export function ProdutoCardEsqueleto({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex w-[180px] animate-pulse flex-col sm:w-[210px] lg:w-[240px]", className)}>
      <span className="h-[135px] w-full rounded-[2px] bg-foreground/10 sm:h-[158px] lg:h-[180px]" />
      <span className="mt-[6px] h-3 w-3/4 rounded bg-foreground/10" />
      <span className="mt-[4px] h-2.5 w-1/3 rounded bg-foreground/10" />
    </div>
  );
}
