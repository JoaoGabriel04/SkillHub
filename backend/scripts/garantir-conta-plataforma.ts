// Cria a conta da plataforma, que recebe as taxas (TAXA_RECEBIDA), se ainda não existir. Idempotente.
// O seed também a cria. Sem ela, concluir um pedido com PLATFORM_FEE_PERCENT > 0 falha.
//
// Uso (no container): docker compose exec backend npm run plataforma:garantir
import "dotenv/config";
import prisma from "../src/configs/prisma.js";
import { garantirContaPlataforma } from "../src/modules/credito/plataforma.js";

try {
  const { id, email } = await garantirContaPlataforma();
  console.log(`Conta da plataforma pronta: ${id} (${email}).`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
