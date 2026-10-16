import prisma from "../../configs/prisma.js";
import { contaPlataforma } from "../../configs/creditos.js";

// Cria a conta da plataforma se ainda não existir (idempotente; upsert pelo id). Sem senha nem login social,
// e com o perfil completo, para nenhum fluxo pedir cadastro. Chamada pelo seed e por npm run plataforma:garantir.
export async function garantirContaPlataforma() {
  const { id, email, fullName } = contaPlataforma();
  await prisma.user.upsert({
    where: { id },
    create: { id, email, fullName, password: null, perfil: null, profileComplete: true },
    update: {},
  });
  return { id, email };
}
