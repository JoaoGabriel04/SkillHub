-- CreateEnum
CREATE TYPE "CategoriaServico" AS ENUM ('EDUCACAO', 'TECNOLOGIA', 'DESIGN_ARTE', 'REPAROS');

-- CreateEnum
CREATE TYPE "StatusServico" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaServico" NOT NULL,
    "remuneracao" INTEGER,
    "prazo" TIMESTAMP(3),
    "status" "StatusServico" NOT NULL DEFAULT 'ABERTO',
    "autorId" TEXT NOT NULL,
    "colaboradorId" TEXT,
    "aceitoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Servico_status_categoria_createdAt_idx" ON "Servico"("status", "categoria", "createdAt");

-- CreateIndex
CREATE INDEX "Servico_autorId_idx" ON "Servico"("autorId");

-- CreateIndex
CREATE INDEX "Servico_colaboradorId_idx" ON "Servico"("colaboradorId");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
