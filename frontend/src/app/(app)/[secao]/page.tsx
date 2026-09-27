import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPersonDigging } from "@fortawesome/free-solid-svg-icons";

// Destinos do menu inferior que ainda não foram construídos.
const SECOES: Record<string, string> = {
  servicos: "Serviços",
  produtos: "Produtos",
  comunidade: "Comunidade",
};

export function generateStaticParams() {
  return Object.keys(SECOES).map((secao) => ({ secao }));
}

export const dynamicParams = false;

export default async function SecaoEmBreve({ params }: PageProps<"/[secao]">) {
  const { secao } = await params;
  const titulo = SECOES[secao];
  if (!titulo) notFound();

  return (
    <main className="flex flex-col items-center justify-center gap-4 py-32 text-center">
      <FontAwesomeIcon icon={faPersonDigging} className="text-[48px] text-accent" />
      <h1 className="text-2xl font-semibold text-white">{titulo}</h1>
      <p className="font-secondary text-sm text-[#9f9f9f]">Esta seção está em construção.</p>
    </main>
  );
}
