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
import LoadingSpinner from "@/components/LoadingSpinner";

const perfisRelevantes = [
    { url: "/foto-perfil-01.jpeg" },
    { url: "/foto-perfil-02.jpeg" },
    { url: "/foto-perfil-03.jpg" },
    { url: "/foto-perfil-04.jpg" },
  ];

export default function Dashboard() {

  const router = useRouter();

  const {fetchUser, perfil, loading} = useUserStore();

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
  }, []);

  useEffect(() => {
    if (perfil === "Colaborador") {
      toast.warning(
        "Você está sendo redirecionado para a área de colaboradores."
      );
      router.push("/c");
    }
  }, [perfil, router]);

  if (loading) return (<LoadingSpinner />)

  return (
    <main>
      <Header />
      <MenuBar/>
      <section className="px-5 md:px-20 lg:px-40 py-3">
        <h3 className="text-md lg:text-xl text-zinc-200/40 font-medium mt-4">
          Seja Bem Vindo ao
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
