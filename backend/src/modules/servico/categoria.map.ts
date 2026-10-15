import type { CategoriaServico } from "@prisma/client";

// A API fala em rótulos (os mesmos textos do frontend); o banco guarda o enum. Único mapa dos dois.
export const ROTULO_CATEGORIA = {
  EDUCACAO: "Educação",
  TECNOLOGIA: "Tecnologia",
  DESIGN_ARTE: "Design e Arte",
  REPAROS: "Reparos e Manutenção",
} as const satisfies Record<CategoriaServico, string>;

export type RotuloCategoria = (typeof ROTULO_CATEGORIA)[CategoriaServico];

export const ROTULOS_CATEGORIA = Object.values(ROTULO_CATEGORIA) as [RotuloCategoria, ...RotuloCategoria[]];

const CATEGORIA_POR_ROTULO = Object.fromEntries(
  Object.entries(ROTULO_CATEGORIA).map(([enumValue, rotulo]) => [rotulo, enumValue])
) as Record<RotuloCategoria, CategoriaServico>;

export const categoriaDoRotulo = (rotulo: RotuloCategoria) => CATEGORIA_POR_ROTULO[rotulo];
