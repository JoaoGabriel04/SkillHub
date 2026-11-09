import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar } from "@/components/app/avatar";
import { ScrollRow } from "@/components/app/scroll-row";
import { TransitionLink } from "@/components/motion/page-transition";
import { ctaButtonClass } from "@/components/ui/cta-button";
import { EVENTO_FUNDOS } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BuscaGlobal } from "./busca-global";
import { colaboradores, eventos } from "./mock";
import { ProdutosRelevantes } from "./produtos-relevantes";
import { ServicosRecentes } from "./servicos-recentes";

// designs/New Início.png — medidas do mockup mobile (440px); a partir de sm o texto e os cards
// crescem (os carrosséis continuam carrossel). A partir de xl, o layout de designs/New Início - Desktop.png
// (Fase 16.2): busca no topo, eventos na largura toda e duas colunas (colaboradores e 2 serviços à
// esquerda, 2 produtos numa coluna de 380px à direita). Só classes xl: no mesmo markup, sem duplicar a árvore.
export default function InicioPage() {
  return (
    <main className="pb-4">
      <section className="mt-[53px] sm:mt-14 xl:mt-0 xl:flex xl:items-start xl:justify-between xl:gap-8">
        <div>
          <p className="text-[20px] text-foreground-secondary sm:text-[24px] lg:text-[28px]">Seja Bem Vindo ao</p>
          <h1 data-scramble className="text-[32px] leading-[1.1] font-bold text-foreground-secondary sm:text-[40px] lg:text-[46px]">SkillHub</h1>
        </div>
        <BuscaGlobal className="xl:mt-[14px]" />
      </section>

      {/* Eventos */}
      <ScrollRow label="Eventos" dots className="mt-[4px] sm:mt-5 xl:mt-8">
        {eventos.map((evento) => (
          <article
            key={evento.id}
            className="flex h-[132px] w-[86%] max-w-[341px] items-center gap-4 rounded-[10px] bg-surface py-[15px] pr-[11px] pl-[14px] shadow-(--shadow-raised) sm:h-[156px] sm:w-[400px] sm:max-w-none sm:gap-5 sm:py-5 sm:pr-4 sm:pl-5 lg:w-[440px] xl:h-[208px] xl:w-full xl:gap-8 xl:p-8"
          >
            <div className="flex h-full min-w-0 flex-1 flex-col xl:justify-center">
              <h2 className="text-[18px] leading-none font-bold text-foreground sm:text-[21px] xl:text-[24px]">{evento.titulo}</h2>
              <p className="mt-[9px] line-clamp-3 text-justify text-[10.5px] leading-[1.2] text-foreground-secondary sm:text-left sm:text-[13px] xl:mt-4 xl:text-[15px]">
                {evento.descricao}
              </p>
              <button
                type="button"
                className={cn(ctaButtonClass, "mt-auto w-[89px] py-[4px] sm:w-[110px] sm:py-[6px] sm:text-[13px] xl:mt-6")}
              >
                {evento.cta}
              </button>
            </div>
            <div
              aria-hidden
              className={cn(
                "flex h-[101px] w-[85px] shrink-0 items-center justify-center rounded-[6px] sm:h-[116px] sm:w-[100px] xl:h-[152px] xl:w-[128px] xl:rounded-[8px]",
                EVENTO_FUNDOS[evento.fundo].fundo,
                EVENTO_FUNDOS[evento.fundo].icone
              )}
            >
              <FontAwesomeIcon icon={evento.icon} className="text-[34px] opacity-90 xl:text-[48px]" />
            </div>
          </article>
        ))}
      </ScrollRow>

      {/* xl: duas colunas. Esquerda: colaboradores e serviços; direita (380px): produtos */}
      <div className="xl:mt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-x-8">
        {/* Colaboradores relevantes */}
        <section className="mt-[12px] sm:mt-10 xl:col-start-1 xl:mt-0">
          <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">Colaboradores Relevantes</h2>
          <ul className="mt-[25px] flex items-center justify-between sm:justify-start sm:gap-8 xl:gap-6">
            {colaboradores.map((pessoa, i) => (
              // 4 avatares; 6 a partir de 1400px (designs/New Início - Desktop.png, 1440px). Entre 1280 e 1399px
              // a coluna esquerda das 2 colunas tem ~530px: 6 avatares (552px) empurrariam o "Ver mais..." para fora
              <li key={pessoa.id} className={cn(i >= 6 ? "hidden" : i >= 4 && "hidden min-[1400px]:block")}>
                <Avatar nome={pessoa.nome} size={60} className="sm:size-[72px]!" />
              </li>
            ))}
            <li>
              <TransitionLink href="/comunidade" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:text-[15px]">
                Ver mais...
              </TransitionLink>
            </li>
          </ul>
        </section>

        <ServicosRecentes />

        <ProdutosRelevantes />
      </div>
    </main>
  );
}
