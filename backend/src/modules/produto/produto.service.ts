import { randomUUID } from "node:crypto";
import type { StatusProduto } from "@prisma/client";
import { z } from "zod";
import { destroyAsset, uploadBuffer } from "../../configs/cloudinary.js";
import { AppError } from "../../utils/AppError.js";
import { toAutorResumo } from "../../utils/autorResumo.js";
import avaliacaoService from "../avaliacao/avaliacao.service.js";
import { categoriaProdutoDoRotulo, ROTULO_CATEGORIA_PRODUTO } from "./categoria.map.js";
import produtoRepository, { type ImagemNova, type ProdutoComCapa, type ProdutoCompleto } from "./produto.repository.js";
import type { AtualizarProdutoInput, CriarProdutoInput, ListarProdutosInput } from "./produto.schema.js";
import { linkWhatsapp, normalizarTelefone } from "./whatsapp.js";

// Preço em créditos. Premissa do piloto, só para o indicador de renda gerada: 1 crédito = R$ 1,00
// (Fase 18, Seção 3.1; a validar com o professor). Nada no código converte valores.

const STATUS = { ATIVO: "Ativo", PAUSADO: "Pausado" } as const satisfies Partial<Record<StatusProduto, string>>;
const STATUS_DO_ROTULO = { Ativo: "ATIVO", Pausado: "PAUSADO" } as const;
const PERFIS_QUE_VENDEM = ["Colaborador", "Empresa"];
const PASTA = (vendedorId: string) => `Skillhub/produtos/${vendedorId}`;

const naoEncontrado = () => new AppError("Produto não encontrado", 404);
const semContato = () => new AppError("O vendedor não disponibilizou contato", 404);
const ehUuid = (id: string) => z.uuid().safeParse(id).success;

// Resposta da API: rótulos no lugar dos enums, datas em ISO e o vendedor só com id, nome e foto.
// Nunca sai telefone, e-mail, documentos, endereço nem o publicId das fotos.
export function toProdutoResumo(p: ProdutoComCapa | ProdutoCompleto) {
  return {
    id: p.id,
    nome: p.nome,
    preco: p.preco,
    estoque: p.estoque,
    categoria: ROTULO_CATEGORIA_PRODUTO[p.categoria],
    digital: p.digital,
    capaUrl: p.imagens[0]?.url ?? null,
    vendedor: toAutorResumo(p.vendedor),
    createdAt: p.createdAt.toISOString(),
  };
}

const rotuloStatus = (status: StatusProduto) => STATUS[status as keyof typeof STATUS];

async function toProdutoDetalhe(p: ProdutoCompleto) {
  const [vendedorReputacao, telefone] = await Promise.all([
    avaliacaoService.mediaETotal(p.vendedorId),
    produtoRepository.telefoneDoVendedor(p.vendedorId),
  ]);
  return {
    ...toProdutoResumo(p),
    descricao: p.descricao,
    status: rotuloStatus(p.status),
    whatsappAtivo: p.whatsappAtivo,
    imagens: p.imagens.map(({ id, url, ordem }) => ({ id, url, ordem })),
    vendedorReputacao,
    // só o sim/não (decisão D8): o telefone continua fora da resposta
    contatoDisponivel: p.status === "ATIVO" && p.whatsappAtivo && normalizarTelefone(telefone) !== null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

// REMOVIDO não existe para ninguém; PAUSADO só existe para o dono. Id que não é UUID nem vai ao banco.
async function produtoVisivel(id: string, usuarioId: string) {
  if (!ehUuid(id)) throw naoEncontrado();
  const produto = await produtoRepository.buscarPorId(id);
  if (!produto || produto.status === "REMOVIDO" || (produto.status === "PAUSADO" && produto.vendedorId !== usuarioId)) throw naoEncontrado();
  return produto;
}

async function produtoDoDono(id: string, usuarioId: string) {
  const produto = await produtoVisivel(id, usuarioId);
  if (produto.vendedorId !== usuarioId) throw new AppError("Só quem publicou pode alterar o produto", 403);
  return produto;
}

const apagarFotos = (publicIds: (string | null)[]) =>
  Promise.all(publicIds.filter((p): p is string => !!p).map((p) => destroyAsset(p, "image")));

// Sobe as fotos em paralelo, cada uma com public_id próprio (o prefixo do vendedor facilita a limpeza manual).
// Se uma falhar, apaga as que subiram e responde 502: nada fica pela metade.
async function subirFotos(vendedorId: string, produtoId: string, arquivos: Express.Multer.File[]): Promise<ImagemNova[]> {
  const envios = await Promise.allSettled(
    arquivos.map(async (arquivo) => {
      const id = randomUUID();
      const r = await uploadBuffer(arquivo.buffer, { folder: PASTA(vendedorId), publicId: `${produtoId}-${id}`, resourceType: "image" });
      return { id, url: r.secure_url, publicId: r.public_id };
    })
  );
  const subidas = envios.flatMap((e) => (e.status === "fulfilled" ? [e.value] : []));
  if (subidas.length < arquivos.length) {
    await apagarFotos(subidas.map((s) => s.publicId));
    throw new AppError("Falha ao enviar arquivo para o armazenamento", 502);
  }
  return subidas;
}

// "imagens" do PATCH -> lista final: cada item é uma foto que fica (deste produto) ou "nova:N".
// Todo arquivo enviado precisa aparecer uma vez. Conferido antes do upload, para não subir nada à toa.
function planoDeFotos(imagens: string[], atuais: { id: string }[], arquivos: number): ({ nova: number } | { existente: string })[] {
  const usados = new Set<string>();
  const final = imagens.map((item): { nova: number } | { existente: string } => {
    if (usados.has(item)) throw new AppError("A mesma foto aparece duas vezes", 400);
    usados.add(item);
    const nova = /^nova:(\d+)$/.exec(item);
    if (nova) {
      const indice = Number(nova[1]);
      if (indice >= arquivos) throw new AppError("Foto nova não enviada", 400);
      return { nova: indice };
    }
    if (!atuais.some((a) => a.id === item)) throw new AppError("Foto não encontrada neste produto", 400);
    return { existente: item };
  });
  if (final.filter((f) => "nova" in f).length !== arquivos) throw new AppError("Toda foto enviada precisa estar na lista de fotos", 400);
  return final;
}

const produtoService = {
  listar: async (usuarioId: string, { categoria, busca, limit, cursor }: ListarProdutosInput) => {
    const linhas = await produtoRepository.listarAtivos({
      usuarioId,
      categoria: categoria && categoriaProdutoDoRotulo(categoria),
      busca: busca || undefined,
      limit,
      cursor,
    });
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    return { produtos: pagina.map(toProdutoResumo), nextCursor: temMais ? pagina[pagina.length - 1].id : null };
  },

  meus: async (usuarioId: string) =>
    (await produtoRepository.listarDoVendedor(usuarioId)).map((p) => ({
      ...toProdutoResumo(p),
      status: rotuloStatus(p.status),
      whatsappAtivo: p.whatsappAtivo,
    })),

  detalhe: async (id: string, usuarioId: string) => toProdutoDetalhe(await produtoVisivel(id, usuarioId)),

  criar: async (usuarioId: string, dados: CriarProdutoInput, arquivos: Express.Multer.File[]) => {
    const perfil = await produtoRepository.perfilDoUsuario(usuarioId);
    // conta que não existe mais: 401, como no módulo user (o front encerra a sessão)
    if (!perfil) throw new AppError("Usuário não encontrado", 401);
    if (!perfil.perfil || !PERFIS_QUE_VENDEM.includes(perfil.perfil)) throw new AppError("Só colaboradores e empresas vendem produtos", 403);
    if (!perfil.profileComplete) throw new AppError("Complete seu perfil para publicar um produto", 403);
    if (arquivos.length === 0) throw new AppError("Envie de 1 a 4 fotos", 400);

    const id = randomUUID();
    const imagens = await subirFotos(usuarioId, id, arquivos);
    // banco falhou depois do upload: as fotos saem do Cloudinary para não ficarem órfãs
    const criado = await produtoRepository
      .criar({ ...dados, id, categoria: categoriaProdutoDoRotulo(dados.categoria), vendedorId: usuarioId }, imagens)
      .catch(async (err) => {
        await apagarFotos(imagens.map((i) => i.publicId));
        throw err;
      });
    return toProdutoDetalhe(criado);
  },

  atualizar: async (id: string, usuarioId: string, dados: AtualizarProdutoInput, arquivos: Express.Multer.File[]) => {
    const produto = await produtoDoDono(id, usuarioId);
    const { imagens, status, categoria, ...resto } = dados;
    if (arquivos.length > 0 && !imagens) throw new AppError("Informe a ordem das fotos (campo imagens)", 400);
    const plano = imagens && planoDeFotos(imagens, produto.imagens, arquivos.length);

    const novas = plano ? await subirFotos(usuarioId, id, arquivos) : [];
    const { produto: atualizado, removidas } = await produtoRepository
      .atualizar(
        id,
        usuarioId,
        {
          ...resto,
          ...(categoria && { categoria: categoriaProdutoDoRotulo(categoria) }),
          ...(status && { status: STATUS_DO_ROTULO[status] }),
        },
        plano && { final: plano.map((f) => ("nova" in f ? { nova: novas[f.nova] } : f)) }
      )
      .catch(async (err) => {
        await apagarFotos(novas.map((n) => n.publicId));
        throw err;
      });
    await apagarFotos(removidas);
    return toProdutoDetalhe(atualizado);
  },

  // exclusão lógica (o histórico de pedidos da 18B usa snapshots); as fotos saem do Cloudinary com "melhor esforço"
  remover: async (id: string, usuarioId: string) => {
    const produto = await produtoDoDono(id, usuarioId);
    if ((await produtoRepository.remover(id, usuarioId)) === 0) throw naoEncontrado();
    await apagarFotos(produto.imagens.map((i) => i.publicId));
  },

  // Seção 3.5: o link do WhatsApp do vendedor, só para produto ativo, com contato ligado e telefone válido
  contato: async (id: string, usuarioId: string) => {
    const produto = await produtoVisivel(id, usuarioId);
    if (produto.vendedorId === usuarioId) throw new AppError("Este produto é seu", 400);
    if (produto.status !== "ATIVO") throw naoEncontrado();
    if (!produto.whatsappAtivo) throw semContato();
    const telefone = normalizarTelefone(await produtoRepository.telefoneDoVendedor(produto.vendedorId));
    if (!telefone) throw semContato();
    return { url: linkWhatsapp(telefone, produto.nome) };
  },

  // exclusão de conta (módulo user): os produtos caem em cascata no banco; as fotos são apagadas depois
  fotosDoVendedor: (usuarioId: string) => produtoRepository.fotosDoVendedor(usuarioId),
  apagarFotos,
};

export default produtoService;
