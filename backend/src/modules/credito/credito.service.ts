import type { Prisma, TipoTransacao } from "@prisma/client";
import { calcularTaxa } from "../../configs/creditos.js";
import { AppError } from "../../utils/AppError.js";
import creditoRepository from "./credito.repository.js";
import type { ExtratoInput } from "./credito.schema.js";

type Tx = Prisma.TransactionClient;
const ROTULO = { BONUS: "Bônus", RESERVA: "Reserva", ESTORNO: "Estorno", RECEBIMENTO: "Recebimento", TAXA: "Taxa da plataforma" } as const;

// O único jeito de mudar um saldo: atualiza User.credits e grava a linha do extrato com o saldo depois.
// Débito sem saldo: 409 "Créditos insuficientes", e a transação de quem chamou volta inteira.
async function movimentar(tx: Tx, userId: string, tipo: TipoTransacao, valor: number, servicoId: string | null) {
  if (valor === 0) return;
  if (valor < 0) {
    const { count } = await creditoRepository.debitar(tx, userId, -valor);
    if (count === 0) throw new AppError("Créditos insuficientes", 409);
  } else {
    await creditoRepository.creditar(tx, userId, valor);
  }
  const { credits } = await creditoRepository.saldo(tx, userId);
  await creditoRepository.registrar(tx, { userId, tipo, valor, saldoApos: credits, servicoId });
}

// valor reservado de um pedido (positivo), ou null se não houve reserva ("a combinar" sem proposta)
async function valorReservado(tx: Tx, servicoId: string) {
  const reserva = await creditoRepository.transacaoDoServico(tx, servicoId, "RESERVA");
  return reserva ? -reserva.valor : null;
}

const creditoService = {
  // aceitar uma candidatura (17B): o autor reserva o valor combinado
  reservar: (tx: Tx, servicoId: string, autorId: string, valor: number | null) =>
    valor === null ? Promise.resolve() : movimentar(tx, autorId, "RESERVA", -valor, servicoId),

  // concluir: o colaborador recebe a reserva; com taxa > 0, ela sai em seguida (sem linha TAXA com taxa 0)
  pagar: async (tx: Tx, servicoId: string, colaboradorId: string) => {
    const valor = await valorReservado(tx, servicoId);
    if (valor === null) return;
    const taxa = calcularTaxa(valor);
    await movimentar(tx, colaboradorId, "RECEBIMENTO", valor, servicoId);
    if (taxa > 0) await movimentar(tx, colaboradorId, "TAXA", -taxa, servicoId);
  },

  // cancelar um pedido em andamento: a reserva volta para o autor
  estornar: async (tx: Tx, servicoId: string, autorId: string) => {
    const valor = await valorReservado(tx, servicoId);
    if (valor !== null) await movimentar(tx, autorId, "ESTORNO", valor, servicoId);
  },

  // script administrativo (scripts/conceder-creditos.ts) e seed de desenvolvimento
  conceder: async (email: string, valor: number) => {
    if (!Number.isInteger(valor) || valor <= 0) throw new AppError("O valor precisa ser um inteiro maior que zero", 400);
    const usuario = await creditoRepository.usuarioPorEmail(email.toLowerCase());
    if (!usuario) throw new AppError(`Nenhum usuário com o e-mail ${email}`, 404);
    await creditoRepository.transacao((tx) => movimentar(tx, usuario.id, "BONUS", valor, null));
    const { credits } = await creditoRepository.transacao((tx) => creditoRepository.saldo(tx, usuario.id));
    return { saldo: credits };
  },

  jaRecebeuBonus: async (email: string) => {
    const usuario = await creditoRepository.usuarioPorEmail(email.toLowerCase());
    return !!usuario && (await creditoRepository.temBonus(usuario.id)) > 0;
  },

  extrato: async (userId: string, { limit, cursor }: ExtratoInput) => {
    const linhas = await creditoRepository.extrato(userId, limit, cursor);
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    const ids = [...new Set(pagina.map((t) => t.servicoId).filter((id): id is string => !!id))];
    const titulos = new Map((await creditoRepository.titulosDosServicos(ids)).map((s) => [s.id, s.titulo]));
    return {
      transacoes: pagina.map((t) => ({
        id: t.id,
        tipo: ROTULO[t.tipo],
        valor: t.valor,
        saldoApos: t.saldoApos,
        createdAt: t.createdAt.toISOString(),
        // pedido que não existe mais (autor excluído) aparece como null
        servico: t.servicoId && titulos.has(t.servicoId) ? { id: t.servicoId, titulo: titulos.get(t.servicoId)! } : null,
      })),
      nextCursor: temMais ? pagina[pagina.length - 1].id : null,
    };
  },
};

export default creditoService;
