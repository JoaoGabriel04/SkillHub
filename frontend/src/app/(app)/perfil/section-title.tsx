import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

// "Qualidades" / "Currículo": título cinza à esquerda, lápis à direita
export function SectionTitle({ title, onEdit, editLabel }: { title: string; onEdit?: () => void; editLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] text-foreground-secondary sm:text-[18px] lg:text-[20px]">{title}</h2>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={editLabel} className="text-muted-foreground transition-colors hover:text-foreground">
          <FontAwesomeIcon icon={faPen} className="text-[13px]" />
        </button>
      )}
    </div>
  );
}
