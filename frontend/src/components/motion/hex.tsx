import type { SVGProps } from "react";

// Hexágono pointy-top, o mesmo formato das células do logo. A cor vem de currentColor.
export function Hex({
  size,
  filled = false,
  strokeWidth = 1.5,
  ...props
}: SVGProps<SVGSVGElement> & { size: number; filled?: boolean; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 100 115.47" width={size} height={size * 1.1547} aria-hidden {...props}>
      <polygon
        points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

