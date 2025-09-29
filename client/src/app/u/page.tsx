'use client'
import Image from "next/image";
import BannerCarousel from "./_components/Carousel";
import Header from "./_components/Header";
import ServicesCarousel from "./_components/ServicesCarousel";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import MenuBar from "./_components/Menu";
import { useUserStore } from "@/stores/userInfo";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const perfisRelevantes = [
    { url: "/foto-perfil-01.jpeg" },
    { url: "/foto-perfil-02.jpeg" },
    { url: "/foto-perfil-03.jpg" },
    { url: "/foto-perfil-04.jpg" },
  ];

export default function Dashboard() {

  const router = useRouter();

  const {fetchUser, fullName, loading} = useUserStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUser().catch(() => {
      toast.error("Erro de autenticação.");
      router.push("/login");
    });
  }, [router]);

  if (loading) return (
    <main className="flex w-full h-screen justify-center items-center">
      {/*From Uiverse.io by TamaniPhiri*/}
      <div className="flex-col gap-4 w-full flex items-center justify-center">
        <div className="w-28 h-28 border-8 text-blue-400 text-4xl animate-spin border-gray-300 flex items-center justify-center border-t-blue-400 rounded-full">
          <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className="animate-ping">
            <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"></path>
          </svg>
        </div>
      </div>
    </main>
  )

  return (
    <main>
      <Header />
      <MenuBar/>
      <section className="px-5 md:px-20 lg:px-40 py-3">
        <h3 className="text-md lg:text-xl text-zinc-200/40 font-medium mt-4">
          Seja Bem Vindo, {fullName}, ao
        </h3>
        <h1 className="text-4xl lg:text-6xl text-zinc-200 font-bold">
          Skillhub
        </h1>
        <BannerCarousel />

        <section className="grid grid-cols-1 xl:grid-cols-2 mt-6 lg:mt-16 gap-y-4">
          <div className="flex flex-col">
            <h1 className="text-zinc-200/60 md:text-lg font-medium">
              Colaboradores Relevantes
            </h1>
            <div className="flex items-center gap-4 sm:gap-6 md:gap-8 mt-6">
              {perfisRelevantes.map((perfil, index) => (
                <div
                  key={index}
                  className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex justify-center items-center overflow-hidden"
                >
                  <Image
                    src={perfil.url}
                    alt="foto-de-perfil"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              ))}
              <span className="text-xs md:text-lg text-zinc-200/40 hover:text-zinc-200/80 cursor-pointer transition-colors">
                Ver Mais...
              </span>
            </div>
          </div>

          <section className="mt-6 lg:mt-0">
            <div className="flex justify-between">
              <h1 className="text-zinc-200/60 md:text-lg font-medium">
                Serviços
              </h1>
              <Link href={"/"}>
                <MoveRight className="w-5 text-zinc-200/40 cursor-pointer" />
              </Link>
            </div>
            <ServicesCarousel />
          </section>
        </section>

        <section className="mt-6 lg:mt-16">
          <div className="flex justify-between">
            <h1 className="text-zinc-200/60 md:text-lg font-medium">
              Produtos Relevantes
            </h1>
            <Link href={"/"}>
              <MoveRight className="w-5 text-zinc-200/40 cursor-pointer" />
            </Link>
          </div>
        </section>
      </section>
      <div className="w-full h-18 lg:hidden"></div>
    </main>
  );
}
