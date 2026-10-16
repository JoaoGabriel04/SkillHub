# SkillHub: paleta de cores, contraste e tema claro/escuro (Fases 16.3, 16.4 e 16.5)

> Documento de instruções para o Claude Code. Vai na raiz do projeto, ao lado do `SKILLHUB_SIDEBAR_E_DOMINIO.md` e do `SKILLHUB_DESIGN_SYSTEM.md`.
> **Todas as regras da Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md` valem aqui** (porta de aprovação, o que nunca fazer, padrões do projeto, verificação mínima). Este documento só acrescenta o que é específico de cor e tema.
> **Nada de código é escrito sem aprovação explícita do João Gabriel.**
> Arquivo que acompanha este documento: `check-contrast.mjs` (validador de contraste da paleta). O João Gabriel o coloca na raiz do projeto antes de começar; a subfase 16.3 o move para `frontend/scripts/`.

**Antes de começar:** o João Gabriel precisa ter enviado ao GitHub a mudança de animação do menu lateral que está só no computador dele. Se `git status` mostrar alterações não commitadas, **pare e avise**, para esta fase não misturar duas coisas.

---

## 0. Diagnóstico (medido no código de `main`, commit `d6d30f5`)

### 0.1. O problema das cores

O código tem **48 arquivos com cor escrita à mão** (`#hex` ou `rgba()` dentro dos componentes) e **cerca de 60 hexadecimais diferentes**. Só o cinza aparece em mais de uma dúzia de tons (`#8a8a8a` 30 vezes, `#9f9f9f` 16, `#d9d9d9` 11, `#e3e3e3`, `#c9c9c9`, `#b3b3b3`, `#a0a0a0`, `#8f8f8f`...). Além do ciano da marca, há verde, amarelo, laranja, roxo, dois azuis e dois vermelhos disputando atenção.

Contraste medido (razão WCAG 2.x; o mínimo é 4,5 para texto normal e 3 para texto grande e ícones):

| Onde | Cores | Razão | Resultado |
|---|---|---|---|
| Botão "Saiba Mais" (`CtaButton`, `ctaButtonClass`) | texto branco em `#3bd4cc` | **1,83** | **reprovado** (é o "ciano quase ilegível") |
| Botão dos eventos do Início | texto branco em `#00a61e` | **3,24** | **reprovado**, e é uma terceira cor de ação |
| Botão do banner de Produtos | texto branco em `#f26b3a` | **3,03** | **reprovado** |
| Borda do perfil selecionado (cadastro) | `#0015ff` em `#101010` | **2,31** | **reprovado** |
| Realce roxo do banner de Produtos | `#8b5cf6` em `#f4f4f8` | 3,86 | reprovado para texto |
| Iniciais dos avatares (verde, oliva, ocre) | branco em `#2f8f6a`, `#6a8f2f`, `#8f7a2f` | 3,99, 3,76, 4,21 | **reprovados** |
| Botão excluir conta | branco em `#d93b3b` | 4,53 | passa por pouco |
| Botões de diálogos (Perfil) | `#101010` em `#3bd4cc` | **10,40** | aprovado (o jeito certo) |

Conclusão: **o próprio projeto já tem a solução certa em um lugar** (os diálogos do Perfil usam texto escuro sobre o ciano, 10,40:1) e as variáveis `--primary-foreground` e `--accent-foreground` do tema já apontam para `#1a1a1a`. O `CtaButton` é que foge da regra.

### 0.2. O problema do tema

- O `<html>` tem a classe `dark` fixa em `app/layout.tsx`, e `components/ui/sonner.tsx` diz "tema fixo dark, sem next-themes".
- O bloco `:root` (claro) de `app/globals.css` é o padrão neutro do shadcn, sem a marca (o `--accent` claro é cinza, o escuro é ciano). Nunca foi usado.
- Fundos, vidros e sombras são cores escritas direto nos componentes (`bg-[#101010]`, `bg-black/30`, `ContentCard`, `GlassCard`, `NAV_VIDRO`, gradiente do `body` em `globals.css`). Nada disso muda com a classe `dark`, então **o tema claro não existe nem como possibilidade** enquanto as cores não virarem tokens.

## 1. A regra de cor do SkillHub (decisão de design desta fase)

1. **Uma única cor de ação: o ciano da marca `#3bd4cc`.** Todo botão principal, link ativo, anel de foco e destaque usa o ciano. Acabam o verde dos eventos, o laranja de Produtos, o roxo, o amarelo e o azul puro.
2. **Texto sobre ciano é sempre escuro** (`#08201e`, 9,29:1). **Nunca branco sobre ciano.**
3. **Ciano como texto ou ícone sobre fundo claro** usa uma versão mais escura (`#0a736e`, 5,28:1), porque o ciano puro tem só 1,8:1 sobre branco. É por isso que existem dois tokens: `accent` (preenchimento) e `accent-text` (texto e ícone).
4. **Neutros em três níveis de texto** (principal, secundário, discreto) no lugar de uma dúzia de cinzas.
5. **Vermelho, verde e âmbar só para estado** (erro, sucesso, aviso). Nunca como decoração ou como cor de botão comum.
6. **Cor nunca diz sozinha:** estado também aparece em texto ou ícone (regra já usada no projeto).
7. **Nenhuma cor escrita à mão nos componentes** depois da 16.3. Tudo sai de um token.

## 2. Paleta (valores validados; fonte da verdade: `check-contrast.mjs`)

### 2.1. Tokens

| Token (variável CSS) | Escuro | Claro | Uso |
|---|---|---|---|
| `--background` | `#101010` | `#f4f7f7` | fundo da página |
| `--surface` | `#0c0c0c` | `#ffffff` | cards (valor efetivo; o card escuro continua translúcido sobre o fundo) |
| `--surface-2` | `#1b1b1b` | `#e9efee` | superfícies elevadas, popovers, faixas |
| `--foreground` | `#f2f4f4` | `#0f1a19` | texto principal |
| `--foreground-secondary` | `#b8c0bf` | `#3f4f4d` | texto secundário (descrições) |
| `--muted-foreground` | `#8f9897` | `#5a6866` | texto discreto (rótulos, placeholders) |
| `--accent` | `#3bd4cc` | `#3bd4cc` | preenchimento do botão principal e destaques |
| `--accent-foreground` | `#08201e` | `#08201e` | texto sobre `--accent` |
| `--accent-hover` | `#62e0d9` | `#62e0d9` | hover do botão principal |
| `--accent-text` | `#3bd4cc` | `#0a736e` | texto, link, ícone e item ativo |
| `--accent-soft` | ciano a 12% | ciano a 16% | fundo do item ativo da navegação |
| `--accent-soft-border` | ciano a 40% | `#0a736e` a 40% | borda do item ativo |
| `--danger` | `#ff7b7b` | `#b3261e` | erro em texto |
| `--danger-fill` | `#c62f2f` | `#c62f2f` | botão perigoso (texto branco, 5,46:1) |
| `--success` | `#4ade80` | `#137a3f` | sucesso em texto |
| `--warning` | `#f5b942` | `#8a5a00` | aviso em texto |
| `--border-input` | `#6b7574` | `#76837f` | borda de campo (sublinhado dos inputs), mínimo 3:1 |
| `--glass-border` | `#b0b0b0` a 33% | `#0f1a19` a 14% | borda dos cards e menus de vidro (decorativa) |

Efeitos de vidro, sombras e fundos também viram tokens (`--glass-bg`, `--shadow-card`, `--shadow-nav`, `--bg-gradient-from/to`, `--bg-profile-from/to`), com os valores **escuros idênticos aos atuais** (nenhuma mudança visual no escuro além das cores corrigidas). Os valores claros são provisórios e são acertados **na tela, com o João Gabriel**, na 16.5. Ponto de partida: card branco com borda `#0f1a19` a 14% e sombra suave (`0 1px 2px` e `0 8px 24px`, `#0f1a19` a 8% e 6%), menu lateral branco translúcido com blur, fundo `#f4f7f7` indo a `#e9efee`, perfil de `#f4f7f7` a `#dfe8e7`.

### 2.2. Cores de marca decorativas (sem texto sobre elas)

Ficam como constantes de marca (um único módulo, por exemplo `lib/brand.ts`, e variáveis CSS para o que for CSS): degradê do logo `#29cffe` a `#3bd4cc`, e a escala dos hexágonos da transição de páginas (`#1a8fe3`, `#29c3dc`, `#3bd4cc`, `#93e7e2`, hoje em `components/motion/hex.tsx`). São família ciano e azul da própria marca, então **ficam**. As animações continuam funcionando igual nos dois temas.

### 2.3. Avatares

As cores de identidade das iniciais passam a este conjunto de 6, **todas com 4,5:1 ou mais com letra branca**: `#2f6f8f`, `#8f5a2f`, `#4a5a8f`, `#7c4a8f`, `#8f2f4a`, `#2a7553`. Saem o oliva (`#6a8f2f`) e o ocre (`#8f7a2f`), e o verde passa de `#2f8f6a` para `#2a7553`. Vale nos dois temas.

### 2.4. De onde para onde (mapa de migração)

| Hoje (em componentes) | Passa a ser |
|---|---|
| `bg-[#3bd4cc]` com `text-white` (`CtaButton`, `ctaButtonClass`) | `bg-accent text-accent-foreground hover:bg-accent-hover` |
| `bg-[#3bd4cc] text-[#101010]` (diálogos do Perfil) | os mesmos tokens do botão principal |
| `bg-[#00a61e]`, `hover:bg-[#00bf23]` (eventos do Início) | o mesmo botão principal em ciano |
| `bg-[#f26b3a]` (banner de Produtos) | o mesmo botão principal em ciano |
| `text-[#ffd900]` (título dos eventos) | `text-foreground` |
| `#8b5cf6` (listras e realce do banner de Produtos) | `accent` e `accent-text` |
| `#1e1b4b`, `#f4f4f8`, `#475569`, `#3b82f6` (banner de Produtos) | `foreground`, `surface-2`, `foreground-secondary`, `accent-text` |
| `#0015ff` (perfil selecionado, cadastro) | `accent` na borda, `accent-text` no texto |
| `#63a6ff` (selo de câmera do perfil) | `bg-accent` com ícone `text-accent-foreground` |
| `text-[#ff6b6b]`, `bg-[#ff6b6b]` (erros) | `text-danger` e a cor de erro da linha |
| `bg-[#d93b3b]`, `#e54848` (excluir conta) | `bg-danger-fill text-white`, com hover por `brightness` |
| `#8a8a8a`, `#9f9f9f`, `#a0a0a0`, `#8f8f8f`, `#9a9a9a`, `#828282`, `#6f6f6f` | `text-muted-foreground` (ou `border-input` quando for linha) |
| `#b3b3b3`, `#c9c9c9`, `#d8d8d8`, `#d9d9d9` | `text-foreground-secondary` |
| `#e0e0e0`, `#e3e3e3`, `#e6e6e6`, `#ffffff` em texto | `text-foreground` |
| `#101010`, `#1a1a1a`, `#0c0c0c`, `#1b1b1b`, `#222222`, `#282828`, `#2e2e2e`, `#343434`, `#595959` (fundos) | `background`, `surface`, `surface-2` ou os tokens de vidro e de fundo |
| gradientes dos blocos de ícone dos eventos (`mock.ts`: azul, laranja) | família da marca: ciano, azul da marca e verde-azulado escuro, com ícone `text-accent-foreground` onde o fundo for claro |
| `rgba(59,212,204,…)` (brilho, item ativo) | `accent` com opacidade, via token |

**Exceção única:** `#b0b0b0` a 33% é a borda de vidro do Figma e vira `--glass-border`, não some.

---

# FASE 16.3: paleta de marca e contraste (ainda só tema escuro)

Branch sugerida: `feat/paleta-cores`.

**Objetivo:** criar a camada de tokens, trocar **todas** as cores escritas à mão pelos tokens e corrigir os pares reprovados. **O tema continua escuro e nada muda de tamanho, de posição ou de texto.** As únicas diferenças visuais permitidas são as cores corrigidas da tabela 2.4 e a unificação dos cinzas.

### O que fazer

1. **Tokens.** Em `app/globals.css`, defina as variáveis da Seção 2.1 (valores escuros no `.dark`, claros provisórios no `:root`) e mapeie para o Tailwind em `@theme inline` (`bg-surface`, `text-foreground-secondary`, `text-accent-text`, `bg-danger-fill`...). **No plano**, proponha os nomes finais das classes se achar melhor, mantendo a semântica. As variáveis do shadcn que já existem (`--primary`, `--ring`, `--border`...) passam a **apontar para os tokens novos**, para os componentes `ui/` do shadcn herdarem a paleta sem edição manual.
2. **Constantes de marca** (Seção 2.2) e **cores dos avatares** (Seção 2.3) em um módulo único.
3. **Substituir** as cores dos componentes conforme o mapa 2.4. Os componentes compartilhados (`CtaButton`, `ContentCard`, `GlassCard`, `NAV_VIDRO`, `Sidebar`, `BottomNav`, `CreditsChip`, `AppHeader`) mudam **uma vez** e propagam.
4. **`ctaButtonClass`**: texto escuro sobre ciano (Seção 1, regra 2). O botão verde dos eventos e o laranja de Produtos passam a usar `ctaButtonClass` em vez de classes próprias, para existir **um** botão principal.
5. **Validador.** Mover `check-contrast.mjs` para `frontend/scripts/` e criar o script `npm run check:contrast` no `package.json` do frontend. Os valores do script **têm de ser iguais** aos de `globals.css` (o plano diz como você garante isso; uma opção simples é um comentário em `globals.css` apontando para o script e a conferência manual no checklist).
6. **Teste de regressão de cor.** Um teste simples (no `e2e/fluxos.mjs` ou em script próprio) que varre `frontend/src` e **reprova se encontrar `#hex` ou `rgb()` em arquivo de componente ou página** (exceto `globals.css`, o módulo de marca e a lista de exceções do plano).
7. **Documentar** a paleta e a regra de cor em uma seção nova do `SKILLHUB_DESIGN_SYSTEM.md` (a Seção 1 deste documento, resumida, e a tabela 2.1). **Sem apagar** o que já existe nesse arquivo; marque como "substituída pela Seção X" o que a nova paleta tornar obsoleto (ex.: os valores do menu inferior e do chip).

### Arquivos desta subfase

Alterar: `app/globals.css`, todos os arquivos de `components/` e `app/` que hoje têm cor escrita à mão (a lista exata sai de `grep -rlE "#[0-9a-fA-F]{3,8}|rgba?\(" frontend/src`, e **o plano a traz arquivo por arquivo**), `package.json` do frontend, `e2e/fluxos.mjs` (só o teste do item 6), `SKILLHUB_DESIGN_SYSTEM.md`, `CHANGELOG_MIGRACAO.md`.
Criar: `frontend/scripts/check-contrast.mjs`, o módulo de marca.
**Não tocar:** backend, `lib/api.ts`, stores, textos, tamanhos, espaçamentos, rotas, e o **tema continua fixo em escuro** (sem provedor de tema ainda).

### Perguntas em aberto da 16.3 (responder no plano e esperar a resposta)

1. **Banners de Produtos.** Hoje são cartões claros com listras roxas, botão laranja e ícones azuis (vêm do Figma). Seguem a paleta da marca (recomendado) ou ficam como no mockup?
2. **Tamanho do texto dos botões.** O `CtaButton` usa 10px no celular. O mínimo confortável é 12px. Subir para 12px no celular (recomendado; pode alterar a largura de alguns botões) ou manter 10px e só corrigir a cor?
3. **Título dos eventos.** Passa de amarelo para `text-foreground` (recomendado) ou para `accent-text`?

### Critérios de aceite da 16.3

- [ ] `node scripts/check-contrast.mjs` termina com "Todos os pares passaram" e `npm run check:contrast` funciona.
- [ ] O varredor do item 6 passa: nenhuma cor escrita à mão fora dos arquivos permitidos.
- [ ] Capturas de tela **antes e depois** das 6 páginas a 375, 440, 1280 e 1440px entregues ao João Gabriel, com a lista das diferenças. Sem mudança de layout (posições e tamanhos iguais, exceto o que a pergunta 2 aprovar).
- [ ] Botões "Saiba Mais", dos eventos e de Produtos são **o mesmo botão** (mesmo componente ou mesma classe) e têm texto escuro sobre ciano.
- [ ] Nenhum amarelo, verde de botão, laranja, roxo ou azul puro restou na interface (fora dos blocos decorativos da marca).
- [ ] As animações (colmeia, telas de entrada) continuam iguais.
- [ ] `tsc`, `eslint`, `next build` e `./e2e/run.sh` verdes.

---

# FASE 16.4: infraestrutura do tema claro/escuro

Branch sugerida: `feat/tema-infra`. **Só começa depois da 16.3 mergeada e de novo plano aprovado.**

**Objetivo:** o usuário poder escolher Claro, Escuro ou Sistema, a escolha ser lembrada e a página **não piscar** no carregamento. Ainda sem polimento visual do claro (isso é a 16.5).

### O que fazer

- **Mecanismo:** continua a estratégia de classe do shadcn (`html.dark`), que o `globals.css` já usa (`@custom-variant dark`). A classe fixa `dark` em `app/layout.tsx` sai e passa a ser definida pelo tema escolhido.
- **Sem piscada:** o tema precisa ser aplicado **antes da primeira pintura**. Antes de escrever, leia no `node_modules/next/dist/docs/` como o Next 16 trata scripts no `<head>` do layout raiz e `suppressHydrationWarning` no `<html>`, e explique no plano o que você achou.
- **Preferência:** `escuro`, `claro` ou `sistema`, guardada em `localStorage` (conveniência do navegador; **não** vai para o backend nesta fase, sem migration). Sempre dentro de `try/catch`, porque o acesso pode falhar.
- **Seletor:** em **Configurações**, nova linha "Aparência" com as três opções, no padrão visual dos itens de Configurações e com ícones FontAwesome (`faSun`, `faMoon`, `faCircleHalfStroke`) ou Lucide, **sem emojis**, acessível por teclado e com o estado marcado também em texto. Só isso de interface nova.
- **`sonner`:** `components/ui/sonner.tsx` passa a seguir o tema ativo (hoje é fixo).
- **Telas de entrada** (`/`, `/login`, `/cadastro`, redefinição de senha): ver pergunta 3.
- **Cor da barra do navegador** (`theme-color`) e `color-scheme` acompanham o tema.

### Perguntas em aberto da 16.4

1. **Biblioteca.** Usar `next-themes` (dependência nova; é a escolha padrão do shadcn e resolve a piscada) ou um provedor próprio pequeno (sem dependência, mais código nosso para manter)? O plano recomenda uma e justifica. **Não instale nada antes da resposta.**
2. **Tema padrão** para quem nunca escolheu: Escuro (recomendado, é a identidade do SkillHub e o que está nos desenhos) ou Sistema?
3. **Telas de entrada** sempre escuras nos dois temas (recomendado: o fundo animado e os efeitos foram desenhados para o escuro) ou também seguem o tema?

### Critérios de aceite da 16.4

- [ ] Trocar a opção muda o tema na hora, sem recarregar, e a escolha sobrevive a recarregar a página e a fechar o navegador.
- [ ] **Nenhuma piscada** do tema errado ao carregar (conferir com a rede lenta simulada e com cache desligado).
- [ ] Com "Sistema", o tema acompanha a preferência do sistema operacional, inclusive quando ela muda com a página aberta.
- [ ] `localStorage` bloqueado ou vazio não quebra nada (cai no padrão).
- [ ] Os toasts seguem o tema.
- [ ] `tsc`, `eslint`, `next build` e `e2e` verdes (incluindo um fluxo novo: alternar o tema em Configurações e conferir a classe do `html`).

---

# FASE 16.5: tema claro (acabamento visual)

Branch sugerida: `feat/tema-claro`. **Só começa depois da 16.4 mergeada e de novo plano aprovado.**

**Objetivo:** o tema claro ficar bonito e legível em todas as telas, com a mesma identidade do escuro.

### O que fazer

- Ajustar os tokens claros da Seção 2.1 **olhando cada tela** (6 páginas, a sidebar, o menu inferior, os diálogos, os toasts, o chip de créditos e o popover). O João Gabriel valida cada ajuste visualmente; **o plano lista as telas na ordem em que você vai ajustá-las**.
- Os efeitos de vidro (`ContentCard`, `GlassCard`, `NAV_VIDRO`, sidebar) ganham a versão clara pelos tokens, sem tocar nos componentes de novo.
- Imagens e brilhos pensados para fundo escuro (brilho ciano do logo, sombras pretas) são revistos no claro.
- **Validar contraste nos dois temas** com `check-contrast.mjs`, e abrir cada tela nos dois temas, a 375px e a 1440px.

### Critérios de aceite da 16.5

- [ ] As 6 páginas, a sidebar, o menu inferior, os diálogos e os toasts legíveis nos dois temas (capturas dos dois temas entregues).
- [ ] `check-contrast.mjs` passa nos dois temas.
- [ ] Nenhuma cor escrita à mão foi reintroduzida (o varredor da 16.3 continua passando).
- [ ] O tema escuro **não mudou** em relação ao fim da 16.3 (capturas idênticas byte a byte, ou diferenças listadas e aprovadas).
- [ ] `tsc`, `eslint`, `next build` e `e2e` verdes.

---

## Decisões em aberto (resumo para o João Gabriel)

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Banners de Produtos seguem a marca ou mantêm roxo e laranja do mockup | seguir a marca |
| 2 | Texto dos botões sobe de 10px para 12px no celular | subir |
| 3 | Título dos eventos: `foreground` ou `accent-text` | `foreground` |
| 4 | `next-themes` ou provedor próprio | `next-themes`, com sua aprovação |
| 5 | Tema padrão: Escuro ou Sistema | Escuro |
| 6 | Telas de entrada sempre escuras ou seguem o tema | sempre escuras |
| 7 | Atualizar o Figma com a nova paleta e uma versão clara das telas | sim, depois da 16.3 (posso fazer pelo Figma) |

## Como encerrar cada subfase

Responda ao João Gabriel com: o que foi feito, a lista de arquivos criados e alterados, o resultado de cada verificação, o que ele precisa conferir no navegador (com as capturas), os achados fora de escopo e o link do PR. **Não** comece a próxima subfase.
