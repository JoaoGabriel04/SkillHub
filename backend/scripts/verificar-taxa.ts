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
import pedidoService from "../src/modules/pedido/pedido.service.js";
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
const EMAILS = ["e2e.taxa.autor@example.com", "e2e.taxa.colab@example.com", "e2e.taxa.vendedor2@example.com", plataforma.email];

const saldo = creditoRepository.saldoAtual;
// extrato x saldo: soma das movimentações e último saldoApos batem com o saldo
async function extratoBate(id: string) {
  const linhas = await prisma.transacaoCredito.findMany({ where: { userId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const s = await saldo(id);
  return linhas.reduce((t, l) => t + l.valor, 0) === s && (linhas.at(-1)?.saldoApos ?? 0) === s;
}
// Na reserva o crédito sai do autor e fica preso no pedido em andamento até concluir (vai ao colaborador e à plataforma)
// ou cancelar (volta ao autor). O que se conserva é a soma dos saldos mais as reservas em aberto: as de serviço
// EM_ANDAMENTO e, desde a 18B, as de pedido de produto AGUARDANDO_ENVIO ou ENVIADO.
async function total() {
  const emAndamento = (await prisma.servico.findMany({ where: { status: "EM_ANDAMENTO" }, select: { id: true } })).map((p) => p.id);
  const pedidosAbertos = (await prisma.pedidoProduto.findMany({ where: { status: { in: ["AGUARDANDO_ENVIO", "ENVIADO"] } }, select: { id: true } })).map((p) => p.id);
  const reservas = await prisma.transacaoCredito.aggregate({
    where: { tipo: "RESERVA", OR: [{ servicoId: { in: emAndamento } }, { pedidoId: { in: pedidosAbertos } }] },
    _sum: { valor: true },
  });
  return (await creditoRepository.somaDosSaldos()) - (reservas._sum.valor ?? 0);
}
const linhasDoPedidoProduto = async (pedidoId: string) =>
  (await prisma.transacaoCredito.findMany({ where: { pedidoId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }))
    .map((t) => `${t.tipo} ${t.valor > 0 ? "+" : ""}${t.valor} ${t.userId === plataforma.id ? "plataforma" : t.userId}`);
const produto = (vendedorId: string, nome: string, preco: number) =>
  prisma.produto.create({ data: { nome, descricao: "Produto do teste da taxa", categoria: "ARTE_DECORACAO", preco, estoque: 10, vendedorId }, select: { id: true } });
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

  // --- Fase 18B: pedidos de produto, com a taxa calculada sobre o total do pedido
  const vend2 = await prisma.user.create({ data: { email: "e2e.taxa.vendedor2@example.com", fullName: "Taxa vendedor E2E", perfil: "Empresa", profileComplete: true }, select: { id: true } });
  await creditoService.conceder("e2e.taxa.autor@example.com", 500); // os pedidos somam 199 (o autor tem 101 depois dos serviços)
  const plat0 = await saldo(plataforma.id), colab0 = await saldo(colab.id);
  const somaP0 = await total();
  const prod99 = await produto(colab.id, "Produto da taxa 99", 99);
  const [ped99] = await pedidoService.checkout(autor.id, { itens: [{ produtoId: prod99.id, quantidade: 1, precoEsperado: 99 }] });
  const somaP1 = await total();
  await pedidoService.enviar(ped99.id, colab.id);
  await pedidoService.confirmarRecebimento(ped99.id, autor.id);
  const somaP2 = await total();
  ok("taxa 15% (pedido): RESERVA -99, RECEBIMENTO +99, TAXA -14 e TAXA_RECEBIDA +14 sobre o total do pedido",
    (await linhasDoPedidoProduto(ped99.id)).join(", ") === `RESERVA -99 ${autor.id}, RECEBIMENTO +99 ${colab.id}, TAXA -14 ${colab.id}, TAXA_RECEBIDA +14 plataforma` &&
      (await saldo(colab.id)) === colab0 + 85 && (await saldo(plataforma.id)) === plat0 + 14, (await linhasDoPedidoProduto(ped99.id)).join(", "));
  // carrinho com 2 vendedores: cada confirmação paga a taxa do seu pedido (15% de 40 = 6; de 60 = 9)
  const [a40, b60] = [await produto(colab.id, "Produto da taxa 40", 40), await produto(vend2.id, "Produto da taxa 60", 60)];
  const pedidos2 = await pedidoService.checkout(autor.id, {
    itens: [{ produtoId: a40.id, quantidade: 1, precoEsperado: 40 }, { produtoId: b60.id, quantidade: 1, precoEsperado: 60 }],
  });
  const somaP3 = await total();
  for (const pd of pedidos2) {
    await pedidoService.enviar(pd.id, pd.outraParte!.id);
    await pedidoService.confirmarRecebimento(pd.id, autor.id);
  }
  const somaP4 = await total();
  const taxasDe = async (id: string) => (await linhasDoPedidoProduto(id)).filter((l) => l.startsWith("TAXA ")).join();
  const [p40, p60] = [pedidos2.find((x) => x.total === 40)!, pedidos2.find((x) => x.total === 60)!];
  ok("taxa 15% (pedido): carrinho com 2 vendedores, duas reservas e cada confirmação paga a taxa do seu pedido",
    pedidos2.length === 2 && (await taxasDe(p40.id)) === `TAXA -6 ${colab.id}` && (await taxasDe(p60.id)) === `TAXA -9 ${vend2.id}` &&
      (await saldo(vend2.id)) === 51 && (await saldo(plataforma.id)) === plat0 + 14 + 6 + 9, `${await taxasDe(p40.id)} | ${await taxasDe(p60.id)}`);
  // cancelamento: estorno inteiro, sem taxa
  const prod30 = await produto(colab.id, "Produto da taxa 30", 30);
  const [ped30] = await pedidoService.checkout(autor.id, { itens: [{ produtoId: prod30.id, quantidade: 1, precoEsperado: 30 }] });
  const somaP5 = await total();
  await pedidoService.cancelar(ped30.id, colab.id);
  const somaP6 = await total();
  ok("taxa 15% (pedido): cancelar estorna inteiro, sem linha de taxa",
    (await linhasDoPedidoProduto(ped30.id)).join(", ") === `RESERVA -30 ${autor.id}, ESTORNO +30 ${autor.id}`);
  ok("taxa 15% (pedido): saldos (com a plataforma) mais reservas em aberto não mudam em nenhum passo do pedido",
    new Set([somaP0, somaP1, somaP2, somaP3, somaP4, somaP5, somaP6]).size === 1, [somaP0, somaP1, somaP2, somaP3, somaP4, somaP5, somaP6].join(" "));
  ok("taxa 15% (pedido): extrato x saldo bate para o comprador, os vendedores e a plataforma",
    (await extratoBate(autor.id)) && (await extratoBate(colab.id)) && (await extratoBate(vend2.id)) && (await extratoBate(plataforma.id)));
  // sem a conta da plataforma, confirmar o pedido falha e nada muda (a conta volta para o caso do serviço, logo abaixo)
  const prod20 = await produto(colab.id, "Produto da taxa 20", 20);
  const [ped20] = await pedidoService.checkout(autor.id, { itens: [{ produtoId: prod20.id, quantidade: 1, precoEsperado: 20 }] });
  await pedidoService.enviar(ped20.id, colab.id);
  await prisma.user.delete({ where: { id: plataforma.id } });
  const colabAntesP = await saldo(colab.id);
  const erroP = await pedidoService.confirmarRecebimento(ped20.id, autor.id).then(() => null, (e: Error) => e.message);
  const statusP = (await prisma.pedidoProduto.findUniqueOrThrow({ where: { id: ped20.id }, select: { status: true } })).status;
  ok("taxa 15% (pedido): sem a conta da plataforma, confirmar falha e nada muda",
    erroP === "Conta da plataforma ausente; rode npm run plataforma:garantir" && statusP === "ENVIADO" && (await saldo(colab.id)) === colabAntesP &&
      (await linhasDoPedidoProduto(ped20.id)).length === 1, `${erroP} | ${statusP}`);
  await garantirContaPlataforma();

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
  // pedidos do teste: SetNull nas partes, então saem pelo id das contas antes de as contas caírem
  const ids = (await prisma.user.findMany({ where: { email: { in: EMAILS } }, select: { id: true } })).map((u) => u.id);
  await prisma.pedidoProduto.deleteMany({ where: { OR: [{ compradorId: { in: ids } }, { vendedorId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.$disconnect();
}
console.log(JSON.stringify(resultados));
