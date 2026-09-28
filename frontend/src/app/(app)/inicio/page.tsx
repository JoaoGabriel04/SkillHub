import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { ScrollRow } from "@/components/app/scroll-row";
import { ContentCard } from "@/components/ui/content-card";
import { ctaButtonClass } from "@/components/ui/cta-button";
import { getProdutos } from "@/lib/mock/produtos";
import { getServicos } from "@/lib/mock/servicos";
import { cn } from "@/lib/utils";
import { colaboradores, eventos } from "./mock";

const formatPreco = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// designs/New Início.png — medidas do mockup mobile (440px); a partir de md as linhas
// mostram mais cards lado a lado e os colaboradores ganham mais avatares.
export default async function InicioPage() {
  const [servicos, produtos] = await Promise.all([getServicos(), getProdutos()]);

  return (
    <main className="pb-4">
      <section className="mt-[53px] md:mt-16">
        <p className="text-[20px] text-[#b3b3b3] md:text-[24px]">Seja Bem Vindo ao</p>
        <h1 className="text-[32px] leading-[1.1] font-bold text-[#d9d9d9] md:text-[40px]">SkillHub</h1>
      </section>

      {/* Eventos */}
      <ScrollRow label="Eventos" dots className="mt-[4px] md:mt-4">
        {eventos.map((evento) => (
          <article
            key={evento.id}
            className="flex h-[132px] w-[86%] max-w-[341px] items-center gap-4 rounded-[10px] bg-[#0c0c0c] py-[15px] pr-[11px] pl-[14px] shadow-[0_4px_14px_rgba(0,0,0,0.6)] md:w-[calc((100%-21px)/2)] md:max-w-none lg:w-[calc((100%-42px)/3)]"
          >
            <div className="flex h-full min-w-0 flex-1 flex-col">
              <h2 className="text-[18px] leading-none font-bold text-[#ffd900]">{evento.titulo}</h2>
              <p className="mt-[9px] line-clamp-3 text-justify text-[10.5px] md:text-left leading-[1.2] text-[#b3b3b3]">
                {evento.descricao}
              </p>
              <button
                type="button"
                className="mt-auto w-[89px] rounded-[2px] bg-[#00a61e] py-[4px] text-[11px] font-semibold text-white transition-colors hover:bg-[#00bf23]"
              >
                {evento.cta}
              </button>
            </div>
            <div
              aria-hidden
              className={cn(
                "flex h-[101px] w-[85px] shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-br text-white",
                evento.cor
              )}
            >
              <FontAwesomeIcon icon={evento.icon} className="text-[34px] opacity-90" />
            </div>
          </article>
        ))}
      </ScrollRow>

      {/* Colaboradores relevantes */}
      <section className="mt-[12px] md:mt-8">
        <h2 className="text-[15px] text-[#d9d9d9] md:text-[17px]">Colaboradores Relevantes</h2>
        <ul className="mt-[25px] flex items-center justify-between md:justify-start md:gap-8">
          {colaboradores.map((pessoa, i) => (
            <li key={pessoa.id} className={cn(i >= 4 && "hidden md:block", i >= 6 && "md:hidden lg:block")}>
              <Avatar nome={pessoa.nome} size={60} className="md:size-[72px]!" />
            </li>
          ))}
          <li>
            <Link href="/comunidade" className="text-[13px] text-[#656766] transition-colors hover:text-white">
              Ver mais...
            </Link>
          </li>
        </ul>
      </section>

      {/* Serviços */}
      <section className="mt-[32px] md:mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] text-[#d9d9d9] md:text-[17px]">Serviços</h2>
          <Link href="/servicos" aria-label="Ver todos os serviços" className="text-[#8a8a8a] transition-colors hover:text-white">
            <FontAwesomeIcon icon={faArrowRight} className="text-[17px]" />
          </Link>
        </div>
        <ScrollRow label="Serviços" className="mt-[20px]">
          {servicos.map((servico) => (
            <ContentCard
              key={servico.id}
              className="flex h-[159px] w-[302px] flex-col px-[11px] pt-[11px] pb-[12px] font-secondary"
            >
              <div className="flex items-center gap-[10px]">
                <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={39} />
                <h3 className="truncate text-[15px] text-white">{servico.autor.fullName}</h3>
              </div>
              <p className="mt-[16px] line-clamp-2 text-justify text-[12px] md:text-left leading-[1.25] text-[#e6e6e6]">
                {servico.descricao}
              </p>
              <Link href="/servicos" className={cn(ctaButtonClass, "mt-auto flex h-[27px] items-center justify-center text-[11px]")}>
                Saiba Mais
              </Link>
            </ContentCard>
          ))}
        </ScrollRow>
      </section>

      {/* Produtos relevantes */}
      <section className="mt-[20px] md:mt-10">
        <h2 className="text-[15px] text-[#d9d9d9] md:text-[17px]">Produtos Relevantes</h2>
        <ScrollRow label="Produtos" className="mt-[20px]">
          {produtos.map((produto) => (
            <Link key={produto.id} href="/produtos" className="group w-[176px] transition-transform hover:-translate-y-1">
              <ContentCard className="flex flex-col overflow-hidden font-secondary">
                <div className="relative h-[199px] bg-[#5f5f5f]">
                  <Image
                    src={produto.imagemUrl}
                    alt={produto.nome}
                    fill
                    sizes="176px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="px-3 py-[10px]">
                  <h3 className="truncate text-[13px] text-white">{produto.nome}</h3>
                  <p className="mt-[2px] text-[13px] font-semibold text-accent">{formatPreco(produto.preco)}</p>
                </div>
              </ContentCard>
            </Link>
          ))}
        </ScrollRow>
      </section>
    </main>
  );
}
