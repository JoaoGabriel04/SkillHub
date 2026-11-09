import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

// Carrinho de produtos (Fase 18B), só no navegador. Guarda o id e a quantidade para valer; nome, preço e capa
// são só para mostrar algo antes de a tela reler os produtos da API (o total usa sempre os dados relidos, e o
// servidor confere o preço e o estoque no checkout).
// Um carrinho por conta: se quem está logado não é o donoId, o carrinho começa vazio.

export type ItemCarrinho = {
  produtoId: string;
  quantidade: number;
  vendedorId: string;
  nome: string;
  preco: number;
  capaUrl: string | null;
};

export const MAX_ITENS = 20; // itens distintos por checkout (decisão D13)
export const MAX_QUANTIDADE = 99;

type CarrinhoState = {
  donoId: string | null;
  itens: ItemCarrinho[];
  // soma ao que já está no carrinho, até o limite (o estoque e 99); devolve a quantidade final
  adicionar: (donoId: string, item: Omit<ItemCarrinho, "quantidade">, quantidade: number, limite: number) => number;
  definirQuantidade: (produtoId: string, quantidade: number) => void;
  remover: (produtoIds: string[]) => void;
};

// localStorage bloqueado, cheio ou em modo privado: o carrinho funciona na memória, só não é lembrado
// (a mesma ideia de lib/tema.ts)
const armazenamento: StateStorage = {
  getItem: (nome) => {
    try {
      return localStorage.getItem(nome);
    } catch {
      return null;
    }
  },
  setItem: (nome, valor) => {
    try {
      localStorage.setItem(nome, valor);
    } catch {}
  },
  removeItem: (nome) => {
    try {
      localStorage.removeItem(nome);
    } catch {}
  },
};

const limitar = (n: number, limite: number) => Math.max(1, Math.min(Math.floor(n), limite, MAX_QUANTIDADE));

export const useCarrinhoStore = create<CarrinhoState>()(
  persist(
    (set, get) => ({
      donoId: null,
      itens: [],
      adicionar: (donoId, item, quantidade, limite) => {
        const itens = get().donoId === donoId ? get().itens : [];
        const atual = itens.find((i) => i.produtoId === item.produtoId);
        const final = limitar((atual?.quantidade ?? 0) + quantidade, limite);
        set({
          donoId,
          itens: atual
            ? itens.map((i) => (i.produtoId === item.produtoId ? { ...i, ...item, quantidade: final } : i))
            : [...itens, { ...item, quantidade: final }].slice(-MAX_ITENS),
        });
        return final;
      },
      definirQuantidade: (produtoId, quantidade) =>
        set({ itens: get().itens.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: limitar(quantidade, MAX_QUANTIDADE) } : i)) }),
      remover: (produtoIds) => set({ itens: get().itens.filter((i) => !produtoIds.includes(i.produtoId)) }),
    }),
    {
      name: "skillhub-carrinho",
      storage: createJSONStorage(() => armazenamento),
      partialize: ({ donoId, itens }) => ({ donoId, itens }),
      // o servidor não tem localStorage: o carrinho é lido depois de montar (useCarrinho), sem diferença de hidratação
      skipHydration: true,
    }
  )
);

// Os itens de quem está logado (vazio se o carrinho guardado é de outra conta). Lê o localStorage ao montar.
export function useCarrinho(usuarioId: string | undefined) {
  useEffect(() => {
    void useCarrinhoStore.persist.rehydrate();
  }, []);
  const donoId = useCarrinhoStore((s) => s.donoId);
  const itens = useCarrinhoStore((s) => s.itens);
  return usuarioId && donoId === usuarioId ? itens : SEM_ITENS;
}
const SEM_ITENS: ItemCarrinho[] = [];
