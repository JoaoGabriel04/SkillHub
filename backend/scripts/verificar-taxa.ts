// Teste da taxa da plataforma (faxina antes da Fase 18), chamado pelo e2e. O backend do compose roda com taxa 0;
// este processo roda com a taxa e uma conta da plataforma de teste só nele, e chama os services direto, sem HTTP:
//
//   docker compose exec -e PLATFORM_FEE_PERCENT=15 -e PLATFORM_ACCOUNT_ID=<uuid> -e PLATFORM_ACCOUNT_EMAIL=e2e.plataforma@example.com \
//     backend npx tsx scripts/verificar-taxa.ts
//
// Imprime na última linha um JSON com os resultados ({ nome, ok, info }[]). Apaga o que criou (e-mails e2e.*).
import "dotenv/config";
import prisma from "../src/configs/prisma.js";
import { contaPlataforma, taxaPercentual } from "../src/configs/creditos.js";
import candidaturaService from "../src/modules/candidatura/candidatura.service.js";
import { candidatarSchema } from "../src/modules/candidatura/candidatura.schema.js";
import creditoRepository from "../src/modules/credito/credito.repository.js";
import creditoService from "../src/modules/credito/credito.service.js";
import { garantirContaPlataforma } from "../src/modules/credito/plataforma.js";
import servicoService from "../src/modules/servico/servico.service.js";
import { criarServicoSchema } from "../src/modules/servico/servico.schema.js";

const plataforma = contaPlataforma();
// nunca mexe na conta da plataforma real nem roda com outra taxa
if (taxaPercentual() !== 15 || !plataforma.email.startsWith("e2e.")) {
  console.error("Rode com PLATFORM_FEE_PERCENT=15 e uma conta da plataforma de teste (PLATFORM_ACCOUNT_EMAIL=e2e.*).");
  process.exit(2);
}

const resultados: { nome: string; ok: boolean; info?: string }[] = [];
const ok = (nome: string, cond: boolean, info?: unknown) => resultados.push({ nome, ok: cond, info: info === undefined ? undefined : String(info) });
const EMAILS = ["e2e.taxa.autor@example.com", "e2e.taxa.colab@example.com", plataforma.email];

const saldo = creditoRepository.saldoAtual;
// extrato x saldo: soma das movimentações e último saldoApos batem com o saldo
async function extratoBate(id: string) {
  const linhas = await prisma.transacaoCredito.findMany({ where: { userId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const s = await saldo(id);
  return linhas.reduce((t, l) => t + l.valor, 0) === s && (linhas.at(-1)?.saldoApos ?? 0) === s;
}
// Na reserva o crédito sai do autor e fica preso no pedido em andamento até concluir (vai ao colaborador e à plataforma)
// ou cancelar (volta ao autor). O que se conserva é a soma dos saldos mais as reservas em aberto.
async function total() {
  const emAndamento = (await prisma.servico.findMany({ where: { status: "EM_ANDAMENTO" }, select: { id: true } })).map((p) => p.id);
  const reservas = await prisma.transacaoCredito.aggregate({ where: { tipo: "RESERVA", servicoId: { in: emAndamento } }, _sum: { valor: true } });
  return (await creditoRepository.somaDosSaldos()) - (reservas._sum.valor ?? 0);
}
const linhasDoPedido = async (servicoId: string) =>
  (await prisma.transacaoCredito.findMany({ where: { servicoId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }))
    .map((t) => `${t.tipo} ${t.valor > 0 ? "+" : ""}${t.valor} ${t.userId === plataforma.id ? "plataforma" : t.userId}`);

async function contratar(autorId: string, colabId: string, remuneracao: number) {
  const { id } = await servicoService.criar(
    autorId,
    criarServicoSchema.parse({ titulo: "Pedido da taxa E2E", descricao: "Pedido de teste da taxa da plataforma", categoria: "Tecnologia", remuneracao })
  );
  const c = await candidaturaService.candidatar(id, colabId, candidatarSchema.parse({ mensagem: "Posso fazer isso nesta semana." }));
  await candidaturaService.aceitar(c.id, autorId);
  return id;
}

try {
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } }); // sobras de uma execução interrompida
  await garantirContaPlataforma();
  const [autor, colab] = await Promise.all(
    [["e2e.taxa.autor@example.com", "Taxa autor E2E", "Cliente"], ["e2e.taxa.colab@example.com", "Taxa colab E2E", "Colaborador"]].map(([email, fullName, perfil]) =>
      prisma.user.create({ data: { email, fullName, perfil, profileComplete: true }, select: { id: true } })
    )
  );
  await creditoService.conceder("e2e.taxa.autor@example.com", 200);

  // 15% de 99 = 14,85 → 14 (para baixo, a favor de quem recebe)
  const soma0 = await total();
  const p99 = await contratar(autor.id, colab.id, 99);
  const soma1 = await total();
  await servicoService.concluir(p99, autor.id);
  const soma2 = await total();
  const linhas = await linhasDoPedido(p99);
  ok("taxa 15%: RESERVA -99, RECEBIMENTO +99, TAXA -14 e TAXA_RECEBIDA +14 na plataforma",
    linhas.join(", ") === `RESERVA -99 ${autor.id}, RECEBIMENTO +99 ${colab.id}, TAXA -14 ${colab.id}, TAXA_RECEBIDA +14 plataforma`, linhas.join(", "));
  ok("taxa 15%: colaborador com 85, plataforma com 14 e autor com 101",
    (await saldo(colab.id)) === 85 && (await saldo(plataforma.id)) === 14 && (await saldo(autor.id)) === 101);

  // estorno: a reserva volta inteira, sem taxa
  const p50 = await contratar(autor.id, colab.id, 50);
  const soma3 = await total();
  await servicoService.cancelar(p50, autor.id);
  const soma4 = await total();
  ok("taxa 15%: cancelar em andamento estorna inteiro, sem linha de taxa",
    (await linhasDoPedido(p50)).join(", ") === `RESERVA -50 ${autor.id}, ESTORNO +50 ${autor.id}` && (await saldo(autor.id)) === 101);
  ok("taxa 15%: saldos (com a plataforma) mais reservas em aberto não mudam ao reservar, concluir e estornar",
    new Set([soma0, soma1, soma2, soma3, soma4]).size === 1, [soma0, soma1, soma2, soma3, soma4].join(" "));
  ok("taxa 15%: extrato x saldo bate para o autor, o colaborador e a plataforma",
    (await extratoBate(autor.id)) && (await extratoBate(colab.id)) && (await extratoBate(plataforma.id)));

  // sem a conta da plataforma, o concluir falha e volta inteiro
  const pSem = await contratar(autor.id, colab.id, 20);
  await prisma.user.delete({ where: { id: plataforma.id } });
  const colabAntes = await saldo(colab.id);
  const erro = await servicoService.concluir(pSem, autor.id).then(() => null, (e: Error) => e.message);
  const status = (await prisma.servico.findUniqueOrThrow({ where: { id: pSem }, select: { status: true } })).status;
  ok("taxa 15%: sem a conta da plataforma, concluir falha e nada muda",
    erro === "Conta da plataforma ausente; rode npm run plataforma:garantir" && status === "EM_ANDAMENTO" &&
      (await saldo(colab.id)) === colabAntes && (await linhasDoPedido(pSem)).length === 1, `${erro} | ${status}`);
} catch (err) {
  ok("taxa 15%: o script rodou sem erro", false, err instanceof Error ? err.message : err);
} finally {
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.$disconnect();
}
console.log(JSON.stringify(resultados));
