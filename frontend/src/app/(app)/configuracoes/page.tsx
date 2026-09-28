"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faKey, faUserXmark } from "@fortawesome/free-solid-svg-icons";
import { DeleteAccountDialog } from "@/components/app/delete-account-dialog";
import { PageTitle } from "@/components/app/page-title";
import { normalizar, SearchBar } from "@/components/app/search-bar";
import { ContentCard } from "@/components/ui/content-card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { emBreve } from "@/lib/em-breve";
import { useAuthStore } from "@/stores/auth-store";

type Item = { label: string; descricao: string; acao: () => void };

// designs/New Configurações.png — 7 itens em ContentCard. Funcionam hoje: Editar Perfil (vai para /perfil),
// Privacidade e Segurança (onde fica o "Excluir conta") e Sair; os demais avisam "em breve".
export default function ConfiguracoesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [busca, setBusca] = useState("");
  const [privacidadeOpen, setPrivacidadeOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);

  async function sair() {
    await api.post("/auth/logout").catch(() => {});
    useAuthStore.getState().clear();
    router.replace("/login");
  }

  const itens: Item[] = [
    { label: "Editar Perfil", descricao: "Dados pessoais, foto e currículo", acao: () => router.push("/perfil") },
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
            <button type="button" onClick={item.acao} className="group w-full text-left">
              <ContentCard className="flex h-[64px] items-center px-[19px] transition-colors group-hover:bg-white/[0.04] sm:h-[76px] sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-white sm:text-[17px]">{item.label}</p>
                  <p className="mt-[3px] truncate font-secondary text-[11px] text-[#9f9f9f] sm:mt-1 sm:text-[13px]">{item.descricao}</p>
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-[12px] text-[#9f9f9f] transition-transform group-hover:translate-x-0.5 group-hover:text-white sm:text-[14px]"
                />
              </ContentCard>
            </button>
          </li>
        ))}
        {visiveis.length === 0 && (
          <li className="mt-6 text-center font-secondary text-[13px] text-[#8a8a8a] sm:text-[15px]">Nenhuma configuração encontrada.</li>
        )}
      </ul>

      <Dialog open={privacidadeOpen} onOpenChange={setPrivacidadeOpen}>
        <DialogContent className="max-w-[400px] rounded-[24px] border border-white/[0.06] bg-[rgba(28,28,28,0.92)] p-6 ring-0 backdrop-blur-[20px] sm:max-w-[400px]">
          <DialogTitle className="text-[19px] font-bold text-white">Privacidade e Segurança</DialogTitle>
          <DialogDescription className="font-secondary text-[13px] text-[#9f9f9f]">
            Conectado como <span className="text-white">{user?.email}</span>
          </DialogDescription>
          <div className="mt-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => emBreve("A troca de senha")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-secondary text-sm text-white transition-colors hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faKey} className="w-4 text-[#9f9f9f]" />
              Alterar senha
              <span className="ml-auto text-[11px] text-[#8a8a8a]">em breve</span>
            </button>
            <div className="mx-3 my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                setPrivacidadeOpen(false);
                setExcluirOpen(true);
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-secondary text-sm text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10"
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
