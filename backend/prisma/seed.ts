// Seed de desenvolvimento (Fase 17A): 8 usuários fictícios e os 8 pedidos de serviço que antes
// eram o mock do frontend (lib/mock/servicos.ts), para a tela não ficar vazia no ambiente local.
//
// Rodar: docker compose exec backend npx prisma db seed
// Idempotente (upsert por e-mail e por id fixo do pedido). Recusa rodar em produção.
// Usuários: seed.<nome>@example.com, todos com a senha de desenvolvimento "seed1234", sem CPF.
// Os 8 autores dos pedidos são Clientes; seed.ana e seed.pedro são Colaboradores (Fase 17B), para dar
// para testar candidaturas localmente (sem candidaturas prontas).
// Créditos (Fase 17C): cada Cliente recebe um bônus de 500 uma vez, pelo mesmo caminho do script
// creditos:conceder (BONUS no extrato), para conseguir aceitar candidaturas.
// Conta da plataforma (faxina antes da Fase 18): criada aqui também, pela mesma função do npm run plataforma:garantir.
// Produtos (Fase 18A): 8 produtos à venda de seed.ana, seed.pedro e da Empresa seed.ateliecosta, com as fotos do antigo
// mock por URL (publicId nulo), entre eles um digital, um esgotado e um pausado. Os vendedores têm telefone fictício,
// para o "Falar com o vendedor" funcionar localmente.
// O e2e não depende deste seed (cria os próprios dados).
import bcrypt from "bcryptjs";
import { PrismaClient, type CategoriaProduto, type CategoriaServico, type StatusProduto } from "@prisma/client";
import creditoService from "../src/modules/credito/credito.service.js";
import { garantirContaPlataforma } from "../src/modules/credito/plataforma.js";

if (process.env.NODE_ENV === "production") {
  console.error("Seed de desenvolvimento: não roda com NODE_ENV=production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const SENHA_DEV = "seed1234";
const BONUS_SEED = 500;
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

const COLABORADORES = {
  ana: { nome: "Ana Ribeiro", foto: "1544005313-94ddf0286df2", competencias: ["Professora", "Designer"], telefone: "(11) 90000-0001" },
  pedro: { nome: "Pedro Almeida", foto: "1519085360753-af0119f7cbe7", competencias: ["Técnico", "Desenvolvedor Web"], telefone: "(11) 90000-0002" },
} as const;
const EMPRESA = { chave: "ateliecosta", nome: "Ateliê Costa", cnpj: "00.000.000/0001-91", telefone: "(11) 3000-0001" } as const;
type Vendedor = keyof typeof COLABORADORES | typeof EMPRESA.chave;

const fotoProduto = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=70&fit=crop`;
const PRODUTOS: { n: number; nome: string; descricao: string; categoria: CategoriaProduto; vendedor: Vendedor; preco: number; estoque: number; digital?: boolean; status?: StatusProduto; fotos: string[]; criado: number }[] = [
  { n: 1, nome: "Pintura feita à mão", descricao: "Quadro em tinta acrílica sobre tela, 30 x 40 cm, pintado à mão.", categoria: "ARTE_DECORACAO", vendedor: "ana", preco: 90, estoque: 2, fotos: ["1578301978693-85fa9c0320b9"], criado: -1 },
  { n: 2, nome: "Casa de palito", descricao: "Miniatura de casa montada com palitos de madeira, peça única.", categoria: "ARTE_DECORACAO", vendedor: "ana", preco: 100, estoque: 0, fotos: ["1518780664697-55e3ad937233"], criado: -2 },
  { n: 3, nome: "Terço personalizado", descricao: "Terço feito à mão com contas coloridas, na cor que você escolher.", categoria: "ARTE_DECORACAO", vendedor: "ana", preco: 50, estoque: 5, status: "PAUSADO", fotos: ["1515562141207-7a88fb7ce338"], criado: -3 },
  { n: 4, nome: "Curso completo de introdução ao Office365", descricao: "Videoaulas de Word, Excel e PowerPoint, do básico ao intermediário. Acesso enviado por link.", categoria: "EDUCACAO_APOSTILAS", vendedor: "ateliecosta", preco: 300, estoque: 50, digital: true, fotos: ["1498050108023-c5249f4df085"], criado: -1 },
  { n: 5, nome: "Apostila para curso de administração", descricao: "Apostila impressa com resumos e exercícios de administração geral.", categoria: "EDUCACAO_APOSTILAS", vendedor: "pedro", preco: 120, estoque: 10, fotos: ["1513475382585-d06e58bcb0e0"], criado: -4 },
  { n: 6, nome: "Curso de análise de dados para iniciantes", descricao: "Curso em vídeo de planilhas e gráficos para quem está começando. Acesso enviado por link.", categoria: "EDUCACAO_APOSTILAS", vendedor: "ateliecosta", preco: 200, estoque: 50, digital: true, fotos: ["1551288049-bebda4e38f71"], criado: -2 },
  { n: 7, nome: "Camisa Tech AOS", descricao: "Camisa de algodão com estampa Tech AOS, tamanhos P, M e G.", categoria: "MODA_ACESSORIOS", vendedor: "pedro", preco: 90, estoque: 8, fotos: ["1523381210434-271e8be1f52b"], criado: 0 },
  { n: 8, nome: "Kit café da tarde", descricao: "Bolo de pote caseiro e café coado, para retirar no bairro.", categoria: "ALIMENTOS_BEBIDAS", vendedor: "ana", preco: 25, estoque: 12, fotos: ["1578985545062-69928b1d9587", "1541167760496-1628856ab772"], criado: 0 },
];
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
  await garantirContaPlataforma();
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
  const vendedores = {} as Record<Vendedor, string>;
  for (const [chave, c] of Object.entries(COLABORADORES) as [keyof typeof COLABORADORES, (typeof COLABORADORES)[keyof typeof COLABORADORES]][]) {
    const email = `seed.${chave}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { phone: c.telefone }, // telefone desde a 18A, também para quem já tinha rodado o seed
      create: { email, password: senha, fullName: c.nome, perfil: "Colaborador", competencias: [...c.competencias], urlPhoto: foto(c.foto), phone: c.telefone, cidade: "São Paulo", estado: "SP", profileComplete: true },
    });
    vendedores[chave] = user.id;
  }
  const empresa = await prisma.user.upsert({
    where: { email: `seed.${EMPRESA.chave}@example.com` },
    update: {},
    create: { email: `seed.${EMPRESA.chave}@example.com`, password: senha, fullName: EMPRESA.nome, perfil: "Empresa", cnpj: EMPRESA.cnpj, phone: EMPRESA.telefone, cidade: "São Paulo", estado: "SP", profileComplete: true },
  });
  vendedores[EMPRESA.chave] = empresa.id;
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
  for (const p of PRODUTOS) {
    const id = `00000000-0000-4000-8001-${String(p.n).padStart(12, "0")}`;
    await prisma.produto.upsert({
      where: { id },
      update: {},
      create: {
        id,
        nome: p.nome,
        descricao: p.descricao,
        categoria: p.categoria,
        preco: p.preco,
        estoque: p.estoque,
        digital: p.digital ?? false,
        status: p.status ?? "ATIVO",
        vendedorId: vendedores[p.vendedor],
        createdAt: dias(p.criado),
        imagens: { create: p.fotos.map((f, ordem) => ({ url: fotoProduto(f), publicId: null, ordem })) },
      },
    });
  }
  for (const chave of Object.keys(PESSOAS)) {
    const email = `seed.${chave}@example.com`;
    if (!(await creditoService.jaRecebeuBonus(email))) await creditoService.conceder(email, BONUS_SEED);
  }
  console.log(
    `Seed: ${Object.keys(PESSOAS).length} clientes, ${Object.keys(COLABORADORES).length} colaboradores, 1 empresa, ${PEDIDOS.length} pedidos de serviço e ${PRODUTOS.length} produtos; bônus de ${BONUS_SEED} créditos para os clientes (senha dos usuários: ${SENHA_DEV}).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
