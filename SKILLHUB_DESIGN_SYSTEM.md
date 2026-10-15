# SkillHub — Design System (extraído das telas reais)

> Fonte: 5 mockups de tela (Login, Cadastro, New Home, New Início, Perfil) + 4 recortes de componentes em efeito vidro (Group 75, 78, 82, Menubar). Cores obtidas por amostragem de pixel direto nos arquivos, não estimadas visualmente.

---

## 1. Paleta

> **Substituída pela Seção 8 (Fase 16.3).** Os valores abaixo ficam como registro da amostragem dos mockups; os tokens em uso estão na Seção 8.

| Token | Valor | Uso |
|---|---|---|
| `--bg-base` | `#1a1a1a` → `#222222` (gradiente radial sutil) | Fundo de toda a aplicação |
| `--surface` | `#1b1b1b` / `#282828` | Cards sólidos (Início, Perfil) |
| `--surface-glass-fill` | `#595959` a 15% | Preenchimento dos cards "vidro" |
| `--surface-glass-stroke` | `#B0B0B0` a 33% | Borda dos cards "vidro" |
| `--nav-glass` | `rgba(34, 33, 33, 0.92)` + `backdrop-blur-lg` | Menu inferior flutuante |
| `--accent` | `#3bd4cc` | Cor de marca — ícone ativo, botões primários, texto de destaque |
| `--accent-gradient` | `linear-gradient(180deg, #29cffe 0%, #3bd4cc 100%)` | Logo, elementos de destaque grandes |
| `--text-primary` | `#ffffff` | Títulos, texto principal |
| `--text-secondary` | `#9f9f9f` | Placeholders, legendas, texto secundário |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Bordas de card e divisores |

---

## 2. Efeito vidro (glassmorphism) — dois tipos

### 2.1. Vidro claro (cards de conteúdo)
Usado em: cards de "Qualidades", card de estatísticas ("Experiências Profissionais"), botões de currículo.

Valores exatos (definidos no Figma):

| Propriedade | Valor |
|---|---|
| Preenchimento | `#595959` a 15% de opacidade |
| Traçado (borda) | `#B0B0B0` a 33% de opacidade |
| Sombra interna 1 | X=0, Y=4px, Desfoque=4px, `#FFFFFF` a 10% |
| Sombra interna 2 | X=0, Y=-4px, Desfoque=4px, `#000000` a 25% |

```css
background: rgba(89, 89, 89, 0.15);   /* #595959 15% */
border: 1px solid rgba(176, 176, 176, 0.33); /* #B0B0B0 33% */
border-radius: 16px;
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
box-shadow:
  inset 0 4px 4px rgba(255, 255, 255, 0.10),
  inset 0 -4px 4px rgba(0, 0, 0, 0.25);
```

Em Tailwind (valores arbitrários, já que são cores/opacidades específicas do Figma, não a escala padrão):

```
bg-[#595959]/15 border border-[#B0B0B0]/[0.33] backdrop-blur-md rounded-2xl
shadow-[inset_0_4px_4px_rgba(255,255,255,0.10),inset_0_-4px_4px_rgba(0,0,0,0.25)]
```

Vale extrair isso pra uma classe utilitária própria (`.glass-card` no CSS global, ou um componente `GlassCard` no React) em vez de repetir essa string longa em cada elemento — é o tipo de coisa que o Claude Code deve centralizar num só lugar.

### 2.2. Vidro escuro (menu inferior)

> **Substituída pela Seção 8 (Fase 16.3).** O menu inferior e a sidebar usam o vidro `NAV_VIDRO` (`bg-nav`, preto a 35%, com `--shadow-glass`); o valor abaixo virou `--glass-strong-bg` e vale para popovers, diálogos e toasts.
Flutuante, fixo na base, pill/rounded, quase opaco mas com blur do conteúdo atrás.

```css
background: rgba(28, 28, 28, 0.92);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.06);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
```

Em Tailwind: `bg-neutral-900/90 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl`

Ícone/label ativo no menu: cor `--accent` (`#3bd4cc`), com leve glow (`drop-shadow` sutil). Ícones inativos: branco/cinza-claro, sem glow.

---

## 3. Tipografia

Confirmado (três fontes, papéis bem definidos):

| Elemento | Fonte | Onde usar |
|---|---|---|
| Botões das telas iniciais (`/`, `/login`, `/cadastro`) | **Jersey 15 / Jersey 20 / Jersey 25** | Estilo mais gráfico/estilizado, só nesses três pontos de entrada — as três variações são pesos/tamanhos diferentes da mesma família, escolher conforme o tamanho do botão |
| Padrão do site (headings, labels, UI geral) | **Inter** | Todo o restante da interface |
| Secundária (parágrafos, descrições) | **Poppins** | Texto de corpo mais longo — descrições de serviço, bio, currículo |

Jersey é carregada via Google Fonts (`Jersey+15`, `Jersey+20`, `Jersey+25` — cada peso é tecnicamente uma família separada, não variação de peso de uma mesma família).

---

## 4. Componentes principais

- **Input (login/cadastro):** sem caixa, só `border-bottom: 1px solid var(--text-secondary)`, fundo transparente, ícone à direita (usuário, cadeado), placeholder em `--text-secondary`.
- **Botão primário:** fundo transparente com borda branca fina (`Entrar`) OU preenchido em `--accent` (`Saiba Mais`) — dois estilos coexistem; usar preenchido para CTA principal de card, contornado para ações de formulário.
- **Botões de login social:** círculo/retângulo com o ícone da marca (Google, Discord) sobre fundo claro ou escuro conforme a marca original do provedor — não recolorir os ícones oficiais.
- **Card de seleção de perfil (Cadastro):** ícone circular grande centralizado, label abaixo, borda azul + badge de check no canto quando selecionado, borda cinza neutra quando não selecionado. *(Fase 16.3: o selecionado passa a usar o ciano da marca, ver Seção 8.)*
- **Avatar com edição:** foto circular, badge circular menor sobreposto no canto inferior direito com ícone de câmera, fundo azul/accent. *(Fase 16.3: fundo `accent` com ícone `accent-foreground`.)*
- **Chip de créditos:** pill pequeno no header, ícone de moeda + valor numérico, fundo `--surface`.
- **Carrossel (Início):** cards largura quase total, dots de paginação centralizados abaixo.
- **Avatares em linha (Colaboradores Relevantes):** círculos sobrepostos/lado a lado, "Ver mais..." ao final da linha.

---

## 5. Ícones — mapeamento para Lucide React

| Elemento visto | Ícone Lucide |
|---|---|
| Serviços (menu) | `Wrench` (ou `Hammer`) |
| Produtos (menu) | `ShoppingBag` |
| Início (menu) | `Home` |
| Comunidade (menu) | `Globe` |
| Perfil (menu) | `User` |
| Configurações (header) | `Settings` |
| Editar (nome, qualidades) | `Pencil` |
| Editar foto | `Camera` |
| Visualizar currículo | `Play` (ou `FileText`) |
| Download | `Download` |
| Créditos | `Coins` |
| Usuário (input login) | `User` |
| Senha (input login) | `Lock` |
| Competência "Designer" | `Paintbrush` |
| Competência "Técnico" | `Monitor` |

---

## 6. Tailwind — extensão sugerida (`tailwind.config.ts`)

> **Substituída pela Seção 8 (Fase 16.3)** no que é cor: o bloco `colors` saiu do `tailwind.config.mts` e as cores vêm do `@theme inline` do `globals.css`. Fontes e `accent-gradient` continuam no config.

```ts
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: { DEFAULT: "#1a1a1a", light: "#222222" },
        surface: { DEFAULT: "#1b1b1b", light: "#282828" },
        accent: { DEFAULT: "#3bd4cc", from: "#29cffe", to: "#3bd4cc" },
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(180deg, #29cffe 0%, #3bd4cc 100%)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        secondary: ["Poppins", "sans-serif"],
        "jersey-15": ["Jersey 15", "sans-serif"],
        "jersey-20": ["Jersey 20", "sans-serif"],
        "jersey-25": ["Jersey 25", "sans-serif"],
      },
    },
  },
};
```

`shadcn/ui` deve ser inicializado com o tema **dark** como padrão (`--background`, `--foreground` etc. mapeados pra essa paleta), já que não há versão clara nos mockups.

---

## 7. Observação sobre os provedores de login social

Confirmado: **Google e Discord**, como já implementado no backend. O mockup de Login mostrando Facebook/LinkedIn era desatualizado — ignorar esses dois ícones ao construir a tela real.

---

## 8. Paleta e regra de cor (Fase 16.3)

> Fonte da verdade dos valores: `frontend/scripts/check-contrast.mjs` (`npm run check:contrast`). Os tokens moram em `frontend/src/app/globals.css`, e `npm run check:cores` reprova se divergirem do script ou se aparecer cor escrita à mão em `src/`.

### 8.1. A regra

1. **Uma única cor de ação: o ciano da marca `#3bd4cc`.** Botão principal, link, item ativo, anel de foco e destaque. Não há verde, laranja, roxo, amarelo ou azul puro de ação.
2. **Texto sobre ciano é sempre escuro** (`accent-foreground`, `#08201e`, 9,29:1). **Nunca branco sobre ciano.**
3. **Ciano como texto ou ícone usa `accent-text`**, que no claro é o ciano escuro `#0a736e` (o ciano puro tem 1,8:1 sobre branco). `accent` é preenchimento.
4. **Três níveis de texto:** `foreground` (principal), `foreground-secondary` (descrições), `muted-foreground` (rótulos, placeholders).
5. **Vermelho, verde e âmbar só para estado** (`danger`, `success`, `warning`), nunca decoração nem botão comum.
6. **Cor nunca diz sozinha:** estado também aparece em texto ou ícone.
7. **Nenhuma cor escrita à mão nos componentes.** Nem `#hex`, nem `rgb()`, nem classes da paleta fixa do Tailwind (`text-white`, `bg-black/35`...). Tudo sai de um token. As únicas exceções são o `globals.css` e o `src/lib/brand.ts` (cores de marca usadas em JavaScript: colmeia, brilhos do GSAP, avatares, blocos dos eventos).

### 8.2. Tokens

| Token | Classe | Escuro | Claro | Uso |
|---|---|---|---|---|
| `--background` | `bg-background` | `#101010` | `#f4f7f7` | fundo da página |
| `--surface` | `bg-surface` | `#0c0c0c` | `#ffffff` | cards sólidos |
| `--surface-2` | `bg-surface-2` | `#1b1b1b` | `#e9efee` | superfícies elevadas, faixas |
| `--foreground` | `text-foreground` | `#f2f4f4` | `#0f1a19` | texto principal |
| `--foreground-secondary` | `text-foreground-secondary` | `#b8c0bf` | `#3f4f4d` | texto secundário |
| `--muted-foreground` | `text-muted-foreground` | `#8f9897` | `#5a6866` | texto discreto |
| `--accent` | `bg-accent` | `#3bd4cc` | `#3bd4cc` | preenchimento do botão principal |
| `--accent-foreground` | `text-accent-foreground` | `#08201e` | `#08201e` | texto sobre `accent` |
| `--accent-hover` | `hover:bg-accent-hover` | `#62e0d9` | `#62e0d9` | hover do botão principal |
| `--accent-text` | `text-accent-text` | `#3bd4cc` | `#0a736e` | texto, link, ícone e item ativo |
| `--accent-soft` | `bg-accent-soft` | ciano a 12% | ciano a 16% | fundo do item ativo |
| `--accent-soft-border` | `border-accent-soft-border` | ciano a 40% | `#0a736e` a 40% | borda do item ativo |
| `--danger` | `text-danger` | `#ff7b7b` | `#b3261e` | erro em texto |
| `--danger-fill` | `bg-danger-fill` | `#c62f2f` | `#c62f2f` | botão perigoso |
| `--danger-fill-foreground` | `text-danger-fill-foreground` | `#ffffff` | `#ffffff` | texto do botão perigoso |
| `--success` | `text-success` | `#4ade80` | `#137a3f` | sucesso em texto |
| `--warning` | `text-warning` | `#f5b942` | `#8a5a00` | aviso em texto |
| `--border-input` | `border-field`, `bg-field` | `#6b7574` | `#76837f` | linha de campo (mínimo 3:1) |
| `--glass-border` | `border-glass-border` | `#b0b0b0` a 33% | `#0f1a19` a 14% | borda de cards e menus de vidro |

Vidros, sombras e fundos (valores escuros iguais aos de antes da 16.3): `bg-glass` (vidro claro do `GlassCard`), `bg-glass-strong` e `border-glass-strong-border` (vidro escuro: popovers, diálogos, toasts), `bg-card-fill` (`ContentCard`), `bg-nav` (`NAV_VIDRO`), `bg-overlay` (fundo dos diálogos); sombras por variável com `shadow-(--shadow-glass)`, `--shadow-card`, `--shadow-cta`, `--shadow-popover`, `--shadow-raised`, `--shadow-badge`, `--shadow-check`; brilhos ciano `drop-shadow-(--glow-active)`, `shadow-(--glow-coin)`, `--glow-coin-lg`, `--glow-line`; fundos `--bg-gradient-from/to` (body), `--bg-profile-from/to` (Perfil) e `--curve-from/mid` (curva do Perfil). Marca: `--brand-gradient` (`bg-accent-gradient`), `--brand-title-gradient`, `--brand-spotlight`, `--glow-logo`.

**Valor por tema (Fase 16.5).** Os efeitos acima têm valor próprio no claro, acertado tela a tela:
- **Brilhos ciano:** com cerca de um terço da força. O `--glow-logo` some no claro.
- **Borda de vidro:** 18%.
- **Sidebar e menu inferior (`bg-nav`):** branco a 88%.
- **Vidro claro (`bg-glass`):** branco a 85%.
- **Borda e sombra dos popovers:** 12% e 16%.

Três tokens também mudam por tema:
- `--banner-bg`, `--banner-shadow` e `--stripe` (classe `bg-banner`): o banner de Produtos é um card branco com listras em ciano escuro no claro e `surface-2` com listras em `accent` no escuro.
- `--avatar-ring` (classe `border-avatar-ring`): o anel do avatar do Perfil fica no tom da curva no claro e em `muted-foreground` no escuro.

O `check-contrast.mjs` também valida os textos sobre `surface-2` nos dois temas.

As variáveis do shadcn (`--primary`, `--ring`, `--card`, `--popover`, `--destructive`, `--input`...) apontam para esses tokens, então os componentes `ui/` herdam a paleta.

### 8.3. Botão principal

Um só: `CtaButton` / `ctaButtonClass` (`bg-accent text-accent-foreground hover:bg-accent-hover`, 12px no celular e 13px a partir de `lg`). "Saiba Mais", os botões dos eventos do Início e o dos banners de Produtos usam essa classe. Os botões dos diálogos do Perfil usam os mesmos tokens com o tamanho deles.

### 8.4. Avatares

Iniciais brancas sobre `#2f6f8f`, `#8f5a2f`, `#4a5a8f`, `#7c4a8f`, `#8f2f4a` ou `#2a7553` (todas com 4,5:1 ou mais), em `src/lib/brand.ts`.

### 8.5. Tema claro/escuro (Fase 16.4)

- **Preferência:** Claro, Escuro ou Sistema, guardada no `localStorage` do navegador (chave `skillhub-tema`). Não vai para o backend. O padrão para quem nunca escolheu é **Escuro**.
- **Mecanismo:** a classe `dark` no `<html>` (as variáveis do `.dark` no `globals.css`). Um script inline no `<head>` aplica o tema antes da primeira pintura, sem piscar. Depois, o `TemaProvider` acompanha as trocas: outra aba e a mudança do sistema com a página aberta, quando a preferência é "Sistema". Lógica e constantes em `src/lib/tema.ts`.
- **Onde se escolhe:**
  - Configurações, linha "Aparência": as três opções, com teclado.
  - Sidebar: a linha "Tema" com um switch compacto (nome acessível "Tema escuro", ligado = escuro). O botão ciano desliza entre o Sol e a Lua e grava uma escolha fixa; no trilho, uma Lua discreta no claro e estrelas no escuro.
  - O header do celular não tem atalho.
- **Sempre escuros, nos dois temas:**
  - As telas de entrada (`/`, `/login`, `/cadastro`, recuperação de senha e retorno do OAuth), por um wrapper com a classe `dark` no `app/(auth)/layout.tsx`.
  - O overlay da colmeia da transição de páginas.
- **O que acompanha o tema:** toasts (`sonner`), `color-scheme` dos campos nativos e a cor da barra do navegador (`COR_BARRA` em `src/lib/brand.ts`, igual ao `--background` de cada tema).
- **Barra do navegador nas telas de entrada:** sempre escura, como a própria tela (`lib/tema.ts`, no script do `<head>` e no `aplicarTema`, que o provedor reaplica a cada troca de rota).
- **Valores claros:** definitivos desde a 16.5 (Seção 8.2).

