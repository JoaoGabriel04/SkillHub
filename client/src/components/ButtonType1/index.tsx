type ButtonProps = {
  handle?: () => void;
  type?: string;
  size: "sm" | "md" | "lg" | "xl";
};

export default function Button1({ handle, type, size }: ButtonProps) {
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
    <div className={`${sizeBtn} h-10 p-[1px] mt-10 bg-zinc-100`}>
      <button
        onClick={handle}
        type={type === "submit" ? "submit" : "button"}
        className="relative group w-full h-full overflow-hidden bg-[#101010] text-zinc-100 cursor-pointer"
      >
        <span className="font-jersey relative z-10 transition-colors duration-500 group-hover:text-[#101010]">
          Entre já
        </span>
        <span className="absolute inset-0 bg-zinc-100 scale-x-0 origin-center transition-transform duration-500 group-hover:scale-x-100"></span>
      </button>
    </div>
  );
}
