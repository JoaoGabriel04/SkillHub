"use client";

import { useRouter } from "next/navigation";
import Button1 from "@/components/Button1";
import { SkillHubLogo } from "@/components/brand/skillhub-logo";

// designs/New Home.png
export default function HomePage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center">
      <SkillHubLogo size={115} />
      <p className="mt-[9px] bg-[linear-gradient(180deg,#2dbfda_0%,#3bd4cc_55%,#93e7e2_100%)] bg-clip-text font-jersey-25 text-[32px] leading-none text-transparent">
        SkillHub
      </p>
      <Button1 size="md" handle={() => router.push("/login")} className="mt-[50px]">
        Entrar
      </Button1>
    </div>
  );
}
