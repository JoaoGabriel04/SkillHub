import { Card, CardContent } from "@/components/ui/card";
import { CarouselItem } from "@/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
};

export default function CardCarousel({
  title,
  description,
  url,
  imageUrl,
}: Props) {
  return (
    <CarouselItem className="pl-4 basis-3/4 sm:basis-[55%] md:basis-3/5 lg:basis-[45%] xl:basis-2/5">
      <div className="pb-4">
        <Card className="h-25 sm:h-30 md:h-40 lg:h-50 py-1 md:py-2 bg-[#101010] border-none rounded-lg lg:rounded-2xl boxshadow-secondary">
          <CardContent className="w-full h-full flex justify-between px-3 lg:px-6 py-1">
            <div className="w-3/5 flex flex-col gap-2">
              <h1 className="text-sm md:text-2xl text-amber-300 font-bold">
                {title}
              </h1>
              <div className="relative overflow-hidden">
                <p className="w-full h-15 sm:h-20 md:max-h-25 text-[8px] sm:text-xs lg:text-lg text-zinc-200/60">
                  {description}
                </p>
                <span className="w-full h-full absolute top-0 left-0 bg-linear-to-b from-[#10101000] via-[#10101040] to-[#101010]"></span>
              </div>
              <Link
                href={url}
                className="w-3/4 md:w-4/5 mt-1 py-1 md:py-2 flex justify-center items-center bg-green-500 hover:bg-green-600 text-zinc-200 text-[9px] sm:text-sm md:text-[16px] font-bold rounded-xs transition-colors"
              >
                Acesse Já
              </Link>
            </div>
            <div className="h-full flex justify-center items-start py-2">
              <div className="h-full aspect-square max-h-full">
                <Image
                  src={imageUrl}
                  alt="image-banner"
                  width={500}
                  height={500}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CarouselItem>
  );
}
