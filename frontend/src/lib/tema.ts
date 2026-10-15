// Tema claro/escuro (Fase 16.4; SKILLHUB_DESIGN_SYSTEM.md, Seção 8.5).
// A preferência fica no localStorage do navegador (não vai para o backend). O tema aplicado é a
// classe `dark` no <html> e a meta theme-color. Quem aplica:
// - no carregamento, o script inline do <head> (scriptTema), antes da primeira pintura;
// - depois, o TemaProvider (components/tema/tema-provider.tsx), com aplicarTema.
// Os dois saem das mesmas constantes daqui. Sem `window` no topo do módulo: o layout raiz
// (Server Component) importa o scriptTema.

import { COR_BARRA } from "@/lib/brand";

export type PreferenciaTema = "escuro" | "claro" | "sistema";
export type Tema = "escuro" | "claro";

export const PREFERENCIAS: readonly PreferenciaTema[] = ["claro", "escuro", "sistema"];
export const TEMA_PADRAO: PreferenciaTema = "escuro";
const CHAVE = "skillhub-tema";
const CONSULTA_SISTEMA = "(prefers-color-scheme: dark)";

// Telas de entrada: sempre escuras (wrapper `dark` em app/(auth)/layout.tsx), então a barra do navegador
// também fica escura nelas, qualquer que seja o tema escolhido
const ROTAS_ENTRADA = ["/", "/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/auth/callback"];
const ehEntrada = (pathname: string) =>
  ROTAS_ENTRADA.some((rota) => pathname === rota || (rota !== "/" && pathname.startsWith(rota + "/")));

const ehPreferencia = (valor: unknown): valor is PreferenciaTema => PREFERENCIAS.includes(valor as PreferenciaTema);

// Escolha da sessão quando o localStorage não grava (bloqueado, modo privado): o tema muda, só não é lembrado
let memoria: PreferenciaTema | null = null;

export function lerPreferencia(): PreferenciaTema {
  if (memoria) return memoria;
  try {
    const valor = localStorage.getItem(CHAVE);
    return ehPreferencia(valor) ? valor : TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO;
  }
}

export const resolverTema = (preferencia: PreferenciaTema): Tema =>
  preferencia === "sistema" ? (window.matchMedia(CONSULTA_SISTEMA).matches ? "escuro" : "claro") : preferencia;

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "escuro");
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = COR_BARRA[ehEntrada(window.location.pathname) ? "escuro" : tema];
}

// Store do useSyncExternalStore: avisa quando a preferência muda (aqui ou em outra aba)
// e quando o sistema troca de tema com a página aberta (vale para "sistema").
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

export function definirPreferencia(preferencia: PreferenciaTema) {
  memoria = preferencia;
  try {
    localStorage.setItem(CHAVE, preferencia);
    memoria = null; // gravou: o localStorage volta a ser a fonte
  } catch {}
  avisar();
}

export function assinarTema(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const sistema = window.matchMedia(CONSULTA_SISTEMA);
  const outraAba = (e: StorageEvent) => {
    if (e.key === CHAVE) ouvinte();
  };
  sistema.addEventListener("change", ouvinte);
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(ouvinte);
    sistema.removeEventListener("change", ouvinte);
    window.removeEventListener("storage", outraAba);
  };
}

// Snapshot como string (o useSyncExternalStore compara por igualdade): "preferência:tema"
export const snapshotTema = () => {
  const preferencia = lerPreferencia();
  return `${preferencia}:${resolverTema(preferencia)}`;
};
export const SNAPSHOT_SERVIDOR = `${TEMA_PADRAO}:${TEMA_PADRAO}`;

// Script do <head>: mesma regra de lerPreferencia + resolverTema + aplicarTema (inclusive as telas de entrada), em JS puro.
// Qualquer erro deixa o que o servidor mandou (classe `dark`, o tema padrão).
export const scriptTema = `(function(){try{var p;try{p=localStorage.getItem(${JSON.stringify(CHAVE)})}catch(e){}var r=location.pathname,n=${JSON.stringify(
  ROTAS_ENTRADA
)}.some(function(x){return r===x||(x!=="/"&&r.indexOf(x+"/")===0)});if(${JSON.stringify(
  PREFERENCIAS
)}.indexOf(p)<0)p=${JSON.stringify(TEMA_PADRAO)};var e=p==="sistema"?matchMedia(${JSON.stringify(
  CONSULTA_SISTEMA
)}).matches:p==="escuro";document.documentElement.classList.toggle("dark",e);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=e||n?${JSON.stringify(
  COR_BARRA.escuro
)}:${JSON.stringify(COR_BARRA.claro)}}catch(e){}})()`;
