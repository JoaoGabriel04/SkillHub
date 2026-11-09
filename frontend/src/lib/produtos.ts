import { mutate } from "swr";
import { api } from "@/lib/api";
import type { CategoriaProduto, ProdutoDetalhe, ProdutoResumo, StatusProduto } from "@/types/produto";

// Cliente da API de Produtos (Fase 18A), no padrão de lib/servicos.ts.

export type FiltrosProdutos = { categoria?: CategoriaProduto; busca?: string; limit?: number };
export type CamposProduto = Pick<ProdutoDetalhe, "nome" | "descricao" | "categoria" | "preco" | "estoque" | "digital" | "whatsappAtivo">;
// fotos na ordem final (a primeira é a capa): as que já existem (pelo id) e os arquivos novos
export type FotoProduto = { id: string } | { arquivo: File };

// Chaves do SWR: a lista inclui os filtros, então cada combinação tem o próprio cache
export const chaveProdutos = (filtros: FiltrosProdutos) => ["produtos", filtros] as const;
export const CHAVE_MEUS_PRODUTOS = "produtos/meus";
export const chaveProduto = (id: string) => ["produto", id] as const;

export const getProdutos = (filtros: FiltrosProdutos) =>
  api.get<{ produtos: ProdutoResumo[]; nextCursor: string | null }>("/produtos", { params: filtros }).then((r) => r.data.produtos);

export const getMeusProdutos = () => api.get<{ produtos: ProdutoResumo[] }>("/produtos/meus").then((r) => r.data.produtos);

export const getProduto = (id: string) => api.get<{ produto: ProdutoDetalhe }>(`/produtos/${id}`).then((r) => r.data.produto);

// multipart: os campos como texto e as fotos novas em "fotos"; no PATCH, "imagens" diz a ordem final
// (ids das que ficam e "nova:N" para o N-ésimo arquivo)
function formulario(campos: Record<string, string | number | boolean | undefined>, fotos?: FotoProduto[]) {
  const body = new FormData();
  for (const [campo, valor] of Object.entries(campos)) if (valor !== undefined) body.append(campo, String(valor));
  if (fotos) {
    let n = 0;
    const ordem = fotos.map((f) => {
      if ("id" in f) return f.id;
      body.append("fotos", f.arquivo);
      return `nova:${n++}`;
    });
    body.append("imagens", JSON.stringify(ordem));
  }
  return body;
}

export const criarProduto = (campos: CamposProduto, arquivos: File[]) => {
  const body = formulario(campos);
  for (const arquivo of arquivos) body.append("fotos", arquivo);
  return api.post<{ produto: ProdutoDetalhe }>("/produtos", body).then((r) => r.data.produto);
};

// sem fotos, vai como JSON; com fotos, multipart
export const atualizarProduto = (id: string, campos: Partial<CamposProduto> & { status?: StatusProduto }, fotos?: FotoProduto[]) =>
  api.patch<{ produto: ProdutoDetalhe }>(`/produtos/${id}`, fotos ? formulario(campos, fotos) : campos).then((r) => r.data.produto);

export const removerProduto = (id: string) => api.delete(`/produtos/${id}`);

export const getContato = (id: string) => api.get<{ url: string }>(`/produtos/${id}/contato`).then((r) => r.data.url);

// Depois de publicar, editar, pausar ou remover: recarrega as listas, "Seus produtos", o Início e o detalhe aberto
export const revalidarProdutos = () =>
  mutate((chave) => chave === CHAVE_MEUS_PRODUTOS || (Array.isArray(chave) && ["produtos", "produto"].includes(chave[0])));
