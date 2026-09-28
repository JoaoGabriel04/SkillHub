# SkillHub — Frontend

Next.js 16 (App Router), Tailwind 4, shadcn/ui, Zustand e SWR.

## Desenvolvimento

O jeito normal é subir tudo pelo `docker compose up` na raiz do projeto (frontend em `:3000`, backend em `:7000`).
Para rodar só o frontend fora do docker:

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:7000/api
npm install
npm run dev
```

## Deploy na Vercel

O navegador fala com o backend **pelo domínio do próprio site**: `next.config.ts` repassa `/api/*` para `BACKEND_URL/api/*`.
Assim o cookie `refresh_token` é gravado no domínio do site e não cai no bloqueio de cookies de terceiros (Safari, Firefox).
O login pelo Google/Discord também passa por esse proxy.

### 1. Projeto na Vercel

- **Import** do repositório no painel da Vercel.
- **Root Directory:** `frontend` (o Next.js é detectado sozinho; comando de build e pasta de saída ficam no padrão).

### 2. Variáveis de ambiente do frontend (Settings → Environment Variables)

| Variável | Valor | Observação |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Entra no build: se mudar, precisa de um novo deploy. |
| `BACKEND_URL` | `https://<backend>` | Origem do backend, **sem** `/api` no fim. |

### 3. Variáveis do backend

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` (cookie com `Secure`) |
| `CLIENT_URL` | `https://<site>.vercel.app` (links dos e-mails e volta do OAuth) |
| `API_URL` | `https://<site>.vercel.app`: o **site**, não o backend. O OAuth volta pelo proxy e o cookie fica no domínio do site. |

### 4. OAuth

Nos consoles do Google e do Discord, cadastrar as URLs de retorno pelo domínio do site:

- `https://<site>.vercel.app/api/auth/google/callback`
- `https://<site>.vercel.app/api/auth/discord/callback`

### Deploys de preview

Os previews têm outra URL. O login por e-mail e senha funciona neles, porque o proxy é do próprio preview.
Já o OAuth e os links dos e-mails voltam para o `CLIENT_URL`/`API_URL` do backend, ou seja, para a produção.
