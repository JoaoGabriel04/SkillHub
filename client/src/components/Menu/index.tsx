import {
  faBagShopping,
  faGlobe,
  faHouse,
  faScrewdriverWrench,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import LinkItem from "./Link";

export default function MenuBar() {
  const links = [
    {
      title: "Serviços",
      url: "/u/servicos",
      icon: faScrewdriverWrench,
    },
    {
      title: "Produtos",
      url: "/u/produtos",
      icon: faBagShopping,
    },
    {
      title: "Início",
      url: "/u/dashboard",
      icon: faHouse,
    },
    {
      title: "Comunidade",
      url: "/u/comunidade",
      icon: faGlobe,
    },
    {
      title: "Perfil",
      url: "/u/perfil",
      icon: faUser,
    },
  ];

  return (
    <div className="w-full flex justify-center items-center mt-4">
      <ul className="hidden lg:flex gap-8">
        {links.map((link, index) => (
          <LinkItem key={index} title={link.title} url={link.url} />
        ))}
      </ul>
      <nav className="fixed bottom-0 left-0 z-10 w-full h-18 px-3 flex justify-center items-center bg-dark-primary shadow-[0px_-5px_10px_#00000080] lg:hidden">
        <ul className="w-full flex justify-center items-end gap-7 sm:gap-10 md:justify-between md:px-6">
          {links.map((link, index) => (
            <LinkItem
              key={index}
              title={link.title}
              url={link.url}
              icon={link.icon}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}
