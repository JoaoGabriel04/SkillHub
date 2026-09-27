import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

// "Qualidades" / "Currículo": título cinza à esquerda, lápis à direita
export function SectionTitle({ title, onEdit, editLabel }: { title: string; onEdit?: () => void; editLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] text-[#b3b3b3] md:text-[17px]">{title}</h2>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={editLabel} className="text-[#8a8a8a] transition-colors hover:text-white">
          <FontAwesomeIcon icon={faPen} className="text-[13px]" />
        </button>
      )}
    </div>
  );
}
