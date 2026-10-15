import { faBagShopping, faGlobe, faHouse, faScrewdriverWrench, faUser } from "@fortawesome/free-solid-svg-icons";

// Destinos da navegação principal, usados pelo BottomNav (mobile) e pela Sidebar (desktop).
// Cada menu escolhe a própria ordem.
export const NAV_ITENS = {
  inicio: { href: "/inicio", label: "Início", icon: faHouse },
  servicos: { href: "/servicos", label: "Serviços", icon: faScrewdriverWrench },
  produtos: { href: "/produtos", label: "Produtos", icon: faBagShopping },
  comunidade: { href: "/comunidade", label: "Comunidade", icon: faGlobe },
  perfil: { href: "/perfil", label: "Perfil", icon: faUser },
};

// Vidro dos menus (SKILLHUB_PAGINAS_DESIGN.md, Seção 0): só insets, sem brilho colorido. O raio fica com cada menu.
export const NAV_VIDRO =
  "border border-[#b0b0b0]/[0.33] bg-black/35 backdrop-blur-[3px] shadow-[inset_0_-4px_4px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(255,255,255,0.10)]";

// Ativo também nas subrotas (/servicos/123), sem confundir /perfil com /perfilx.
export const rotaAtiva = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

// Páginas do menu (os dois menus + Configurações): navegar entre elas usa a transição suave, não a colmeia
const ROTAS_MENU = [...Object.values(NAV_ITENS).map((item) => item.href), "/configuracoes"];
export const rotaDoMenu = (pathname: string) => ROTAS_MENU.some((href) => rotaAtiva(pathname, href));
