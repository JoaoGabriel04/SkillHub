import { cn } from "@/lib/utils";

// Título das páginas do menu (designs/New Serviços.png etc.): 32px, negrito, cinza-claro
export function PageTitle({ children, className }: { children: string; className?: string }) {
  return <h1 className={cn("mt-[35px] text-[32px] leading-[1.1] font-bold text-[#d9d9d9] md:mt-12 md:text-[40px]", className)}>{children}</h1>;
}
