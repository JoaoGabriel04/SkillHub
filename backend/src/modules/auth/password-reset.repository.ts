import prisma from "../../configs/prisma.js";

const passwordResetRepository = {
  findLatestByUser: (userId: string) =>
    prisma.passwordResetToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),

  findByHash: (tokenHash: string) =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } }),

  // um link novo invalida os anteriores ainda não usados
  replaceForUser: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]),

  // Marca o token como usado só se ainda estiver válido (condição atômica: dois envios simultâneos
  // do mesmo link não trocam a senha duas vezes), troca a senha e descarta os outros tokens.
  // Retorna false se o token já tinha sido usado ou expirou.
  consume: (tokenId: string, userId: string, passwordHash: string) =>
    prisma.$transaction(async (tx) => {
      const now = new Date();
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (count === 0) return false;
      await tx.user.update({ where: { id: userId }, data: { password: passwordHash, passwordChangedAt: now } });
      await tx.passwordResetToken.deleteMany({ where: { userId, id: { not: tokenId } } });
      return true;
    }),
};

export default passwordResetRepository;
