// Fase 17C: User.credits só muda por src/modules/credito/ (credito.repository, chamado pelo credito.service).
// Reprova qualquer menção a "credits" fora desse módulo no código do backend e no seed.
// Uso: npm run check:creditos
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const PERMITIDO = join(RAIZ, "src/modules/credito");
const arquivos = (dir) =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.ts$/.test(nome) ? [caminho] : [];
  });

let falhas = 0;
for (const arquivo of [...arquivos(join(RAIZ, "src")), join(RAIZ, "prisma/seed.ts"), ...arquivos(join(RAIZ, "scripts"))]) {
  if (arquivo.startsWith(PERMITIDO)) continue;
  readFileSync(arquivo, "utf8")
    .split("\n")
    .forEach((linha, i) => {
      if (/\bcredits\b/.test(linha)) {
        falhas++;
        console.log(`FALHA ${relative(RAIZ, arquivo)}:${i + 1}  ${linha.trim()}`);
      }
    });
}
console.log(falhas ? `\n${falhas} menção(ões) a credits fora de src/modules/credito.` : "User.credits só é alterado pelo módulo de créditos.");
process.exit(falhas ? 1 : 0);
