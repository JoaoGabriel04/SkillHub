-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'RETIRADA');

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "valorProposto" INTEGER,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidatura_colaboradorId_idx" ON "Candidatura"("colaboradorId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_servicoId_colaboradorId_key" ON "Candidatura"("servicoId", "colaboradorId");

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
