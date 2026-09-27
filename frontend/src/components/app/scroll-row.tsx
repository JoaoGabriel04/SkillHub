"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Linha com rolagem horizontal e snap (carrosséis do Início). No mobile encosta nas
// bordas da tela (o próximo card "espia" pela direita, como no mockup).
// dots: bolinhas de paginação — só aparecem quando há o que rolar.
type ScrollRowProps = { children: ReactNode; dots?: boolean; className?: string; label: string };

export function ScrollRow({ children, dots = false, className, label }: ScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const count = Children.count(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScrollable(el.scrollWidth > el.clientWidth + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    const left = el.scrollLeft + el.clientWidth * 0.1;
    let index = items.findIndex((item) => item.offsetLeft - el.offsetLeft + item.offsetWidth / 2 > left);
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) index = items.length - 1;
    setActive(Math.max(0, index));
  }

  function goTo(index: number) {
    const el = ref.current;
    const item = el?.children[index] as HTMLElement | undefined;
    if (el && item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft - 23, behavior: "smooth" });
  }

  return (
    <div className={className}>
      <div
        ref={ref}
        onScroll={handleScroll}
        role="region"
        aria-label={label}
        className="-mx-[23px] flex snap-x snap-mandatory scroll-px-[23px] gap-[21px] overflow-x-auto px-[23px] pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start"
      >
        {children}
      </div>
      {dots && scrollable && (
        <div className="mt-[7px] flex justify-center gap-[5px]">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para o item ${i + 1}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              className={cn("size-[7px] rounded-full transition-colors", i === active ? "bg-white" : "bg-[#5a5a5a]")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
