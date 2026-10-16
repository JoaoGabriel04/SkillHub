# Plano da subfase 16.1: casca com sidebar

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Seção 16.1), `SKILLHUB_DESIGN_SYSTEM.md` e `CHANGELOG_MIGRACAO.md` (Fase 15).
> Referência visual: `designs/New Início - Desktop.png` (frame `719:130`, 1440×900).
> **Status: aprovado pelo João Gabriel em 13/10/2026** ("Pode seguir, aprovei"), depois do merge do PR #4 (animações). A `feat/sidebar-desktop` parte da `main` em `fe74495`.

## 0. O que foi lido

- `SKILLHUB_SIDEBAR_E_DOMINIO.md` inteiro, `SKILLHUB_DESIGN_SYSTEM.md`, `CHANGELOG_MIGRACAO.md`, `frontend/AGENTS.md`.
- Guias do Next 16.3.6 em `frontend/node_modules/next/dist/docs/`: `01-getting-started/03-layouts-and-pages.md`, `01-getting-started/04-linking-and-navigating.md`, `03-api-reference/02-components/link.md` (seção "Checking active links") e `03-api-reference/04-functions/use-pathname.md`. Nada do que a 16.1 usa mudou de forma relevante: layout aninhado com `children`, `Link` do `next/link` e `usePathname()` em Client Component para o item ativo. O aviso de hydration mismatch do `usePathname` só vale com rewrites ou Proxy, e o projeto não tem nenhum dos dois. Além disso, o `app/(app)/layout.tsx` já é Client Component e só renderiza o menu depois que a sessão carrega.
- Arquivos da subfase: `app/(app)/layout.tsx`, `components/app/bottom-nav.tsx`, `app-header.tsx`, `page-container.tsx`, `credits-chip.tsx`, `app/(app)/configuracoes/page.tsx`. Também li os que eles usam: `SkillHubLogo`, `ContentCard`, `GlassCard`, `app/layout.tsx`, `components/motion/page-transition.tsx` e `e2e/fluxos.mjs` (viewport de 440px).

## 1. Arquivos

Todos os caminhos são relativos a `frontend/src/`.

### Criar

| Arquivo | Conteúdo |
|---|---|
| `components/app/navegacao.ts` | A lista única `NAV_ITENS` (`href`, `label`, `icon`) com os 5 destinos e os mesmos ícones FontAwesome do `BottomNav`. Também exporta `NAV_VIDRO`, a constante com as classes de vidro hoje inline no `BottomNav` (`border border-[#b0b0b0]/[0.33] bg-black/35 backdrop-blur-[3px] shadow-[inset_0_-4px_4px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(255,255,255,0.10)]`), sem raio, porque cada menu tem o seu. E exporta `rotaAtiva(pathname, href)`. |
| `components/app/sidebar.tsx` | `Sidebar` (Client Component), conforme a Seção 3. |
| `hooks/use-logout.ts` | `useLogout()` devolve a função `sair`, com o corpo idêntico ao de hoje: `api.post("/auth/logout").catch(() => {})`, depois `useAuthStore.getState().clear()` e `router.replace("/login")`. |

### Alterar

| Arquivo | Alteração (só isto) |
|---|---|
| `app/(app)/layout.tsx` | Dentro do ramo `ready`, um wrapper novo `flex flex-1 flex-col lg:flex-row lg:gap-8 lg:p-4` envolve `<Sidebar />` e a `div data-page-exit` existente. O `PageContainer` passa de `pb-[90px]` para `pb-[90px] lg:pb-6`. O `<BottomNav />` continua onde está. O fundo e o estado de carregamento não mudam. |
| `components/app/bottom-nav.tsx` | Usa `NAV_ITENS` na ordem atual (Serviços, Produtos, Início, Comunidade, Perfil), `NAV_VIDRO` no lugar da string inline e `rotaAtiva` para o item ativo (resposta 3). Ganha `lg:hidden` e perde `lg:max-w-[520px]`. Visual e ordem iguais. |
| `components/app/app-header.tsx` | Só acrescenta `lg:hidden` no `<header>`. |
| `components/app/page-container.tsx` | Só classes `lg+` (ver a Seção 4). |
| `components/app/credits-chip.tsx` | Só adiciona `export` em `formatCredits` e `useCountUp`. Nada mais muda. |
| `app/(app)/configuracoes/page.tsx` | Troca a função local `sair` por `const sair = useLogout()` e remove os imports que ficarem sem uso (`api`). |
| `e2e/fluxos.mjs` | Bloco novo de desktop (resposta 5): um contexto a 1280×800 que, logado, confere a sidebar visível e o menu inferior e o header ocultos, `aria-current` correto nas 6 rotas (navegando pela sidebar), sem rolagem horizontal, e Configurações e Sair pela sidebar. Os fluxos existentes a 440px não mudam. |

### Não tocar (explicitamente)

- Páginas de conteúdo: `inicio/`, `servicos/`, `produtos/`, `comunidade/`, `perfil/`. No caso de `configuracoes/page.tsx`, só a troca do `sair`.
- Componentes de conteúdo: `ServicoCard`, `ProdutoCard`, `ScrollRow`, `ChipRow`, `SearchBar`, `PageTitle`, `SectionHeader`, `GlassCard`, `ContentCard`, `SkillHubLogo`, `Avatar`.
- `lib/api.ts`, `stores/*`, `lib/mock/*`, `components/motion/*`, `lib/gsap.ts`, `app/layout.tsx`, `globals.css`.
- Todo o backend, `designs/*.png`, `.env*`, `e2e/.libs`, `package.json` (nenhuma dependência nova).

## 2. Comportamento por largura

| Largura | Navegação | Header | Padding inferior |
|---|---|---|---|
| `< lg` | `BottomNav` como hoje | `AppHeader` como hoje | `pb-[90px]` (igual) |
| `lg+` | `Sidebar` (`hidden lg:flex`) | oculto (`lg:hidden`) | `lg:pb-6` |

Abaixo de `lg`, as únicas mudanças no DOM são o wrapper novo (um `flex flex-1 flex-col` em volta de outro `flex flex-1 flex-col`, que não altera o layout) e a `aside` com `display: none`. Nenhuma classe sem prefixo muda. Os screenshots comprovam isso (Seção 6).

## 3. Sidebar

Estrutura, de cima para baixo:

```
<aside aria-label="Barra lateral"   hidden lg:flex flex-col sticky top-4 self-start
                                    h-[calc(100dvh-32px)] w-[248px] shrink-0 rounded-[28px] NAV_VIDRO
                                    pt-6 px-5 pb-5>
  <div  área rolável: flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto>
    1. Link /inicio: SkillHubLogo size={38} + "SkillHub" (Inter Bold 22px, branco)
    2. ContentCard de créditos: "Seus créditos" (Poppins 11px, #9f9f9f), moeda do CreditsChip, valor em Jersey 24px
    3. "MENU" (Poppins Medium 11px, tracking-[0.12em], #9f9f9f)
    4. <nav aria-label="Navegação principal"> com 5 itens: Início, Serviços, Produtos, Comunidade, Perfil
  </div>
  6. divisor h-px bg-white/10 (shrink-0, mt-5)
  7. Conta (shrink-0, mt-5): Configurações (Link) e Sair (button)
</aside>
```

Decisões:

- **Espaçador flexível (item 5):** é a própria área rolável com `flex-1`. Ela empurra o divisor e a Conta para baixo e, quando falta altura (1024×600), é ela que rola. Assim a Conta nunca some, como pede o critério de aceite. A marca e os créditos ficam dentro da área rolável junto com o menu: numa tela baixa, rolar só os 5 itens deixaria pouquíssimo espaço visível.
- **Card de créditos:** usa o próprio `ContentCard`, que já tem exatamente os valores do "Card" do Figma (raio 10, preto 30%, borda, sombras internas). A moeda é a mesma do chip (círculo de 24px em `bg-accent-gradient` com `faCoins`), e não a moeda cinza do PNG: o documento pede a do `CreditsChip`. O valor usa `font-jersey-15`, a mesma família do chip (detalhe visual: vence o componente existente), em 24px, com `formatCredits(useCountUp(user.credits))`. O saldo vem de `useAuthStore((s) => s.user?.credits ?? 0)`, como no `AppHeader`. Não tem popover. O rótulo acessível é igual ao do chip: o card tem `aria-label="Créditos: 4,00"` e o número animado fica `aria-hidden`.
- **Marca:** a imagem já tem `alt="SkillHub"` e o texto repete "SkillHub". Por isso o link recebe `aria-label="SkillHub, ir para o Início"`, para não ser lido duas vezes. O `SkillHubLogo` não é alterado.
- **Itens (navegação e conta):** `flex h-11 items-center gap-3 rounded-[12px] border px-4 font-secondary text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent`, com ícone de 20px (`text-[20px]`, largura fixa para alinhar os textos).
  - Ativo: `border-[rgba(59,212,204,0.4)] bg-[rgba(59,212,204,0.12)] text-[#3bd4cc]`, com `drop-shadow-[0_0_6px_rgba(59,212,204,0.7)]` no ícone (o mesmo brilho do `BottomNav`) e `aria-current="page"`.
  - Inativo: `border-transparent text-[rgb(212,233,255)] hover:bg-white/5 hover:text-white`. A borda transparente evita que o item "pule" 1px quando fica ativo.
  - Tamanho do texto: o documento não define. Pelo PNG, 15px em Poppins, a fonte dos rótulos do `BottomNav`.
- **Item ativo:** `rotaAtiva(pathname, href)` = `pathname === href || pathname.startsWith(href + "/")`. Fica `href + "/"` em vez de um `startsWith(href)` puro para que `/perfil` não marque uma rota hipotética `/perfilx`. Configurações usa a mesma função com `/configuracoes`.
- **Sair:** um `<button type="button">` com `LogOut` do Lucide (20px) e o mesmo estilo dos itens, chamando `useLogout()`.
- **Fora da transição de página:** a sidebar fica fora da `div data-page-exit`, como o `BottomNav`. Então ela não afunda nem desfoca quando a transição cobre a tela, e o `transform` do GSAP nessa `div` não interfere no `sticky`.
- **Contraste:** o texto inativo `rgb(212,233,255)` sobre o vidro (preto 35% sobre `#101010`, que dá aproximadamente `#0b0b0b`) fica perto de 16:1. O cinza `#9f9f9f` dos rótulos, perto de 7:1. Os dois passam de 4.5:1. Os números exatos vão no changelog, medidos sobre a cor renderizada.
- **Teclado:** a ordem do DOM é a ordem visual (marca, navegação, Configurações, Sair). O card de créditos não é focável porque não tem ação.

## 4. Largura da coluna principal (classes exatas)

`PageContainer`, hoje:
`mx-auto w-full max-w-[440px] px-[23px] sm:max-w-2xl sm:px-8 lg:max-w-5xl lg:px-12 xl:max-w-6xl`

Proposto:
`mx-auto w-full max-w-[440px] px-[23px] sm:max-w-2xl sm:px-8 lg:max-w-[1200px] lg:pt-6 lg:pr-6 lg:pl-0`

- Sem prefixo e com `sm:` nada muda. Sai `lg:max-w-5xl lg:px-12 xl:max-w-6xl` e entra `lg:max-w-[1200px] lg:pt-6 lg:pr-6 lg:pl-0`. O `lg:pb-6` vem do `layout.tsx`, junto do `pb-[90px]` que já é passado por ali.
- Contas a 1440×900, com o wrapper `lg:p-4` e `lg:gap-8`: sidebar em x = 16 até 264, conteúdo começando em 16 + 248 + 32 = **296** e terminando em 1440 − 16 − 24 = **1400**, topo em 16 + 24 = **40**. É o que o PNG mostra: a saudação em x = 296 e a busca terminando em x = 1400. A coluna útil fica com 1104px, abaixo do limite de 1200px.
- A 1024px, a coluna útil fica com 1024 − 16 − 248 − 32 − 24 − 16 = **688px** (hoje são 928px). É o ponto de maior risco: ver a Seção 7.
- O `-mx-[23px]` de `ScrollRow`, `ChipRow` e do herói do Perfil só vale abaixo de `sm`, então não é afetado.
- Com `mx-auto`, acima de 1496px (por exemplo a 1920) a coluna de 1200px fica **centralizada no espaço à direita da sidebar** (ver a pergunta 2).

## 5. Ordem dos commits (na branch `feat/sidebar-desktop`)

1. `navegacao.ts` com `NAV_ITENS`, `NAV_VIDRO` e `rotaAtiva`, e o `BottomNav` passando a usá-los.
2. `use-logout.ts` e a troca em `configuracoes/page.tsx`.
3. `export` de `formatCredits` e `useCountUp`.
4. `Sidebar`.
5. Casca: `layout.tsx`, `page-container.tsx` e `app-header.tsx`.
6. Bloco de desktop no `e2e/fluxos.mjs`.
7. Entrada no `CHANGELOG_MIGRACAO.md` (Fase 16.1).

## 6. Verificação (Seção 1.4)

- `npx tsc --noEmit` (frontend e backend), `npx eslint .` e `next build`.
- `./e2e/run.sh`: os 73 fluxos continuam verdes, mais os novos de desktop. A suíte roda a 440px, e lá a sidebar fica com `display: none`, então os seletores `link "Configurações"` e `button /^Sair/` continuam encontrando um elemento só.
- **Byte a byte:** com um script Playwright avulso no scratchpad (mesmo método da Fase 15, fora do repositório), screenshots de página inteira das 6 páginas (`/inicio`, `/servicos`, `/produtos`, `/comunidade`, `/perfil`, `/configuracoes`) a 375, 440 e 768px. São tiradas antes (na base da branch) e depois, e comparadas por hash, 18 de 18. O script espera o fim do splash da transição e usa um usuário de teste com 0 crédito, para o contador não animar.
- **Desktop (1024, 1280, 1440 e 1920):** screenshots das 6 páginas e checagens com Playwright: `scrollWidth <= clientWidth` (sem rolagem horizontal), `aria-current` correto em cada rota (inclusive Configurações), sidebar ainda presa ao topo depois de rolar, área rolável funcionando e Conta visível a 1024×600, Tab percorrendo os itens na ordem com o anel de foco, Sair levando a `/login`.
- Depois disso eu paro e te digo o que conferir no navegador.

## 7. Riscos que já vejo

- **Coluna a 1024px cai de 928 para 688px.** As páginas têm larguras fixas em `lg:` pensadas para a coluna antiga. Exemplos: `ProdutoCard` com `lg:w-[240px]` na grade `lg:grid-cols-5` dos resultados de Produtos, os 8 avatares do Início a partir de `lg`, `ServicoCard` com `lg:w-[370px]` no Início e a grade `lg:grid-cols-3` de Serviços. Carrossel continua rolando, mas uma grade pode estourar e gerar rolagem horizontal, o que quebra um critério de aceite. Como as páginas de conteúdo estão em "não tocar", **se isso acontecer eu paro e trago o caso com screenshot**, sem corrigir em silêncio. Os ajustes de página provavelmente cabem na 16.2, ou numa decisão sua.
- Se a 1024×600 a área rolável ficar pequena demais para ser útil, também trago o caso antes de mudar a estrutura.

## 8. Perguntas respondidas (13/10/2026)

O João Gabriel respondeu: "Faz o que você acha recomendado, e adiciona o item 5."

1. **Trabalho não commitado (animações GSAP, `gsap` e `@gsap/react`, correção do botão do Google):** vai para uma branch e um PR próprios (`feat/animacoes-auth`), fora da 16.1. A `feat/sidebar-desktop` parte da `main` depois desse merge, e os screenshots "antes" saem dela. Os documentos `SKILLHUB_SIDEBAR_E_DOMINIO.md` e `designs/New Início - Desktop.png` não entram no PR das animações (vão no PR da 16.1, com este plano).
2. **Coluna acima de 1496px:** centralizada no espaço à direita da sidebar (`mx-auto`, classes da Seção 4).
3. **Item ativo do `BottomNav`:** passa a usar `rotaAtiva` (prefixo), como a sidebar.
4. **Padding inferior no desktop:** `lg:pb-6`.
5. **e2e de desktop:** aprovado; `e2e/fluxos.mjs` entra na lista de arquivos alterados (Seção 1).

## Achados fora de escopo

- Nenhum até agora (os riscos da Seção 7 só se confirmam na implementação).
