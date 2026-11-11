"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { DialogField, ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { getApiErrorMessage } from "@/lib/api";
import { atualizarProduto, criarProduto, revalidarProdutos, type FotoProduto } from "@/lib/produtos";
import { cn } from "@/lib/utils";
import { fieldErrors } from "@/lib/validation/auth";
import { erroDaFoto, MAX_FOTOS, produtoSchema, TIPOS_FOTO } from "@/lib/validation/produto";
import { useAuthStore } from "@/stores/auth-store";
import { CATEGORIAS_PRODUTO, type ProdutoDetalhe } from "@/types/produto";

// produto: editar esse produto (PATCH) em vez de publicar um novo
type Props = { open: boolean; onOpenChange: (open: boolean) => void; produto?: ProdutoDetalhe };

// uma foto do formulário: a que já existe (id) ou um arquivo novo; url é a do Cloudinary ou a prévia local (blob:)
type Foto = { chave: string; url: string } & ({ id: string } | { arquivo: File });

const campoClass =
  "mt-1 w-full border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground";
const botaoFoto =
  "flex size-5 items-center justify-center rounded-full bg-background/80 text-[10px] text-foreground transition-colors hover:bg-background disabled:opacity-40";

function Erro({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-[12px] text-danger">{children}</p> : null;
}

// Liga e desliga, com o trilho e a bolha do switch de tema da sidebar (sem as animações dele)
function Interruptor({ ligado, onChange, rotulo, disabled }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={disabled}
      onClick={() => onChange(!ligado)}
      className="relative h-[26px] w-[48px] shrink-0 rounded-full border border-glass-border bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[2px] left-[2px] size-5 rounded-full transition-transform motion-reduce:transition-none",
          ligado ? "translate-x-[22px] bg-accent shadow-(--glow-coin)" : "bg-foreground/30"
        )}
      />
    </button>
  );
}

// Publicar um produto (POST /produtos, multipart com as fotos) ou editar um (PATCH), na casca dos modais
// do Perfil. O pai monta o modal só enquanto aberto, então o formulário sempre começa vazio (ou do produto).
// Fotos: de 1 a 4, com prévia; a primeira é a capa; as setas trocam a ordem.
export function PublicarProdutoDialog({ open, onOpenChange, produto }: Props) {
  const temTelefone = useAuthStore((s) => !!s.user?.phone);
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    categoria: produto?.categoria ?? "",
    preco: produto?.preco.toString() ?? "",
    estoque: produto?.estoque.toString() ?? "1",
  });
  const [digital, setDigital] = useState(produto?.digital ?? false);
  const [whatsappAtivo, setWhatsappAtivo] = useState(produto ? produto.whatsappAtivo : temTelefone);
  const [fotos, setFotos] = useState<Foto[]>(() => produto?.imagens.map((i) => ({ chave: i.id, id: i.id, url: i.url })) ?? []);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  });

  // as prévias locais ocupam memória até serem revogadas: ao remover uma foto e ao fechar o modal
  const fotosRef = useRef(fotos);
  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);
  useEffect(() => () => fotosRef.current.forEach((f) => "arquivo" in f && URL.revokeObjectURL(f.url)), []);

  function adicionarFotos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(event.target.files ?? [])];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    const invalido = arquivos.map(erroDaFoto).find(Boolean);
    if (invalido) return setErros((e) => ({ ...e, fotos: invalido }));
    const cabem = arquivos.slice(0, MAX_FOTOS - fotos.length);
    setErros((e) => ({ ...e, fotos: cabem.length < arquivos.length ? `No máximo ${MAX_FOTOS} fotos.` : "" }));
    setFotos((atuais) => [...atuais, ...cabem.map((arquivo) => ({ chave: crypto.randomUUID(), arquivo, url: URL.createObjectURL(arquivo) }))]);
  }

  function removerFoto(chave: string) {
    const foto = fotos.find((f) => f.chave === chave);
    if (foto && "arquivo" in foto) URL.revokeObjectURL(foto.url);
    setFotos((atuais) => atuais.filter((f) => f.chave !== chave));
  }

  function moverFoto(indice: number, passo: -1 | 1) {
    setFotos((atuais) => {
      const nova = [...atuais];
      [nova[indice], nova[indice + passo]] = [nova[indice + passo], nova[indice]];
      return nova;
    });
  }

  async function publicar() {
    const parsed = produtoSchema.safeParse({ ...form, digital, whatsappAtivo });
    const novosErros = parsed.success ? {} : fieldErrors(parsed.error);
    if (fotos.length === 0) novosErros.fotos = "Adicione ao menos 1 foto.";
    setErros(novosErros);
    if (!parsed.success || fotos.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      if (produto) {
        // as fotos só vão (multipart) se mudaram: a ordem ou o conjunto
        const mudou = fotos.length !== produto.imagens.length || fotos.some((f, i) => !("id" in f) || f.id !== produto.imagens[i].id);
        const lista: FotoProduto[] = fotos.map((f) => ("id" in f ? { id: f.id } : { arquivo: f.arquivo }));
        // Fase 18B (decisão D6): o estoque só vai se mudou, com o valor lido ao abrir; se houve venda nesse meio-tempo,
        // o servidor responde 409 e nada é gravado
        const { estoque, ...campos } = parsed.data;
        const comEstoque = estoque !== produto.estoque ? { estoque, estoqueLido: produto.estoque } : {};
        await atualizarProduto(produto.id, { ...campos, ...comEstoque }, mudou ? lista : undefined);
        await revalidarProdutos();
        toast.success("Produto atualizado");
      } else {
        await criarProduto(parsed.data, fotos.flatMap((f) => ("arquivo" in f ? [f.arquivo] : [])));
        await revalidarProdutos();
        toast.success("Produto publicado", { description: "Ele já aparece em Produtos, na linha Seus produtos." });
      }
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, produto ? "Não foi possível salvar o produto." : "Não foi possível publicar o produto."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={produto ? "Editar produto" : "Publicar produto"}
      description={produto ? "As mudanças aparecem para os outros usuários assim que você salvar." : "O produto aparece para os outros usuários em Produtos."}
      error={error}
      saving={saving}
      onSubmit={publicar}
      submitLabel={produto ? "Salvar" : "Publicar"}
    >
      <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
        <div>
          <DialogField label="Nome" placeholder="ex: Pintura feita à mão" maxLength={80} autoFocus {...campo("nome")} />
          <Erro>{erros.nome}</Erro>
        </div>
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Descrição</span>
          <textarea rows={3} maxLength={1000} placeholder="Material, tamanho, como é entregue" className={`${campoClass} resize-none`} {...campo("descricao")} />
          <Erro>{erros.descricao}</Erro>
        </label>
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Categoria</span>
          <select className={`${campoClass} cursor-pointer`} {...campo("categoria")}>
            <option value="" disabled className="bg-background">
              Escolha
            </option>
            {CATEGORIAS_PRODUTO.map((c) => (
              <option key={c} value={c} className="bg-background">
                {c}
              </option>
            ))}
          </select>
          <Erro>{erros.categoria}</Erro>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DialogField label="Preço (créditos)" placeholder="ex: 50" inputMode="numeric" {...campo("preco")} />
            <Erro>{erros.preco}</Erro>
          </div>
          <div>
            <DialogField label="Estoque" inputMode="numeric" {...campo("estoque")} />
            <Erro>{erros.estoque}</Erro>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-[14px] text-foreground">
          <input type="checkbox" checked={digital} onChange={(e) => setDigital(e.target.checked)} className="size-4 accent-accent" />
          Produto digital (sem envio físico)
        </label>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] text-foreground">Receber contato pelo WhatsApp</span>
            <Interruptor ligado={whatsappAtivo} onChange={setWhatsappAtivo} rotulo="Receber contato pelo WhatsApp" disabled={!temTelefone} />
          </div>
          {!temTelefone && <p className="mt-1 text-[12px] text-muted-foreground">Adicione um telefone no seu perfil para receber contatos.</p>}
        </div>
        <div>
          <span className="text-[12px] text-muted-foreground">Fotos (1 a 4; a primeira é a capa)</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {fotos.map((foto, i) => (
              <li key={foto.chave} className="relative size-[72px] overflow-hidden rounded-[6px] bg-surface-2">
                {/* prévia local (blob:) não passa pelo otimizador do Next */}
                <Image src={foto.url} alt={`Foto ${i + 1}`} fill sizes="72px" unoptimized={"arquivo" in foto} className="object-cover" />
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-background/80 text-center text-[10px] text-foreground">Capa</span>}
                <div className="absolute inset-x-1 top-1 flex justify-between">
                  <span className="flex gap-0.5">
                    <button type="button" aria-label={`Mover a foto ${i + 1} para a esquerda`} disabled={i === 0} onClick={() => moverFoto(i, -1)} className={botaoFoto}>
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover a foto ${i + 1} para a direita`}
                      disabled={i === fotos.length - 1}
                      onClick={() => moverFoto(i, 1)}
                      className={botaoFoto}
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </span>
                  <button type="button" aria-label={`Remover a foto ${i + 1}`} onClick={() => removerFoto(foto.chave)} className={botaoFoto}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </li>
            ))}
            {fotos.length < MAX_FOTOS && (
              <li>
                <button
                  type="button"
                  onClick={() => arquivoRef.current?.click()}
                  className="flex size-[72px] flex-col items-center justify-center gap-1 rounded-[6px] border border-dashed border-field text-[11px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[14px]" />
                  Adicionar
                </button>
              </li>
            )}
          </ul>
          <input ref={arquivoRef} type="file" accept={TIPOS_FOTO.join(",")} multiple hidden aria-label="Escolher fotos" onChange={adicionarFotos} />
          <Erro>{erros.fotos}</Erro>
        </div>
      </div>
    </ProfileDialog>
  );
}
