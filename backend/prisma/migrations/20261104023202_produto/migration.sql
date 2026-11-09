-- CreateEnum
CREATE TYPE "CategoriaProduto" AS ENUM ('ARTE_DECORACAO', 'ALIMENTOS_BEBIDAS', 'MODA_ACESSORIOS', 'SERVICOS_DIGITAIS', 'EDUCACAO_APOSTILAS');

-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'PAUSADO', 'REMOVIDO');

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaProduto" NOT NULL,
    "preco" INTEGER NOT NULL,
    "estoque" INTEGER NOT NULL,
    "digital" BOOLEAN NOT NULL DEFAULT false,
    "whatsappAtivo" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusProduto" NOT NULL DEFAULT 'ATIVO',
    "vendedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoImagem" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "ProdutoImagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Produto_status_categoria_createdAt_idx" ON "Produto"("status", "categoria", "createdAt");

-- CreateIndex
CREATE INDEX "Produto_vendedorId_idx" ON "Produto"("vendedorId");

-- CreateIndex
CREATE INDEX "ProdutoImagem_produtoId_idx" ON "ProdutoImagem"("produtoId");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoImagem" ADD CONSTRAINT "ProdutoImagem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
