import type { Prisma } from "@prisma/client";
import prisma from "../../configs/prisma.js";

const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  findByGoogleId: (googleId: string) => prisma.user.findUnique({ where: { googleId } }),

  findByDiscordId: (discordId: string) => prisma.user.findUnique({ where: { discordId } }),

  findByCpf: (cpf: string) => prisma.user.findUnique({ where: { cpf } }),

  findByCnpj: (cnpj: string) => prisma.user.findUnique({ where: { cnpj } }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),

  linkGoogleId: (id: string, googleId: string) =>
    prisma.user.update({ where: { id }, data: { googleId } }),

  linkDiscordId: (id: string, discordId: string) =>
    prisma.user.update({ where: { id }, data: { discordId } }),

  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),

  delete: (id: string) => prisma.user.delete({ where: { id } }),
};

export default userRepository;
