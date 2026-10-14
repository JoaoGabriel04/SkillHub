"use client";

import { useRef, type FocusEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

// Peças das telas de entrada (/, /login, /cadastro) — medidas dos mockups em designs/.
// Os campos têm a linha de baixo em dois traços: [data-line] (cinza, a página desenha na entrada)
// e [data-line-focus] (ciano com brilho, desenhado da esquerda no foco e recolhido pra direita no blur).

export function AuthTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("text-center font-jersey-20 text-[23px] leading-[1.1] text-balance text-white", className)} {...props} />;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p data-field-error className="mt-1 font-jersey-15 text-[14px] text-[#ff6b6b]">
      {children}
    </p>
  );
}

// Foco/blur/erro animados de um campo de linha
function useLineField<T extends HTMLElement>(
  error: string | undefined,
  onFocus?: (e: FocusEvent<T>) => void,
  onBlur?: (e: FocusEvent<T>) => void
) {
  const root = useRef<HTMLDivElement>(null);
  const hadError = useRef(false);

  const { contextSafe } = useGSAP(
    () => {
      // erro novo: o campo treme e a mensagem cai no lugar
      if (error && !hadError.current && !prefersReducedMotion()) {
        gsap.fromTo(root.current, { x: 0 }, { x: 7, duration: 0.5, ease: "shake", clearProps: "x" });
        gsap.from("[data-field-error]", { autoAlpha: 0, y: -6, duration: 0.3, ease: "power2.out" });
      }
      hadError.current = !!error;
    },
    { scope: root, dependencies: [error] }
  );

  return {
    root,
    onFocus: contextSafe((e: FocusEvent<T>) => {
      onFocus?.(e);
      gsap.fromTo(
        "[data-line-focus]",
        { scaleX: 0, transformOrigin: "0% 50%" },
        { scaleX: 1, duration: 0.45, ease: "power3.out", overwrite: true }
      );
      gsap.fromTo("[data-field-icon]", { y: 0 }, { y: -4, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 });
    }),
    onBlur: contextSafe((e: FocusEvent<T>) => {
      onBlur?.(e);
      gsap.to("[data-line-focus]", {
        scaleX: 0,
        transformOrigin: "100% 50%",
        duration: 0.35,
        ease: "power3.in",
        overwrite: true,
      });
    }),
  };
}

function Underline({ error }: { error?: string }) {
  return (
    <>
      <span
        data-line
        className={cn("absolute inset-x-0 bottom-0 h-px transition-colors", error ? "bg-[#ff6b6b]" : "bg-[#a0a0a0]")}
      />
      <span
        data-line-focus
        className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 bg-accent shadow-[0_0_10px_rgba(59,212,204,0.8)]"
      />
    </>
  );
}

// Campo sem caixa: só a linha de baixo, placeholder cinza e ícone opcional à direita
type LineInputProps = InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; error?: string };

export function LineInput({ icon, error, className, onFocus, onBlur, ...props }: LineInputProps) {
  const { root, ...handlers } = useLineField<HTMLInputElement>(error, onFocus, onBlur);
  return (
    <div ref={root} data-field className={className}>
      <label className="group relative flex items-center gap-3 pb-[9px]">
        <input
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent font-jersey-15 text-[17px] text-white outline-none placeholder:text-[#8a8a8a] [color-scheme:dark]"
          {...handlers}
          {...props}
        />
        {icon && (
          <span data-field-icon className="shrink-0 text-[#828282] transition-colors group-focus-within:text-accent">
            {icon}
          </span>
        )}
        <Underline error={error} />
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

export function LineSelect({ placeholder, options, error, className, value, onFocus, onBlur, ...props }: LineSelectProps) {
  const { root, ...handlers } = useLineField<HTMLSelectElement>(error, onFocus, onBlur);
  return (
    <div ref={root} data-field className={className}>
      <div className="relative pb-[9px]">
        <select
          aria-invalid={!!error}
          value={value}
          {...handlers}
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
        <Underline error={error} />
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
