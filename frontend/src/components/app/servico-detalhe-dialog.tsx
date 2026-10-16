"use client";

import { useState, type ReactNode } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/app/avatar";
import { Estrelas, SeletorEstrelas } from "@/components/app/estrelas";
import { ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { PublicarServicoDialog } from "@/components/app/publicar-servico-dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { getApiErrorMessage } from "@/lib/api";
import { avaliar, chaveAvaliacoesDoServico, getAvaliacoesDoServico } from "@/lib/avaliacoes";
import {
  aceitarCandidatura,
  candidatar,
  CHAVE_MINHAS_CANDIDATURAS,
  chaveCandidaturasDoServico,
  getCandidaturasDoServico,
  getMinhasCandidaturas,
  retirarCandidatura,
} from "@/lib/candidaturas";
import { atualizarUsuario } from "@/lib/creditos";
import { cancelarServico, chaveServico, concluirServico, getServico, revalidarServicos } from "@/lib/servicos";
import { cn } from "@/lib/utils";
import { fieldErrors } from "@/lib/validation/auth";
import { candidaturaSchema } from "@/lib/validation/candidatura";
import { useAuthStore } from "@/stores/auth-store";
import type { Avaliacao } from "@/types/avaliacao";
import type { AutorResumo, Servico } from "@/types/servico";

type Props = { servico: Servico; open: boolean; onOpenChange: (open: boolean) => void; onEditar?: () => void };

const campoClass =
  "mt-1 w-full border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground";
// base sem cor: o cn do projeto (pacote "cn") só junta classes, não resolve conflito de cor
const botaoBase = "rounded-[6px] px-3 py-2 text-[13px] transition-colors hover:bg-foreground/10 disabled:opacity-50";
const botaoSecundario = cn(botaoBase, "text-foreground-secondary hover:text-foreground");

const creditos = (n: number | null, vazio: string) => (n === null ? vazio : `${n} créditos`);
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "Sem prazo");

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-[14px] text-foreground">{children}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-foreground/10 pt-4">
      <h3 className="text-[14px] font-semibold text-foreground">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AvaliacaoFeita({ titulo, avaliacao }: { titulo: string; avaliacao: Avaliacao }) {
  return (
    <div className="font-secondary">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">{titulo}</span>
        <Estrelas nota={avaliacao.nota} />
      </div>
      {avaliacao.comentario && (
        <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-foreground-secondary">{avaliacao.comentario}</p>
      )}
    </div>
  );
}

// Fase 17D: num pedido concluído, cada parte avalia a outra uma vez e vê a avaliação que recebeu.
// outro = null: o colaborador excluiu a conta (não há quem avaliar).
function SecaoAvaliacao({ servicoId, usuarioId, outro }: { servicoId: string; usuarioId: string; outro: AutorResumo | null }) {
  const { data: avaliacoes } = useSWR(chaveAvaliacoesDoServico(servicoId), () => getAvaliacoesDoServico(servicoId));
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const minha = avaliacoes?.find((a) => a.avaliador?.id === usuarioId);
  const recebida = avaliacoes?.find((a) => a.avaliado.id === usuarioId);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      await avaliar(servicoId, { nota, comentario: comentario.trim() || null });
      // a seção e os cards ("Não avaliado" vira "Concluído" em Seus pedidos e Suas candidaturas)
      await Promise.all([mutate(chaveAvaliacoesDoServico(servicoId)), revalidarServicos()]);
      toast.success("Avaliação enviada");
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível enviar a avaliação."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Secao titulo="Avaliação">
      {!avaliacoes ? (
        <p className="text-[13px] text-muted-foreground">Carregando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {minha ? (
            <AvaliacaoFeita titulo="Sua avaliação" avaliacao={minha} />
          ) : !outro ? (
            <p className="font-secondary text-[13px] text-muted-foreground">O colaborador excluiu a conta.</p>
          ) : (
            // div, não <form>: o ProfileDialog já envolve o conteúdo num <form>
            <div className="flex flex-col gap-3 font-secondary">
              <p className="text-[13px] text-foreground-secondary">Como foi trabalhar com {outro.fullName}?</p>
              <SeletorEstrelas value={nota} onChange={setNota} rotulo={`Nota para ${outro.fullName}`} />
              <label className="block">
                <span className="text-[12px] text-muted-foreground">Comentário (opcional)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Conte como foi o serviço"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className={`${campoClass} resize-none`}
                />
              </label>
              {erro && (
                <p role="alert" className="text-[12px] text-danger">
                  {erro}
                </p>
              )}
              <div className="flex justify-end">
                <CtaButton onClick={enviar} disabled={!nota || enviando} className="flex h-9 items-center gap-1.5 px-4">
                  {enviando && <FontAwesomeIcon icon={faCircleNotch} spin />}
                  Enviar avaliação
                </CtaButton>
              </div>
            </div>
          )}
          {recebida && <AvaliacaoFeita titulo={`Avaliação de ${recebida.avaliador?.fullName ?? "Usuário removido"}`} avaliacao={recebida} />}
        </div>
      )}
    </Secao>
  );
}

// Detalhe de um pedido (o "Saiba Mais" dos cards, Fase 17B). O que aparece depende de quem abre:
// - o autor: candidaturas com "Aceitar"; em andamento, o colaborador e "Marcar como concluído";
//   "Editar" (aberto) e "Cancelar pedido" (aberto ou em andamento, com confirmação);
// - um Colaborador: "Candidatar-se" (mensagem e valor opcional) ou o status da candidatura, com "Retirar";
// - os outros perfis: o aviso de que só colaboradores se candidatam.
export function ServicoDetalheDialog({ servico: inicial, open, onOpenChange, onEditar }: Props) {
  const usuario = useAuthStore((s) => s.user);
  const { data: servico = inicial } = useSWR(chaveServico(inicial.id), () => getServico(inicial.id), { fallbackData: inicial });
  const ehAutor = usuario?.id === servico.autor.id;
  const ehColaborador = usuario?.perfil === "Colaborador";
  // em andamento, a lista ainda serve para saber o valor da candidatura aceita (o reservado, Fase 17C)
  const candidaturas = useSWR(
    ehAutor && (servico.status === "Aberto" || servico.status === "Em andamento") ? chaveCandidaturasDoServico(servico.id) : null,
    () => getCandidaturasDoServico(servico.id)
  );
  const aceita = candidaturas.data?.find((c) => c.status === "Aceita");
  // valor combinado: o proposto pela candidatura ou, sem proposta, a remuneração do pedido (null = sem créditos)
  const valorCombinado = (valorProposto: number | null) => valorProposto ?? servico.remuneracao;
  const minhas = useSWR(!ehAutor && ehColaborador ? CHAVE_MINHAS_CANDIDATURAS : null, getMinhasCandidaturas);
  const minha = minhas.data?.find((c) => c.servico.id === servico.id);

  const [ocupado, setOcupado] = useState<string | null>(null); // qual ação está em andamento
  const [erro, setErro] = useState<string | null>(null);
  const [candidatando, setCandidatando] = useState(false);
  const [form, setForm] = useState({ mensagem: "", valorProposto: "" });
  const [errosForm, setErrosForm] = useState<Record<string, string>>({});
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  async function executar(acao: string, fazer: () => Promise<unknown>, sucesso: string) {
    setErro(null);
    setOcupado(acao);
    try {
      await fazer();
      // aceitar, concluir e cancelar mexem em créditos: o saldo do chip e da sidebar é relido junto
      await Promise.all([revalidarServicos(), atualizarUsuario()]);
      toast.success(sucesso);
      return true;
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível concluir a ação."));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  async function enviarCandidatura() {
    const parsed = candidaturaSchema.safeParse(form);
    if (!parsed.success) return setErrosForm(fieldErrors(parsed.error));
    setErrosForm({});
    if (await executar("candidatar", () => candidatar(servico.id, parsed.data), "Candidatura enviada")) setCandidatando(false);
  }

  const carregando = (acao: string) => ocupado === acao && <FontAwesomeIcon icon={faCircleNotch} spin />;

  return (
    <ProfileDialog
      open={open}
      onOpenChange={(o) => !ocupado && onOpenChange(o)}
      title={servico.titulo}
      description={`${servico.categoria} · ${servico.status}`}
      error={erro}
    >
      <div className="flex items-center gap-2.5">
        <Avatar nome={servico.autor.fullName} src={servico.autor.urlPhoto} size={32} />
        <span className="text-[14px] text-foreground">{ehAutor ? "Você" : servico.autor.fullName}</span>
      </div>
      <p className="mt-4 font-secondary text-[14px] leading-relaxed whitespace-pre-line text-foreground-secondary">{servico.descricao}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 font-secondary">
        <Info rotulo="Remuneração">{creditos(servico.valorCombinado, "A combinar")}</Info>
        <Info rotulo="Prazo">{data(servico.prazo)}</Info>
      </dl>

      {/* o autor */}
      {ehAutor && servico.status === "Aberto" && (
        <Secao titulo="Candidaturas">
          {!candidaturas.data ? (
            <p className="text-[13px] text-muted-foreground">Carregando…</p>
          ) : candidaturas.data.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Ainda não há candidaturas.</p>
          ) : (
            <ul className="flex max-h-[240px] flex-col gap-3 overflow-y-auto pr-1">
              {candidaturas.data.map((c) => (
                <li key={c.id} className="rounded-[10px] bg-foreground/[0.05] px-3 py-2.5 font-secondary">
                  <div className="flex items-center gap-2">
                    <Avatar nome={c.colaborador.fullName} src={c.colaborador.urlPhoto} size={26} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{c.colaborador.fullName}</span>
                    {c.status === "Pendente" ? (
                      <CtaButton
                        onClick={() => executar(`aceitar-${c.id}`, () => aceitarCandidatura(c.id), `Você aceitou ${c.colaborador.fullName}`)}
                        disabled={!!ocupado}
                        className="flex h-7 shrink-0 items-center gap-1.5 px-3"
                      >
                        {carregando(`aceitar-${c.id}`)}
                        Aceitar
                      </CtaButton>
                    ) : (
                      <span className="shrink-0 text-[12px] text-muted-foreground">{c.status}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] text-foreground-secondary">{c.mensagem}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {c.valorProposto === null ? "Aceita a remuneração do pedido" : `Propõe ${c.valorProposto} créditos`}
                  </p>
                  {c.status === "Pendente" && (
                    <p className="mt-0.5 text-[12px] text-accent-text">
                      {valorCombinado(c.valorProposto) === null
                        ? "Aceitar não reserva créditos (a combinar)"
                        : `Aceitar reserva ${valorCombinado(c.valorProposto)} créditos do seu saldo`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Secao>
      )}
      {ehAutor && servico.status === "Em andamento" && (
        <Secao titulo="Em andamento">
          {aceita && (
            <p className="mb-3 font-secondary text-[12px] text-muted-foreground">
              {valorCombinado(aceita.valorProposto) === null
                ? "Sem créditos reservados (a combinar)."
                : `${valorCombinado(aceita.valorProposto)} créditos reservados do seu saldo: vão para o colaborador ao concluir, ou voltam para você se cancelar.`}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {servico.colaborador ? (
                <>
                  <Avatar nome={servico.colaborador.fullName} src={servico.colaborador.urlPhoto} size={26} />
                  <span className="text-[13px] text-foreground">{servico.colaborador.fullName}</span>
                </>
              ) : (
                <span className="text-[13px] text-muted-foreground">O colaborador excluiu a conta.</span>
              )}
            </div>
            <CtaButton
              onClick={() => executar("concluir", () => concluirServico(servico.id), "Pedido concluído")}
              disabled={!!ocupado}
              className="flex h-8 items-center gap-1.5 px-3"
            >
              {carregando("concluir")}
              Marcar como concluído
            </CtaButton>
          </div>
        </Secao>
      )}
      {ehAutor && (servico.status === "Aberto" || servico.status === "Em andamento") && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-foreground/10 pt-4">
          {confirmandoCancelar ? (
            <>
              <span className="mr-auto text-[13px] text-foreground-secondary">Cancelar este pedido?</span>
              <button type="button" onClick={() => setConfirmandoCancelar(false)} disabled={!!ocupado} className={botaoSecundario}>
                Voltar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (await executar("cancelar", () => cancelarServico(servico.id), "Pedido cancelado")) onOpenChange(false);
                }}
                disabled={!!ocupado}
                className="flex items-center gap-1.5 rounded-[6px] bg-danger-fill px-3 py-2 text-[13px] font-semibold text-danger-fill-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
              >
                {carregando("cancelar")}
                Sim, cancelar
              </button>
            </>
          ) : (
            <>
              {servico.status === "Aberto" && onEditar && (
                <button type="button" onClick={onEditar} className={botaoSecundario}>
                  Editar
                </button>
              )}
              <button type="button" onClick={() => setConfirmandoCancelar(true)} className={cn(botaoBase, "text-danger")}>
                Cancelar pedido
              </button>
            </>
          )}
        </div>
      )}

      {/* quem não é o autor */}
      {!ehAutor && !ehColaborador && (
        <p className="mt-5 border-t border-foreground/10 pt-4 font-secondary text-[13px] text-muted-foreground">
          Só colaboradores podem se candidatar a pedidos.
        </p>
      )}
      {!ehAutor && ehColaborador && (
        <Secao titulo="Sua candidatura">
          {minhas.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Carregando…</p>
          ) : minha ? (
            <div className="flex flex-wrap items-center justify-between gap-3 font-secondary">
              <p className="text-[13px] text-foreground-secondary">
                Candidatura <strong className="text-accent-text">{minha.status.toLowerCase()}</strong>
              </p>
              {minha.status === "Pendente" && (
                <button
                  type="button"
                  onClick={() => executar("retirar", () => retirarCandidatura(minha.id), "Candidatura retirada")}
                  disabled={!!ocupado}
                  className={cn(botaoSecundario, "flex items-center gap-1.5")}
                >
                  {carregando("retirar")}
                  Retirar candidatura
                </button>
              )}
            </div>
          ) : servico.status !== "Aberto" ? (
            <p className="text-[13px] text-muted-foreground">Este pedido não está mais aberto.</p>
          ) : candidatando ? (
            // div, não <form>: o ProfileDialog já envolve o conteúdo num <form> (form dentro de form é inválido)
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-[12px] text-muted-foreground">Mensagem para quem publicou</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  autoFocus
                  placeholder="Conte por que você é a pessoa certa e quando pode fazer"
                  value={form.mensagem}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                  className={`${campoClass} resize-none`}
                />
                {errosForm.mensagem && <p className="mt-1 text-[12px] text-danger">{errosForm.mensagem}</p>}
              </label>
              <label className="block">
                <span className="text-[12px] text-muted-foreground">Valor proposto (créditos, opcional)</span>
                <input
                  inputMode="numeric"
                  placeholder={creditos(servico.remuneracao, "A combinar")}
                  value={form.valorProposto}
                  onChange={(e) => setForm((f) => ({ ...f, valorProposto: e.target.value }))}
                  className={campoClass}
                />
                {errosForm.valorProposto && <p className="mt-1 text-[12px] text-danger">{errosForm.valorProposto}</p>}
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCandidatando(false)} disabled={!!ocupado} className={botaoSecundario}>
                  Voltar
                </button>
                <CtaButton onClick={enviarCandidatura} disabled={!!ocupado} className="flex h-9 items-center gap-1.5 px-4">
                  {carregando("candidatar")}
                  Enviar candidatura
                </CtaButton>
              </div>
            </div>
          ) : (
            <CtaButton onClick={() => setCandidatando(true)} className="h-9 w-full">
              Candidatar-se
            </CtaButton>
          )}
        </Secao>
      )}

      {/* as duas partes de um pedido concluído (Fase 17D) */}
      {usuario && servico.status === "Concluído" && (ehAutor || servico.colaborador?.id === usuario.id) && (
        <SecaoAvaliacao servicoId={servico.id} usuarioId={usuario.id} outro={ehAutor ? servico.colaborador : servico.autor} />
      )}
    </ProfileDialog>
  );
}

export type ModalServico = null | "detalhe" | "editar";

// Os dois modais de um pedido, um de cada vez: o detalhe, e a edição que sai dele ("Editar")
export function ServicoModais({ servico, modal, onModal }: { servico: Servico; modal: ModalServico; onModal: (m: ModalServico) => void }) {
  return (
    <>
      {modal === "detalhe" && (
        <ServicoDetalheDialog servico={servico} open onOpenChange={(o) => !o && onModal(null)} onEditar={() => onModal("editar")} />
      )}
      {modal === "editar" && <PublicarServicoDialog servico={servico} open onOpenChange={(o) => !o && onModal(null)} />}
    </>
  );
}
