// Pedidos de produto parados (Fase 18B, Seção 5.4): ENVIADO há mais de N dias (padrão 7) sem a confirmação do
// recebimento, com os créditos do comprador ainda reservados. SOMENTE LISTAGEM: não muda nada no banco.
// A "confirmação automática" é proposta de fase futura (CHANGELOG_MIGRACAO.md).
//
//   docker compose exec backend npm run pedidos:pendentes            (mais de 7 dias)
//   docker compose exec backend npm run pedidos:pendentes -- --dias 3
//
// Sem e-mail nem telefone na saída: só os ids das partes.
import "dotenv/config";
import prisma from "../src/configs/prisma.js";

const i = process.argv.indexOf("--dias");
const dias = i > -1 ? Number(process.argv[i + 1]) : 7;
if (!Number.isInteger(dias) || dias < 0) {
  console.error("Use --dias com um inteiro maior ou igual a 0.");
  process.exit(2);
}

const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
try {
  const pedidos = await prisma.pedidoProduto.findMany({
    where: { status: "ENVIADO", enviadoEm: { lt: limite } },
    orderBy: [{ enviadoEm: "asc" }, { id: "asc" }],
    select: {
      id: true,
      total: true,
      enviadoEm: true,
      compradorId: true,
      vendedorId: true,
      itens: { select: { nome: true }, orderBy: [{ nome: "asc" }, { id: "asc" }] },
    },
  });
  if (pedidos.length === 0) console.log(`Nenhum pedido enviado há mais de ${dias} dias.`);
  else {
    console.log(`${pedidos.length} pedido(s) enviado(s) há mais de ${dias} dias, sem confirmação do recebimento:\n`);
    for (const p of pedidos) {
      const parado = Math.floor((Date.now() - p.enviadoEm!.getTime()) / (24 * 60 * 60 * 1000));
      const nome = p.itens[0]?.nome ?? "(sem itens)";
      console.log(
        [
          `pedido ${p.id}`,
          `enviado em ${p.enviadoEm!.toISOString()} (${parado} dias)`,
          `${p.total} créditos reservados`,
          `${nome}${p.itens.length > 1 ? ` (+${p.itens.length - 1})` : ""}`,
          `comprador ${p.compradorId ?? "conta excluída"}`,
          `vendedor ${p.vendedorId ?? "conta excluída"}`,
        ].join(" | ")
      );
    }
  }
} finally {
  await prisma.$disconnect();
}
