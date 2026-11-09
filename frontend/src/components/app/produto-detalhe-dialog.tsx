"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import useSWR from "swr";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faStar } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Minus, Plus } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { CheckoutDialog } from "@/components/app/checkout-dialog";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { PublicarProdutoDialog } from "@/components/app/publicar-produto-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { getApiErrorMessage } from "@/lib/api";
import { atualizarProduto, chaveProduto, getContato, getProduto, removerProduto, revalidarProdutos } from "@/lib/produtos";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { MAX_QUANTIDADE, useCarrinhoStore } from "@/stores/carrinho-store";
import type { ProdutoDetalhe, ProdutoResumo } from "@/types/produto";

type Props = { produto: ProdutoResumo; open: boolean; onOpenChange: (open: boolean) => void; onEditar?: () => void };

// base sem cor: o cn do projeto (pacote "cn") só junta classes, não resolve conflito de cor
const botaoBase = "rounded-[6px] px-3 py-2 text-[13px] transition-colors hover:bg-foreground/10 disabled:opacity-50";
const botaoSecundario = cn(botaoBase, "text-foreground-secondary hover:text-foreground");
const botaoIcone =
  "flex size-8 items-center justify-center rounded-[6px] text-foreground-secondary transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";

const creditos = (n: number) => `${n} ${n === 1 ? "crédito" : "créditos"}`;
const estoque = (n: number) => (n === 0 ? "Esgotado" : n === 1 ? "1 disponível" : `${n} disponíveis`);

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-[14px] text-foreground">{children}</dd>
    </div>
  );
}

// Foto grande e, com mais de uma, as miniaturas para trocar (a primeira é a capa)
function Fotos({ produto }: { produto: ProdutoDetalhe }) {
  const [atual, setAtual] = useState(0);
  const foto = produto.imagens[atual] ?? produto.imagens[0];
  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-surface-2">
        {/* a foto é a maior imagem com o diálogo aberto (LCP): sem lazy */}
        {foto && <Image src={foto.url} alt={produto.nome} fill loading="eager" sizes="372px" className="object-cover" />}
      </div>
      {produto.imagens.length > 1 && (
        <div className="mt-2 flex gap-2">
          {produto.imagens.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Foto ${i + 1} de ${produto.imagens.length}`}
              aria-pressed={i === atual}
              onClick={() => setAtual(i)}
              className={cn(
                "relative size-[52px] overflow-hidden rounded-[6px] border-2 bg-surface-2 transition-opacity",
                i === atual ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={img.url} alt="" fill sizes="52px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Reputacao({ reputacao }: { reputacao: ProdutoDetalhe["vendedorReputacao"] }) {
  if (reputacao.media === null) return <span className="text-[12px] text-muted-foreground">Sem avaliações</span>;
  return (
    <span className="flex items-center gap-1 text-[12px] text-foreground-secondary">
      <FontAwesomeIcon icon={faStar} aria-hidden className="text-accent-text" />
      <span>
        {reputacao.media.toLocaleString("pt-BR")} ({reputacao.total} {reputacao.total === 1 ? "avaliação" : "avaliações"})
      </span>
    </span>
  );
}

// Detalhe de um produto (o clique nos cards, Fase 18A), na casca dos modais do Perfil. Depende de quem abre:
// - quem compra: "Falar com o vendedor" (link do WhatsApp em nova aba) ou o aviso de que não há contato;
// - o dono: "Editar", "Pausar" / "Ativar" e "Remover" (com confirmação).
// Fase 18B: quem compra escolhe a quantidade e adiciona ao carrinho, ou compra só este item ("Comprar agora",
// que abre o checkout sem mexer no carrinho, decisão D11).
export function ProdutoDetalheDialog({ produto: resumo, open, onOpenChange, onEditar }: Props) {
  const usuario = useAuthStore((s) => s.user);
  const { data: produto, error, mutate } = useSWR(chaveProduto(resumo.id), () => getProduto(resumo.id));
  const ehDono = usuario?.id === resumo.vendedor.id;

  const [ocupado, setOcupado] = useState<string | null>(null); // qual ação está em andamento
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoRemover, setConfirmandoRemover] = useState(false);
  const [quantidade, setQuantidade] = useState(1);
  const [comprando, setComprando] = useState(false);
  const adicionarAoCarrinho = useCarrinhoStore((s) => s.adicionar);

  function adicionar(p: ProdutoDetalhe) {
    if (!usuario) return;
    const capa = p.imagens[0]?.url ?? p.capaUrl;
    const final = adicionarAoCarrinho(usuario.id, { produtoId: p.id, vendedorId: p.vendedor.id, nome: p.nome, preco: p.preco, capaUrl: capa }, quantidade, p.estoque);
    toast.success("Adicionado ao carrinho", { description: `${p.nome}: ${final} no carrinho.` });
  }

  async function executar(acao: string, fazer: () => Promise<unknown>, sucesso: string) {
    setErro(null);
    setOcupado(acao);
    try {
      await fazer();
      await revalidarProdutos();
      toast.success(sucesso);
      return true;
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível concluir a ação."));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  // A aba abre já no clique (antes da resposta), senão o navegador bloqueia o pop-up. O telefone só
  // chega ao navegador aqui, dentro do link, e só se a pessoa pedir.
  async function falarComVendedor() {
    const aba = window.open("", "_blank");
    setErro(null);
    setOcupado("contato");
    try {
      const url = await getContato(resumo.id);
      if (aba) {
        aba.opener = null;
        aba.location.href = url;
      } else window.open(url, "_blank", "noopener");
    } catch (err) {
      aba?.close();
      setErro(getApiErrorMessage(err, "Não foi possível abrir o contato."));
    } finally {
      setOcupado(null);
    }
  }

  const carregando = (acao: string) => ocupado === acao && <FontAwesomeIcon icon={faCircleNotch} spin />;
  const descricao = [resumo.categoria, resumo.digital ? "Digital" : "Físico", ehDono && produto?.status === "Pausado" ? "Pausado" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ProfileDialog open={open && !comprando} onOpenChange={(o) => !ocupado && onOpenChange(o)} title={resumo.nome} description={descricao} error={erro}>
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-secondary text-[13px] text-muted-foreground">
              {getApiErrorMessage(error, "Não foi possível carregar o produto.") === "Produto não encontrado"
                ? "Este produto não está mais disponível."
                : "Não foi possível carregar o produto."}
            </p>
            <CtaButton onClick={() => mutate()} className="h-8 px-4">
              Tentar de novo
            </CtaButton>
          </div>
        ) : !produto ? (
          <div aria-busy className="flex animate-pulse flex-col gap-3">
            <span className="aspect-[4/3] w-full rounded-[10px] bg-foreground/10" />
            <span className="h-4 w-1/2 rounded bg-foreground/10" />
            <span className="h-3 w-full rounded bg-foreground/10" />
          </div>
        ) : (
          <>
            <Fotos produto={produto} />
            <div className="mt-4 flex items-center gap-2.5">
              <Avatar nome={produto.vendedor.fullName} src={produto.vendedor.urlPhoto} size={32} />
              <div className="min-w-0">
                <p className="truncate text-[14px] text-foreground">{ehDono ? "Você" : produto.vendedor.fullName}</p>
                <Reputacao reputacao={produto.vendedorReputacao} />
              </div>
            </div>
            <p className="mt-4 font-secondary text-[14px] leading-relaxed whitespace-pre-line text-foreground-secondary">{produto.descricao}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 font-secondary">
              <Info rotulo="Preço">{creditos(produto.preco)}</Info>
              <Info rotulo="Estoque">{estoque(produto.estoque)}</Info>
            </dl>

            {/* quem compra */}
            {!ehDono && (
              <div className="mt-5 border-t border-foreground/10 pt-4 font-secondary">
                {produto.estoque === 0 ? (
                  <p className="mb-4 text-[13px] text-muted-foreground">Esgotado: não dá para comprar agora.</p>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">Quantidade</span>
                      <div className="flex items-center gap-1" role="group" aria-label="Quantidade">
                        <button type="button" aria-label="Diminuir" disabled={quantidade <= 1} onClick={() => setQuantidade(quantidade - 1)} className={botaoIcone}>
                          <Minus size={15} aria-hidden />
                        </button>
                        <span className="w-7 text-center text-[14px] text-foreground tabular-nums">{quantidade}</span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          disabled={quantidade >= Math.min(produto.estoque, MAX_QUANTIDADE)}
                          onClick={() => setQuantidade(quantidade + 1)}
                          className={botaoIcone}
                        >
                          <Plus size={15} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => adicionar(produto)}
                        className="h-9 rounded-[6px] border border-accent/60 text-[13px] font-semibold text-accent-text transition-colors hover:bg-accent/10"
                      >
                        Adicionar ao carrinho
                      </button>
                      <CtaButton onClick={() => setComprando(true)} className="h-9">
                        Comprar agora
                      </CtaButton>
                    </div>
                  </div>
                )}
                {produto.contatoDisponivel ? (
                  <>
                    <CtaButton onClick={falarComVendedor} disabled={!!ocupado} className="flex h-9 w-full items-center justify-center gap-2">
                      {carregando("contato") || <FontAwesomeIcon icon={faWhatsapp} className="text-[15px]" />}
                      Falar com o vendedor
                    </CtaButton>
                    <p className="mt-2 text-center text-[12px] text-muted-foreground">O WhatsApp abre numa nova aba, com o número do vendedor.</p>
                  </>
                ) : (
                  <p className="text-[13px] text-muted-foreground">O vendedor não disponibilizou contato.</p>
                )}
              </div>
            )}

            {/* o dono */}
            {ehDono && (
              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-foreground/10 pt-4">
                {confirmandoRemover ? (
                  <>
                    <span className="mr-auto text-[13px] text-foreground-secondary">Remover este produto?</span>
                    <button type="button" onClick={() => setConfirmandoRemover(false)} disabled={!!ocupado} className={botaoSecundario}>
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await executar("remover", () => removerProduto(produto.id), "Produto removido")) onOpenChange(false);
                      }}
                      disabled={!!ocupado}
                      className="flex items-center gap-1.5 rounded-[6px] bg-danger-fill px-3 py-2 text-[13px] font-semibold text-danger-fill-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
                    >
                      {carregando("remover")}
                      Sim, remover
                    </button>
                  </>
                ) : (
                  <>
                    {onEditar && (
                      <button type="button" onClick={onEditar} disabled={!!ocupado} className={botaoSecundario}>
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        produto.status === "Ativo"
                          ? executar("status", () => atualizarProduto(produto.id, { status: "Pausado" }), "Produto pausado")
                          : executar("status", () => atualizarProduto(produto.id, { status: "Ativo" }), "Produto ativado")
                      }
                      disabled={!!ocupado}
                      className={cn(botaoSecundario, "flex items-center gap-1.5")}
                    >
                      {carregando("status")}
                      {produto.status === "Ativo" ? "Pausar" : "Ativar"}
                    </button>
                    <button type="button" onClick={() => setConfirmandoRemover(true)} disabled={!!ocupado} className={cn(botaoBase, "text-danger")}>
                      Remover
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </ProfileDialog>
      {comprando && produto && (
        <CheckoutDialog
          itens={[{ produto, quantidade: Math.min(quantidade, produto.estoque) }]}
          open
          onOpenChange={(o) => {
            setComprando(o);
            if (!o) void mutate();
          }}
          onDesatualizado={() => void mutate()}
        />
      )}
    </>
  );
}

export type ModalProduto = null | "detalhe" | "editar";

// Os dois modais de um produto, um de cada vez: o detalhe, e a edição que sai dele ("Editar")
export function ProdutoModais({ produto, modal, onModal }: { produto: ProdutoResumo; modal: ModalProduto; onModal: (m: ModalProduto) => void }) {
  const { data: detalhe } = useSWR(modal === "editar" ? chaveProduto(produto.id) : null, () => getProduto(produto.id));
  return (
    <>
      {modal === "detalhe" && (
        <ProdutoDetalheDialog produto={produto} open onOpenChange={(o) => !o && onModal(null)} onEditar={() => onModal("editar")} />
      )}
      {modal === "editar" && detalhe && <PublicarProdutoDialog produto={detalhe} open onOpenChange={(o) => !o && onModal(null)} />}
    </>
  );
}
