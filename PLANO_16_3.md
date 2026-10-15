# Plano da subfase 16.3: paleta de marca e contraste (ainda só tema escuro)

> Segue `SKILLHUB_CORES_E_TEMA.md` (Fase 16.3), a Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`, o `SKILLHUB_DESIGN_SYSTEM.md` e o `CHANGELOG_MIGRACAO.md` (Fase 16.1).
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("aprovado, pode seguir com as recomendações"). Respostas: as seis recomendações da Seção 7 (banners seguem a marca; botões a 12px no celular; título dos eventos em `text-foreground`; classes da paleta fixa do Tailwind entram; selos sem unificar; branch depois do PR #6). O PR #6 foi mergeado antes do início: a `feat/paleta-cores` parte da `main` em `4c6897c`.

## 0. O que foi lido e medido

- `SKILLHUB_CORES_E_TEMA.md` inteiro, Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`, `SKILLHUB_DESIGN_SYSTEM.md`, `CHANGELOG_MIGRACAO.md`, `PLANO_16_1.md`, `frontend/AGENTS.md`.
- Guia do Next 16.3.6: `01-app/01-getting-started/11-css.md` (Tailwind e CSS global). Nada muda para esta subfase: o Tailwind v4 entra pelo `@import "tailwindcss"` no `app/globals.css`, que o layout raiz importa, como o projeto já faz. O guia recomenda CSS global só para o que é de fato global (tokens e base), e é exatamente onde os tokens vão.
- `check-contrast.mjs` (raiz): rodado sem alteração, **"Todos os pares passaram"** nos dois temas e nos 6 avatares.
- Varredor do documento (`grep -rlE "#[0-9a-fA-F]{3,8}|rgba?\(" frontend/src`) rodado no commit `d6d30f5` (`main`): **48 arquivos**, mesmo número do diagnóstico.
- Tailwind instalado: **4.3.3**. Suporta `shadow-(--var)`, `drop-shadow-(--var)` e `bg-(image:--var)`, então sombras, brilhos e degradês podem vir de variáveis CSS sem hex nos componentes.
- CSS compilado (servidor de dev): `.bg-accent` e `.text-accent` saem de `var(--accent)`. Ou seja, o `@theme inline` do `globals.css` **vence** as cores do `tailwind.config.mts` (`base`, `surface`, `accent`), que hoje são código morto com hex.

### 0.1. Base da branch e o PR #6

O PR #6 (`feat/transicao-area-logada`, transições da área logada) toca 10 arquivos desta lista: `globals.css`, `inicio/page.tsx`, `configuracoes/page.tsx`, `app-header.tsx`, `bottom-nav.tsx`, `credits-chip.tsx`, `navegacao.ts`, `page-title.tsx`, `sidebar.tsx` e `page-transition.tsx`. E traz uma cor nova (o brilho da barra de progresso, `rgba(59,212,204,0.8)`, o mesmo valor do traço de foco dos campos).

**Recomendação:** a `feat/paleta-cores` sai da `main` **depois do merge do PR #6**, para não gerar conflito nesses 10 arquivos. A barra de progresso entra no mapa abaixo (token `--glow-line`). Se você preferir começar antes, a branch sai da `main` atual e eu resolvo os conflitos quando o PR #6 entrar.

## 1. Camada de tokens

### 1.1. Variáveis CSS (`app/globals.css`)

Valores escuros no `.dark` e claros provisórios no `:root`, exatamente os da Seção 2.1 do documento (iguais aos do `check-contrast.mjs`). Os nomes das variáveis são os do documento. No Tailwind, o `@theme inline` ganha as cores com estes nomes de classe:

| Variável | Classe Tailwind | Observação |
|---|---|---|
| `--background` | `bg-background` | já existe; o valor escuro passa de `#1a1a1a` para `#101010` (só o `ui/` do shadcn usa) |
| `--surface`, `--surface-2` | `bg-surface`, `bg-surface-2` | |
| `--foreground` | `text-foreground` | já existe; `#ffffff` passa a `#f2f4f4` |
| `--foreground-secondary` | `text-foreground-secondary` | |
| `--muted-foreground` | `text-muted-foreground` | já existe; `#9f9f9f` passa a `#8f9897` |
| `--accent`, `--accent-foreground`, `--accent-hover` | `bg-accent`, `text-accent-foreground`, `bg-accent-hover` | |
| `--accent-text` | `text-accent-text` | os 12 usos de `text-accent` como texto passam para cá |
| `--accent-soft`, `--accent-soft-border` | `bg-accent-soft`, `border-accent-soft-border` | item ativo da navegação |
| `--danger`, `--danger-fill` | `text-danger`, `bg-danger-fill` | |
| `--danger-fill-foreground` (**novo**, `#ffffff` nos dois temas) | `text-danger-fill-foreground` | o `onDanger` do script; evita `text-white` no botão perigoso |
| `--success`, `--warning` | `text-success`, `text-warning` | ainda sem uso; ficam prontos |
| `--border-input` | **`border-field`, `bg-field`** | proposta de nome: `border-border-input` ficaria repetido, e o `--input` do shadcn já existe com outro papel |
| `--glass-border` | `border-glass-border` | `#b0b0b0` a 33% (exceção da Seção 2.4) |

Efeitos e fundos, com os **valores escuros idênticos aos de hoje**:

| Variável | Valor escuro (igual ao atual) | Uso | Classe |
|---|---|---|---|
| `--glass-bg` | `#595959` a 15% | `GlassCard` claro, `CreditsChip` | `bg-glass` |
| `--glass-strong-bg` | `rgba(28,28,28,0.92)` | `GlassCard` escuro, diálogos, toasts | `bg-glass-strong` |
| `--glass-strong-border` | branco a 6% | borda do vidro escuro | `border-glass-strong-border` |
| `--card-bg` | preto a 30% | `ContentCard` (o card continua translúcido) | `bg-card-fill` |
| `--nav-bg` | preto a 35% | `NAV_VIDRO` | `bg-nav` |
| `--overlay` | preto a 70% | fundo dos diálogos (`ui/dialog.tsx`) | `bg-overlay` |
| `--shadow-glass` | as duas sombras internas do vidro claro | `GlassCard`, `CreditsChip`, `NAV_VIDRO` | `shadow-(--shadow-glass)` |
| `--shadow-card` | as três sombras do `ContentCard` | `ContentCard` | `shadow-(--shadow-card)` |
| `--shadow-cta` | as duas sombras internas do botão principal | `ctaButtonClass` | `shadow-(--shadow-cta)` |
| `--shadow-popover` | `0 8px 32px` preto a 40% | vidro escuro, diálogo do Perfil | `shadow-(--shadow-popover)` |
| `--shadow-raised` | `0 4px 14px` preto a 60% | card dos eventos do Início | `shadow-(--shadow-raised)` |
| `--shadow-badge` | `0 2px 8px` preto a 40% | selo da câmera do Perfil | `shadow-(--shadow-badge)` |
| `--shadow-check` | `0 2px 6px` preto a 50% | selo de check do cadastro | `shadow-(--shadow-check)` |
| `--glow-active` | `0 0 6px` ciano a 70% | ícone ativo da sidebar e do menu inferior | `drop-shadow-(--glow-active)` |
| `--glow-coin` | `0 0 10px` ciano a 45% | moeda do chip e da sidebar | `shadow-(--glow-coin)` |
| `--glow-coin-lg` | `0 0 18px` ciano a 40% | moeda grande do popover de créditos | `shadow-(--glow-coin-lg)` |
| `--glow-line` | `0 0 10px` ciano a 80% | traço de foco dos campos e barra da transição (PR #6) | `shadow-(--glow-line)` |
| `--bg-gradient-from/to` | `#1a1a1a` / `#222222` | gradiente do `body` | (no próprio `globals.css`) |
| `--bg-profile-from/to` | `#101010` / `#343434` | fundo do Perfil | `bg-[linear-gradient(180deg,var(--bg-profile-from)_0%,var(--bg-profile-to)_100%)]` |
| `--curve-from/mid` | `#6f6f6f` / `#9a9a9a` | curva decorativa atrás do avatar do Perfil (SVG) | `style={{ stopColor: "var(--curve-from)" }}` |

Os brilhos ciano usam `color-mix(in srgb, var(--accent) N%, transparent)` dentro do `globals.css`, então acompanham o `--accent`. Os valores claros desta tabela são provisórios e serão acertados na 16.5.

**Variáveis do shadcn passam a apontar para os tokens novos**, para os componentes `ui/` herdarem a paleta: `--primary` → `var(--accent)`, `--primary-foreground` → `var(--accent-foreground)`, `--ring` → `var(--accent)`, `--destructive` → `var(--danger)`, `--card` → `var(--surface)`, `--popover` e `--secondary` e `--muted` → `var(--surface-2)`, `--input` → `var(--border-input)`, `--card-foreground`, `--popover-foreground` e `--secondary-foreground` → `var(--foreground)`. O `--border` (branco a 8%) fica. As variáveis `--sidebar-*` e `--chart-*` do shadcn não são usadas no projeto e ficam como estão.

### 1.2. Módulo de marca (`lib/brand.ts`, novo)

Tudo o que é cor de marca decorativa ou precisa de cor literal em JavaScript (canvas e GSAP não leem classe Tailwind):

- `HEX_COLORS` (escala dos hexágonos, hoje em `components/motion/hex.tsx`) e o degradê da colmeia (`GRADIENT` e `DARK` do `page-transition.tsx`), mais um helper `rgbCss(rgb, alpha?)` para o canvas montar as strings de cor sem `rgb(` no componente.
- Os brilhos animados por GSAP: o pulso do logo na transição (ciano a 85%) e o brilho do logo da Home (ciano a 55%).
- `AVATAR_CORES`: as 6 cores da Seção 2.3 (sai o oliva e o ocre, e o verde passa a `#2a7553`).
- `EVENTO_FUNDOS`: os 3 degradês dos blocos de ícone dos eventos do Início, como strings de classe Tailwind (o Tailwind lê o arquivo e gera as classes), na família da marca: **ciano** (`#29cffe` a `#3bd4cc`, ícone `text-accent-foreground`), **azul da marca** (`#1a8fe3` a `#29c3dc`) e **petróleo** (`#0a736e` a `#0e9f97`), estes dois com ícone `text-foreground`. O `inicio/mock.ts` passa a guardar a chave (`"ciano" | "azul" | "petroleo"`), não a classe.

Do lado do CSS, as cores de marca usadas em classe ficam numa seção "marca" do `globals.css`: `--brand-gradient` (logo e `bg-accent-gradient`), `--brand-title-gradient` (título "SkillHub" da Home, `#2dbfda`, `#3bd4cc`, `#93e7e2`), `--brand-spotlight` (holofote das telas de entrada) e `--glow-logo` (brilho do logo, `#29c3dc` a 45%).

### 1.3. `tailwind.config.mts`

Sai o bloco `colors` (`base`, `surface`, `accent` com hex), que é código morto (Seção 0). O `backgroundImage["accent-gradient"]` passa a `var(--brand-gradient)`. As fontes não mudam. **Esse arquivo não está na lista do documento**; incluí porque tem hex e porque o `surface` dele colidiria com o token `--surface` novo.

## 2. Arquivos

Todos os caminhos são relativos a `frontend/src/`, salvo indicação. A coluna "De → para" segue o mapa 2.4 do documento.

### 2.1. Criar

| Arquivo | Conteúdo |
|---|---|
| `lib/brand.ts` | Seção 1.2. |
| `frontend/scripts/check-contrast.mjs` | O arquivo da raiz, movido sem alteração de valores. O da raiz é apagado. |
| `frontend/scripts/check-cores.mjs` | Varredor do item 6 (Seção 4). |

### 2.2. Alterar: base e configuração

| Arquivo | Alteração |
|---|---|
| `app/globals.css` | Tokens da Seção 1.1 (`:root` claro provisório, `.dark` escuro), seção de marca, `@theme inline` com as classes novas, variáveis do shadcn apontando para os tokens, gradiente do `body` por variável. Comentário no topo apontando para `scripts/check-contrast.mjs`. |
| `frontend/tailwind.config.mts` | Seção 1.3. |
| `frontend/package.json` | Só os scripts `check:contrast` e `check:cores`. **Nenhuma dependência.** |

### 2.3. Alterar: componentes compartilhados (mudam uma vez e propagam)

| Arquivo | De → para |
|---|---|
| `components/ui/cta-button.tsx` | `bg-[#3bd4cc] text-white` → `bg-accent text-accent-foreground hover:bg-accent-hover`; sombra → `--shadow-cta`; sai o `hover:brightness-110`. Texto do celular: pergunta 2. |
| `components/ui/content-card.tsx` | borda → `border-glass-border`, `bg-black/30` → `bg-card-fill`, sombra → `--shadow-card`. |
| `components/ui/glass-card.tsx` | claro: `bg-glass`, `border-glass-border`, `--shadow-glass`. Escuro: `bg-glass-strong`, `border-glass-strong-border`, `--shadow-popover`. |
| `components/ui/button.tsx` | variante `skillhub`: `bg-[#101010] text-white hover:bg-[#101010]` → `bg-background text-foreground hover:bg-background`. |
| `components/ui/dialog.tsx` | `bg-black/70` → `bg-overlay` (só se a decisão 4 for aprovada). |
| `components/ui/sonner.tsx` | `--normal-bg/text/border` → `var(--glass-strong-bg)`, `var(--foreground)`, `var(--glass-strong-border)`; ícone info → `text-accent-text`. O `theme="dark"` fixo fica (é da 16.4). |
| `components/app/navegacao.ts` | `NAV_VIDRO` → `border-glass-border bg-nav shadow-(--shadow-glass)` (o blur continua). |
| `components/app/sidebar.tsx` | item ativo → `bg-accent-soft border-accent-soft-border text-accent-text`; brilho → `--glow-active`; inativo `rgb(212,233,255)` → `text-foreground-secondary` (ver Seção 5); moeda → `bg-accent-gradient text-accent-foreground shadow-(--glow-coin)`; `#9f9f9f` → `text-muted-foreground`. |
| `components/app/bottom-nav.tsx` | ativo `#3bd4cc` → `text-accent-text`; inativo `#d8d8d8` → `text-foreground-secondary`; brilho → `--glow-active`; comentário com hex reescrito. |
| `components/app/credits-chip.tsx` | vidro → `bg-glass border-glass-border shadow-(--shadow-glass)`; anel `ring-offset-[#101010]` → `ring-offset-background`; moeda → `text-accent-foreground`, `--glow-coin`, `--glow-coin-lg`; `#9f9f9f` → `text-muted-foreground`. |
| `components/app/app-header.tsx` | `ring-offset-[#101010]` → `ring-offset-background`; `text-[#3bd4cc]` → `text-accent-text`; `text-white` → `text-foreground`. |
| `components/app/page-title.tsx`, `section-header.tsx` | `#d9d9d9` → `text-foreground-secondary`; `#8a8a8a` → `text-muted-foreground`. |
| `components/app/servico-card.tsx` | `#e0e0e0` → `text-foreground`; `#8a8a8a` → `text-muted-foreground`. |
| `components/app/produto-card.tsx` | `#2e2e2e` (fundo e borda) → `bg-surface-2 border-surface-2`; `#8a8a8a` → `text-muted-foreground`. |
| `components/app/scroll-row.tsx` | ponto inativo `#5a5a5a` → `bg-field`; ativo `bg-white` → `bg-foreground`. |
| `components/app/search-bar.tsx` | foco `#3bd4cc/60` → `border-accent/60`; `#c9c9c9` → `text-foreground-secondary`; placeholder → `placeholder:text-muted-foreground`. |
| `components/app/filter-chip.tsx` | `#3bd4cc` (borda, anel, check) → `border-accent/70`, `ring-accent`, `text-accent-text`; `#c9c9c9` → `text-foreground-secondary`. |
| `components/app/avatar.tsx` | as 8 cores → `AVATAR_CORES` de `lib/brand.ts` (6 cores). |
| `components/app/delete-account-dialog.tsx` | botão `#d93b3b`/`#e54848` → `bg-danger-fill text-danger-fill-foreground hover:brightness-110`; `#ff6b6b` → `text-danger`; `#c9c9c9` → `text-foreground-secondary`; `#9f9f9f` → `text-muted-foreground`. |
| `components/app/perfil/profile-dialog.tsx` | botão `bg-[#3bd4cc] text-[#101010]` → `bg-accent text-accent-foreground hover:bg-accent-hover` (mesmo tamanho de hoje); vidro → `bg-glass-strong shadow-(--shadow-popover)`; `#a0a0a0` → `border-field`; `#8a8a8a`, `#9f9f9f` → `muted`; `#c9c9c9` → `secondary`; `#ff6b6b` → `danger`. |
| `components/app/perfil/edit-curriculo-dialog.tsx`, `edit-nome-dialog.tsx`, `edit-qualidades-dialog.tsx` | botões ciano como acima; `#101010` → `bg-background`; `#a0a0a0` → `border-field`; `#3bd4cc` em texto → `text-accent-text`; cinzas pelo mapa. |
| `components/Button1/index.tsx` | `bg-zinc-100` → `bg-foreground`; `group-hover:text-[#101010]` → `group-hover:text-background`. |
| `components/brand/skillhub-logo.tsx` | brilho → `drop-shadow-(--glow-logo)`. |
| `components/motion/hex.tsx` | `HEX_COLORS` vai para `lib/brand.ts` (os imports de `app/(auth)/page.tsx` e `auth-background.tsx` passam a vir de lá). |
| `components/motion/page-transition.tsx` | `GRADIENT`, `DARK`, pulso do logo e cor do modo "menos movimento" vêm de `lib/brand.ts`; as strings do canvas usam `rgbCss`; `bg-[#101010]` → `bg-background`. Com o PR #6: barra → `shadow-(--glow-line)`. **Animações iguais.** |
| `components/auth/auth-ui.tsx` | linha `#a0a0a0` → `bg-field`, linha de erro `#ff6b6b` → `bg-danger`; traço de foco → `shadow-(--glow-line)`; `#ff6b6b` → `text-danger`; `#828282`, `#8a8a8a` → `muted`; `option` `#101010` → `bg-background`. |
| `components/auth/auth-background.tsx` | `bg-[#101010]` → `bg-background`; holofote → `bg-(image:--brand-spotlight)`. |
| `components/auth/profile-card.tsx` | selecionado `#0015ff` → `border-accent` e `text-accent-text`; selo de check → `bg-accent text-accent-foreground shadow-(--shadow-check)`; não selecionado `#4a4a4a` → `border-glass-border`; círculo `#e3e3e3` com ícone `#101010` → `bg-foreground text-background`; `#e3e3e3` em texto → `text-foreground`; comentário com hex reescrito. |
| `components/auth/social-buttons.tsx` | Google `#e3e3e3`/`#c9c9c9` → `bg-foreground hover:bg-foreground-secondary text-background`; Discord `#101010`/`#1d1d1d` → `bg-background hover:bg-surface-2 border-foreground`. Os ícones oficiais não são recoloridos. |

### 2.4. Alterar: páginas

| Arquivo | De → para |
|---|---|
| `app/(app)/layout.tsx` | `bg-[#101010]` → `bg-background`; fundo do Perfil por `--bg-profile-from/to`; comentário com hex reescrito. |
| `app/(app)/inicio/page.tsx` | botão dos eventos `#00a61e` → `ctaButtonClass` (critério "mesmo botão"); título `#ffd900` → pergunta 3; card dos eventos `#0c0c0c` → `bg-surface shadow-(--shadow-raised)`; ícone do evento → classes de `EVENTO_FUNDOS`; `#b3b3b3`, `#d9d9d9` → `secondary`; `#e6e6e6` → `foreground`; `#656766`, `#8a8a8a` → `muted`; fundo da imagem do produto `#5f5f5f` → `bg-surface-2`. |
| `app/(app)/inicio/mock.ts` | as classes de degradê viram a chave de `EVENTO_FUNDOS`. |
| `app/(app)/produtos/page.tsx` | banner: pergunta 1; links `#3bd4cc` → `text-accent-text`; cinzas pelo mapa. |
| `app/(app)/servicos/page.tsx`, `comunidade/page.tsx` | `#3bd4cc` → `text-accent-text` ou `border-accent/70`; cinzas pelo mapa. |
| `app/(app)/configuracoes/page.tsx` | vidro → `bg-glass-strong`; `#ff6b6b` → `text-danger`, `hover:bg-danger/10`; cinzas pelo mapa. |
| `app/(app)/perfil/profile-hero.tsx` | selo da câmera `#63a6ff` → `bg-accent` com ícone `text-accent-foreground` e `--shadow-badge`; `#101010` → `bg-background`; borda `#8f8f8f` → `border-muted-foreground`; curva SVG → `--curve-from/mid`; `#ff6b6b` → `text-danger`; `#8a8a8a` → `muted`. |
| `app/(app)/perfil/section-title.tsx`, `curriculo-section.tsx` | cinzas pelo mapa; `#ff6b6b` → `text-danger`. |
| `app/(app)/perfil/page.tsx`, `competencias-section.tsx` | só `text-white` e `bg-white/…` → `text-foreground`, `bg-foreground/…` (decisão 4). |
| `app/(auth)/page.tsx` | título → `bg-(image:--brand-title-gradient)`; brilho do logo (GSAP) → `lib/brand.ts`. |
| `app/(auth)/login/login-form.tsx`, `cadastro/cadastro-flow.tsx`, `esqueci-senha/forgot-password-form.tsx`, `redefinir-senha/reset-password-form.tsx`, `auth/callback/oauth-callback.tsx` | `#8a8a8a`, `#8f8f8f` → `muted`; `#b3b3b3` → `secondary`; borda `#8a8a8a` do checkbox → `border-field`; `#ff6b6b` → `text-danger`. |

**Em todos os arquivos:** `text-white` → `text-foreground`; `hover:text-white` → `hover:text-foreground`; `bg-white/N` → `bg-foreground/N`; `border-white` → `border-foreground` (decisão 4). Os cinzas seguem o mapa 2.4: `#8a8a8a`, `#9f9f9f`, `#a0a0a0`, `#8f8f8f`, `#9a9a9a`, `#828282`, `#6f6f6f`, `#656766` → `text-muted-foreground` (ou `field` quando for linha); `#b3b3b3`, `#c9c9c9`, `#d8d8d8`, `#d9d9d9` → `text-foreground-secondary`; `#e0e0e0`, `#e3e3e3`, `#e6e6e6` → `text-foreground`.

### 2.5. Alterar: documentação

| Arquivo | Alteração |
|---|---|
| `SKILLHUB_DESIGN_SYSTEM.md` | Seção nova "8. Paleta e regra de cor (Fase 16.3)", com a Seção 1 do documento resumida, a tabela 2.1 e a lista de classes. As Seções 1, 2.2 e 6 ganham a marca "substituída pela Seção 8" no ponto obsoleto. Nada é apagado. |
| `CHANGELOG_MIGRACAO.md` | Entrada "Fase 16.3" no formato das anteriores. |

### 2.6. Não tocar (explicitamente)

- Backend inteiro, `lib/api.ts`, `stores/*`, `lib/mock/*`, rotas, textos, tamanhos e espaçamentos (fora a pergunta 2).
- `app/layout.tsx`: a classe `dark` fixa fica, e não entra provedor de tema (é da 16.4).
- `e2e/fluxos.mjs`: o varredor vira script próprio (Seção 4). **Exceção aprovada em 15/10/2026 durante a implementação:** só a linha 63, o seletor do helper `errTexts`, que procurava a classe da cor antiga (`p.text-[#ff6b6b]`) e passa a `p.text-danger`.
- `designs/*.png`, `.env*`, `e2e/.libs`. Nenhuma dependência nova.

## 3. Validador de contraste e sincronia com o `globals.css`

`check-contrast.mjs` vai para `frontend/scripts/` sem mudar valores, com `npm run check:contrast`. Para os valores não divergirem, o `check-cores.mjs` (Seção 4) também confere a sincronia: lê os tokens do `.dark` e do `:root` no `globals.css` e compara com a tabela `T` do `check-contrast.mjs`, reprovando se algum valor for diferente. A tabela do script continua sendo a fonte da verdade, e ninguém precisa conferir à mão. Além disso, um comentário no topo do `globals.css` aponta para o script.

## 4. Teste de regressão de cor (item 6)

`frontend/scripts/check-cores.mjs`, rodado por `npm run check:cores`, sem dependências (só `node:fs`):

- Varre `frontend/src` e reprova se encontrar `#hex`, `rgb(` ou `rgba(` em qualquer arquivo, inclusive em comentários, para a regra ser simples.
- Também reprova classes da paleta fixa do Tailwind (`text-white`, `bg-black/…`, `bg-zinc-…` e afins), se a decisão 4 for aprovada.
- **Exceções, só duas:** `app/globals.css` e `lib/brand.ts`.
- Faz a conferência de sincronia da Seção 3.
- Sai com código 1 e lista arquivo, linha e trecho de cada ocorrência.

Recomendo script próprio em vez de um teste no `e2e/fluxos.mjs`: ele não precisa de navegador nem do docker, roda em menos de um segundo e pode ir para o CI depois.

## 5. Diferenças visuais esperadas (para conferir nas capturas)

Todas vêm do mapa 2.4 ou das perguntas em aberto. Layout, posições e tamanhos não mudam (fora a pergunta 2).

- **Botões:**
  - "Saiba Mais", eventos e Produtos: texto escuro sobre ciano. Os eventos deixam de ser verdes e Produtos deixa de ser laranja.
  - Botões dos diálogos: `#101010` passa a `#08201e`.
  - Excluir conta: `#d93b3b` passa a `#c62f2f`.
- **Textos:**
  - Branco: passa a `#f2f4f4`.
  - Cinzas: unificados em três níveis.
  - Erros: `#ff6b6b` passa a `#ff7b7b`.
  - Título dos eventos: deixa de ser amarelo.
- **Linhas e bordas:**
  - Sublinhado dos campos e bordas de diálogo: `#a0a0a0` passa a `#6b7574`, mais escuro, porém acima do mínimo de 3:1.
  - Borda do perfil selecionado no cadastro: deixa de ser azul e fica ciano.
- **Menus:**
  - Inativo da sidebar: `#d4e9ff` passa a `#b8c0bf`, igual ao inativo do menu inferior. Antes os dois menus usavam cinzas diferentes para o mesmo papel.
- **Superfícies:**
  - Card de produto: `#2e2e2e` passa a `#1b1b1b`.
  - Fundo da imagem antes de carregar: `#5f5f5f` passa a `#1b1b1b`.
  - Selo da câmera: deixa de ser azul e fica ciano.
- **Avatares:** verde, oliva e ocre trocados pelas cores novas.
- **Banner de Produtos:** pergunta 1.

## 6. Verificação planejada

- `node scripts/check-contrast.mjs` e `npm run check:contrast`: "Todos os pares passaram".
- `npm run check:cores`: nenhuma ocorrência fora das duas exceções.
- `npx tsc --noEmit` (frontend e backend), `npx eslint .`, `next build` e `./e2e/run.sh` verdes.
- Capturas de página inteira **antes** (na base da branch) e **depois** das 6 páginas a 375, 440, 1280 e 1440px, com o método da Fase 15 (script Playwright no scratchpad, fora do repositório, usuário com 0 crédito e espera do fim do splash). Também vou capturar `/`, `/login` e `/cadastro`, que mudam por causa do perfil selecionado e dos erros. As capturas vão lado a lado, com a lista de diferenças da Seção 5.
- Animações: conferir a colmeia, as telas de entrada e a transição suave (PR #6) com quadros no meio da animação, como no PR #6.

## 7. Perguntas em aberto

### Do documento

1. **Banners de Produtos seguem a paleta da marca ou ficam como no mockup?** Recomendo **seguir a marca**. O banner é hoje o único bloco claro com roxo, laranja e azul no meio de uma tela escura, e o botão laranja reprova (3,03:1). Pelo mapa 2.4:
   - fundo `#f4f4f8` → `surface-2`
   - título `#1e1b4b` → `foreground`
   - descrição `#475569` → `foreground-secondary`
   - listras e realce roxos → `accent` e `accent-text`
   - ícone azul → `accent-text`
   - botão → `ctaButtonClass`

   O banner deixa de ser claro e vira um cartão escuro com listras ciano.
2. **Texto dos botões: subir de 10px para 12px no celular?** Recomendo **subir**. No `ctaButtonClass`, o celular passa de `text-[10px]` para `text-[12px]`. `sm` (12px) e `lg` (13px) ficam iguais. Os dois botões do Início que sobrescrevem com 11px também passam a 12px, para os três serem o mesmo botão. As larguras fixas continuam: "Acesse Já" e "Ler agora" cabem nos 89px a 12px. O "Saiba Mais" do Início tem altura fixa e não muda. O botão dos eventos usa `py-[4px]`, então fica cerca de 1px mais alto. Ao passar a usar o `ctaButtonClass`, ele também troca o raio de 2px por 5px e ganha a sombra do botão principal, porque passa a ser o mesmo botão.
3. **Título dos eventos: `text-foreground` ou `accent-text`?** Recomendo **`text-foreground`**. O ciano fica reservado para ação e item ativo (regra 1). Num título que não é clicável, ele faria o usuário procurar um link.

### Minhas (para você confirmar)

4. **Classes da paleta fixa do Tailwind entram na 16.3?** São cerca de 110 usos em 39 arquivos, como `text-white`, `bg-white/5`, `bg-black/35`, `bg-zinc-100` e `border-white`. Só 3 desses arquivos estão fora da lista dos 48: `perfil/page.tsx`, `perfil/competencias-section.tsx` e `ui/dialog.tsx`. O varredor do documento não as pega, porque não são hex nem `rgb()`. Mas são cor escrita à mão do mesmo jeito: no tema claro, `text-white` fica branco sobre branco e a 16.5 quebraria. Recomendo **incluir**, com o varredor reprovando essas classes também.
5. **Sombras com valor próprio:** criei um token por valor distinto (Seção 1.1) para o escuro não mudar nada. Dá para unificar os dois selos (`--shadow-badge` e `--shadow-check`) num token só, mas isso muda de leve a sombra do check do cadastro. Recomendo **não unificar agora**, para cumprir "nenhuma mudança visual no escuro".
6. **Base da branch:** recomendo **depois do merge do PR #6** (Seção 0.1).

## 8. Achados fora de escopo

- O overlay da transição de páginas e o fundo das telas de entrada usam `bg-background`, que no tema claro ficaria claro, enquanto o canvas da colmeia desenha ladrilhos escuros. Isso é para decidir na 16.4 (pergunta 3, telas de entrada) e na 16.5, não aqui.
- As variáveis `--sidebar-*` e `--chart-*` do shadcn ficam definidas sem uso. Podem sair numa limpeza futura.
- Na raiz, ao lado do `check-contrast.mjs`, existe um `check-contrast.mjs:Zone.Identifier` (sobra do Windows). Vale apagar antes de começar.
