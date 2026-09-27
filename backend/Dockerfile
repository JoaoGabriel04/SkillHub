FROM node:24-slim

# engine do Prisma precisa do OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY . .

EXPOSE 7000

# aplica migrations pendentes antes de subir a API em modo watch
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
