import { forwardRef } from "react";

type TitlesProps = {
  children: React.ReactNode;
  className?: string;
};

const Titles = forwardRef<HTMLHeadingElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <h1 ref={ref} className={`text-2xl lg:text-4xl text-zinc-200 font-bold ${className}`}>
      {children}
    </h1>
  )
);

export default Titles;
Titles.displayName = "Titles";