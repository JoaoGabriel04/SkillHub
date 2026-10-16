// Movimentação de créditos (Fase 17C), como GET /creditos/extrato devolve
export type TipoTransacao = "Bônus" | "Reserva" | "Estorno" | "Recebimento" | "Taxa da plataforma";

export type Transacao = {
  id: string;
  tipo: TipoTransacao;
  valor: number; // positivo entra, negativo sai
  saldoApos: number;
  createdAt: string; // ISO
  servico: { id: string; titulo: string } | null; // null: sem pedido (bônus) ou pedido que não existe mais
};
