# Plano da subfase 16.4: infraestrutura do tema claro/escuro

> Segue `SKILLHUB_CORES_E_TEMA.md` (Fase 16.4), a Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`, o `SKILLHUB_DESIGN_SYSTEM.md` (Seção 8) e o `CHANGELOG_MIGRACAO.md` (Fase 16.3).
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("Pode seguir as recomendações"). Respostas: provedor próprio, sem dependência; tema padrão Escuro; telas de entrada sempre escuras; atalho na sidebar e nada no header do celular; overlay da transição sempre escuro; "Aparência" depois de "Editar Perfil". A `feat/tema-infra` parte de `origin/main` em `5454a2e`.

## 0. O que foi lido

- Seção 16.4 do `SKILLHUB_CORES_E_TEMA.md`, Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`, Seção 8 do `SKILLHUB_DESIGN_SYSTEM.md`, Seção 9 do `PLANO_16_3.md` (atalho de tema), `frontend/AGENTS.md`.
- Arquivos que a subfase toca: `app/layout.tsx`, `app/globals.css`, `app/(auth)/layout.tsx`, `components/ui/sonner.tsx`, `components/app/sidebar.tsx`, `app/(app)/configuracoes/page.tsx`, `components/motion/page-transition.tsx`, `lib/brand.ts`, `scripts/check-cores.mjs` e `e2e/fluxos.mjs`.
- `main` está em `5454a2e` (merge do PR #7). A branch sai de `origin/main`.

### 0.1. O que o Next 16 diz (pedido do documento)

O guia `01-app/02-guides/preventing-flash-before-hydration.md` tem uma seção "Themes" exatamente para isto. Resumo do que vale para o SkillHub:

- **Script inline no `<head>` do layout raiz** (`<script dangerouslySetInnerHTML={{ __html: "..." }} />`). O navegador o executa de forma **síncrona durante o parse do HTML, antes da primeira pintura**, então o tema certo já está no `<html>` quando qualquer coisa aparece na tela. Leitura do `localStorage` dentro de `try/catch`, como o guia faz.
- **`suppressHydrationWarning` no `<html>`.** O script muda o atributo antes de o React hidratar. Sem a flag, o React trata a diferença como erro de hidratação e renderiza de novo no cliente (o que pisca). Com ela, o React aceita o que está no DOM. A flag vale **só para os atributos do próprio `<html>`**, não para os filhos.
- **Strict Mode no desenvolvimento.** O React remonta uma vez e, nessa remontagem, **reseta os atributos do `<html>`** para os do JSX, apagando o que o script pôs. Em produção isso não acontece. O guia resolve reaplicando o tema num `useLayoutEffect` no componente dono do tema, que roda antes da pintura.
- **Por que não `useEffect`:** roda depois da pintura, então o usuário veria o tema errado primeiro. O `useLayoutEffect` sozinho também não basta, porque numa rede lenta o navegador pinta o HTML antes de o React carregar. Só o script inline cobre esse intervalo.
- **Cookie em vez de `localStorage`:** o guia mostra a opção, mas ler cookie no servidor tiraria o app inteiro da pré-renderização estática. O documento pede `localStorage`, e o script inline resolve sem servidor.
- **Aviso do React com `<script>` renderizado no cliente:** o guia avisa que o React reclama em desenvolvimento quando um componente cliente renderiza `<script>`. Isso não acontece no layout raiz, que é Server Component. Esse ponto pesa na pergunta 1.
- **`theme-color` e `color-scheme`:** a doc de `generate-viewport` mostra os dois campos do `viewport`, mas eles são **estáticos** (no máximo com `media` para seguir o sistema) e não acompanham a escolha do usuário. Por isso o `color-scheme` vai no CSS (por classe) e a meta `theme-color` é atualizada pelo script e pela troca de tema (Seção 1).

## 1. Como vai funcionar

- **Preferência:** `"escuro" | "claro" | "sistema"`, guardada no `localStorage` na chave `skillhub-tema`. **Tema aplicado:** `escuro` ou `claro`. Com "sistema", ele segue `prefers-color-scheme`.
- **Mecanismo:** continua a classe `dark` no `<html>`, que o `globals.css` já usa (`@custom-variant dark`, `.dark { ... }`).
- **No `app/layout.tsx`:**
  - O comentário "dark fixo" sai. A classe `dark` continua no JSX **só como valor do servidor**, porque é o tema padrão (pergunta 2) e assim nada muda para quem nunca escolheu. O script tira a classe quando o tema for claro.
  - `<html suppressHydrationWarning>`.
  - `<head>` com o script inline. O script lê a preferência (com `try/catch`; erro ou valor desconhecido caem no padrão), resolve "sistema" por `matchMedia`, põe ou tira a classe `dark` e atualiza a meta `theme-color` (cria a meta se não existir).
- **Lógica num lugar só:** o texto do script sai de `lib/tema.ts`, de uma função que o provedor também usa. O script e o React não podem divergir.
- **`color-scheme`** (barras de rolagem, campos nativos, seletor de data): `color-scheme: light` no `:root` e `color-scheme: dark` no `.dark`, no `globals.css`. Assim os campos nativos seguem o tema.
- **Provedor** (`components/tema/tema-provider.tsx`, Client Component, em volta do app no layout raiz):
  - Estado por `useSyncExternalStore`, com um store pequeno em `lib/tema.ts` que escuta três coisas: mudanças de preferência, o evento `storage` (outra aba trocou) e o `matchMedia` do sistema (com "sistema" e a página aberta, o tema acompanha na hora).
  - O snapshot do servidor é "escuro", então a hidratação nunca diverge. No cliente, o valor real entra logo depois e só re-renderiza quem lê o tema (o seletor e os toasts).
  - `useLayoutEffect` que aplica o tema resolvido no `<html>`, a correção do Strict Mode do guia.
  - Expõe `useTema()` → `{ preferencia, tema, definirPreferencia }`.
  - Gravar no `localStorage` sempre dentro de `try/catch`. Se falhar, o tema muda na sessão e não é lembrado.
- **Cor da barra do navegador:** `COR_BARRA = { escuro: "#101010", claro: "#f4f7f7" }` em `lib/brand.ts`, iguais ao `--background` de cada tema. O `check-cores.mjs` passa a conferir essa igualdade.
- **Toasts:** o `sonner.tsx` passa a usar `theme={tema}` do provedor. O comentário de "tema fixo" sai.
- **Telas de entrada** (pergunta 3): o `app/(auth)/layout.tsx` envolve o fundo e o `<main>` num elemento com a classe `dark`. As variáveis do `.dark` valem para tudo dentro dele, então `/`, `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha` e `/auth/callback` ficam escuras nos dois temas, sem tocar nos componentes delas.
- **Overlay da transição de páginas** (decisão 5): a classe `dark` também vai no overlay da colmeia, que fica escuro nos dois temas.

## 2. Interface nova

### 2.1. Configurações: linha "Aparência"

- **Posição:** logo depois de "Editar Perfil". É encontrável pela busca: rótulo "Aparência", descrição "Tema claro, escuro ou do sistema", então "tema" acha.
- **Visual:** mesmo `ContentCard` dos outros itens, com o rótulo e a descrição no mesmo lugar. Embaixo, no celular, ou à direita, a partir de `sm`, um grupo de três opções:
  - Claro (`faSun`)
  - Escuro (`faMoon`)
  - Sistema (`faCircleHalfStroke`)
- **Opções:** cada uma com ícone **e texto**. A marcada usa o item ativo da sidebar (`bg-accent-soft`, `border-accent-soft-border`, `text-accent-text`).
- **Acessibilidade:**
  - `role="radiogroup"` com `aria-labelledby` no rótulo, e `role="radio"` com `aria-checked` em cada opção.
  - Só a marcada entra no Tab (tabindex móvel), e as setas trocam de opção, como num grupo de rádio nativo.
  - A escolha também está em texto: o rótulo do grupo anuncia, por exemplo, "Aparência: Escuro".
- **Componente** próprio, `components/tema/seletor-tema.tsx`. A linha não é um botão como os outros itens da lista, que navegam ou abrem diálogo.

### 2.2. Sidebar: atalho (pergunta 4)

- Um item no rodapé, entre Configurações e Sair, com o mesmo `itemClass` e a mesma caixa de ícone.
- O texto diz o que o clique faz: "Tema claro" com `faSun` quando o tema atual é escuro, e "Tema escuro" com `faMoon` quando é claro. O clique grava a preferência oposta ao tema aplicado; se estava em "sistema", vira uma escolha fixa.
- Componente `components/tema/alternar-tema.tsx`.
- **Header do celular:** nada muda.

## 3. Arquivos

Caminhos relativos a `frontend/src/`, salvo indicação.

### 3.1. Criar

| Arquivo | Conteúdo |
|---|---|
| `lib/tema.ts` | Tipos, chave do `localStorage`, leitura e gravação com `try/catch`, resolução de "sistema", `aplicarTema` (classe e `theme-color`), store do `useSyncExternalStore` e a função que gera o texto do script inline. |
| `components/tema/tema-provider.tsx` | Provedor e `useTema()` (Seção 1). |
| `components/tema/seletor-tema.tsx` | Grupo Claro, Escuro e Sistema (Seção 2.1). |
| `components/tema/alternar-tema.tsx` | Atalho da sidebar (Seção 2.2), só se a pergunta 4 for aprovada. |

### 3.2. Alterar

| Arquivo | Alteração |
|---|---|
| `app/layout.tsx` | `suppressHydrationWarning` no `<html>`; `<head>` com o script inline; `TemaProvider` em volta do conteúdo; comentário do "dark fixo" reescrito. A classe `dark` continua como valor do servidor. |
| `app/globals.css` | Só `color-scheme: light` no `:root` e `color-scheme: dark` no `.dark`. Nenhum valor de token muda (isso é a 16.5). |
| `app/(auth)/layout.tsx` | Elemento com a classe `dark` em volta do fundo e do `<main>` (Seção 1). |
| `components/motion/page-transition.tsx` | Só a classe `dark` no overlay da colmeia. A animação não muda. |
| `components/ui/sonner.tsx` | `theme` vem do provedor. |
| `app/(app)/configuracoes/page.tsx` | Linha "Aparência" com o `SeletorTema`, entrando na busca. |
| `components/app/sidebar.tsx` | O atalho no rodapé (pergunta 4). |
| `components/app/perfil/profile-dialog.tsx`, `edit-nome-dialog.tsx` | Sai o `[color-scheme:dark]` fixo dos campos, que passam a seguir o tema pelo CSS. No escuro nada muda. |
| `lib/brand.ts` | `COR_BARRA` (Seção 1). |
| `frontend/scripts/check-cores.mjs` | Confere se `COR_BARRA` bate com o `--background` de cada tema. |
| `e2e/fluxos.mjs` | Fluxos novos da Seção 4. Nenhum fluxo existente muda. |
| `SKILLHUB_DESIGN_SYSTEM.md` | Subseção 8.5 "Tema": como a preferência funciona, as telas que ficam sempre escuras e onde ficam o seletor e o atalho. |
| `CHANGELOG_MIGRACAO.md` | Entrada da Fase 16.4. |

### 3.3. Não tocar

- **Valores dos tokens claros:** são da 16.5. O tema claro vai aparecer com os valores provisórios da 16.3 (ver Seção 6).
- `components/app/app-header.tsx`: o header do celular não ganha atalho.
- Backend, migrations, `lib/api.ts`, `stores/*`, rotas e textos existentes. A preferência não vai para o servidor.
- `components/auth/*` e as páginas de entrada, que já ficam escuras pelo wrapper.
- Nenhuma dependência nova, se a pergunta 1 seguir a recomendação.

## 4. Verificação planejada

- **Fluxos novos no `e2e/fluxos.mjs`:**
  - Em Configurações, escolher Claro tira a classe `dark` do `<html>`, sem recarregar. A escolha sobrevive a um `reload` e a uma aba nova no mesmo contexto. Escuro devolve a classe.
  - "Sistema" com `colorScheme: "light"` emulado tira a classe. Trocar a emulação para `"dark"` com a página aberta devolve a classe, sem recarregar.
  - Teclado no seletor: Tab chega na opção marcada e as setas trocam.
  - Atalho da sidebar a 1280px alterna a classe e o texto do botão.
  - `localStorage` que lança erro (script de inicialização do Playwright que faz o acesso falhar) e `localStorage` vazio: a página carrega no escuro, sem erro de JavaScript.
  - Valor inválido gravado na chave cai no padrão.
  - As telas de entrada continuam com a classe `dark` em vigor (o wrapper) com a preferência em Claro.
  - Toasts seguem o tema: um "em breve" de Configurações aparece no claro com o tema claro.
- **Sem piscada:**
  - Um script de inicialização do Playwright grava a classe do `<html>` no primeiro `requestAnimationFrame`, que é a primeira pintura, com a preferência em Claro.
  - O teste exige que ela já seja a do claro.
  - O mesmo teste roda com cache desligado e rede lenta simulada pelo protocolo do Chrome (`Network.emulateNetworkConditions`), com capturas dos primeiros quadros.
- **Verificação mínima:**
  - `tsc` (frontend e backend), `eslint`, `next build`, `check:contrast`, `check:cores` e `./e2e/run.sh` verdes.
  - O build não pode mostrar nenhum aviso de hidratação nem de `<script>`.
- **Tema escuro sem mudança:** capturas das 6 páginas e das telas de entrada a 375 e 1440px, antes e depois, sem preferência gravada. Devem ser iguais. Se alguma diferir, eu listo o motivo.

## 5. Perguntas em aberto

### Do documento

1. **Biblioteca: `next-themes` ou provedor próprio?** Recomendo **provedor próprio, sem dependência**. Isso **diverge da recomendação da tabela do documento**, então explico:
   - O guia do Next 16 traz a receita exata: script inline no `<head>`, `suppressHydrationWarning` e a correção do Strict Mode. A parte difícil, que era o motivo de usar a biblioteca, já está resolvida na documentação oficial.
   - O código nosso fica pequeno, por volta de 100 linhas entre `lib/tema.ts` e o provedor, e cobre o que a biblioteca não faz: a meta `theme-color`, a regra das telas de entrada e a chave e os valores em português.
   - O `next-themes` está na 0.4.6, sem publicação desde março de 2025 (consultei o registro do npm, sem instalar). Ele também renderiza o `<script>` dentro de um Client Component, que é justamente o padrão que o guia diz que gera aviso do React no desenvolvimento.

   Se você preferir o `next-themes`, troco `lib/tema.ts` e o provedor por ele e mantenho todo o resto do plano. Nesse caso preciso da aprovação explícita para instalar.
2. **Tema padrão para quem nunca escolheu: Escuro ou Sistema?** Recomendo **Escuro**. É a identidade do SkillHub, é o que está nos desenhos, e o claro só fica acabado na 16.5.
3. **Telas de entrada sempre escuras ou seguindo o tema?** Recomendo **sempre escuras**. O fundo com imagem, o holofote, os hexágonos e a colmeia foram desenhados para o escuro. Isso sai de graça com o wrapper `dark` (Seção 1), sem tocar nos componentes.

### Registrada na 16.3

4. **Atalho de tema fora de Configurações.**
   - Na sidebar: recomendo **sim** (Seção 2.2).
   - No header do celular: recomendo **não**.
   - "Sistema" fica só em Configurações.

### Minhas (para você confirmar)

5. **Overlay da transição de páginas sempre escuro?** Recomendo **sim**. O canvas da colmeia desenha ladrilhos escuros. Sem a classe, o fundo do overlay ficaria claro no tema claro e a animação ficaria quebrada (era o achado fora de escopo da 16.3).
6. **Posição da linha "Aparência" em Configurações:** recomendo logo **depois de "Editar Perfil"**. O placeholder da busca já é "ex: Tema Escuro", então o tema é a primeira coisa que a tela sugere procurar.

## 6. Riscos e pontos de atenção

- **O tema claro vai aparecer inacabado.** Os valores claros são os provisórios da 16.3, ainda não acertados tela por tela. Isso é esperado (o documento deixa o acabamento para a 16.5), mas quem escolher "Claro" nesta branch vai ver o tema cru. Se preferir, a opção pode ficar escondida até a 16.5. Não recomendo, porque os testes da 16.4 precisam dela.
- **Toasts nas telas de entrada:** os toasts ficam fora do wrapper (são um portal no `body`), então seguem o tema escolhido mesmo numa tela de entrada escura. Hoje só existem toasts na área logada (os "em breve"), então isso não aparece na prática.
- **Meta `theme-color` nas telas de entrada:** segue o tema escolhido, não o escuro fixo da tela. No celular, com o tema claro, a barra do navegador fica clara sobre a tela escura do login. Dá para corrigir com uma regra por rota, mas recomendo deixar para a 16.5, junto do acabamento.

## 7. Achados fora de escopo

- A `main` local deste computador está parada em `fe74495` (PR #4). Não interfere, porque as branches saem de `origin/main`. O `SKILLHUB_SIDEBAR_E_DOMINIO.md` continua modificado e não commitado, e é ele que impede trocar para a `main` local.

## 8. Ajuste feito durante a implementação

- **`app/globals.css`, além do `color-scheme` previsto:**
  - O que mudou: as variáveis derivadas de outros tokens (`--card: var(--surface)`, `--input: var(--border-input)`, `--ring`, os brilhos `--glow-*` e afins) saíram do `:root` e passaram para uma regra `:root, .dark`.
  - Por quê: uma variável com `var()` é resolvida no elemento onde é declarada. No `:root`, ela ficaria com o valor claro já calculado, e um `.dark` aninhado (o wrapper das telas de entrada e o overlay da colmeia) herdaria esse valor claro.
  - Efeito: nenhum valor mudou; só passam a ser recalculadas dentro de cada `.dark`.
- **`check-cores.mjs`:** a leitura dos blocos do CSS passou a ignorar listas de seletores como `:root, .dark`. Sem isso, ela lia o bloco dos derivados no lugar do `.dark` dos tokens.

