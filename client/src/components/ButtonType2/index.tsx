type ButtonProps = {
  handle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: string;
  size: "sm" | "md" | "lg" | "xl";
  ref?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children?: React.ReactNode;
};

export default function Button2({ handle, className, type, size, ref, children }: ButtonProps) {
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
    <div ref={ref} className={`${sizeBtn} h-10 p-[1px] bg-red-500 ${className}`}>
      <button
        {...(handle && { onClick: handle as React.MouseEventHandler<HTMLButtonElement> })}
        type={type === "submit" ? "submit" : "button"}
        className="relative group w-full h-full overflow-hidden bg-[#101010] text-red-500 cursor-pointer"
      >
        <span className="font-jersey25 relative z-10 transition-colors duration-500 group-hover:text-zinc-100">
          {children}
        </span>
        <span className="absolute inset-0 bg-red-500 scale-x-0 origin-center transition-transform duration-500 group-hover:scale-x-100"></span>
      </button>
    </div>
  );
}

Button2.defaultProps = {
  className: '',
  type: 'button',
};