#!/usr/bin/env bash
# Roda os testes de fluxo (fluxos.mjs) contra o app do docker compose: login, cadastro, sessão,
# OAuth, menus, Perfil (inclui upload de foto/currículo no Cloudinary), recuperação de senha
# (lê o e-mail no Mailpit, http://localhost:8025) e exclusão de conta.
# Pré-requisito: `docker compose up` na raiz do projeto (postgres, backend :7000, frontend :3000).
#
# Faz sozinho: instala o playwright-core e o navegador, baixa as bibliotecas de sistema que faltarem
# (sem sudo, em e2e/.libs), cria o usuário OAuth de teste e apaga os usuários e2e.* no fim.
set -euo pipefail
cd "$(dirname "$0")"

API=http://localhost:7000/api
WEB=http://localhost:3000
LIBDIR="$PWD/.libs/root/usr/lib/x86_64-linux-gnu"

compose() { docker compose -f ../docker-compose.yml "$@"; }
sql() { compose exec -T postgres psql -U skillhub -d skillhub -tAc "$1"; }
# Apaga os usuários de teste e, antes, os arquivos deles no Cloudinary (public_id fixo por usuário).
# Numa execução completa os testes já excluem as contas pelo app; isto cobre execuções interrompidas.
cleanup() {
  local ids
  ids=$(sql "select id from \"User\" where email like 'e2e.%@example.com'" 2>/dev/null | tr -d '\r') || true
  if [ -n "$ids" ]; then
    compose exec -T backend node -e '
      const { v2: c } = require("cloudinary");
      c.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
      Promise.all(process.argv.slice(1).flatMap((id) => [
        c.uploader.destroy(`Skillhub/avatars/${id}`, { resource_type: "image", invalidate: true }),
        c.uploader.destroy(`Skillhub/curriculos/${id}`, { resource_type: "raw", invalidate: true }),
      ])).catch((e) => console.error("[e2e] limpeza do Cloudinary falhou:", e.message));' $ids || true
  fi
  sql "delete from \"User\" where email like 'e2e.%@example.com'" >/dev/null || true
  # e-mails de teste (recuperação de senha) na caixa do Mailpit
  curl -s -o /dev/null -X DELETE "http://localhost:8025/api/v1/search?query=to%3Aexample.com" || true
}

# 1. app no ar
curl -sf -m 5 "$API/health" >/dev/null || { echo "Backend fora do ar em $API — rode 'docker compose up' na raiz."; exit 1; }
curl -sf -m 5 "http://localhost:8025/api/v1/info" >/dev/null || { echo "Mailpit fora do ar em :8025 — rode 'docker compose up' na raiz."; exit 1; }
curl -s -m 60 -o /dev/null "$WEB/login" || { echo "Frontend fora do ar em $WEB — rode 'docker compose up' na raiz."; exit 1; }

# 2. dependências e navegador (reaproveita o cache em ~/.cache/ms-playwright)
[ -d node_modules/playwright-core ] || npm install --no-audit --no-fund --silent
node node_modules/playwright-core/cli.js install --only-shell chromium >/dev/null

# 3. bibliotecas de sistema do Chromium: no WSL/Ubuntu sem elas o launch falha com
#    "error while loading shared libraries". Baixa os .deb e extrai localmente (sem instalar).
[ -d "$LIBDIR" ] && export LD_LIBRARY_PATH="$LIBDIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
launch_check() { node -e 'import("playwright-core").then(async ({ chromium }) => (await chromium.launch()).close())' 2>&1; }
if ! out=$(launch_check); then
  if ! grep -q "error while loading shared libraries" <<<"$out"; then echo "$out"; exit 1; fi
  echo "Baixando bibliotecas do Chromium para e2e/.libs ..."
  asound=$(apt-cache show libasound2t64 >/dev/null 2>&1 && echo libasound2t64 || echo libasound2)
  tmp=$(mktemp -d) && mkdir -p "$PWD/.libs/root"
  (cd "$tmp" && apt-get download libnspr4 libnss3 "$asound" >/dev/null)
  for deb in "$tmp"/*.deb; do dpkg -x "$deb" "$PWD/.libs/root"; done
  rm -rf "$tmp"
  export LD_LIBRARY_PATH="$LIBDIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  out=$(launch_check) || { echo "$out"; exit 1; }
fi

# 4. usuário de conta OAuth nova (sem perfil) + access token dele, para o fluxo de completar cadastro
cleanup # sobras de uma execução interrompida
trap cleanup EXIT
oauth_id=$(sql "insert into \"User\" (id, email, \"fullName\", perfil, \"profileComplete\", \"googleId\")
  values (gen_random_uuid(), 'e2e.oauth@example.com', 'Usuario OAuth E2E', null, false, 'e2e-google-id') returning id" | head -1 | tr -d '[:space:]')
token=$(compose exec -T backend node -e \
  "console.log(require('jsonwebtoken').sign({ sub: '$oauth_id' }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '15m' }))" | tr -d '[:space:]')
# o callback real do OAuth também grava o cookie refresh_token; sem ele a sessão não sobrevive a um reload
refresh=$(compose exec -T backend node -e \
  "console.log(require('jsonwebtoken').sign({ sub: '$oauth_id', remember: true }, process.env.JWT_REFRESH_TOKEN, { expiresIn: '1h' }))" | tr -d '[:space:]')

# 5. testes
mkdir -p .output
E2E_OAUTH_TOKEN="$token" E2E_OAUTH_REFRESH="$refresh" E2E_OAUTH_ID="$oauth_id" E2E_OUT="$PWD/.output" E2E_BASE_URL="$WEB" node fluxos.mjs
