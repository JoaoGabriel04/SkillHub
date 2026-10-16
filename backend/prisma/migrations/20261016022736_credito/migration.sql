-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('BONUS', 'RESERVA', 'ESTORNO', 'RECEBIMENTO', 'TAXA');

-- CreateTable
CREATE TABLE "TransacaoCredito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "valor" INTEGER NOT NULL,
    "saldoApos" INTEGER NOT NULL,
    "servicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransacaoCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransacaoCredito_userId_createdAt_idx" ON "TransacaoCredito"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransacaoCredito" ADD CONSTRAINT "TransacaoCredito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
