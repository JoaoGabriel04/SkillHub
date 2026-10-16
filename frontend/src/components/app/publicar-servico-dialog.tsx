"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DialogField, ProfileDialog } from "@/components/app/perfil/profile-dialog";
import { getApiErrorMessage } from "@/lib/api";
import { criarServico, revalidarServicos } from "@/lib/servicos";
import { fieldErrors } from "@/lib/validation/auth";
import { novoServicoSchema } from "@/lib/validation/servico";
import { CATEGORIAS_SERVICO } from "@/types/servico";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const campoClass =
  "mt-1 w-full border-b border-field bg-transparent pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground";

function Erro({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-[12px] text-danger">{children}</p> : null;
}

// Publicar um pedido de serviço (POST /servicos), na casca dos modais do Perfil.
// O pai monta o modal só enquanto aberto, então o formulário sempre começa vazio.
export function PublicarServicoDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "", remuneracao: "", prazo: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  });

  async function publicar() {
    const parsed = novoServicoSchema.safeParse(form);
    if (!parsed.success) return setErros(fieldErrors(parsed.error));
    setErros({});
    setError(null);
    setSaving(true);
    try {
      await criarServico(parsed.data);
      await revalidarServicos();
      toast.success("Pedido publicado", { description: "Ele já aparece em Serviços, na linha Seus pedidos." });
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível publicar o pedido."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publicar pedido"
      description="Descreva o serviço de que você precisa. O pedido aparece para os outros usuários em Serviços."
      error={error}
      saving={saving}
      onSubmit={publicar}
      submitLabel="Publicar"
    >
      <div className="flex flex-col gap-5">
        <div>
          <DialogField label="Título" placeholder="ex: Aula de reforço de matemática" maxLength={80} autoFocus {...campo("titulo")} />
          <Erro>{erros.titulo}</Erro>
        </div>
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Descrição</span>
          <textarea rows={3} maxLength={1000} placeholder="O que precisa ser feito, quando e onde" className={`${campoClass} resize-none`} {...campo("descricao")} />
          <Erro>{erros.descricao}</Erro>
        </label>
        <label className="block">
          <span className="text-[12px] text-muted-foreground">Categoria</span>
          <select className={`${campoClass} cursor-pointer`} {...campo("categoria")}>
            <option value="" disabled className="bg-background">
              Escolha
            </option>
            {CATEGORIAS_SERVICO.map((c) => (
              <option key={c} value={c} className="bg-background">
                {c}
              </option>
            ))}
          </select>
          <Erro>{erros.categoria}</Erro>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DialogField label="Remuneração (créditos)" placeholder="A combinar" inputMode="numeric" {...campo("remuneracao")} />
            <Erro>{erros.remuneracao}</Erro>
          </div>
          <div>
            <DialogField label="Prazo" type="date" {...campo("prazo")} />
            <Erro>{erros.prazo}</Erro>
          </div>
        </div>
      </div>
    </ProfileDialog>
  );
}
