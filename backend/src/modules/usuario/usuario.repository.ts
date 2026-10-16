import prisma from "../../configs/prisma.js";

// Dados públicos de um usuário (Fase 17D). O módulo user (a conta do próprio usuário) não é tocado.
const usuarioRepository = {
  existe: async (id: string) => !!(await prisma.user.findUnique({ where: { id }, select: { id: true } })),

  // pedidos concluídos em que a pessoa participou, como autor ou como colaborador
  colaboracoes: (id: string) =>
    prisma.servico.count({ where: { status: "CONCLUIDO", OR: [{ autorId: id }, { colaboradorId: id }] } }),
};

export default usuarioRepository;
