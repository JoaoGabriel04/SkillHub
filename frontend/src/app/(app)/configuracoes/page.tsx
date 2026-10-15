"use client";

import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faKey, faUserXmark } from "@fortawesome/free-solid-svg-icons";
import { DeleteAccountDialog } from "@/components/app/delete-account-dialog";
import { PageTitle } from "@/components/app/page-title";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { usePageTransition } from "@/components/motion/page-transition";
import { SeletorTema, useDescricaoTema } from "@/components/tema/seletor-tema";
import { ContentCard } from "@/components/ui/content-card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLogout } from "@/hooks/use-logout";
import { emBreve } from "@/lib/em-breve";
import { useAuthStore } from "@/stores/auth-store";

// origem: o botão clicado (a transição de página nasce dele). "Aparência" não é botão: tem o seletor de tema.
type Item = { label: string; descricao: string } & ({ acao: (origem: HTMLElement) => void } | { aparencia: true });

// designs/New Configurações.png — 7 itens em ContentCard, mais "Aparência" (Fase 16.4). Funcionam hoje: Editar Perfil
// (vai para /perfil), Aparência (tema), Privacidade e Segurança (onde fica o "Excluir conta") e Sair; os demais avisam "em breve".
export default function ConfiguracoesPage() {
  const { navigate } = usePageTransition();
  const user = useAuthStore((s) => s.user);
  const [busca, setBusca] = useState("");
  const [privacidadeOpen, setPrivacidadeOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const sair = useLogout();
  const rotuloAparencia = useId();
  const descricaoTema = useDescricaoTema();

  const itens: Item[] = [
    { label: "Editar Perfil", descricao: "Dados pessoais, foto e currículo", acao: (origem) => navigate("/perfil", { origin: origem }) },
    { label: "Aparência", descricao: "Tema claro, escuro ou do sistema", aparencia: true },
    { label: "Notificações", descricao: "Preferências de alertas e e-mails", acao: () => emBreve("As notificações") },
    { label: "Privacidade e Segurança", descricao: "Senha, sessões e dados da conta", acao: () => setPrivacidadeOpen(true) },
    { label: "Créditos e Pagamentos", descricao: "Histórico e formas de pagamento", acao: () => emBreve("Créditos e Pagamentos") },
    { label: "Ajuda e Suporte", descricao: "Central de ajuda e contato", acao: () => emBreve("A central de ajuda") },
    { label: "Sobre o SkillHub", descricao: "Versão e termos de uso", acao: () => emBreve("A página Sobre o SkillHub") },
    { label: "Sair", descricao: "Encerrar sessão nesse dispositivo", acao: sair },
  ];

  const termo = normalizar(busca);
  const visiveis = itens.filter((item) => !termo || normalizar(`${item.label} ${item.descricao}`).includes(termo));

  return (
    <main className="mx-auto max-w-[760px] pb-4">
      <PageTitle>Configurações</PageTitle>
      <SearchBar value={busca} onChange={setBusca} placeholder="ex: Tema Escuro" label="Buscar configurações" className="mt-[33px] sm:mt-8" />

      <ul className="mt-[25px] flex flex-col gap-[14px] sm:mt-8 sm:gap-4">
        {visiveis.map((item) => (
          <li key={item.label}>
            {"aparencia" in item ? (
              <ContentCard className="flex flex-col gap-3 px-[19px] py-[14px] sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4">
                <div className="min-w-0 flex-1">
                  <p id={rotuloAparencia} className="text-[15px] text-foreground sm:text-[17px]">
                    {item.label}
                  </p>
                  <p className="mt-[3px] font-secondary text-[11px] text-muted-foreground sm:mt-1 sm:text-[13px]">
                    {item.descricao}. {descricaoTema}
                  </p>
                </div>
                <SeletorTema rotuloId={rotuloAparencia} />
              </ContentCard>
            ) : (
              <button type="button" onClick={(e) => item.acao(e.currentTarget)} className="group w-full text-left">
                <ContentCard className="flex h-[64px] items-center px-[19px] transition-colors group-hover:bg-foreground/[0.04] sm:h-[76px] sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-foreground sm:text-[17px]">{item.label}</p>
                    <p className="mt-[3px] truncate font-secondary text-[11px] text-muted-foreground sm:mt-1 sm:text-[13px]">{item.descricao}</p>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="text-[12px] text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:text-[14px]"
                  />
                </ContentCard>
              </button>
            )}
          </li>
        ))}
        {visiveis.length === 0 && (
          <li className="mt-6 text-center font-secondary text-[13px] text-muted-foreground sm:text-[15px]">Nenhuma configuração encontrada.</li>
        )}
      </ul>

      <Dialog open={privacidadeOpen} onOpenChange={setPrivacidadeOpen}>
        <DialogContent className="max-w-[400px] rounded-[24px] border border-glass-strong-border bg-glass-strong p-6 ring-0 backdrop-blur-[20px] sm:max-w-[400px]">
          <DialogTitle className="text-[19px] font-bold text-foreground">Privacidade e Segurança</DialogTitle>
          <DialogDescription className="font-secondary text-[13px] text-muted-foreground">
            Conectado como <span className="text-foreground">{user?.email}</span>
          </DialogDescription>
          <div className="mt-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => emBreve("A troca de senha")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-secondary text-sm text-foreground transition-colors hover:bg-foreground/10"
            >
              <FontAwesomeIcon icon={faKey} className="w-4 text-muted-foreground" />
              Alterar senha
              <span className="ml-auto text-[11px] text-muted-foreground">em breve</span>
            </button>
            <div className="mx-3 my-1 border-t border-foreground/10" />
            <button
              type="button"
              onClick={() => {
                setPrivacidadeOpen(false);
                setExcluirOpen(true);
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-secondary text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <FontAwesomeIcon icon={faUserXmark} className="w-4" />
              Excluir conta
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {excluirOpen && user && <DeleteAccountDialog user={user} onClose={() => setExcluirOpen(false)} />}
    </main>
  );
}
