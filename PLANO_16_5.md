# Plano da subfase 16.5: tema claro (acabamento visual)

> Segue `SKILLHUB_CORES_E_TEMA.md` (Fase 16.5), a Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`, o `SKILLHUB_DESIGN_SYSTEM.md` (Seções 8 e 8.5) e o `CHANGELOG_MIGRACAO.md` (Fase 16.4 e o ajuste do switch).
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("Merge feito. Pode começar o 16.5"), depois do merge do PR #9 (switch). As perguntas da Seção 5 não foram respondidas uma a uma: sigo as recomendações. As perguntas 3, 5, 6 e 7 só entram nas rodadas 2 a 4, e uma resposta diferente até lá muda a rodada correspondente. A `feat/tema-claro` parte de `origin/main` em `d8849c8`.

## 0. Estado de partida

- `main` em `d2f0e81` (merge do PR #8, Fase 16.4).
- O switch de tema da sidebar, pedido depois do merge, está pronto na `feat/switch-tema` (2 commits, ainda sem PR). **Recomendo** abrir e mergear esse PR antes, e a `feat/tema-claro` sair da `main` depois dele. A 16.5 compara o tema escuro "antes e depois" byte a byte, e a sidebar com o switch precisa estar nessa referência.
- **O que medi no claro de hoje** (valores provisórios da 16.3):
  - **Como:** capturas das 6 páginas a 375 e 1440px, mais popover de créditos, filtro, diálogos de nome, privacidade e exclusão, e toast. Folhas de contato no scratchpad.
  - **Resultado:** a base já é coerente: fundo `#f4f7f7`, cards brancos com sombra suave, sidebar e menu inferior de vidro branco, botões ciano com texto escuro. O que falta é acabamento, listado na Seção 2.
- **Contrastes que o `check-contrast.mjs` ainda não cobre**, medidos agora:

| Par no claro | Razão | Leitura |
|---|---|---|
| card branco sobre o fundo `#f4f7f7` | 1,08 | a separação depende só da borda e da sombra |
| listras ciano `#3bd4cc` do banner sobre `surface-2` | 1,57 | decorativo, mas some no claro |
| `accent-text` sobre `surface-2` | 4,89 | passa |
| texto discreto sobre `surface-2` | 5,00 | passa |
| linha de campo `#76837f` sobre card branco | 3,94 | passa (mínimo 3) |

## 1. Como vai funcionar

- **Só tokens.** Os ajustes são nos valores do `:root` (claro) do `globals.css`. Os componentes não mudam, como pede o documento ("sem tocar nos componentes de novo"). As exceções estão listadas na Seção 3 e são todas pequenas.
- **O escuro não muda.** Tudo o que hoje é compartilhado entre os temas e precisa de valor próprio no claro (os brilhos `--glow-*` e o `--glow-logo`) é dividido em valor escuro, igual ao atual, e valor claro. As capturas do escuro precisam ficar idênticas byte a byte às da base.
- **Rodadas com a sua conferência.** O documento pede que você valide cada ajuste na tela. Para não te chamar dezenas de vezes, agrupo em **4 rodadas**, na ordem abaixo. Ao fim de cada rodada eu paro e mando uma página de comparação (claro antes, claro depois e escuro, a 375 e 1440px). Só sigo para a próxima com o seu "ok". Os ajustes que você pedir entram na mesma rodada.

## 2. Ordem das telas e o que ajustar em cada rodada

### Rodada 1: base e moldura (aparece em todas as telas)

1. **Fundo da página e do Perfil** (`--background`, `--bg-gradient-*`, `--bg-profile-*`). Hoje o card branco tem só 1,08:1 contra o fundo. Ajusto o fundo e a borda de vidro para os cards se destacarem sem depender só da sombra.
2. **Sidebar** (vidro, item ativo, rótulos, card de créditos, switch de tema).
3. **Menu inferior** (`--nav-bg`, borda e sombra): no claro o conteúdo aparece demais através do vidro.
4. **Header do celular** (chip de créditos, engrenagem e logo).
5. **Brilhos ciano** (`--glow-active`, `--glow-coin`, `--glow-coin-lg`, `--glow-line` e `--glow-logo`): pensados para o escuro, no claro viram halo. Ver pergunta 2.

### Rodada 2: Início, Serviços e Produtos

1. **Cards de conteúdo** (`ContentCard`): borda, sombra e o `--card-bg` branco.
2. **Card dos eventos** (`surface` e `--shadow-raised`) e os blocos de ícone da marca.
3. **Botão principal** sobre card branco: o ciano e a sombra interna `--shadow-cta`.
4. **Banner de Produtos:** as listras ciano somem no `surface-2` (1,57:1). Ver pergunta 3.
5. **Pontos do carrossel, chips de filtro e busca** (`GlassCard` claro).
6. **Fundo das imagens antes de carregar** (`surface-2`).

### Rodada 3: Comunidade, Perfil e Configurações

1. **Comunidade:** feed, listas de dúvidas e eventos, histórias.
2. **Perfil:** curva decorativa atrás do avatar (`--curve-*`), anel do avatar, selo da câmera e card de estatísticas.
3. **Configurações:** linhas, a linha "Aparência" com o seletor, e o item ativo.

### Rodada 4: sobreposições e estados

1. **Diálogos** do Perfil, de Privacidade e de Excluir conta: `--glass-strong-bg`, `--overlay` e `--shadow-popover`.
2. **Toasts**, **popover de créditos** e **lista do filtro**.
3. **Estados:**
   - **Erro:** texto e linha em `--danger`.
   - **Foco:** anel em `accent`.
   - **Desabilitado:** o "Excluir conta" desabilitado vira um rosa desbotado (o `danger-fill` a 40% de opacidade), que parece erro e não inativo. Ver pergunta 4.

## 3. Arquivos

Caminhos relativos a `frontend/src/`, salvo indicação.

| Arquivo | Alteração |
|---|---|
| `app/globals.css` | Valores do `:root` (claro). Os brilhos e o `--glow-logo` passam a ter valor por tema, com o escuro igual ao atual. |
| `frontend/scripts/check-contrast.mjs` | Só se a pergunta 5 for aprovada: pares novos de `surface-2` nos dois temas. Os valores das cores mudam junto com o `globals.css` (o `check:cores` exige). |
| `components/motion/page-transition.tsx` | Só se a pergunta 6 for aprovada: o overlay da colmeia vem **antes** do conteúdo no HTML. A animação não muda. |
| `lib/tema.ts` e `app/(auth)/layout.tsx` | Só se a pergunta 7 for aprovada: barra do navegador escura nas telas de entrada. |
| `e2e/fluxos.mjs` | Só se a pergunta 7 for aprovada: um fluxo novo para a cor da barra nas telas de entrada. |
| `SKILLHUB_DESIGN_SYSTEM.md` | Tabela 8.2 com os valores claros definitivos e a coluna "Claro" sem a marca de provisório. |
| `CHANGELOG_MIGRACAO.md` | Entrada da Fase 16.5. |

**Não tocar:**
- os valores do tema escuro;
- os componentes (fora as exceções acima);
- as telas de entrada, que continuam sempre escuras;
- backend, rotas e textos;
- nenhuma dependência nova.

## 4. Verificação

- `npm run check:contrast`: todos os pares passam **nos dois temas**, incluindo os de `surface-2` se a pergunta 5 for aprovada. `npm run check:cores` verde.
- **Capturas entregues dos dois temas**, a 375 e 1440px:
  - as 6 páginas, a sidebar e o menu inferior;
  - os diálogos, os toasts e o popover de créditos;
  - o filtro e o seletor de tema.

  São as mesmas telas da Seção 2, numa página de comparação.
- **Escuro sem mudança:** capturas das mesmas telas no escuro, antes (na base) e depois, **idênticas byte a byte**. Qualquer diferença eu listo com o motivo.
- `tsc` (frontend e backend), `eslint`, `next build` e `./e2e/run.sh` verdes.

## 5. Perguntas em aberto

1. **Cor do fundo claro.** Manter o fundo levemente frio (`#f4f7f7`) com cards brancos, ou fundo branco com cards em `surface-2`? Recomendo **manter o fundo frio com cards brancos**, só reforçando a borda. Já está assim, conversa com o ciano e evita uma tela inteira branca.
2. **Brilhos ciano no claro.** Tirar ou suavizar? Recomendo **suavizar**:
   - o brilho do ícone ativo e da moeda cai para cerca de um terço;
   - o traço de foco dos campos fica com um brilho leve;
   - o brilho do logo sai no claro.

   Tirar tudo deixa o claro sem a assinatura da marca, e manter igual vira halo.
3. **Banner de Produtos no claro.** As listras em `accent` somem no `surface-2`. Recomendo **listras em `accent-text`** no claro (o ciano escuro `#0a736e`), com card branco em vez de `surface-2`. No escuro nada muda. Isso pede um token próprio para as listras (`--stripe`) e uma troca de classe no banner, uma exceção pequena à regra de não tocar nos componentes.
4. **Botão perigoso desabilitado.** Trocar o "rosa desbotado" por um cinza de desabilitado nos dois temas, ou só no claro? Recomendo **deixar como está nesta fase** e anotar para uma revisão de estados (desabilitado, carregando) que valha para todos os botões. Mexer só nesse botão criaria uma exceção.
5. **Pares novos no `check-contrast.mjs`.** O documento trata o script como fonte da verdade. Recomendo **acrescentar** os pares de `surface-2` (texto principal, secundário, discreto e `accent-text`), porque essa superfície aparece em banners e campos e hoje não é validada. Os valores das cores continuam os mesmos dos tokens.
6. **Ordem do splash em rede lenta** (achado da 16.4). No claro, o carregamento da área logada aparece antes do overlay escuro, porque o HTML do overlay chega depois. Recomendo **corrigir**, movendo o overlay para antes do conteúdo no HTML do `PageTransitionProvider`. É uma linha de ordem, sem mudar a animação.
7. **Barra do navegador nas telas de entrada** (achado da 16.4). Hoje ela segue o tema escolhido, e no claro fica clara sobre a tela escura do login. Recomendo **escura nas telas de entrada**: o script do `<head>` e o `aplicarTema` usam a cor escura quando a rota é de entrada, mais um fluxo no e2e.
8. **Base da branch:** recomendo **depois do merge do switch** (Seção 0).

## 6. Achados fora de escopo (vindos das fases anteriores)

- **Aviso do GSAP:** um "GSAP target not found" aparece no console ao cair no `/login` sem sessão (anotado na 16.4, não investigado).
- **Ponto instável no e2e:** no passo 16, o `waitForURL(...).catch(() => {})` do login engole o erro de tempo, e o passo seguinte falha esperando o header (anotado no ajuste do switch).
- **Emojis dos eventos do Início:** os títulos ainda os têm; a 16.2 já prevê removê-los.

## 7. Resultado da implementação

- **Rodadas 1 a 4:** feitas e conferidas uma a uma pelo João Gabriel. Os ajustes estão no changelog.
- **Pergunta 5:** os pares de `surface-2` entraram no `check-contrast.mjs`, nos dois temas.
- **Pergunta 7:** a barra do navegador fica escura nas telas de entrada. Entraram dois fluxos no e2e.
- **Pergunta 6 (não feita, por um motivo diferente do previsto).**
  - O que tentei: mover o overlay para antes do conteúdo no HTML. Não mudou nada.
  - O que medi: com rede lenta, o HTML (e o overlay) chega cedo. O que demora são os pacotes de JavaScript, que no dev levam dezenas de segundos a 50 KB/s.
  - Por que aparece a tela clara: a animação CSS de segurança do overlay (`page-transition-fallback`) o esconde depois de 4s, de propósito, para a tela não travar se o JS falhar. Com o overlay escondido, aparece o carregamento da área logada, que no claro é claro, como o tema pede.
  - Decisão: desfiz a reordenação, que não teria efeito. A pergunta volta como decisão em aberto (ver o changelog).

