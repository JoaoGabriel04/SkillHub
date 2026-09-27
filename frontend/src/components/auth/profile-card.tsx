import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

// Card de seleção de perfil (designs/Cadastro.png): 175×200, círculo de 77px,
// selecionado = borda/texto azul #0015ff, círculo preenchido e selo de check.
// A partir de md cresce pra 230×260 (telas maiores têm espaço de sobra).
type ProfileCardProps = {
  label: string;
  icon: IconDefinition;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  ribbon?: string; // faixa diagonal no canto (ex.: "Em produção")
};

export function ProfileCard({ label, icon, selected, onSelect, disabled = false, ribbon }: ProfileCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex h-[200px] w-full max-w-[175px] flex-col items-center overflow-hidden rounded-[4px] bg-[#101010] transition-colors md:h-[260px] md:max-w-[230px]",
        disabled
          ? "cursor-not-allowed border-2 border-[#4a4a4a]"
          : selected
            ? "border-2 border-[#0015ff]"
            : "border-2 border-[#e3e3e3] hover:border-white"
      )}
    >
      {ribbon && (
        <span className="absolute top-[26px] -right-[42px] z-10 w-[170px] rotate-45 bg-accent py-[3px] text-center font-jersey-15 text-[14px] text-[#101010] shadow-[0_2px_6px_rgba(0,0,0,0.5)] md:top-[30px] md:-right-[40px] md:text-[16px]">
          {ribbon}
        </span>
      )}

      <span
        className={cn(
          "absolute top-[5px] right-[5px] flex size-5 items-center justify-center rounded-full border-2 md:top-2 md:right-2 md:size-6",
          selected ? "border-[#0015ff] bg-[#e3e3e3] text-[#0015ff]" : "border-[#e3e3e3]",
          disabled && "hidden"
        )}
      >
        {selected && <FontAwesomeIcon icon={faCheck} className="text-[11px] md:text-[13px]" />}
      </span>

      <span
        className={cn(
          "mt-[46px] flex size-[77px] items-center justify-center rounded-full border-2 md:mt-[58px] md:size-[100px]",
          selected ? "border-[#0015ff] bg-[#e3e3e3] text-[#0015ff]" : "border-[#e3e3e3] text-[#e3e3e3]",
          disabled && "opacity-35"
        )}
      >
        <FontAwesomeIcon icon={icon} className="text-[28px] md:text-[36px]" />
      </span>

      <span className={cn(
          "mt-[25px] font-jersey-15 text-[17px] md:mt-[30px] md:text-[21px]",
          selected ? "text-[#0015ff]" : "text-white",
          disabled && "opacity-35"
        )}>
        {label}
      </span>
    </button>
  );
}
