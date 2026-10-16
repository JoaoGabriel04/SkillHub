# Plano da subfase 16.2: Início em layout desktop

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Seção 16.2 e Seção 1), `SKILLHUB_DESIGN_SYSTEM.md` (Seção 8, regra de cor) e `CHANGELOG_MIGRACAO.md`.
> Referência visual: `designs/New Início - Desktop.png` (frame `719:130`, 1440×900).
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("aprovado, pode seguir as recomendações"). Respostas: busca visível com `emBreve`; de 1024 a 1279px, empilhado; card de evento com a paleta da 16.3; "Ver mais..." no fim da fileira de avatares. A `feat/inicio-desktop` parte de `origin/main` em `d276697`.

## 0. O que foi lido

- Seção 16.2 e Seção 1 do `SKILLHUB_SIDEBAR_E_DOMINIO.md`. Li a versão local, que tem uma alteração não commitada na Seção 16.1 (a receita de layout). Ela não muda a 16.2.
- `designs/New Início - Desktop.png`.
- `app/(app)/inicio/page.tsx` e `inicio/mock.ts`, além de `components/app/scroll-row.tsx`, `search-bar.tsx`, `servico-card.tsx`, `produto-card.tsx`, `hooks/use-drag-scroll.ts` e `lib/em-breve.ts`.
- `main` está em `d276697` (merge do PR #10). A branch `feat/inicio-desktop` sai de `origin/main`.
- Guias do Next: a subfase só usa Server Component assíncrono, Client Component para a busca e classes do Tailwind. Nada disso mudou de forma relevante desde a 16.1.

### 0.1. Três coisas que mudaram desde que a Seção 16.2 foi escrita

1. **Cores do card de evento.** A seção pede o "título amarelo `#ffd900`, botão verde `#00a61e`". A 16.3, já mergeada, trocou isso pelo `text-foreground` e pelo botão principal ciano, e o `check:cores` reprova cor escrita à mão. Ver pergunta 3.
2. **Os cards do Início não são `ServicoCard` nem `ProdutoCard`.**
   - O Início tem cards próprios, desenhados no mockup mobile: avatar, nome, descrição e "Saiba Mais" largo nos serviços; imagem, nome e preço nos produtos.
   - O frame desktop usa **esses mesmos cards** (ver o PNG). O `ServicoCard` das páginas de Serviços tem título e distância, que não aparecem no frame.
   - Por isso **não mexo em `ServicoCard` nem `ProdutoCard`**: o Início continua com os próprios cards, que no `xl` preenchem a célula da grade. Isso também evita trocar o visual do mobile.
3. **Tema claro.** Agora existem dois temas, e o Início desktop é conferido nos dois.

## 1. Como fica, a partir de `xl` (1280px)

Abaixo de `xl` o Início não muda, nem no DOM visível nem nas classes sem prefixo `xl:`. De cima para baixo, na coluna principal:

1. **Topo.**
   - O `section` da saudação vira uma linha (`xl:flex xl:items-start xl:justify-between`): "Seja Bem Vindo ao" e "SkillHub" à esquerda, como hoje, e a busca à direita.
   - A busca reaproveita o `SearchBar` (pílula de vidro, lupa à direita). O frame mostra a lupa à esquerda, mas pela regra de desempate o componente existente vence no detalhe visual. Medida: 340×44px.
   - Corrige o espaço vazio no topo do desktop (achado da 16.1): `xl:mt-0` na saudação.
2. **Banner de eventos.** Continua o `ScrollRow` com `dots`. No `xl`, cada card de evento ocupa a **largura toda** da coluna (`xl:w-full`), com cerca de 230px de altura.
   - Texto à esquerda.
   - O bloco de ícone em degradê da marca fica maior, à direita, no lugar da imagem de terceiros do frame, que não é importada.
   - Continua arrastável, e os dots continuam funcionando.
3. **Duas colunas.** Um `div` novo envolve as três seções (Colaboradores, Serviços e Produtos). Abaixo de `xl` ele é um bloco sem classes e não muda nada na tela. No `xl` vira `xl:grid xl:grid-cols-[1fr_380px] xl:gap-x-8`:
   - **Coluna esquerda: Colaboradores Relevantes.** **6** avatares de 72px. O 5º e o 6º aparecem no `xl`; os demais continuam escondidos, e hoje o `xl` mostrava 8. O "Ver mais..." fica onde está (pergunta 4).
   - **Coluna esquerda: Serviços.** O cabeçalho continua igual. A trilha do `ScrollRow` vira **grade de 2 colunas** (`xl:grid xl:grid-cols-2 xl:gap-4`, sem rolagem). Os cards além do 2º ficam com `xl:hidden`, e os cards preenchem a célula (`xl:w-auto`).
   - **Coluna direita: Produtos Relevantes.** Fica com `xl:col-start-2 xl:row-span-2 xl:row-start-1`. A trilha vira grade de 2 colunas: 2 cards de cerca de 182px de largura, com imagem de cerca de 236px de altura, mais nome e preço embaixo, porque o card existente vence no detalhe visual.
4. **Altura.** A 1440×900 a página cabe sem rolar. Ajusto os espaçamentos verticais no `xl` (`xl:mt-*`) até o fim do conteúdo ficar perto dos 770px do frame. Em telas mais baixas, a página rola normalmente.

**De 1024 a 1279px** (`lg`, com a sidebar e sem as 2 colunas): o Início continua empilhado como hoje. Só confiro que nada corta nem sobrepõe (pergunta 2).

## 2. Arquivos

Caminhos relativos a `frontend/src/`, salvo indicação.

| Arquivo | Alteração |
|---|---|
| `app/(app)/inicio/page.tsx` | Só classes `xl:`. O `div` da grade em volta das três seções. A busca no topo. `xl:hidden` nos cards além do 2º e nos colaboradores além do 6º. **Continua Server Component assíncrono** lendo de `lib/mock`. |
| `app/(app)/inicio/mock.ts` | Só os emojis dos 3 títulos: "Novo Evento!", "Guia essencial", "Maratona Tech". |
| `app/(app)/inicio/busca-global.tsx` | **Novo, pequeno.** O `SearchBar` é controlado (precisa de estado) e o Início é Server Component, então a busca precisa de um Client Component em volta. É um `<form>` com o `SearchBar` ("Buscar no SkillHub"), `hidden xl:block`, que ao enviar chama `emBreve("A busca global")`. O arquivo não está na lista do documento; é a forma de manter a página como Server Component. |
| `components/app/scroll-row.tsx` | **Indispensável:** prop opcional `trilhaClassName`, acrescentada às classes da trilha. Sem ela não dá para a mesma trilha virar grade no `xl` sem duplicar o DOM. Sem a prop, o componente fica idêntico, então as outras páginas não mudam. |
| `e2e/fluxos.mjs` | Fluxo novo a 1440×900 e a 1280px. Confere no Início: sem rolagem vertical a 1440×900, sem rolagem lateral, 6 avatares, 2 serviços e 2 produtos visíveis, busca abrindo o "Em breve" e o carrossel de eventos com dots. |
| `CHANGELOG_MIGRACAO.md` | Entrada da Fase 16.2, listando a remoção dos emojis. |

**Não tocar:**
- `components/app/servico-card.tsx` e `produto-card.tsx` (Seção 0.1, item 2);
- `lib/mock/*`, as outras páginas, a sidebar, o backend e os tokens de cor;
- nenhuma dependência nova.

## 3. Verificação

- **375, 440 e 768px:** Início idêntico byte a byte ao de antes. Como o documento pede, a captura "antes" é refeita na base **já sem os emojis**: primeiro tiro os emojis, capturo, e só então mudo o layout. Assim a comparação fica limpa. Nos dois temas.
- **1440×900:** composição igual ao frame (ordem, 6 avatares, 2 serviços, 2 produtos, coluna direita de 380px) e `scrollHeight <= innerHeight`. Nos dois temas.
- **1280, 1920 e 1024px:** nada cortado nem sobreposto, sem rolagem lateral. O carrossel de eventos arrasta com o mouse e os dots funcionam.
- **Outras páginas intactas:** Serviços e Produtos, que também usam o `ScrollRow`, idênticas byte a byte a 375 e 1440px.
- **Busca:** conforme a resposta à pergunta 1.
- `tsc` (frontend e backend), `eslint`, `next build`, `check:cores` e `./e2e/run.sh` verdes.

## 4. Perguntas em aberto

### Do documento

1. **A busca "Buscar no SkillHub" fica visível com `emBreve` ou é omitida até existir busca real?** Recomendo **visível com `emBreve`**, como no frame. É só um campo; ao enviar, mostra o aviso que o resto do app já usa. Ela não filtra o mock nem finge uma busca.
2. **De 1024 a 1279px, manter empilhado ou usar a grade de 2 colunas já no `lg`?** Recomendo **manter empilhado**. A 1024px a coluna tem cerca de 690px, e com a coluna de produtos de 380px sobrariam cerca de 280px para colaboradores e serviços, apertado demais.

### Minhas (para você confirmar)

3. **Cores do card de evento: frame/documento (amarelo e verde) ou paleta da 16.3?** Recomendo **a paleta da 16.3**: título `text-foreground` e o botão principal ciano, como já está. O frame é anterior à regra "uma única cor de ação", e voltar ao amarelo e ao verde reabriria contraste reprovado (botão verde 3,24:1) e cor escrita à mão.
4. **"Ver mais..." dos colaboradores.** No frame ele fica à direita do título da seção; hoje fica no fim da fileira de avatares. Levar o link para o título só no `xl` exigiria mexer na estrutura da lista, que também é a do mobile, e arriscaria a comparação byte a byte. Recomendo **deixá-lo no fim da fileira** também no desktop. É uma diferença pequena em relação ao frame, que fica listada no changelog.

## 5. Achados fora de escopo

- O frame mostra os cards de produto só com a imagem. Os do Início têm nome e preço embaixo, e eu mantenho, pela regra do componente existente.
- O campo de busca do frame tem a lupa à esquerda; o `SearchBar` tem à direita, e mantenho o componente.

## 6. Ajustes feitos durante a implementação

- **6 avatares a partir de 1400px, não do `xl` (desvio do plano).**
  - O problema: a 1280px a coluna esquerda das 2 colunas tem cerca de 530px. Seis avatares de 72px com os espaços (552px) empurravam o "Ver mais..." 88px para fora da coluna, e o 6º avatar encostava nos produtos.
  - A correção: até 1399px aparecem 4 avatares; a partir de 1400px, os 6. É a largura em que a coluna comporta os 6 e o link.
  - O efeito: o frame (1440px) continua atendido, e o link fica sempre dentro da coluna (medido de 1280 a 1920px).
- **Card de evento no `xl`:** título, descrição e botão centralizados verticalmente, com o botão logo abaixo da descrição, como no frame. Antes o botão ficava preso ao pé do card.
- **Altura do card de evento:** 208px, a medida do frame (o plano dizia "cerca de 230px").

