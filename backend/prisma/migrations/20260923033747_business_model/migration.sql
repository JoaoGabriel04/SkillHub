-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "genero" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "perfil" TEXT,
    "urlPhoto" TEXT,
    "competencias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculo" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "googleId" TEXT,
    "discordId" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_cnpj_key" ON "User"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
