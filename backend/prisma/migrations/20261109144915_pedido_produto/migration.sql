-- CreateEnum
CREATE TYPE "StatusPedidoProduto" AS ENUM ('AGUARDANDO_ENVIO', 'ENVIADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ParteDoPedido" AS ENUM ('COMPRADOR', 'VENDEDOR');

-- AlterTable
ALTER TABLE "TransacaoCredito" ADD COLUMN     "pedidoId" TEXT;

-- CreateTable
CREATE TABLE "PedidoProduto" (
    "id" TEXT NOT NULL,
    "compradorId" TEXT,
    "vendedorId" TEXT,
    "status" "StatusPedidoProduto" NOT NULL DEFAULT 'AGUARDANDO_ENVIO',
    "total" INTEGER NOT NULL,
    "observacao" TEXT,
    "canceladoPor" "ParteDoPedido",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),

    CONSTRAINT "PedidoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT,
    "nome" TEXT NOT NULL,
    "precoUnitario" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "imagemUrl" TEXT,
    "digital" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoProduto_compradorId_createdAt_idx" ON "PedidoProduto"("compradorId", "createdAt");

-- CreateIndex
CREATE INDEX "PedidoProduto_vendedorId_createdAt_idx" ON "PedidoProduto"("vendedorId", "createdAt");

-- CreateIndex
CREATE INDEX "PedidoProduto_status_enviadoEm_idx" ON "PedidoProduto"("status", "enviadoEm");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");

-- CreateIndex
CREATE INDEX "TransacaoCredito_pedidoId_idx" ON "TransacaoCredito"("pedidoId");

-- AddForeignKey
ALTER TABLE "PedidoProduto" ADD CONSTRAINT "PedidoProduto_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoProduto" ADD CONSTRAINT "PedidoProduto_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
