import { toast } from "sonner";

// Aviso para ações cuja tela/endpoint ainda não existe (detalhes, notificações etc.)
export function emBreve(oQue = "Esta funcionalidade") {
  toast.info("Em breve", { description: `${oQue} ainda está sendo construída.`, id: "em-breve" });
}
