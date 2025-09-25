import { Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between items-center py-3 px-5 md:px-20 lg:px-40 border-b border-zinc-300/20">
      <Link href={"/"} className="flex justify-center items-center">
        <Image
          src={"/Skillhub-Logo.png"}
          alt="logo-skillhub"
          priority
          width={200}
          height={100}
          className="w-25 lg:w-30"
        />
      </Link>
      <div className="flex justify-center items-center gap-4 text-zinc-200">
        <div className="relative w-20 py-1 px-2 flex justify-end bg-[#191919] rounded-sm">
          <Image
            src={"/Icon-Credits-Skillhub.png"}
            alt="credit-icon"
            width={50}
            height={50}
            className="absolute top-1/2 transform -translate-1/2 left-0 w-6"
          />
          <span>0,00</span>
        </div>
        <Link href={"/c/configuracoes"}>
          <Settings className="cursor-pointer" />
        </Link>
      </div>
    </header>
  );
}
