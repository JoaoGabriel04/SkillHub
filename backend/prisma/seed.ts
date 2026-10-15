// Seed de desenvolvimento (Fase 17A): 8 usuários fictícios e os 8 pedidos de serviço que antes
// eram o mock do frontend (lib/mock/servicos.ts), para a tela não ficar vazia no ambiente local.
//
// Rodar: docker compose exec backend npx prisma db seed
// Idempotente (upsert por e-mail e por id fixo do pedido). Recusa rodar em produção.
// Usuários: seed.<nome>@example.com, todos com a senha de desenvolvimento "seed1234", sem CPF.
// O e2e não depende deste seed (cria os próprios dados).
import bcrypt from "bcryptjs";
import { PrismaClient, type CategoriaServico } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("Seed de desenvolvimento: não roda com NODE_ENV=production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const SENHA_DEV = "seed1234";
const foto = (id: string) => `https://images.unsplash.com/photo-${id}?w=120&q=70&fit=crop`;
const dias = (n: number) => new Date(Date.now() + n * 86_400_000);

const PESSOAS = {
  carlos: { nome: "Carlos Magno", foto: "1507003211169-0a1dd7228f2d" },
  lindalva: { nome: "Lindalva Filho", foto: "1438761681033-6461ffad8d80" },
  humberto: { nome: "Humberto da Silva", foto: "1472099645785-5658abf4ff4e" },
  bruna: { nome: "Bruna de Alencar", foto: "1494790108377-be9c29b29330" },
  francisco: { nome: "Francisco Gomes", foto: "1500648767791-00dcc994a43e" },
  olivia: { nome: "Olívia Monteiro", foto: "1534528741775-53994a69daeb" },
  caetano: { nome: "Caetano Santos", foto: "1539571696357-5a69c17a67c6" },
  jose: { nome: "José Pereira", foto: "1506794778202-cad84cf45f1d" },
} as const;
type Pessoa = keyof typeof PESSOAS;

const PEDIDOS: { n: number; titulo: string; descricao: string; categoria: CategoriaServico; autor: Pessoa; remuneracao: number | null; prazo: number | null; criado: number }[] = [
  { n: 1, titulo: "Arte para criação de um cardápio", descricao: "Estou precisando de um cardápio para o meu restaurante", categoria: "DESIGN_ARTE", autor: "carlos", remuneracao: 150, prazo: 10, criado: -1 },
  { n: 2, titulo: "Manutenção de ar-condicionado", descricao: "Estou precisando limpar o meu ar-condicionado", categoria: "REPAROS", autor: "lindalva", remuneracao: 120, prazo: 5, criado: -2 },
  { n: 3, titulo: "Aula de reforço", descricao: "Estou precisando que alguém dê aula de matemática para meu filho.", categoria: "EDUCACAO", autor: "humberto", remuneracao: 80, prazo: null, criado: -3 },
  { n: 4, titulo: "Aula de música", descricao: "Alguém que possa me ensinar a tocar bateria.", categoria: "EDUCACAO", autor: "bruna", remuneracao: null, prazo: null, criado: -4 },
  { n: 5, titulo: "Edição de vídeo", descricao: "Edição de vídeo simples para divulgação em redes sociais.", categoria: "TECNOLOGIA", autor: "francisco", remuneracao: 200, prazo: 7, criado: -1 },
  { n: 6, titulo: "Criação de site", descricao: "Site para vendas de produtos da minha loja virtual de maquiagem", categoria: "TECNOLOGIA", autor: "olivia", remuneracao: 600, prazo: 30, criado: -5 },
  { n: 7, titulo: "Formatação de computador", descricao: "Estou precisando de um pequeno serviço, para a formatação do meu computador.", categoria: "TECNOLOGIA", autor: "caetano", remuneracao: 100, prazo: 3, criado: 0 },
  { n: 8, titulo: "Conserto de máquina de lavar", descricao: "Minha máquina de lavar parou de funcionar, preciso de alguém para dar uma olhada.", categoria: "REPAROS", autor: "jose", remuneracao: null, prazo: 2, criado: 0 },
];

async function main() {
  const senha = await bcrypt.hash(SENHA_DEV, 10);
  const ids = {} as Record<Pessoa, string>;
  for (const [chave, p] of Object.entries(PESSOAS) as [Pessoa, (typeof PESSOAS)[Pessoa]][]) {
    const email = `seed.${chave}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, password: senha, fullName: p.nome, perfil: "Cliente", urlPhoto: foto(p.foto), cidade: "São Paulo", estado: "SP", profileComplete: true },
    });
    ids[chave] = user.id;
  }
  for (const p of PEDIDOS) {
    const id = `00000000-0000-4000-8000-${String(p.n).padStart(12, "0")}`;
    await prisma.servico.upsert({
      where: { id },
      update: {},
      create: {
        id,
        titulo: p.titulo,
        descricao: p.descricao,
        categoria: p.categoria,
        remuneracao: p.remuneracao,
        prazo: p.prazo === null ? null : dias(p.prazo),
        autorId: ids[p.autor],
        createdAt: dias(p.criado),
      },
    });
  }
  console.log(`Seed: ${Object.keys(PESSOAS).length} usuários e ${PEDIDOS.length} pedidos de serviço (senha dos usuários: ${SENHA_DEV}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
