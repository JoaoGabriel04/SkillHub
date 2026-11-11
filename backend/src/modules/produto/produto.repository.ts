import type { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import prisma from "../../configs/prisma.js";
import { AUTOR_RESUMO_SELECT } from "../../utils/autorResumo.js";

// Único lugar que escreve em Produto (inclusive o estoque, Seção 1, regra 8) e em ProdutoImagem.
// O vendedor sai do banco só com id, nome e foto (toAutorResumo no service). O telefone tem consulta própria
// (telefoneDoVendedor) e nunca entra no objeto que vira resposta.
const IMAGEM_SELECT = { id: true, url: true, ordem: true, publicId: true } as const;

// lista: só a capa
export const comCapa = {
  vendedor: { select: AUTOR_RESUMO_SELECT },
  imagens: { select: IMAGEM_SELECT, orderBy: { ordem: "asc" }, take: 1 },
} as const;
// detalhe: todas as fotos
export const completo = {
  vendedor: { select: AUTOR_RESUMO_SELECT },
  imagens: { select: IMAGEM_SELECT, orderBy: { ordem: "asc" } },
} as const;
const ORDEM = [{ createdAt: "desc" }, { id: "desc" }] as const satisfies Prisma.ProdutoOrderByWithRelationInput[];

export type ProdutoComCapa = Prisma.ProdutoGetPayload<{ include: typeof comCapa }>;
export type ProdutoCompleto = Prisma.ProdutoGetPayload<{ include: typeof completo }>;
export type ImagemNova = { id: string; url: string; publicId: string };

type Tx = Prisma.TransactionClient;

type FiltroLista = {
  usuarioId: string;
  categoria?: Prisma.ProdutoWhereInput["categoria"];
  busca?: string;
  limit: number;
  cursor?: string;
};

const produtoRepository = {
  // lista geral: só ATIVO e nunca os produtos do próprio usuário (ele os vê em /produtos/meus)
  listarAtivos: ({ usuarioId, categoria, busca, limit, cursor }: FiltroLista) =>
    prisma.produto.findMany({
      where: {
        status: "ATIVO",
        vendedorId: { not: usuarioId },
        ...(categoria && { categoria }),
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { descricao: { contains: busca, mode: "insensitive" } },
            { vendedor: { fullName: { contains: busca, mode: "insensitive" } } },
          ],
        }),
      },
      include: comCapa,
      orderBy: [...ORDEM],
      take: limit + 1, // um a mais para saber se há próxima página
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),

  listarDoVendedor: (vendedorId: string) =>
    prisma.produto.findMany({ where: { vendedorId, status: { not: "REMOVIDO" } }, include: comCapa, orderBy: [...ORDEM] }),

  buscarPorId: (id: string) => prisma.produto.findUnique({ where: { id }, include: completo }),

  // só para montar o link do WhatsApp e o contatoDisponivel; nunca vai para a resposta
  telefoneDoVendedor: async (vendedorId: string) =>
    (await prisma.user.findUnique({ where: { id: vendedorId }, select: { phone: true } }))?.phone ?? null,

  // quem publica precisa ser Colaborador ou Empresa com o perfil completo (o módulo user não é alterado)
  perfilDoUsuario: (id: string) => prisma.user.findUnique({ where: { id }, select: { perfil: true, profileComplete: true } }),

  criar: (data: Omit<Prisma.ProdutoUncheckedCreateInput, "imagens">, imagens: ImagemNova[]) =>
    prisma.produto.create({
      data: { ...data, imagens: { create: imagens.map((img, ordem) => ({ ...img, ordem })) } },
      include: completo,
    }),

  // Edita os campos e, com `fotos`, troca as fotos pela lista final (ids existentes e novas, já na ordem).
  // O updateMany condicional vem primeiro: grava só se o produto ainda é do vendedor e não foi removido,
  // e trava a linha até o fim da transação, então duas edições simultâneas rodam uma depois da outra
  // (a segunda vê as fotos que a primeira deixou). Devolve o produto e os publicId das fotos que saíram.
  atualizar: (
    id: string,
    vendedorId: string,
    dados: Prisma.ProdutoUncheckedUpdateManyInput,
    fotos?: { final: ({ existente: string } | { nova: ImagemNova })[] },
    estoqueLido?: number // Fase 18B (D6): com o estoque no corpo, só grava se ele ainda é o que o vendedor viu
  ) =>
    prisma.$transaction(async (tx) => {
      const onde = { id, vendedorId, status: { in: ["ATIVO", "PAUSADO"] } } satisfies Prisma.ProdutoWhereInput;
      const { count } = await tx.produto.updateMany({
        where: { ...onde, ...(estoqueLido !== undefined && { estoque: estoqueLido }) },
        data: { ...dados, updatedAt: new Date() }, // updatedAt sempre: garante o UPDATE (e a trava) mesmo sem campos
      });
      if (count === 0) {
        // o produto continua lá: o que mudou foi o estoque (houve uma venda entre a leitura e o salvar)
        if (estoqueLido !== undefined && (await tx.produto.count({ where: onde })) > 0)
          throw new AppError("O estoque mudou (houve uma venda). Confira e salve de novo.", 409, { code: "ESTOQUE_ALTERADO" });
        throw new AppError("Produto não encontrado", 404);
      }

      let removidas: (string | null)[] = [];
      if (fotos) {
        const atuais = await tx.produtoImagem.findMany({ where: { produtoId: id }, select: { id: true, publicId: true } });
        const mantidas = new Set(fotos.final.flatMap((f) => ("existente" in f ? [f.existente] : [])));
        if ([...mantidas].some((fotoId) => !atuais.some((a) => a.id === fotoId)))
          throw new AppError("As fotos mudaram enquanto você editava. Tente de novo.", 409);
        const saem = atuais.filter((a) => !mantidas.has(a.id));
        await tx.produtoImagem.deleteMany({ where: { id: { in: saem.map((a) => a.id) } } });
        for (const [ordem, f] of fotos.final.entries()) {
          if ("existente" in f) await tx.produtoImagem.update({ where: { id: f.existente }, data: { ordem } });
          else await tx.produtoImagem.create({ data: { ...f.nova, produtoId: id, ordem } });
        }
        removidas = saem.map((a) => a.publicId);
      }
      return { produto: await tx.produto.findUniqueOrThrow({ where: { id }, include: completo }), removidas };
    }),

  // --- Fase 18B: o estoque do checkout e do cancelamento. Continua sendo o único lugar que escreve em Produto.estoque.
  // Quem chama trava as linhas em ordem crescente de id (PLANO_18B, Seção 3.4).

  // leitura do checkout, sem trava: status, dono, preço e o snapshot (nome, capa, digital)
  paraCheckout: (tx: Tx, ids: string[]) =>
    tx.produto.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, nome: true, preco: true, estoque: true, status: true, digital: true, vendedorId: true,
        imagens: { select: { url: true }, orderBy: { ordem: "asc" }, take: 1 },
      },
    }),

  // Baixa condicional: só se ainda está ATIVO, com o preço que a pessoa viu e estoque suficiente. Devolve se baixou.
  // O UPDATE trava a linha: na corrida pela última unidade, o segundo espera e não encontra estoque.
  baixarEstoque: async (tx: Tx, id: string, quantidade: number, precoEsperado: number) =>
    (
      await tx.produto.updateMany({
        where: { id, status: "ATIVO", preco: precoEsperado, estoque: { gte: quantidade } },
        data: { estoque: { decrement: quantidade } },
      })
    ).count === 1,

  // depois de a baixa não pegar, para dizer por quê (INDISPONIVEL, PRECO_ALTERADO ou ESGOTADO)
  estadoParaCheckout: (tx: Tx, id: string) => tx.produto.findUnique({ where: { id }, select: { status: true, preco: true, estoque: true } }),

  // cancelamento: o estoque volta, qualquer que seja o status (um produto removido continua fora da loja)
  devolverEstoque: (tx: Tx, id: string, quantidade: number) =>
    tx.produto.updateMany({ where: { id }, data: { estoque: { increment: quantidade } } }),

  // exclusão lógica: só se ainda não foi removido (condição no UPDATE); as linhas das fotos ficam
  remover: async (id: string, vendedorId: string) =>
    (await prisma.produto.updateMany({ where: { id, vendedorId, status: { not: "REMOVIDO" } }, data: { status: "REMOVIDO" } })).count,

  // as fotos no Cloudinary de todos os produtos de um vendedor (exclusão de conta)
  fotosDoVendedor: async (vendedorId: string) =>
    (await prisma.produtoImagem.findMany({ where: { produto: { vendedorId }, publicId: { not: null } }, select: { publicId: true } })).map(
      (i) => i.publicId!
    ),
};

export default produtoRepository;
