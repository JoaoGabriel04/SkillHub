"use client";

import * as React from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
} from "@/components/ui/carousel";
import CardCarousel from "./Card";

export default function BannerCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const banners = [
    {
      title: "Novo Evento! 🎉",
      description:
        "A empresa TechSolutions está lançando agora um curso para desenvolvimento web.",
      url: "/",
      imageUrl: "/image-free-fire.jpg",
    },
    {
      title: "Nosso Primeiro curso! 💙",
      description:
        "A empresa NextGen está lançando agora um curso para desenvolvimento backend.",
      url: "/",
      imageUrl: "/image-nextgen-coders.jpg",
    },
    {
      title: "Venha aprender JS! 💻",
      description:
        "A empresa TechSolutions está lançando agora um curso de JavaScript.",
      url: "/",
      imageUrl: "/image-javascript.png",
    },
  ];

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="w-full mt-4">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {banners.map((banner, index) => (
            <CardCarousel
              key={index}
              title={banner.title}
              description={banner.description}
              url={banner.url}
              imageUrl={banner.imageUrl}
            />
          ))}
        </CarouselContent>
      </Carousel>
      {/* Bolinhas de navegação */}
      <div className="flex justify-center gap-2 mt-2">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            className={`h-2 w-2 rounded-full transition-colors ${
              current === index ? "bg-zinc-300" : "bg-zinc-700"
            } cursor-pointer`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
