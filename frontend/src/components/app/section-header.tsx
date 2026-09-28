import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

// Título de seção com a seta "ver todos" à direita (designs/New Serviços.png, New Comunidade.png)
export function SectionHeader({ title, onMore, className }: { title: string; onMore?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-[15px] text-[#d9d9d9] md:text-[17px]">{title}</h2>
      {onMore && (
        <button type="button" onClick={onMore} aria-label={`Ver tudo em ${title}`} className="text-[#8a8a8a] transition-colors hover:text-white">
          <FontAwesomeIcon icon={faArrowRight} className="text-[17px]" />
        </button>
      )}
    </div>
  );
}
