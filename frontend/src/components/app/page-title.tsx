import { cn } from "@/lib/utils";

// Título das páginas do menu (designs/New Serviços.png etc.): 32px no mobile, cresce a partir de sm.
// data-scramble: decodifica na transição suave entre páginas (page-transition.tsx)
export function PageTitle({ children, className }: { children: string; className?: string }) {
  return <h1 data-scramble className={cn("mt-[35px] text-[32px] leading-[1.1] font-bold text-foreground-secondary sm:mt-12 sm:text-[36px] lg:text-[42px]", className)}>{children}</h1>;
}
