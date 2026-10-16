# SkillHub: Sidebar desktop (Fase 16) e domínio de Serviços (Fase 17)

> Documento de instruções para o Claude Code. Vai na raiz do projeto, ao lado de `SKILLHUB_DESIGN_SYSTEM.md`.
> Continua a numeração do `CHANGELOG_MIGRACAO.md` (a última entrada é a Fase 15, responsividade desktop).
> Este documento cobre **duas fases**, e cada uma é dividida em subfases com a própria porta de aprovação.
> **Nada de código é escrito sem aprovação explícita do João Gabriel** (Seção 1).

Referência visual da Fase 16: Figma `https://www.figma.com/design/c9wpuGxs1l53mDn6lQXeXa/Skillhub`, frame **New Início - Desktop** (node `719:130`, 1440×900). O PNG do frame vai em `designs/New Início - Desktop.png` (o João Gabriel coloca o arquivo na pasta antes de começar).

---

## 0. Estado atual (conferido no repositório em 13/10/2026)

- `main` está no commit `81f4bed`. PRs #1, #2 e #3 mergeados, nenhuma issue ou branch aberta.
- **Backend:** Express 5 + TypeScript + Prisma 6 + PostgreSQL. Módulos prontos: `auth` e `user`. O `schema.prisma` só tem `User` e `PasswordResetToken`. Padrão de cada módulo: `*.schema.ts` (Zod), `*.repository.ts`, `*.service.ts`, `*.controller.ts` (com `handleError` local) e uma rota em `src/api/routes/`, registrada em `routes/index.ts`. Erros de negócio usam `AppError(mensagem, status)`. Autenticação: middleware `authenticate`, que preenche `req.userId`.
- **Frontend:** Next.js 16 (App Router), Tailwind, SWR, Zustand, axios (`lib/api.ts` com refresh automático), Lucide e FontAwesome. As telas Início, Serviços, Produtos, Comunidade, Perfil e Configurações existem, mas Serviços, Produtos, Comunidade e Início leem de `lib/mock/*` e `app/(app)/inicio/mock.ts`.
- **Navegação:** só existe o menu pill inferior (`components/app/bottom-nav.tsx`) mais o `AppHeader` (logo, chip de créditos, engrenagem). `app/(app)/layout.tsx` envolve tudo em `PageContainer` com `pb-[90px]`.
- **Créditos:** `User.credits` é `Int` com default 0. Não existe nenhuma forma de ganhar ou gastar créditos hoje. A tela formata com duas casas (`4,00`) só na exibição.
- **Testes:** `e2e/run.sh` (73 fluxos passando na Fase 15), `tsc --noEmit`, `eslint`, `next build`.

## 0.1. Roadmap (visão geral, só as Fases 16 e 17 são detalhadas aqui)

| Fase | Entrega | Objetivo da PIBITI que alimenta | Situação |
|---|---|---|---|
| **16** | Sidebar desktop e Início em layout desktop | Obj. 5 (protótipo testável) | **Detalhada abaixo** |
| **17** | Domínio de Serviços: publicar, candidatar, contratar, créditos, avaliar | Obj. 1, 2 e 4 (base de dados do matching e da reputação) | **Detalhada abaixo** |
| 18 | Produtos reais (model, endpoints, SWR) | Obj. 5 | Só roadmap, ganha documento próprio |
| 19 | Comunidade e Início reais (postagens, eventos, destaques) | Obj. 5 | Só roadmap |
| 20 | Papel Empresa e Dashboard-Empresa | Modelo de negócio B2B | Só roadmap |
| 21 | SkillMatch v1 (matching hiperlocal) | Obj. 1 | Só roadmap |
| 22 | ImpactScore e painel de KPIs | Obj. 2 e 4 | Só roadmap |

**Não inicie nenhuma fase do roadmap (18 em diante) por conta própria.** Cada uma só começa com documento próprio e aprovação.

---

## 1. Regras gerais (valem para toda subfase)

### 1.1. Porta de aprovação

Para **cada subfase** (16.1, 16.2, 17A, 17B...), siga sempre esta sequência e **pare** entre as etapas:

1. **Ler.** Leia este documento, o `SKILLHUB_DESIGN_SYSTEM.md`, o `CHANGELOG_MIGRACAO.md` e os arquivos citados na subfase. No frontend, leia antes o guia relevante em `frontend/node_modules/next/dist/docs/`, como pede o `frontend/AGENTS.md` (esta versão do Next tem mudanças que não estão no seu treinamento).
2. **Planejar.** Escreva `PLANO_<subfase>.md` (exemplo: `PLANO_16_1.md`) com: arquivos que serão criados, alterados e **explicitamente não tocados**, decisões que você tomou e as perguntas em aberto da subfase. **Não escreva código nem rode migration nesta etapa.** Pare e peça aprovação.
3. **Esperar a aprovação.** Só avance quando o João Gabriel escrever aprovação explícita ("aprovado", "pode seguir"). Silêncio, "ok, parece bom" sobre outro assunto ou aprovação de outra subfase **não valem**. Se ele responder as perguntas em aberto, registre as respostas no plano e peça aprovação de novo.
4. **Implementar** exatamente o que o plano aprovado descreve, em uma branch própria (nome sugerido em cada subfase), com commits pequenos.
5. **Verificar** (Seção 1.4) e **parar** para o João Gabriel conferir visualmente no navegador. Diga o que ele deve olhar.
6. **Registrar** a entrada no `CHANGELOG_MIGRACAO.md` (mesmo formato das Fases 14 e 15: data, status, branch, contexto, decisões tomadas na aprovação, tabelas de arquivos, validação).
7. **PR.** Abra o pull request da branch para `main` e **pare**. Quem faz o merge é o João Gabriel.

Se descobrir durante a implementação que o plano aprovado não funciona, **pare e explique**. Não improvise uma solução diferente em silêncio.

### 1.2. O que nunca fazer

- Nunca fazer push direto em `main`, nunca `git push --force`, nunca mergear PR, nunca fazer deploy.
- Nunca mexer em arquivo fora da lista do plano aprovado. "Aproveitar para arrumar" outra coisa é proibido: se achar um problema, anote em "Achados fora de escopo" no fim do plano ou do changelog.
- Nunca alterar `designs/*.png`, `.env*` ou a pasta `e2e/.libs`. Nunca commitar segredo.
- Nunca adicionar dependência nova sem perguntar antes (e justificar). Em especial: **sem TanStack Query** (o projeto usa SWR para todo GET), sem biblioteca de UI nova, sem biblioteca de datas se `Intl` resolver.
- Nunca alterar migrations já criadas. Mudança de schema = **nova migration** com `prisma migrate dev --name <descricao>`. Nunca usar `prisma db push` nem `prisma migrate reset` fora do banco local de desenvolvimento.
- Nunca alterar os módulos `auth` e `user`, o `User` do Prisma, `lib/api.ts` ou `stores/auth-store.ts`, a não ser que a subfase diga que pode (e só no ponto indicado).
- Nunca mudar o visual **abaixo de `lg` (1024px)** na Fase 16. Mobile e tablet têm que continuar idênticos.

### 1.3. Padrões do projeto (obrigatórios)

- **Idioma:** textos de interface, mensagens de erro da API, comentários e nomes de domínio em português do Brasil (como o resto do código). Identificadores técnicos seguem o padrão já existente.
- **Sem emojis na interface.** Ícones só do **FontAwesome** (`@fortawesome/free-solid-svg-icons`, já usado no menu e no header) ou **Lucide React**. Para ícones de navegação, use os mesmos FontAwesome do `BottomNav`, para não criar dois conjuntos de ícones.
- **Dados remotos:** SWR para todo GET. Mutations (`POST`, `PATCH`, `DELETE`) com o cliente `api` de `lib/api.ts`, seguidas de `mutate` na chave afetada. Estado global só em Zustand e só o que já existe.
- **Backend:** padrão Repository, Service, Controller e Route, com Zod no `*.schema.ts`, `AppError` para erro de negócio e o `handleError` do controller. Sem lógica de negócio em controller e sem acesso ao Prisma fora do repository.
- **Visual:** reaproveite `GlassCard`, `ContentCard`, `CtaButton`, `SectionHeader`, `ServicoCard`, `ProdutoCard`, `Avatar`, `SearchBar`, `PageTitle`. Não crie variações paralelas desses componentes. Se faltar uma prop (por exemplo `className` para largura), **adicione a prop mantendo os defaults atuais**.
- **Regra de desempate Figma x código:** o Figma vence em **layout** (larguras, ordem, grade, espaçamento entre blocos). O componente existente vence em **detalhe visual** (fonte, cor, raio, sombra), porque já foi validado contra os mockups mobile. Se houver conflito que você não consiga resolver com essa regra, pergunte.
- **Tokens do design** (já no projeto, não redefinir): accent `#3bd4cc`, degradê `#29cffe → #3bd4cc`, fundo `#101010`, vidro claro `#595959/15% + borda #B0B0B0/33%`, fontes Inter (padrão), Poppins (`font-secondary`), Jersey 15/20/25 (números e botões de entrada).

### 1.4. Verificação mínima antes de pedir a conferência visual

- `npx tsc --noEmit` (frontend e backend), `npx eslint .` (frontend) e `next build`, sem erros novos.
- `./e2e/run.sh` passando (os 73 fluxos atuais continuam verdes, mais os novos da subfase quando houver).
- Fase 16: screenshots de página inteira das 6 páginas a **375px, 440px e 768px, antes e depois, idênticos byte a byte** (mesmo método da Fase 15). Conferência visual a 1024px, 1280px, 1440px e 1920px.
- Backend (Fase 17): cada endpoint novo testado com sucesso e com os casos de erro da subfase (401, 403, 404, 400 de validação e os de regra de negócio).

---

# FASE 16: Sidebar desktop

**Objetivo:** a partir de `lg` (1024px), trocar o menu pill inferior por uma **sidebar à esquerda bem organizada**, e reorganizar o Início para o layout desktop do Figma. Abaixo de `lg` nada muda.

**Decisões já tomadas pelo João Gabriel (não reabrir):**
- No desktop **não existe** o menu pill inferior. A sidebar o substitui.
- Logo, créditos, Configurações e Sair passam a morar na sidebar, então o `AppHeader` some no desktop.
- A Fase 16 é só de **layout**. Nenhum dado, rota, endpoint ou fluxo muda.

## 16.1. Casca com sidebar (todas as páginas logadas)

Branch sugerida: `feat/sidebar-desktop`.

### Comportamento

| Largura | Navegação | Header |
|---|---|---|
| menor que 1024px (`< lg`) | `BottomNav` como hoje | `AppHeader` como hoje |
| 1024px ou mais (`lg+`) | `Sidebar` à esquerda | `AppHeader` oculto (`lg:hidden`) |

- `BottomNav` ganha `lg:hidden` (e perde o `lg:max-w-[520px]`, que deixa de ter efeito). Seu visual e a ordem dos itens **não mudam**.
- No `app/(app)/layout.tsx`, a partir de `lg` o conteúdo vira uma linha (`flex`): sidebar + coluna principal. O `pb-[90px]` (espaço do menu inferior) vira `lg:pb-0`.
- A sidebar fica **fixa na viewport enquanto a página rola**, com 16px de margem em volta, como no Figma.

**Receita de layout (obrigatória, testada em um protótipo isolado).** Dois erros clássicos de flexbox quebram esta tela, e os dois já aconteceram na primeira implementação:

1. **Rolagem horizontal da página.** O filho `flex-1` da linha (a coluna principal) tem `min-width: auto` por padrão, então ele cresce até a largura do conteúdo. Os carrosséis (`ScrollRow`, com `overflow-x-auto`) têm uma trilha larga, a coluna se estica até ela e a página ganha barra de rolagem lateral. **Correção:** a coluna principal precisa de `min-w-0` (e, por segurança, `overflow-x-clip`, que corta sem criar um contêiner de rolagem).
2. **Sidebar que rola junto com a página.** Em uma linha flex, o `aside` esticaria até a altura de todo o conteúdo (`align-items: stretch`), e um elemento `sticky` não tem para onde "grudar" dentro de um pai que ele mesmo preenche. **Correção:** o `aside` precisa de `self-start` e de **altura própria** (`h-[calc(100dvh-32px)]`), com `sticky top-4`. Nenhum ancestral do `aside` pode ter `overflow` diferente de `visible` (isso desativa o `sticky`). Por isso, **não** aplique `overflow-hidden`, `overflow-x-auto` ou similar na linha nem no wrapper do layout; o corte horizontal vai só na coluna principal.

Estrutura esperada, a partir de `lg`:

```tsx
<div className="lg:flex lg:gap-8 lg:p-4">
  <aside className="hidden lg:flex lg:sticky lg:top-4 lg:h-[calc(100dvh-32px)] lg:w-[248px] lg:shrink-0 lg:self-start ...">...</aside>
  <div className="min-w-0 flex-1 lg:overflow-x-clip">
    {/* PageContainer + header + children */}
  </div>
</div>
```

A rolagem continua sendo a **da janela** (`window`), e não a de um contêiner interno. Isso preserva o comportamento padrão do Next (voltar ao topo ao trocar de página, restaurar a posição ao voltar) e a barra de rolagem normal do navegador. Se mesmo assim o João Gabriel preferir a alternativa de dividir a tela em dois blocos com `h-dvh overflow-hidden` no pai e rolagem só no filho, ela é aceitável, mas **exige** resetar o `scrollTop` do contêiner a cada mudança de `pathname` e é aplicada só em `lg+` (abaixo disso a rolagem da janela continua).
- Fundo da página continua o atual (`#101010` chapado, e o degradê no `/perfil`).

### Especificação da sidebar (do Figma, node `719:131`)

| Item | Valor |
|---|---|
| Largura | 248px, altura = viewport menos 32px (868px no frame de 900) |
| Superfície | Mesmo vidro do menu inferior: `bg-black/35`, borda `#b0b0b0/33%`, `backdrop-blur-[3px]`, sombras internas iguais às do `BottomNav`. **Extraia essas classes para uma constante compartilhada** em vez de copiar a string |
| Raio | 28px |
| Padding | 24px em cima, 20px nos lados e embaixo |
| Espaço entre blocos | 20px |

Blocos, de cima para baixo:

1. **Marca.** `SkillHubLogo` (tamanho próximo de 36 a 40px) + texto "SkillHub" em Inter Bold 22px, branco. O conjunto é um link para `/inicio`.
2. **Card de créditos.** Estilo "Card" do Figma (raio 10, fundo preto 30%, borda `#B0B0B0/33%`, sombras internas). Conteúdo: rótulo "Seus créditos" (Poppins 11px, cinza), moeda (a mesma do `CreditsChip`) e o valor em Jersey 24px. Usa o saldo real `user.credits` do `useAuthStore`. **Reaproveite** `formatCredits` e `useCountUp` do `credits-chip.tsx` (exporte-os ou mova para um módulo comum, sem duplicar). Não use o popover do chip aqui.
3. **Rótulo "MENU".** Poppins Medium 11px, espaçamento entre letras de 12%, cinza.
4. **Navegação principal.** Cinco itens, **nesta ordem** (diferente do menu pill, onde o Início fica no meio): Início, Serviços, Produtos, Comunidade, Perfil.
   - Cada item: ícone de 20 a 22px + texto, gap 12px, altura confortável (cerca de 44px), raio 12px, `Link` do Next, `aria-current="page"` no ativo.
   - **Ativo:** texto e ícone `#3bd4cc` (com o mesmo brilho do `BottomNav`), fundo `rgba(59,212,204,0.12)` e borda `rgba(59,212,204,0.4)`.
   - **Inativo:** texto `rgb(212,233,255)`, sem fundo; no hover, fundo branco a 5% e texto branco.
   - Ícones: os mesmos do `BottomNav` (`faHouse`, `faScrewdriverWrench`, `faBagShopping`, `faGlobe`, `faUser`). **Crie uma lista única** de itens (href, rótulo, ícone) usada pelos dois menus; cada menu só escolhe a ordem.
   - O item ativo vale também para subrotas (`pathname.startsWith(href)`), já que o Serviços e o Produtos vão ganhar detalhes depois.
5. **Espaçador flexível** (empurra o resto para baixo).
6. **Divisor** de 1px, branco a 10%.
7. **Conta.** Dois itens com o mesmo estilo dos de navegação:
   - **Configurações** (`faGear`, link para `/configuracoes`, ativo quando for essa rota).
   - **Sair** (ícone Lucide `LogOut`, é um botão, não link). **Extraia** a função `sair` que hoje está em `app/(app)/configuracoes/page.tsx` para um hook `hooks/use-logout.ts` e use o mesmo hook nos dois lugares. Comportamento idêntico ao atual (chama `/auth/logout`, limpa a sessão, leva ao login).

### Acessibilidade

- `<aside aria-label="Barra lateral">` envolvendo um `<nav aria-label="Navegação principal">`. Como só um dos dois menus está visível por vez (o outro fica `display: none`), manter o mesmo `aria-label` é correto.
- Todos os itens focáveis por teclado, com anel de foco no accent (`focus-visible:ring-2 ring-accent`, como o resto do projeto), na ordem visual.
- Contraste do texto inativo sobre o vidro conferido (mínimo 4.5:1).

### Largura da coluna principal

- Hoje o `PageContainer` limita a coluna (`lg:max-w-5xl xl:max-w-6xl`). Com a sidebar, o espaço restante é menor. **No plano**, proponha as classes exatas de `lg+` para que a coluna ocupe o espaço da sidebar até o limite de 1200px, com padding de 24px em cima e à direita (como no Figma: 24/24/24/0 e 32px de espaço entre a sidebar e o conteúdo). A regra de ouro: **abaixo de `lg` as classes não podem mudar**.

### Arquivos desta subfase

Criar: `components/app/sidebar.tsx`, a lista única de itens de navegação, `hooks/use-logout.ts`.
Alterar: `app/(app)/layout.tsx`, `components/app/bottom-nav.tsx`, `components/app/app-header.tsx` (só o `lg:hidden`), `components/app/page-container.tsx` (só classes `lg+`), `components/app/credits-chip.tsx` (só exportar utilitários), `app/(app)/configuracoes/page.tsx` (só trocar `sair` pelo hook).
**Não tocar:** páginas de conteúdo (Início, Serviços, Produtos, Comunidade, Perfil), backend, `lib/api.ts`, stores.

### Critérios de aceite da 16.1

- [ ] A 375, 440 e 768px as 6 páginas estão **idênticas byte a byte** às de antes.
- [ ] De 1024px para cima: sidebar visível, menu pill e header ocultos, nenhuma página com barra de rolagem horizontal.
- [ ] Item ativo correto em cada uma das 6 rotas (inclusive Configurações).
- [ ] **Sem rolagem horizontal da página** em nenhuma das 6 rotas, de 1024px a 1920px (conferir com `document.documentElement.scrollWidth <= clientWidth` e visualmente). Os carrosséis continuam rolando **dentro** de si mesmos.
- [ ] **Sidebar imóvel:** com a página rolada até o fim, o topo da sidebar continua a 16px da borda da janela (testar com Playwright: `getBoundingClientRect().top` do `aside` antes e depois de `scrollTo(0, 800)` precisa ser igual).
- [ ] A sidebar acompanha a rolagem e nunca passa da altura da tela; a 1024x600 (tela baixa) o conteúdo da sidebar continua acessível (se faltar altura, a área de navegação rola, o rodapé Conta nunca some).
- [ ] Sair e Configurações funcionam igual ao que já funcionava.
- [ ] Saldo de créditos da sidebar vem do usuário logado.
- [ ] Navegação 100% por teclado.
- [ ] `tsc`, `eslint`, `build` e `e2e` verdes.

## 16.2. Início em layout desktop

Branch sugerida: `feat/inicio-desktop` (parte da `main` depois do merge da 16.1; **só comece depois da 16.1 mergeada e da nova aprovação**).

### Layout a partir de `xl` (1280px)

Referência: o frame `New Início - Desktop`. Abaixo de `xl` o Início fica como está (Fase 15), apenas verificado nos espaços novos de 1024 a 1279px (ver critérios).

De cima para baixo, na coluna principal:

1. **Topo:** saudação à esquerda ("Seja Bem Vindo ao" e "SkillHub", como já existe) e, **à direita**, um campo de busca "Buscar no SkillHub" (pílula de 340×44px). Reaproveite o `SearchBar`.
2. **Banner de eventos:** continua sendo o carrossel `ScrollRow` com `dots`, só que ocupando a **largura toda** da coluna, com altura em torno de 230px. Mantém o estilo atual dos cards de evento (título amarelo `#ffd900`, botão verde `#00a61e`, bloco com ícone em degradê). **Não importe a imagem de evento do Figma** (é um material de terceiros de exemplo, não um ativo do projeto).
3. **Duas colunas** (`grid`, coluna direita de 380px, espaço de 32px):
   - **Coluna esquerda:** "Colaboradores Relevantes" com **6** avatares de 72px e o link "Ver mais...". Abaixo, "Serviços" com o cabeçalho e **2 `ServicoCard` lado a lado** (grade de 2 colunas, **sem carrossel** nesta largura).
   - **Coluna direita:** "Produtos Relevantes" com **2 `ProdutoCard` lado a lado**, de cerca de 182×236px.
4. O conteúdo todo precisa caber em **900px de altura** a 1440×900 sem rolar (no Figma termina em 770px). Em telas mais baixas, rola normalmente.

### Restrições de implementação

- Início é hoje um **Server Component assíncrono** que lê de `lib/mock`. **Mantenha assim** nesta subfase (nada de transformar em Client Component nem de trocar fonte de dados).
- Evite duplicar a árvore de DOM para mobile e desktop. Prefira ajustar o mesmo markup com classes responsivas (`xl:grid`, `xl:hidden` nos itens além do segundo, etc.). Se achar que não dá, **explique no plano** antes.
- `ServicoCard` e `ProdutoCard` hoje têm largura fixa por breakpoint. Adicione uma forma de preencherem a célula da grade (por exemplo, `className`), **sem alterar os defaults**.
- **Busca no topo:** o Início não tem busca global e o backend não tem endpoint para isso. Comportamento padrão, a confirmar no plano: o campo é renderizado e, ao enviar, chama `emBreve("A busca global")` (já existe em `lib/em-breve.ts`). **Não invente** uma busca nem faça o campo filtrar dados do mock.
- **Emojis:** os títulos dos eventos em `inicio/mock.ts` têm emojis ("Novo Evento! 🎉", "Guia essencial 📚", "Maratona Tech 🏆"). O João Gabriel não usa emojis na interface (no Figma já foram removidos). Remova-os desses três títulos. É a única mudança de dado desta fase.
- Avatares de "Colaboradores Relevantes" continuam sem nome embaixo (como no Figma).

### Perguntas em aberto da 16.2 (responder no plano e esperar a resposta do João Gabriel)

1. A busca "Buscar no SkillHub" fica visível com `emBreve` (recomendado, igual ao Figma) ou é omitida até existir busca real?
2. De 1024 a 1279px (sidebar presente, sem o layout de 2 colunas), manter o Início empilhado como hoje ou já usar a grade de 2 colunas a partir de `lg`? (Recomendado: manter empilhado e só validar que nada quebra.)

### Arquivos desta subfase

Alterar: `app/(app)/inicio/page.tsx`, `app/(app)/inicio/mock.ts` (só os 3 títulos), `components/app/servico-card.tsx` e `components/app/produto-card.tsx` (só props opcionais), `components/app/scroll-row.tsx` somente se for indispensável (justifique no plano).
**Não tocar:** `lib/mock/*`, outras páginas, backend, sidebar (a menos que a 16.1 tenha bug).

### Critérios de aceite da 16.2

- [ ] 375, 440 e 768px: Início idêntico byte a byte ao de antes (a única diferença permitida é a ausência dos emojis nos títulos dos eventos, e isso deve estar listado no changelog; refaça a captura "antes" já sem emojis para a comparação ser limpa).
- [ ] 1440×900: composição igual ao frame do Figma (ordem, 6 avatares, 2 cards de serviço, 2 de produto, coluna direita de 380px) e sem rolagem vertical.
- [ ] 1280, 1920 e 1024px conferidos: nada cortado, nada sobreposto, carrossel de eventos ainda arrasta e os dots funcionam.
- [ ] Busca conforme a resposta à pergunta 1.
- [ ] `tsc`, `eslint`, `build` e `e2e` verdes.

---

# FASE 17: Domínio de Serviços (backend real + telas ligadas)

**Objetivo:** tirar Serviços do mock. Um usuário publica um pedido de serviço, colaboradores se candidatam, o autor escolhe, o trabalho é concluído com pagamento em créditos e as duas partes se avaliam. É o primeiro dado real que o SkillMatch (Fase 21) e o ImpactScore (Fase 22) vão consumir, então **as datas e relações abaixo já são desenhadas para medir os KPIs da PIBITI** (latência de contratação, volume de transações, retenção).

**Subfases, cada uma com plano, aprovação, branch e PR próprios, na ordem:**

| Subfase | Entrega | Branch sugerida |
|---|---|---|
| 17A | Serviço: modelo, endpoints, telas Serviços e Início ligadas via SWR, seed de desenvolvimento | `feat/servicos-dominio` |
| 17B | Candidaturas e contratação (status do serviço) | `feat/servicos-candidaturas` |
| 17C | Créditos: reserva, pagamento, estorno, extrato | `feat/creditos` |
| 17D | Avaliações entre as partes | `feat/avaliacoes` |

Uma subfase **só começa depois que a anterior foi mergeada** pelo João Gabriel.

## 17.0. Regras do domínio (valem para 17A a 17D)

- **Quem pode o quê:** qualquer usuário com perfil completo (`profileComplete = true`) pode **publicar** um pedido. Só quem tem `perfil = "Colaborador"` pode **se candidatar**, e nunca ao próprio pedido. Só o autor edita, aceita candidatura, conclui ou cancela o próprio pedido.
- **Privacidade (inegociável):** a API devolve do autor e do colaborador **apenas** `{ id, fullName, urlPhoto }` (o tipo `AutorResumo` que o frontend já usa). **Nunca** devolver e-mail, CPF, CNPJ, telefone, endereço, data de nascimento, `googleId`, `discordId` ou hash de senha em nenhuma resposta de serviço, candidatura, extrato ou avaliação. Crie um único utilitário `toAutorResumo` (como existe o `toSafeUser`) e use-o em todo lugar.
- **IDs** em `uuid`, como o `User`. **Datas** sempre `DateTime` no banco e ISO string na API.
- **Exclusão de conta:** hoje a conta pode ser excluída (`DELETE /user`). As relações novas precisam ter um comportamento definido e testado: pedidos do autor excluído somem em cascata; o colaborador excluído de um serviço em andamento vira `null` (`SetNull`) sem quebrar o serviço. Cubra isso no e2e.
- **Moeda:** `credits` continua `Int`. 1 crédito = 1 unidade. O frontend continua só **formatando** com duas casas. **Não** altere o tipo da coluna.
- **Monetização (alinhada à proposta PIBITI, p. 10):** durante a fase piloto o uso é gratuito. A taxa de 10 a 20% sobre transações é uma decisão **futura**. Portanto o código tem a taxa **configurável por variável de ambiente `PLATFORM_FEE_PERCENT` com default `0`**, e com `0` nenhuma linha de taxa é criada. **Não** fixe 10% nem 20% no código.
- **Mensagens de erro da API em português**, no formato `{ error: "..." }` (e `details` para validação Zod), como o resto do backend.

## 17A. Serviço

### Modelo de dados (nova migration `servico`)

```prisma
enum CategoriaServico {
  EDUCACAO
  TECNOLOGIA
  DESIGN_ARTE
  REPAROS
}

enum StatusServico {
  ABERTO
  EM_ANDAMENTO
  CONCLUIDO
  CANCELADO
}

model Servico {
  id            String           @id @default(uuid())
  titulo        String
  descricao     String
  categoria     CategoriaServico
  remuneracao   Int?             // em créditos; null = "a combinar"
  prazo         DateTime?        // null = sem prazo
  status        StatusServico    @default(ABERTO)
  autorId       String
  autor         User             @relation("ServicosPublicados", fields: [autorId], references: [id], onDelete: Cascade)
  colaboradorId String?          // preenchido na 17B, ao aceitar uma candidatura
  colaborador   User?            @relation("ServicosExecutados", fields: [colaboradorId], references: [id], onDelete: SetNull)
  aceitoEm      DateTime?        // KPI: latência de contratação = aceitoEm - createdAt
  concluidoEm   DateTime?        // KPI: volume de transações concluídas
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([status, categoria, createdAt])
  @@index([autorId])
  @@index([colaboradorId])
}
```

- Acrescente as duas relações inversas no `User` (`servicosPublicados`, `servicosExecutados`). **É a única alteração permitida no model `User`**, e só isso.
- As colunas `colaboradorId`, `aceitoEm` e `concluidoEm` já nascem aqui (ficam `null` até a 17B) para evitar uma segunda migration só para elas.
- **Rótulos:** a API devolve a categoria como o **texto que o frontend já usa** (`"Educação"`, `"Tecnologia"`, `"Design e Arte"`, `"Reparos e Manutenção"`), convertendo no service por **um único mapa** (`categoria.map.ts`). Assim o tipo `Servico` do frontend (`lib/mock/servicos.ts`) não muda. Aceite os mesmos textos na entrada (Zod).

### Distância (decisão em aberto, ver Perguntas)

O mock tem `distanciaKm`. Não existe latitude/longitude no `User`. **Padrão recomendado para a 17A:** `distanciaKm` passa a `number | null` e a API devolve `null` por enquanto; o `ServicoCard` esconde a distância quando for `null`. O cálculo real (coordenadas a partir do CEP) fica para uma subfase própria, para não inflar esta. Se o João Gabriel escolher outra opção, o plano precisa trazer a avaliação do provedor de CEP escolhido **antes** de qualquer código.

### Endpoints (todos com `authenticate`)

| Método e rota | Regra |
|---|---|
| `GET /servicos` | Lista pedidos com `status = ABERTO`. Filtros opcionais: `categoria`, `q` (busca no título e na descrição, sem diferenciar maiúsculas), `cidade`. Ordem: mais recentes primeiro. Paginação por `limit` (padrão 20, máximo 50) e `cursor`. Não devolve os pedidos do próprio usuário na lista geral (ele os vê em `/servicos/meus`) |
| `GET /servicos/meus` | Pedidos publicados pelo usuário logado, em qualquer status |
| `GET /servicos/:id` | Detalhe. 404 se não existir. Pedido `CANCELADO` só aparece para o autor |
| `POST /servicos` | Cria como `ABERTO`. Valida título (3 a 80 caracteres), descrição (10 a 1000), categoria, remuneração (inteiro maior ou igual a 0, opcional) e prazo (data futura, opcional) |
| `PATCH /servicos/:id` | Só o autor (senão 403), só enquanto `ABERTO` (senão 409). Campos parciais |
| `DELETE /servicos/:id` | Só o autor (403). **Não apaga a linha**: muda para `CANCELADO` (preserva o histórico para os KPIs). Já `CONCLUIDO` não cancela (409) |

- Arquivos novos: `modules/servico/{servico.schema,servico.repository,servico.service,servico.controller}.ts`, `categoria.map.ts`, `utils/autorResumo.ts`, `api/routes/servico.route.ts` registrado em `routes/index.ts`.
- **Não alterar** nenhum arquivo dos módulos `auth` e `user`.

### Frontend

- Criar o cliente em `lib/api/servicos.ts` (ou o padrão equivalente que o plano justificar): `getServicos(params)`, `getServico(id)`, `criarServico`, etc., usando `api` (axios). **Manter o tipo `Servico`** (mover para `types/servico.ts`; `distanciaKm` vira `number | null`).
- **Página Serviços** (`app/(app)/servicos/page.tsx`): trocar `getServicos` do mock por SWR sobre a API, **mantendo o visual atual**. Os filtros por categoria e a busca passam a ser parâmetros da requisição (a chave do SWR inclui os filtros). Estados novos obrigatórios, no estilo visual existente: **carregando** (esqueleto com `GlassCard`, sem spinner genérico), **vazio** ("Nenhum pedido encontrado") e **erro** (mensagem + botão "Tentar de novo" que chama `mutate`).
- **Publicar pedido:** o `PageTitle`/seção de Serviços ganha o botão para publicar, abrindo um **dialog** (`components/ui/dialog.tsx`) com o formulário (título, descrição, categoria, remuneração opcional, prazo opcional). Validação com o mesmo Zod do padrão de `lib/validation/auth.ts`. Sucesso: toast (`sonner`) e `mutate`. Siga o visual dos modais do Perfil. **Pergunte no plano** onde o botão fica, se o Figma não mostrar (não invente um layout novo sem aprovação).
- **Início:** a seção "Serviços" do Início precisa dos dados reais. Como o Início é um Server Component que usa o mock, **a 17A é a subfase que o converte**: a seção de Serviços vira um componente cliente com SWR (chave `servicos`, os 2 ou 8 primeiros, conforme o layout atual), **sem mudar o layout da Fase 16.2** e sem mexer nas seções de Produtos e Colaboradores (que continuam no mock até as Fases 18 e 19).
- O arquivo `lib/mock/servicos.ts` deixa de ser usado. **Não apague** ainda (Início, Produtos e Comunidade podem referenciar `PESSOAS`); apenas pare de importar `getServicos` dele. Remoção do que sobrar fica anotada no changelog.
- Botão "Saiba Mais" dos cards continua chamando `emBreve` até a 17B.

### Seed de desenvolvimento

- `backend/prisma/seed.ts` (idempotente) cria 8 usuários fictícios (e-mails `seed.*@example.com`, sem CPF real, senha de dev documentada) e os 8 pedidos do `SERVICOS_MOCK`, para a tela não ficar vazia no ambiente local. **Recusa rodar se `NODE_ENV === "production"`.** Configure `prisma.seed` no `package.json` do backend. O `e2e/run.sh` **não** deve depender do seed (crie os dados de teste pelos próprios fluxos).

### Testes

- Novos fluxos no `e2e/fluxos.mjs`: publicar, listar com filtro de categoria e busca, ver detalhe, editar, cancelar, tentar editar pedido de outro usuário (403), tentar cancelar pedido concluído (409), validação (400), exclusão de conta do autor apagando os pedidos dele. O cleanup do e2e (`e2e.%@example.com`) precisa continuar limpando tudo (as relações em cascata garantem).

### Perguntas em aberto da 17A (responder no plano)

1. **Distância:** (a) `null` por enquanto e cálculo por coordenadas em subfase própria (**recomendado**), (b) filtrar/ordenar por `cidade` e `bairro` iguais, sem km, (c) calcular km já na 17A via geocodificação do CEP (exige avaliar e aprovar um provedor externo).
2. Onde fica o botão "Publicar pedido" na tela de Serviços?
3. O `GET /servicos` deve esconder os pedidos do próprio usuário (recomendado) ou mostrá-los marcados como "Meu pedido"?

### Critérios de aceite da 17A

- [ ] Migration criada e aplicada no banco local; `prisma migrate status` limpo; migrations antigas intactas.
- [ ] Todos os endpoints testados nos casos de sucesso e erro listados (401, 400, 403, 404, 409).
- [ ] Nenhuma resposta contém dado pessoal além de `id`, `fullName`, `urlPhoto` do autor.
- [ ] Serviços e a seção de Serviços do Início mostram dados do banco (via seed) com o **mesmo visual** de antes; carregando, vazio e erro funcionam.
- [ ] Mobile (375/440/768) visualmente igual ao de antes, exceto estados novos e o botão de publicar.
- [ ] `tsc` (front e back), `eslint`, `build` e `e2e` verdes.

## 17B. Candidaturas e contratação

### Modelo (nova migration `candidatura`)

```prisma
enum StatusCandidatura {
  PENDENTE
  ACEITA
  RECUSADA
  RETIRADA
}

model Candidatura {
  id             String            @id @default(uuid())
  servicoId      String
  servico        Servico           @relation(fields: [servicoId], references: [id], onDelete: Cascade)
  colaboradorId  String
  colaborador    User              @relation("CandidaturasEnviadas", fields: [colaboradorId], references: [id], onDelete: Cascade)
  mensagem       String
  valorProposto  Int?              // em créditos; null = aceita a remuneração do pedido
  status         StatusCandidatura @default(PENDENTE)
  createdAt      DateTime          @default(now())

  @@unique([servicoId, colaboradorId])
  @@index([colaboradorId])
}
```

(Relação inversa `candidaturasEnviadas` no `User`, única alteração permitida nele.)

### Endpoints

| Método e rota | Regra |
|---|---|
| `POST /servicos/:id/candidaturas` | Só `Colaborador` (403), pedido `ABERTO` (409), não pode ser o autor (403), uma por colaborador (409 se repetir). Mensagem de 10 a 500 caracteres |
| `GET /servicos/:id/candidaturas` | Só o autor (403). Lista com `AutorResumo` do colaborador |
| `GET /candidaturas/minhas` | Candidaturas do usuário logado, com o resumo do serviço |
| `PATCH /candidaturas/:id/retirar` | Só o colaborador dono, só `PENDENTE` |
| `POST /candidaturas/:id/aceitar` | Só o autor do pedido. **Em uma única transação Prisma** (`$transaction`): candidatura vira `ACEITA`, as outras `PENDENTE` viram `RECUSADA`, o serviço vira `EM_ANDAMENTO` com `colaboradorId` e `aceitoEm = now()`. Falha se o serviço não estiver `ABERTO` (409), inclusive em corrida entre duas aceitações |
| `POST /servicos/:id/concluir` | Só o autor, só `EM_ANDAMENTO`. Serviço vira `CONCLUIDO` com `concluidoEm = now()` |

- Cancelar (`DELETE /servicos/:id`) de um pedido `EM_ANDAMENTO` passa a ser permitido ao autor, voltando as candidaturas para o histórico (não apagar). Ajuste a regra da 17A **só neste ponto** e cubra no e2e.

### Frontend

- "Saiba Mais" do `ServicoCard` deixa de chamar `emBreve` e abre um **dialog de detalhe** (reaproveitando `components/ui/dialog.tsx`): descrição completa, categoria, remuneração, prazo, autor, e:
  - para o `Colaborador`: botão "Candidatar-se" (abre campo de mensagem e valor opcional);
  - para o autor: lista de candidaturas com "Aceitar" e, em andamento, "Marcar como concluído".
- **Pergunte no plano** como o autor chega ao próprio pedido (provavelmente uma aba ou seção "Meus pedidos" em Serviços). Sem layout do Figma, **não invente**: proponha e espere aprovação.

### Critérios de aceite da 17B

- [ ] Fluxo completo no e2e: publicar, candidatar-se com outro usuário Colaborador, aceitar, concluir.
- [ ] Todas as regras de permissão e de status testadas (incluindo a corrida de duas aceitações).
- [ ] `aceitoEm` e `concluidoEm` preenchidos corretamente (base dos KPIs).
- [ ] Nenhum dado pessoal nas respostas. `tsc`, `eslint`, `build`, `e2e` verdes.

## 17C. Créditos

### Modelo (nova migration `credito`)

```prisma
enum TipoTransacao {
  BONUS
  RESERVA
  ESTORNO
  RECEBIMENTO
  TAXA
}

model TransacaoCredito {
  id         String        @id @default(uuid())
  userId     String
  user       User          @relation("Transacoes", fields: [userId], references: [id], onDelete: Cascade)
  tipo       TipoTransacao
  valor      Int           // positivo entra, negativo sai
  saldoApos  Int
  servicoId  String?
  createdAt  DateTime      @default(now())

  @@index([userId, createdAt])
}
```

(Relação inversa no `User`, única alteração permitida. `servicoId` é só referência, sem `onDelete` que apague o extrato: use uma coluna simples sem relação, ou `SetNull`, e justifique no plano.)

### Regras

- **Reserva:** ao aceitar uma candidatura (17B) de um serviço com remuneração, o saldo do **autor** é debitado do valor combinado (`valorProposto` da candidatura aceita, ou a remuneração do pedido). Saldo insuficiente: **409** "Créditos insuficientes", e a aceitação **não acontece**. Tudo na **mesma transação** da aceitação.
- **Proteção contra saldo negativo e corrida:** o débito usa atualização condicional (`updateMany` com `credits >= valor`, conferindo o número de linhas afetadas), nunca "ler, calcular e gravar".
- **Pagamento:** ao concluir, o colaborador recebe o valor reservado menos a taxa (`PLATFORM_FEE_PERCENT`, default 0, arredondamento definido e documentado no plano). Com taxa 0, **não** cria linha `TAXA`.
- **Estorno:** cancelar um serviço `EM_ANDAMENTO` devolve a reserva ao autor.
- **Serviço sem remuneração** ("a combinar", `null`): não gera movimentação de créditos.
- Toda alteração de `credits` gera uma `TransacaoCredito` com `saldoApos` correto. **Nenhum outro lugar do código altera `User.credits` diretamente.**
- Endpoint `GET /creditos/extrato` (paginado) para o usuário logado.
- Frontend: o saldo da sidebar e do `CreditsChip` atualiza após aceitar, concluir ou cancelar (revalidar o usuário em `useAuthStore`/`/auth/me` da forma que o projeto já faz, sem criar um segundo estado de saldo). O popover do `CreditsChip` ganha um link "Ver extrato" **somente se** houver uma tela de extrato aprovada no plano.

### Pergunta em aberto da 17C

**Como o usuário ganha créditos na fase piloto?** Hoje todo mundo começa com 0 e ninguém consegue contratar. Opções: (a) bônus de boas-vindas configurável por `WELCOME_CREDITS` (default 0 em produção, valor de teste em desenvolvimento), registrado como `BONUS` no extrato e **exigindo uma alteração mínima no fluxo de criação de usuário do módulo `auth`** (única exceção à regra de não tocar em `auth`), (b) script administrativo que concede créditos, sem tocar em `auth`, (c) deixar para uma fase de recarga. O plano deve recomendar uma e esperar a decisão.

### Critérios de aceite da 17C

- [ ] Saldo nunca fica negativo, nem sob requisições concorrentes (teste de corrida no e2e ou em script).
- [ ] Para cada fluxo (reservar, pagar, estornar), `saldoApos` do extrato bate com `User.credits`.
- [ ] Com `PLATFORM_FEE_PERCENT=0` não há linhas de taxa; com valor maior que 0 (teste local) a soma de pagamento + taxa = valor reservado.
- [ ] `tsc`, `eslint`, `build`, `e2e` verdes.

## 17D. Avaliações

### Modelo (nova migration `avaliacao`)

```prisma
model Avaliacao {
  id           String   @id @default(uuid())
  servicoId    String
  servico      Servico  @relation(fields: [servicoId], references: [id], onDelete: Cascade)
  avaliadorId  String
  avaliador    User     @relation("AvaliacoesFeitas", fields: [avaliadorId], references: [id], onDelete: Cascade)
  avaliadoId   String
  avaliado     User     @relation("AvaliacoesRecebidas", fields: [avaliadoId], references: [id], onDelete: Cascade)
  nota         Int      // 1 a 5
  comentario   String?
  createdAt    DateTime @default(now())

  @@unique([servicoId, avaliadorId])
  @@index([avaliadoId])
}
```

(Relações inversas no `User`, únicas alterações permitidas.)

### Regras

- Só depois de o serviço estar `CONCLUIDO`, e só **entre as duas partes** (autor avalia o colaborador e o colaborador avalia o autor), uma vez cada (409 se repetir).
- `nota` inteira de 1 a 5, comentário opcional de até 500 caracteres.
- Endpoints: `POST /servicos/:id/avaliacoes`, `GET /usuarios/:id/avaliacoes` (lista paginada com `AutorResumo` de quem avaliou) e agregados `{ media, total }` devolvidos junto do resumo público.
- **Não** calcule ImpactScore aqui. A estrutura (nota, serviço, par avaliador/avaliado, datas) já é suficiente para a Fase 22 derivar o índice multidimensional. Não crie colunas de "dimensões" sem decisão do João Gabriel.
- Frontend: após concluir, o dialog de detalhe oferece "Avaliar" (estrelas com ícone FontAwesome `faStar`, sem emoji) para cada parte. A seção "Experiências Profissionais" do Perfil **continua com os números atuais** (placeholders) nesta subfase, a menos que o plano proponha e o João Gabriel aprove ligá-la aos dados reais.

### Critérios de aceite da 17D

- [ ] Não é possível avaliar serviço não concluído, nem por terceiros, nem duas vezes.
- [ ] Média e total corretos (conferidos contra consulta SQL no teste).
- [ ] Exclusão de conta não deixa avaliação órfã nem quebra a média dos outros usuários.
- [ ] `tsc`, `eslint`, `build`, `e2e` verdes.

---

## 2. Como encerrar cada subfase

Ao terminar, responda ao João Gabriel com: o que foi feito (resumido), a lista de arquivos criados e alterados, o resultado de cada verificação da Seção 1.4, o que ele precisa conferir no navegador, os achados fora de escopo (se houver) e o link do PR. **Não** comece a próxima subfase.
