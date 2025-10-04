import { useUserStore } from "@/stores/userInfo";
import { Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function Header() {

  const router = useRouter();
  const {credits} = useUserStore();

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
          <span>{credits?.toFixed(2) ?? 2}</span>
        </div>
        <Link href={"/u/configuracoes"}>
          <Settings className="cursor-pointer" />
        </Link>
      </div>
    </header>
  );
}
