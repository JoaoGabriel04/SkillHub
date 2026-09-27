# SkillHub — Design System (extraído das telas reais)

> Fonte: 5 mockups de tela (Login, Cadastro, New Home, New Início, Perfil) + 4 recortes de componentes em efeito vidro (Group 75, 78, 82, Menubar). Cores obtidas por amostragem de pixel direto nos arquivos, não estimadas visualmente.

---

## 1. Paleta

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
- **Card de seleção de perfil (Cadastro):** ícone circular grande centralizado, label abaixo, borda azul + badge de check no canto quando selecionado, borda cinza neutra quando não selecionado.
- **Avatar com edição:** foto circular, badge circular menor sobreposto no canto inferior direito com ícone de câmera, fundo azul/accent.
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
