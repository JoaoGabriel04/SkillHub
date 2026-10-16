-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_avaliadorId_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_servicoId_fkey";

-- AlterTable
ALTER TABLE "Avaliacao" ALTER COLUMN "servicoId" DROP NOT NULL,
ALTER COLUMN "avaliadorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_avaliadorId_fkey" FOREIGN KEY ("avaliadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
