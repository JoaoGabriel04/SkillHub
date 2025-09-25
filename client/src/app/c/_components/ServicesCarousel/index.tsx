import { Carousel, CarouselContent } from "@/components/ui/carousel";
import CardType1 from "@/components/CardType1";

type Servicos = {
  usuario: string;
  foto: string;
  titulo?: string;
  descricao: string;
}

export default function ServicesCarousel() {
  const servicos: Servicos[] = [
    {
      usuario: "Caetano Santos",
      foto: "/foto-perfil-05.jpg",
      descricao:
        "Estou precisando de um pequeno serviço, para a formatação do meu computador.",
    },
    {
      usuario: "José Alves",
      foto: "/foto-perfil-06.jpg",
      descricao:
        "Minha máquina de lavar não está mais funcionando corretamente, poderia me ajudar?",
    },
    {
      usuario: "Marina Oliveira",
      foto: "/foto-perfil-05.jpg",
      descricao:
        "Preciso de alguém para revisar meu currículo e dar dicas de apresentação.",
    },
    {
      usuario: "Lucas Pereira",
      foto: "/foto-perfil-06.jpg",
      descricao:
        "Meu celular está travando bastante, gostaria de uma limpeza e atualização de sistema.",
    },
    {
      usuario: "Fernanda Costa",
      foto: "/foto-perfil-05.jpg",
      descricao:
        "Queria ajuda para organizar meu escritório em casa, está bem bagunçado.",
    },
    {
      usuario: "Rafael Lima",
      foto: "/foto-perfil-06.jpg",
      descricao:
        "Preciso de um frete rápido para levar algumas caixas até o centro da cidade.",
    },
    {
      usuario: "Aline Rodrigues",
      foto: "/foto-perfil-05.jpg",
      descricao:
        "Meu cachorro precisa de banho e tosa, alguém disponível essa semana?",
    },
    {
      usuario: "Bruno Martins",
      foto: "/foto-perfil-06.jpg",
      descricao: "Estou com problemas na rede Wi-Fi, a internet cai toda hora.",
    },
  ];

  return (
    <div className="w-full mt-4">
      <Carousel className="w-full">
        <CarouselContent>
          {servicos.map((servico, index) => (
            <CardType1
              key={index}
              titulo={servico.titulo ?? servico.titulo}
              usuario={servico.usuario}
              foto={servico.foto}
              descricao={servico.descricao}
            />
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
