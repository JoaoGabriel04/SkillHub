// ⚠️ DADOS ESTÁTICOS: os banners de "Destaques" de /produtos (designs/New Produtos.png) são campanhas da
// plataforma (guias), não produtos. Ficam aqui, estáticos, até a Fase 19. Os produtos vêm da API desde a
// Fase 18A (lib/produtos.ts); o que sobrar deste mock é limpo na 18C.

// Banner do carrossel do topo (campanhas da plataforma)
export type Destaque = {
  id: string;
  chamada: string; // "Guia completo:"
  titulo: string; // "Como fazer venda de"
  realce: string; // trecho colorido do título
  cta: string;
};

export const DESTAQUES_MOCK: Destaque[] = [
  { id: "d1", chamada: "Guia completo:", titulo: "Como fazer venda de", realce: "cursos online", cta: "Download" },
  { id: "d2", chamada: "Guia essencial:", titulo: "Como montar o seu", realce: "portfólio online", cta: "Download" },
];

export async function getDestaques(): Promise<Destaque[]> {
  return Promise.resolve(DESTAQUES_MOCK);
}
