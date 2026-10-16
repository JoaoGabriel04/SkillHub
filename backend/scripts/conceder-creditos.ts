// Concede créditos a um usuário (Fase 17C): é como os créditos chegam às pessoas na fase piloto.
// Registra um BONUS no extrato pelo mesmo caminho de todas as movimentações (credito.service).
//
// Uso (no container): docker compose exec backend npm run creditos:conceder -- --email fulano@exemplo.com --valor 100
import "dotenv/config";
import prisma from "../src/configs/prisma.js";
import creditoService from "../src/modules/credito/credito.service.js";
import { AppError } from "../src/utils/AppError.js";

const arg = (nome: string) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const email = arg("email");
const valor = Number(arg("valor"));
if (!email || !arg("valor")) {
  console.error("Uso: npm run creditos:conceder -- --email <e-mail> --valor <créditos>");
  process.exit(1);
}

try {
  const { saldo } = await creditoService.conceder(email, valor);
  console.log(`${valor} créditos concedidos a ${email}. Saldo agora: ${saldo}.`);
} catch (err) {
  console.error(err instanceof AppError ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
