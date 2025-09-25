import { Card, CardContent } from "@/components/ui/card";
import { CarouselItem } from "@/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";

type Props = {
  usuario: string;
  foto: string;
  descricao: string;
};

export default function CardServico({ usuario, foto, descricao }: Props) {
  return (
    <CarouselItem className="basis-3/4 sm:basis-[45%] md:basis-3/5 lg:basis-[45%] xl:basis-3/5 2xl:basis-[45%]">
      <div className="pb-4">
        <Card className="h-35 md:h-40 lg:h-45 py-1 md:py-2 bg-dark-secundary border-none rounded-md lg:rounded-xl boxshadow-secondary">
          <CardContent className="w-full h-full flex flex-col gap-2 px-3 lg:px-6 py-1">
            <div className="w-full flex items-center gap-4">
              <div className="w-7 h-7">
                <Image
                  src={foto}
                  alt="foto-perfil-usuario"
                  width={100}
                  height={100}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-zinc-200 font-semibold">{usuario}</span>
            </div>
            <div className="h-full flex flex-col justify-between">
              <div className="relative overflow-hidden">
                <p className="w-full h-15 sm:h-20 text-[8px] sm:text-xs lg:text-lg text-zinc-200/60">
                  {descricao}
                </p>
                <span className="w-full h-full absolute top-0 left-0 bg-linear-to-b from-[#33333300] via-[#33333340] to-[#333333]"></span>
              </div>
              <Link
                href={"/"}
                className="align-end py-1 md:py-2 lg:py-1 bg-blue-500 hover:bg-blue-600 text-xs md:text-sm lg:text-base text-zinc-200 font-medium flex justify-center items-center rounded-xs"
              >
                Detalhes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </CarouselItem>
  );
}
