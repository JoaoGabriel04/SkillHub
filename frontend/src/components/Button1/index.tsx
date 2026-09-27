import { Button } from "@/components/ui/button";

type ButtonProps = {
  handle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: string;
  size: "sm" | "md" | "lg" | "xl";
  ref?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

// React 19 ignora defaultProps em componentes de função — defaults vão na desestruturação
export default function Button1({
  handle,
  className = "",
  type = "button",
  size,
  ref,
  disabled = false,
  children,
}: ButtonProps) {
  let sizeBtn = "";

  if (size === "sm") {
    sizeBtn = "w-30";
  } else if (size === "md") {
    sizeBtn = "w-50";
  } else if (size === "lg") {
    sizeBtn = "w-70";
  } else if (size === "xl") {
    sizeBtn = "w-100";
  }

  return (
    <div ref={ref} className={`${sizeBtn} h-10 p-[1px] bg-zinc-100 ${disabled ? "opacity-50" : ""} ${className}`}>
      <Button
        variant="skillhub"
        onClick={handle}
        type={type === "submit" ? "submit" : "button"}
        disabled={disabled}
        className="group relative w-full h-full p-0 border-0 rounded-none overflow-hidden disabled:opacity-100 cursor-pointer"
      >
        <span className="font-jersey-25 relative z-10 transition-colors duration-500 group-hover:text-[#101010]">
          {children}
        </span>
        <span className="absolute inset-0 bg-zinc-100 scale-x-0 origin-center transition-transform duration-500 group-hover:scale-x-100 pointer-events-none"></span>
      </Button>
    </div>
  );
}
