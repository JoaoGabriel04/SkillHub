import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Peças das telas de entrada (/, /login, /cadastro) — medidas dos mockups em designs/.

export function AuthTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("text-center font-jersey-20 text-[23px] leading-[1.1] text-balance text-white", className)} {...props} />;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 font-jersey-15 text-[14px] text-[#ff6b6b]">{children}</p>;
}

// Campo sem caixa: só a linha de baixo, placeholder cinza e ícone opcional à direita
type LineInputProps = InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; error?: string };

export function LineInput({ icon, error, className, ...props }: LineInputProps) {
  return (
    <div className={className}>
      <label
        className={cn(
          "flex items-center gap-3 border-b pb-[9px] transition-colors focus-within:border-white",
          error ? "border-[#ff6b6b]" : "border-[#a0a0a0]"
        )}
      >
        <input
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent font-jersey-15 text-[17px] text-white outline-none placeholder:text-[#8a8a8a] [color-scheme:dark]"
          {...props}
        />
        {icon && <span className="shrink-0 text-[#828282]">{icon}</span>}
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

type LineSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder: string;
  options: readonly string[];
  error?: string;
};

export function LineSelect({ placeholder, options, error, className, value, ...props }: LineSelectProps) {
  return (
    <div className={className}>
      <div
        className={cn(
          "border-b pb-[9px] transition-colors focus-within:border-white",
          error ? "border-[#ff6b6b]" : "border-[#a0a0a0]"
        )}
      >
        <select
          aria-invalid={!!error}
          value={value}
          className={cn(
            "w-full cursor-pointer bg-transparent font-jersey-15 text-[17px] outline-none [color-scheme:dark]",
            value ? "text-white" : "text-[#8a8a8a]"
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#101010] text-white">
              {option}
            </option>
          ))}
        </select>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// Mensagem de erro geral do formulário (resposta da API)
export function FormAlert({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-center font-jersey-15 text-[15px] text-[#ff6b6b]">
      {children}
    </p>
  );
}
