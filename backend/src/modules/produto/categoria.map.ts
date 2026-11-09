import type { CategoriaProduto } from "@prisma/client";

// A API fala em rótulos (os mesmos textos do frontend); o banco guarda o enum. Único mapa dos dois (Fase 18A).
export const ROTULO_CATEGORIA_PRODUTO = {
  ARTE_DECORACAO: "Arte e Decoração",
  ALIMENTOS_BEBIDAS: "Alimentos e Bebidas",
  MODA_ACESSORIOS: "Moda e Acessórios",
  SERVICOS_DIGITAIS: "Serviços Digitais",
  EDUCACAO_APOSTILAS: "Educação e Apostilas",
} as const satisfies Record<CategoriaProduto, string>;

export type RotuloCategoriaProduto = (typeof ROTULO_CATEGORIA_PRODUTO)[CategoriaProduto];

export const ROTULOS_CATEGORIA_PRODUTO = Object.values(ROTULO_CATEGORIA_PRODUTO) as [RotuloCategoriaProduto, ...RotuloCategoriaProduto[]];

const CATEGORIA_POR_ROTULO = Object.fromEntries(
  Object.entries(ROTULO_CATEGORIA_PRODUTO).map(([enumValue, rotulo]) => [rotulo, enumValue])
) as Record<RotuloCategoriaProduto, CategoriaProduto>;

export const categoriaProdutoDoRotulo = (rotulo: RotuloCategoriaProduto) => CATEGORIA_POR_ROTULO[rotulo];
