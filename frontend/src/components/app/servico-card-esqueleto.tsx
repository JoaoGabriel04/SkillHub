import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

// Estado "carregando" das listas de serviço: o contorno do card com blocos no lugar do texto (sem spinner).
// className troca o tamanho padrão (o do ServicoCard) inteiro: o cn do projeto não resolve conflitos.
const TAMANHO_PADRAO = "h-[123px] w-[218px] sm:h-[150px] sm:w-[260px] lg:w-[290px]";

export function ServicoCardEsqueleto({ className }: { className?: string }) {
  return (
    <GlassCard aria-hidden className={cn("flex animate-pulse flex-col gap-2 rounded-[10px] p-3", className ?? TAMANHO_PADRAO)}>
      <div className="flex items-center gap-2">
        <span className="size-[22px] rounded-full bg-foreground/10 sm:size-7" />
        <span className="h-2.5 w-24 rounded bg-foreground/10" />
      </div>
      <span className="mt-2 h-3 w-3/4 rounded bg-foreground/10" />
      <span className="h-2.5 w-full rounded bg-foreground/10" />
      <span className="mt-auto h-6 w-full rounded-[5px] bg-foreground/10" />
    </GlassCard>
  );
}
