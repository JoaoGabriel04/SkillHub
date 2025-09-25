import Image from "next/image";
import Link from "next/link";
import React, { forwardRef } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

const LogoSkillHub = forwardRef<HTMLImageElement, Props>((props, ref) => {
  return (
    <Link href={"/"}>
      <Image
        src={"/Skillhub-Logotipo.png"}
        alt="logo-skillhub"
        width={300}
        height={300}
        ref={ref}
        className="w-10 lg:w-20 absolute top-0 left-[50%] translate-x-[-50%] mt-8 opacity-0"
      />
    </Link>
  );
});
export default LogoSkillHub;
LogoSkillHub.displayName = "LogoSkillHub";
