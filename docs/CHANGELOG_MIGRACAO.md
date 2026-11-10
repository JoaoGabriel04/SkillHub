# SkillHub — Changelog de Migração

> Registro de todas as fases de modernização do projeto.
> Cada entrada deve incluir: data, fase, responsável e resumo do que foi feito.
>
> As Fases 0 a 13 foram registradas no repositório anterior (`~/projetos/SkillHub/CHANGELOG_MIGRACAO.md`,
> estrutura `client/` + `server/`). Este arquivo continua a numeração a partir da reconstrução
> (`frontend/` + `backend/`).

---

## Fase 18B: carrinho, checkout e pedido

**Data:** 2026-11-09
**Status:** Implementada, PR aberto
**Branch:** `feat/produtos-pedidos`

### Contexto

Segunda subfase de `docs/especificacoes/SKILLHUB_PRODUTOS_LOJA.md` (Seção 5), com o plano em `docs/planos/PLANO_18B.md`. Os produtos passam a ser comprados em créditos:
- carrinho no navegador;
- checkout com um pedido por vendedor, numa só transação que baixa o estoque e reserva os créditos;
- envio, confirmação do recebimento (paga o vendedor, com a taxa configurável), cancelamento com estorno e devolução do estoque;
- compras, vendas e o contato pelo WhatsApp entre as partes.

Base: `origin/main` em `1948361` (o merge do PR #18). A troca de branch esbarrou de novo na migration da 18A com dono `root`; o conteúdo era idêntico ao da `main`, e a `main` local foi adiantada só pelo índice. A migration nova foi criada pelo `prisma migrate dev` **rodado no host** (contra o Postgres na porta 5432), então já nasceu com o dono certo.

Decisões tomadas na aprovação do plano (as recomendações da Seção 9), mais quatro ajustes:
- **D1:** 1 crédito = R$ 1, só para o indicador de renda, a levar ao professor. A renda de produtos vem de `PedidoProduto.total` com `CONCLUIDO`.
- **D2:** a confirmação automática não entra; há o `npm run pedidos:pendentes`, só de listagem (abaixo).
- **D3:** um pedido por vendedor.
- **D4:** a entrega é combinada pelo WhatsApp, sem copiar endereço. O detalhe mostra só cidade e bairro da outra parte. O `whatsappAtivo` do produto não vale para o contato do pedido.
- **D5:** se o vendedor exclui a conta com o pedido `ENVIADO`, o comprador pode cancelar e é estornado. É a única exceção à tabela da Seção 5.4, e está na condição do `updateMany` (ajuste 1). Confirmar, sem vendedor, dá 409 "O vendedor excluiu a conta".
- **D6:** o PATCH do produto com `estoque` exige o `estoqueLido`; se houve venda entre a leitura e o salvar, dá 409 e não grava. A tela só manda os dois quando o estoque mudou (ajuste 3).
- **D7:** a capa de um pedido cujo produto foi removido mostra o ícone de sacola quando a imagem falha.
- **D8:** os 5 desvios do schema (abaixo).
- **D9:** o teste de 15% fica no `scripts/verificar-taxa.ts`, num processo à parte, como na 17C.
- **D10:** "Suas compras" e "Suas vendas" só aparecem com ao menos 1 pedido.
- **D11:** "Comprar agora" abre o checkout só com o item, sem mexer no carrinho.
- **D12:** o carrinho relê cada produto com `GET /produtos/:id`, sem rota nova.
- **D13:** de 1 a 20 itens distintos por checkout, de 1 a 99 de cada.
- **D14:** a correção do keep-alive só entraria se a Etapa 0 confirmasse a causa. Não confirmou (abaixo).
- **D15:** devolução e disputa ficam fora (risco, abaixo).
- **Ajuste 2:** `pagarPedido` e `estornarPedido` usam `pedido.total` e abortam (erro interno, a transação volta inteira) se o pedido não tiver exatamente uma `RESERVA`, do comprador, de `-total`.
- **Ajuste 4:** a taxa de falha da reprodução do "socket hang up" está abaixo.

### Etapa 0: diagnóstico do "socket hang up"

O e2e caiu com `socket hang up` na 18A (PR #18) e com `other side closed` no PR #17, sem erro nem reinício no log do backend.

**Hipótese** (do plano): corrida de keep-alive. O Playwright usa um agente HTTP global com `keepAlive: true` e sem limite de ociosidade, compartilhado entre contextos. O servidor fecha sockets ociosos. O `execFileSync` do e2e trava o processo de teste exatamente quando o servidor fecha, e o socket fechado é reaproveitado.

**Reprodução** (script no scratchpad, fora do repositório): pedido, pausa ociosa com o último 1s travado por `execFileSync("sleep")`, pedido novo por um contexto novo (no Playwright) ou pelo `fetch`.

| Alvo | Pausa | Playwright | `fetch` |
|---|---|---|---|
| backend do compose | 4,8 a 5,2s | 0 de 300 (0,0%) | 0 de 300 (0,0%) |
| backend do compose | 5,8 a 6,2s | 0 de 60 (0,0%) | 0 de 60 (0,0%) |
| servidor Node local, fora do Docker | 5,8 a 6,2s | 0 de 40 (0,0%) | 0 de 40 (0,0%) |
| backend do compose, **pausa inteira travada** (como as `sql()` seguidas do e2e) | 6,2 a 6,8s | 0 de 10 (0,0%) | 0 de 10 (0,0%) |
| backend do compose, **pausa inteira travada** | 5,8 a 7,0s | 0 de 60 (0,0%) | 0 de 60 (0,0%) |

- **Taxa de falha antes: 0% (0 de 940).** Como a causa não se confirmou, **a correção não entrou** (D14), e não há medida "depois". O `backend/src/index.ts` não mudou.
- **Achado no caminho:** o Node 24.22 do container anuncia `Keep-Alive: timeout=5`, mas só fecha o socket ocioso aos **6s** (`keepAliveTimeoutBuffer` de 1000ms). Essa folga já é a proteção contra a corrida que a hipótese descrevia. A primeira bateria (pausas até 5,2s) nem chegava à janela; a segunda mirou nela e também não falhou. Contra o servidor local, cerca de 20 dos 82 pedidos reaproveitaram o socket, sem nenhuma falha.
- **Descartados:**
  - reinício do container: `RestartCount=0` e nenhum "Restarting" no log;
  - memória: 88 MiB, sem `OOMKilled`;
  - pool do Prisma: 1 conexão ativa num `max_connections` de 100, e nenhum `P2024` no log (um pool esgotado daria 500 com log, não um socket cortado);
  - a corrida de keep-alive, pelas medidas acima.
- **Nova ocorrência, depois do diagnóstico:** numa rodada de verificação dos modais (abaixo), o e2e caiu com `POST /pedidos: other side closed` (undici), na 15j. Era um socket reaproveitado (3.070 bytes escritos e 5.614 lidos antes), sem reinício do backend, logo depois de uma sequência de chamadas `sql()` síncronas (o `prodSql`), sem nenhum `await` entre elas. Isso aponta para a mesma família (um socket ocioso reaproveitado logo depois de o processo de teste ficar travado), mas as duas baterias com a pausa inteira travada também deram 0 de 140. A janela é mais estreita do que a reprodução alcança, e **a causa continua não confirmada**. Por isso a correção do keep-alive continua fora (D14).
  - Depois disso, a queda se repetiu em mais 2 rodadas, sempre no `POST /pedidos` da 15j (duas vezes na mesma linha, logo depois de seis `sql()` síncronas). Ao todo, foram 3 de 6 rodadas.
  - Achado da investigação: a reprodução usava `GET /health`, e o undici repete sozinho uma requisição idempotente (GET) quando o socket reaproveitado cai, o que esconderia o erro. Refiz com `POST` (sem token, 401): de novo 0 de 60, com a pausa inteira travada.
  - Não houve reinício do `tsx watch` nem erro no log do backend ou do Postgres no minuto das quedas, e o pool estava folgado (1 conexão ativa e 6 ociosas).
- **O que fica:** a regra de 5 rodadas seguidas continua, sem retry no teste. Durante o desenvolvimento da 18B, duas das rodadas de depuração caíram fora da 18B, as duas logo depois de um login, esperando o `/inicio`. Nenhuma foi `socket hang up` (Achados fora de escopo).

### Arquivos

**Backend**

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261109144915_pedido_produto` | Enums `StatusPedidoProduto` e `ParteDoPedido`; models `PedidoProduto` e `ItemPedido` (Seção 5.1, com os 5 desvios abaixo); `TransacaoCredito.pedidoId` (só referência, com índice); as relações `compras`, `vendas` e `itensPedido`. |
| `src/modules/pedido/` | **Novo:** `pedido.schema.ts`, `pedido.repository.ts` (o único que escreve em `PedidoProduto` e `ItemPedido`), `pedido.service.ts`, `pedido.controller.ts` e `status.map.ts`. |
| `src/api/routes/pedido.route.ts`, `index.ts` | **Novo** router `/pedidos`, todo com `authenticate`; `/compras` e `/vendas` antes de `/:id`. |
| `src/modules/credito/credito.service.ts`, `credito.repository.ts` | `pedidoId` no `movimentar` e no extrato; `reservarPedido`, `pagarPedido` e `estornarPedido` (ajuste 2); a taxa virou `cobrarTaxa`, usada pelos serviços e pelos pedidos. O 409 de saldo leva `code: "SALDO_INSUFICIENTE"`. Os caminhos de serviço não mudaram de comportamento. |
| `src/modules/produto/produto.repository.ts` | `paraCheckout`, `baixarEstoque` (condição com status, preço e estoque), `estadoParaCheckout` e `devolverEstoque`. Continua sendo o único que escreve em `Produto.estoque`. O PATCH ganhou a condição do `estoqueLido` (D6). |
| `src/modules/produto/produto.schema.ts`, `produto.service.ts` | `estoqueLido`, obrigatório quando o corpo traz `estoque` (D6). |
| `src/modules/produto/whatsapp.ts` | `linkWhatsappPedido`, com a mensagem de quem comprou e de quem vendeu. |
| `src/utils/AppError.ts` | `extra` opcional (o `code` e o produto do 409). Os usos de antes não mudaram. |
| `scripts/pedidos-pendentes.ts`, `package.json` | **Novo** `npm run pedidos:pendentes`. |
| `scripts/verificar-taxa.ts` | Os 6 casos de pedido com 15%; a conservação passa a somar as reservas de pedido em aberto. |

**Desvios da Seção 5.1** (D8):
1. `canceladoPor` é o enum `ParteDoPedido`, e não `String`.
2. `ItemPedido.digital`, em snapshot ("Entregue" no lugar de "Enviado").
3. `@@index([status, enviadoEm])`, para o `pedidos:pendentes`.
4. `ItemPedido.@@index([produtoId])`, para o `SetNull` ao apagar produtos.
5. `TransacaoCredito.@@index([pedidoId])`.

**Frontend**

| Arquivo | Alteração |
|---|---|
| `src/types/pedido.ts`, `src/lib/pedidos.ts`, `src/lib/validation/pedido.ts` | **Novos.** |
| `src/stores/carrinho-store.ts` | **Novo.** Zustand com `persist`, sobre um adaptador com `try/catch` (com o `localStorage` bloqueado, o carrinho funciona na memória). Um carrinho por conta (`donoId`). `skipHydration`, para o servidor e o navegador renderizarem igual. |
| `src/components/app/botao-carrinho.tsx`, `carrinho-dialog.tsx`, `checkout-dialog.tsx` | **Novos.** O botão com a contagem no título de Produtos; o carrinho agrupado por vendedor, com indisponível fora do total; o checkout com saldo, observação e o estado de saldo insuficiente. |
| `src/components/app/pedido-card.tsx`, `pedido-detalhe-dialog.tsx`, `pedido-foto.tsx` | **Novos.** O card de pedido (as medidas do `ProdutoCard`; o carregando reaproveita o `ProdutoCardEsqueleto`, sem arquivo novo); o detalhe com a linha do tempo, os itens, a outra parte (cidade e bairro) e as ações do papel; a foto com o marcador (D7). |
| `src/components/app/produto-detalhe-dialog.tsx` | Quantidade, "Adicionar ao carrinho" e "Comprar agora". |
| `src/components/app/publicar-produto-dialog.tsx`, `src/lib/produtos.ts` | `estoque` + `estoqueLido` só quando o estoque mudou (D6). |
| `src/components/app/extrato-dialog.tsx`, `src/types/credito.ts` | "Pedido: nome do primeiro item (+N)". |
| `src/app/(app)/produtos/page.tsx` | O carrinho no título (para todos), e as linhas "Suas compras" e "Suas vendas", com carregando e erro. |

**Modais com altura máxima e rolagem interna** (commit próprio, `fix: modais com altura máxima e rolagem interna`). Em janela de pouca altura, o detalhe do produto passava da janela e era cortado em cima e embaixo, sem como rolar: o `ProfileDialog` usa o `DialogContent` do shadcn, centralizado e sem altura máxima. A correção é só na casca e vale para todos os modais que usam o `ProfileDialog` (produto, publicar produto, serviço, publicar serviço, extrato, edições do Perfil, carrinho, checkout e pedido). O `ui/dialog.tsx` não mudou, e nenhum modal fora do `ProfileDialog` mudou.

| Arquivo | Alteração |
|---|---|
| `src/components/app/perfil/profile-dialog.tsx` | A caixa vira coluna flex (`flex!`, porque o `cn` do projeto não tira o `grid` do shadcn) com `max-h-[calc(100dvh-2rem)]`. O título, a descrição e o X ficam fixos no topo, e o Cancelar/Salvar no rodapé; só o conteúdo (com a mensagem de erro) rola. A rolagem (`overflow-y-auto`, a calha e o padding compensado) só liga quando o conteúdo passa da altura, medida por um `ResizeObserver`. Quando o modal cabe, a área é um bloco comum. |
| `src/app/globals.css` | `.rolagem-modal`: barra de 6px, polegar em `--border-input` (`--muted-foreground` no hover), trilho transparente, `scrollbar-gutter: stable`, e a barra fina padrão (com as mesmas cores) nos navegadores sem `::-webkit-scrollbar`. |

Por que a rolagem só liga quando precisa, e por que a caixa não tem `overflow-hidden`: as duas coisas, mesmo sem nada para rolar, mudam o desenho do Chromium. Aparecem diferenças de 1 nível de cor nos cantos dos botões e nas bordas, de 2 a 42 pixels por modal. A comparação byte a byte pegou isso. Testei uma propriedade de cada vez: sem as duas, todos os modais saem idênticos; com qualquer uma delas, não. O conteúdo rolado não aparece nos cantos de baixo porque a própria área que rola tem os cantos arredondados.

Ícones novos em Lucide (`ShoppingCart`, `Minus`, `Plus`, `Trash`). O "Falar com o vendedor/comprador" do pedido usa o mesmo ícone do WhatsApp (Font Awesome) do detalhe do produto, para as duas telas ficarem iguais. Nenhuma dependência nova.

**e2e:** `e2e/fluxos.mjs` ganhou a seção `15j` (63 verificações), e a 15g conta 12 casos de taxa no lugar de 6. O `cleanup` do `e2e/run.sh` apaga, antes das contas, os pedidos em que uma das partes é `e2e.*` (com `SetNull`, eles não caem com as contas).

### Regras que valem daqui em diante

- **Ordem das travas** em toda transação que mexe em mais de uma linha:
  1. a linha do pedido;
  2. as linhas de `Produto`, em ordem crescente de id;
  3. os usuários, sempre com a conta da plataforma por último.
  Com isso não há deadlock. Se ainda assim o Postgres acusar conflito (`P2034`), a resposta é 409 `CONFLITO`, e não 500.
- **Créditos só pelo `credito.service`** (o `check:creditos` passa). **Estoque só pelo `produto.repository`.**
- **Telefone privado:** sai só em `GET /pedidos/:id/contato`, para as partes e com o pedido em aberto. As respostas de pedido trazem só a cidade e o bairro da outra parte.
- **Primeiro item:** os itens de um pedido saem sempre em ordem de nome, então o resumo, o extrato e a mensagem do contato citam o mesmo.

### Exclusão de conta hoje (o bloqueio é da 18C)

- **Comprador sai com pedido em aberto:**
  - o extrato dele some (`TransacaoCredito.user` é `Cascade`), e a reserva vai junto;
  - o vendedor ainda vê o pedido e pode cancelar (o estoque volta, sem estorno);
  - ninguém confirma.
- **Vendedor sai com pedido aguardando envio:** o comprador cancela e é estornado. O estoque não volta, porque o produto caiu em cascata.
- **Vendedor sai com pedido enviado:** D5 (acima).
- **Pedidos concluídos ficam**, com `total` e `concluidoEm`, e continuam contando para volume e renda.

### Validação

- `prisma migrate status` sem pendências; `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 346/346** (antes: 276/276; 70 novos: 64 na `15j`, incluindo a altura dos modais a 440x500 e 6 casos de pedido no script da taxa, chamado pela 15g). Cobrem a Seção 5.7 inteira e os itens a a i do pedido: compra, atomicidade por estoque e por saldo, `PRECO_ALTERADO`, `INDISPONIVEL`, as 4 corridas (5 vezes cada por rodada), o ciclo, os cancelamentos, consultas e privacidade, o extrato, o `pedidos:pendentes`, o histórico, a exclusão de conta hoje, a conferência da reserva, o D6 e as telas.
- **Rodadas da 18B (antes da correção dos modais):** 5 de 5 seguidas, todas com 345/345, depois de reiniciar o container do frontend (ver Achados fora de escopo). No fim, nenhuma conta de teste e nenhum pedido sem as duas partes ficaram no banco.
- **Rodadas com a correção dos modais (346 verificações): a regra de 5 seguidas NÃO foi cumprida.**
  - Rodadas 1 e 2: 346/346.
  - Rodada 3: 345/346. A falha foi um aviso `GSAP target  not found` no console de `/produtos`, que vem da transição de página (`page-transition.tsx`, Fase 16), quando ela roda sem nenhum `[data-page-exit]` na tela (fora da Fase 18).
  - Rodadas 4 e 5: pararam com `POST /pedidos: other side closed` na 15j (Etapa 0).
  - O item novo da altura dos modais passou em todas as rodadas que chegaram até ele (1, 2 e 3). As quedas não têm relação com a correção, que só muda o frontend.
- **Visual, byte a byte:** Serviços, Perfil, Configurações, Comunidade, Início, login, cadastro, o detalhe de um pedido de serviço, o popover de créditos (abaixo de `lg`) e o extrato vazio, a 375 e 1440px, nos dois temas: **38 de 38 idênticas à base**.
  - **Método:** o mesmo da 18A. A base foi capturada com o frontend de `1948361` (os 16 arquivos da 18B tirados de lado e restaurados, conferidos por hash), contra o mesmo backend e o mesmo banco, com duas capturas de cada lado.
  - **Ruído:** 4 telas variam entre duas capturas da própria base (`cadastro_1440` nos dois temas, `creditos-popover_375_claro` e `inicio_1440_escuro`), e cada uma tem um par antes x depois idêntico.
- **Diferenças previstas:** `/produtos` (o carrinho no título e as linhas Suas compras e Suas vendas) e o detalhe do produto (quantidade, Adicionar ao carrinho, Comprar agora).
- **Modais (altura máxima e rolagem interna):**
  - **Alturas baixas (1440x500 e 375x600, nos dois temas):** o detalhe do produto com 2 fotos, publicar produto, publicar serviço, extrato, detalhe do serviço e editar dados pessoais cabem na janela, com o título e o X visíveis, e a rolagem alcança o último botão. Antes, o detalhe do produto chegava a 861px de altura (o título, o X e o último botão ficavam fora da janela), e o publicar serviço passava da janela em 1440x500.
  - **Alturas normais (1440x900 e 375x812, nos dois temas), contra uma base capturada duas vezes:** **20 de 24 idênticas byte a byte.** As 4 que mudam, com o motivo:
    - **Detalhe do produto a 375x812 (2 telas):** antes, ele **não cabia** (850px numa janela de 812, com o X cortado no topo). Agora cabe e rola. É a correção.
    - **Extrato a 375x812 (2 telas):** antes, o conteúdo **vazava pela direita**, com os valores (−45,00, +200,00) e a descrição cortados na borda da tela. No `grid` do shadcn, um texto com `truncate` alargava a coluna além da caixa. Na coluna flex, a largura é a da caixa, o `truncate` funciona e os valores aparecem inteiros. O carrinho a 375 tinha o mesmo vazamento (o Finalizar compra e o total passavam da margem direita) e agora também fica dentro da margem.
  - **Modais da 18B (carrinho, checkout e pedido), contra as capturas de antes da correção:** as diferenças são o horário da linha do tempo do pedido (os pedidos são criados na hora), o fundo atrás do vidro (os dados variam entre execuções, como na base) e o vazamento corrigido do carrinho e do extrato a 375.
  - **A barra de rolagem não aparece nas capturas:** o Chromium sem interface oculta as barras. A calha de 6px está reservada, e a largura do conteúdo é a mesma com e sem rolagem.
- **Telas novas**, 60 capturas a 375 e 1440px nos dois temas, sem aviso nem erro no console: `/produtos` com compras e com vendas, o carrinho (com indisponível e vazio), o checkout, o saldo insuficiente, o detalhe do produto com a compra, o pedido em cada status e papel, as confirmações de cancelar e de confirmar o recebimento, e o extrato com as linhas de pedido.

### Depois do merge

- **`docker compose up -d --build -V backend`.** Sem o `-V`, o volume anônimo do `node_modules` mantém o Prisma Client antigo, e as rotas de pedido dão 500.
- Nenhum seed novo.

### Proposta para uma fase futura

- **Confirmação automática do recebimento:** pedidos `ENVIADO` há mais de N dias seriam concluídos por uma tarefa agendada, com aviso às duas partes. Hoje só existe a listagem (`npm run pedidos:pendentes`). Decidir N, o aviso e quem pode contestar.

### Achados fora de escopo

- **Duas quedas do e2e em rodadas de depuração, fora da 18B:**
  - **15a2:** `page.waitForURL("**/inicio")` esgotou os 30s depois do clique em Entrar (`e2e/fluxos.mjs:335`).
  - **Passo 8:** o login com "Lembre de mim" espera o `/inicio` por só 5s e engole o erro (`.catch(() => {})`). O clique seguinte, em Configurações, não navegou.
  - As duas são login seguido da transição de entrada (a colmeia, que bloqueia cliques até voltar ao repouso). É o mesmo mecanismo que a A5 da faxina corrigiu no passo 16, com o `transicaoParada()`, e que não foi aplicado nesses dois pontos.
  - Coincidiram com o `next dev` do container em 1 GB de memória depois de um dia de hot reload. Depois de reiniciar o container, não voltaram. **Não mexi nesses testes** (fora da 18B); a correção seria o `transicaoParada()` depois desses dois logins, sem aumentar timeout.
- **`next/image` e a mesma foto em vários lugares:** o Next guarda o `loading` de cada imagem pela URL otimizada. Com a mesma foto em duas linhas (uma acima da dobra, sem lazy, e outra abaixo, com lazy), o aviso de LCP com lazy aparece mesmo com a imagem certa sem lazy. O aviso só existe em desenvolvimento. Aconteceu no e2e porque todos os produtos da 15j usavam a mesma URL; agora cada um tem a sua.
- **Migrations antigas com dono `root`** (as da 17 e a da 18A): `sudo chown -R $USER backend/prisma/migrations`. A da 18B foi criada no host e não tem o problema.
- **Devolução e disputa (D15):** não há mediação. Se o vendedor marca como enviado e não entrega, o comprador não tem como cancelar nem contestar pela plataforma (a reserva fica presa até o vendedor cancelar). Fica como risco.
- **Pedido de quem excluiu a conta:** a reserva some com o extrato do comprador (Cascade). Quando a 18C trouxer o bloqueio, isso deixa de acontecer com pedido em aberto.

---

## Fase 18A: catálogo de produtos e contato por WhatsApp

**Data:** 2026-11-09 (implementação em 2026-11-03 e 04)
**Status:** Implementada, PR aberto
**Branch:** `feat/produtos-catalogo`

### Contexto

Primeira das três subfases de `docs/especificacoes/SKILLHUB_PRODUTOS_LOJA.md` (Produtos como loja), com o plano em `docs/planos/PLANO_18A.md`. Os produtos saem do mock e vão para o banco: publicar com fotos, editar, pausar, remover, busca e filtros no servidor, detalhe e contato com o vendedor por link do WhatsApp. **Não mexe em créditos:** carrinho, checkout e pedido são da 18B.

Base: `origin/main` em `26ba19d`, a mesma do documento. O documento estava na raiz, fora do git, e foi movido sem alteração para `docs/especificacoes/`.

Decisões tomadas na aprovação do plano ("faça o recomendado", todas as recomendações da Seção 9):
- **D1:** 1 crédito = R$ 1, só para o indicador de renda e a levar ao professor. Aparece só em comentário; nada no código converte valores.
- **D2:** só Colaborador e Empresa com perfil completo publicam. Cliente recebe 403 e não vê o botão.
- **D3:** o "(Jovem aprendiz)" sai do card; nenhum campo novo no perfil.
- **D5:** esgotado continua visível, com a etiqueta "Esgotado".
- **D9:** os banners de Destaques ficam estáticos em `lib/mock/produtos.ts` até a Fase 19.
- **D8:** `contatoDisponivel` (booleano) no detalhe, para não mostrar um botão que sempre daria 404.
- **D10:** uma requisição por categoria nas linhas de `/produtos` (`limit=12`).
- **D11:** o card do Início abre o detalhe.
- **D12:** `lib/mock/pessoas.ts` fica para a 18C (agora sem uso).
- **D13:** o filtro de texto se chama `busca`, como na especificação.
- **D14:** o PATCH das fotos recebe a lista final em ordem (`imagens`, com ids existentes e `"nova:N"`).
- **D15:** teto de 9999 no estoque.

### Arquivos

**Backend**

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261104023202_produto` | Enums `CategoriaProduto` e `StatusProduto`, models `Produto` e `ProdutoImagem`, exatamente como na Seção 4.1 do documento (sem desvio). No `User`, só a relação inversa `produtosVendidos`. |
| `src/modules/produto/` | **Novo:** `categoria.map.ts`, `produto.schema.ts` (Zod, com coerção do multipart), `produto.repository.ts` (único ponto que escreve em `Produto` e `ProdutoImagem`), `produto.service.ts`, `produto.controller.ts` e `whatsapp.ts` (normalização do telefone e o link `wa.me`). |
| `src/api/routes/produto.route.ts`, `src/api/routes/index.ts` | **Novo** router `/produtos`, todo com `authenticate`; `/meus` antes de `/:id`. |
| `src/configs/multer.ts` | `produtoFotosUpload`: campo `fotos`, de 1 a 4 arquivos, com as mesmas regras de tipo, assinatura e 5 MB. Os uploads de foto de perfil e currículo não mudaram. |
| `src/modules/user/user.service.ts` | Exclusão de conta: lê os `publicId` das fotos dos produtos antes do `delete` (os produtos caem em cascata) e os apaga do Cloudinary depois, com "melhor esforço". |
| `prisma/seed.ts` | 8 produtos nas 5 categorias (um digital, um esgotado, um pausado), fotos por URL com `publicId` nulo, uma vendedora Empresa nova ("Ateliê Costa") e telefone fictício nos vendedores do seed. |

**Frontend**

| Arquivo | Alteração |
|---|---|
| `src/types/produto.ts`, `src/lib/produtos.ts`, `src/lib/validation/produto.ts` | **Novos:** tipos, cliente da API com as chaves do SWR, e a validação (as regras do backend, mais as das fotos). |
| `src/app/(app)/produtos/page.tsx` | Lê a API. Chips e busca filtram no servidor (debounce de 300ms). "Publicar" e "Seus produtos" para quem vende. Estados de carregando (esqueleto), vazio e erro com "Tentar de novo". As fotos visíveis na primeira tela carregam sem lazy (as 2 primeiras linhas, até 6 por linha, e os 10 primeiros resultados da busca), para o Next não avisar de LCP com lazy. |
| `src/components/app/produto-card.tsx` | Mesmo visual, agora com "N créditos", a capa da API, a etiqueta "Esgotado"/"Pausado" e o clique abrindo o detalhe. |
| `src/components/app/produto-card-esqueleto.tsx`, `produto-detalhe-dialog.tsx`, `publicar-produto-dialog.tsx` | **Novos:** esqueleto do card; detalhe (fotos com troca, vendedor com média, "Falar com o vendedor", e Editar/Pausar/Remover para o dono); publicar e editar (fotos com pré-visualização, troca de ordem e remoção). |
| `src/app/(app)/inicio/produtos-relevantes.tsx`, `inicio/page.tsx`, `inicio/mock.ts` | A seção "Produtos Relevantes" vira componente cliente lendo `GET /produtos?limit=8`, com o mesmo markup. Sem produtos ou com erro, a seção some. |
| `src/lib/mock/produtos.ts` | Ficam só os Destaques. |

**e2e:** `e2e/fluxos.mjs` ganhou a seção `15i` (48 verificações), e o `cleanup` do `e2e/run.sh` também apaga do Cloudinary as fotos de produto dos usuários `e2e.*`.

Nenhuma dependência nova.

### Regras que valem daqui em diante

- **Telefone privado:** só sai dentro do link de `GET /produtos/:id/contato`. O repositório lê o telefone numa consulta à parte, e ele nunca entra no objeto da resposta. O e2e varre lista, meus, detalhe, publicar, editar e o resumo do usuário atrás do telefone (com e sem máscara) e do e-mail.
- **Escrita condicional:** editar, pausar e remover usam `updateMany` com `vendedorId` e `status` na condição, dentro de transação. Um produto removido nunca volta, e uma edição de fotos nunca deixa o produto com 0 nem com mais de 4.
- **Fotos no Cloudinary:** `Skillhub/produtos/<vendedorId>/<produtoId>-<imagemId>`. Se uma foto falhar no upload, as outras são apagadas e a resposta é 502. Se o banco falhar depois do upload, as fotos novas também são apagadas.

### Validação

- `prisma migrate status` ("Database schema is up to date"); `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 276/276** (antes: 228/228; 48 novos), cobrindo a Seção 4.5 inteira. Entre os novos: publicar com 1 e 4 fotos, 0, 5, arquivo falso e acima de 5 MB; validação de cada campo; 403 para Cliente e perfil incompleto e 401 sem token; listagem sem o próprio produto, com filtro, busca e cursor; pausado e removido; `vendedorReputacao` contra SQL; edição e remoção só pelo dono; duas corridas (duas edições de fotos simultâneas, e editar com remover); contato e privacidade; exclusão de conta do vendedor; e as telas.
- **Rodadas:** 5 de 5 seguidas, todas com 276/276. Numa bateria anterior (04/11), uma rodada caiu no meio com `socket hang up` (ver "Achados fora de escopo"); a bateria final, de 09/11, passou inteira.
- **Visual, byte a byte:** Serviços, Perfil, Configurações, Comunidade, login, cadastro, o detalhe de um pedido de serviço aberto e o popover de créditos (este só abaixo de `lg`, onde o chip existe), a 375 e 1440px, nos dois temas: 30 capturas.
  - **Método:** as capturas da base foram feitas com o frontend de `26ba19d` (os arquivos da 18A tirados de lado e restaurados depois, conferidos por hash), contra o mesmo backend e o mesmo banco. Usuário Colaborador com 0 crédito, mouse fora da página, "menos movimento" ligado. Duas capturas de cada lado.
  - **Resultado:** 28 de 30 idênticas à base. As outras duas (`cadastro_1440`, nos dois temas) diferem em 1.962 pixels na faixa y 125 a 179, a da animação das telas de entrada. Duas capturas da própria base do `/login` também variam nessa faixa (11.465 pixels): é ruído de renderização, e cada uma tem pelo menos um par antes x depois idêntico.
- **Telas novas**, capturadas a 375 e 1440px nos dois temas para a conferência visual: Início, `/produtos` com "Seus produtos" vazia e cheia, carregando, erro, detalhe (comprador e dono), confirmação de remoção, publicar (vazio e com erros) e editar.
- **Diferenças previstas:** `/produtos` (dados reais, preços em créditos, sem "Jovem aprendiz", "Publicar" e "Seus produtos" para quem vende) e Início (só a seção "Produtos Relevantes", com as fotos do seed e "N créditos").

### Depois do merge

- **Reconstruir o backend com volumes novos:** `docker compose up -d --build -V backend`. O Prisma Client é gerado no build da imagem, mas o `node_modules` fica num volume anônimo que o compose reaproveita até no `--build`. Sem o `-V`, o client antigo continua lá, sem o model `Produto`, e todas as rotas de produto dão 500 (`Cannot read properties of undefined (reading 'findMany')`).
- Rodar o seed, se quiser os produtos de exemplo.

### Achados fora de escopo

- **Queda intermitente do e2e** (`socket hang up` / `other side closed` vindo do backend), a mesma do PR #17. Aconteceu de novo numa rodada da 18A, no login da seção de avaliações, sem erro nem reinício no log. A causa segue em aberto.
- **Migrations com dono `root`:** criadas pelo `prisma migrate dev` dentro do container, o `git checkout` não consegue apagá-las nem regravá-las. Sugestão: `sudo chown -R $USER backend/prisma/migrations`.
- **Capa de pedido antigo (para a 18B):** remover um produto apaga as fotos no Cloudinary, como pede o documento. Na 18B, o snapshot da capa num pedido antigo deixa de abrir. O plano da 18B precisa decidir entre guardar as fotos enquanto houver pedido ou mostrar um marcador.
- **Duas edições de fotos ao mesmo tempo:** a trava garante de 1 a 4 fotos, mas vale a última que chega. Se as duas acrescentam fotos, a segunda pode tirar as que a primeira acabou de pôr. Hoje é aceitável (só o dono edita); uma versão do produto no PATCH resolveria.
- **Foto órfã:** se o processo cair entre o upload e o banco, a foto fica no Cloudinary. O prefixo pelo vendedor facilita a limpeza manual.
- **Aviso de LCP nas capturas de página inteira:** o screenshot `fullPage` estica a viewport, e o Next passa a ver como "acima da dobra" fotos que estão bem abaixo (por exemplo, a da última categoria a 375px). Navegando normalmente, não há aviso. É artefato do método de captura, não da página.
- **`lib/mock/pessoas.ts`** ficou sem uso (limpeza na 18C, como pede o documento).
- **Cadastro de Empresa** continua desabilitado na tela. Pela tela, só Colaborador publica; Empresa publica pela API e pelo seed.

---

## Ajustes de domínio antes da Fase 18 (PR B)

**Data:** 2026-10-16
**Status:** Implementada, PR aberto
**Branch:** `feat/ajustes-dominio`

### Contexto

Segunda parte da faxina pedida em `SKILLHUB_FAXINA_PRE_FASE_18.md` (plano em `PLANO_FAXINA.md`, Seção 2). Muda regras de negócio e tem duas migrations.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **`SetNull` também em `Avaliacao.servico`.** Sem isso, a avaliação ainda sumiria quando quem sai é o autor, porque os pedidos dele caem em cascata.
- **Checagem mínima no `auth.service`**, para o "esqueci a senha" e o login social não abrirem a conta da plataforma.

### B1. Conta da plataforma para a taxa

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261016194710_taxa_recebida` | `TAXA_RECEBIDA` no enum `TipoTransacao`. |
| `src/configs/creditos.ts` | `contaPlataforma()`: id `00000000-0000-4000-8000-000000000001`, e-mail `plataforma@skillhub.invalid` e nome "SkillHub", com padrão no código. `PLATFORM_ACCOUNT_ID` e `PLATFORM_ACCOUNT_EMAIL` só mudam para o teste da taxa usar uma conta própria. O `.env` não mudou. |
| `src/modules/credito/plataforma.ts`, `scripts/garantir-conta-plataforma.ts`, `prisma/seed.ts`, `package.json` | **Novos.** `garantirContaPlataforma()` faz um `upsert` pelo id, sem senha. É chamada pelo seed e por `npm run plataforma:garantir`, e é idempotente. O `e2e/run.sh` também a chama antes dos testes. |
| `src/modules/credito/credito.service.ts`, `credito.repository.ts` | `pagar`: com taxa maior que 0, `TAXA -taxa` no colaborador e `TAXA_RECEBIDA +taxa` na plataforma, na mesma transação e pelo `movimentar`. Com taxa 0, nenhuma linha extra. Sem a conta da plataforma, o `concluir` dá 500 e a transação volta inteira. Rótulo "Taxa recebida" no extrato. |
| `src/modules/auth/auth.service.ts` | A conta da plataforma é tratada como inexistente: o login dá "E-mail ou senha incorretos", o "esqueci a senha" não gera link, e o login social com o e-mail dela dá 403 "Este e-mail não pode ser usado para entrar", sem vincular nem criar conta. |
| `src/modules/usuario/usuario.service.ts`, `avaliacao.service.ts` | `GET /usuarios/:id/resumo` e `GET /usuarios/:id/avaliacoes` dão 404 para ela. Não há listagem nem busca de usuários hoje; quando houver (Fase 18+), elas devem filtrar `ehContaPlataforma`. |
| `scripts/verificar-taxa.ts` | **Novo.** O teste com 15%, rodado pelo e2e no container com a taxa e uma conta da plataforma de teste só naquele processo. Ele chama os services direto e apaga o que criou. |
| `frontend/src/types/credito.ts` | "Taxa recebida" no tipo do extrato. |

### B2. Avaliações sobrevivem à exclusão de conta

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261016194454_avaliacao_sobrevive` | `avaliadorId` e `servicoId` opcionais, com `onDelete: SetNull`; `avaliado` continua `Cascade`. O `@@unique([servicoId, avaliadorId])` ficou: no PostgreSQL, `NULL` não colide em índice único, e as linhas novas sempre têm os dois preenchidos. |
| `src/modules/avaliacao/avaliacao.service.ts` | `avaliador: null` quando a conta foi excluída, e `servico: null` quando o pedido sumiu, sem nenhum dado de quem saiu. A média segue por `avaliadoId`, então continua contando. |
| `frontend/src/types/avaliacao.ts`, `components/app/servico-detalhe-dialog.tsx` | `avaliador` e `servico` opcionais. O detalhe do pedido mostra "Avaliação de Usuário removido". O plano falava em avatar de iniciais, mas essa seção não tem avatar, então ficou só o nome. |

### B3. Exclusão bloqueada com pedido em andamento

| Arquivo | Alteração |
|---|---|
| `src/modules/user/user.service.ts` | `deleteAccount`: 409 "Conclua ou cancele seus pedidos em andamento antes de excluir a conta" para quem for autor ou colaborador aceito de um pedido em andamento. A checagem vem depois da senha, para o 409 não dizer nada a quem não a tem. Pedidos abertos e candidaturas pendentes continuam caindo em cascata. |
| `src/modules/servico/servico.service.ts`, `servico.repository.ts` | `temPedidoEmAndamento(userId)`. |
| Tela | O `delete-account-dialog.tsx` já mostrava o erro da API no `FormAlert`; não mudou. |

### Testes ajustados

- **"Colaborador aceito que sai"** (15f e 15g): pela API, agora dá 409. O estado continua possível em dados antigos, então é reconstruído com `delete from "User"` por SQL, que dispara o mesmo `ON DELETE` que a exclusão pelo app disparava. Os testes de "concluir dá 409" e "cancelar estorna" continuam cobrindo esse estado.
- **Autor que exclui a conta** (15h): a avaliação continua, a média do colaborador fica em 3,5 com total 4, e a lista pública mostra `avaliador: null` e `servico: null`.
- **Colaborador que saiu** (15h): a nota 2 que ele deu continua, e o resumo do autor passa a média 3 e total 2.
- **`orfas()`** conta só avaliação sem o avaliado.
- **Taxa 0:** também sem `TAXA_RECEBIDA`.

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 228/228** (antes: 211/211; 17 novos). Os novos cobrem:
  - **B1:** os 6 casos do script da taxa; a conta da plataforma existe, mas o login e o "esqueci a senha" a tratam como inexistente; ela não tem resumo nem avaliações públicas (404); e o saldo e o extrato dela não mudam com o resto da suíte.
  - **B2:** a avaliação de quem saiu continua na lista pública, sem nenhum dado da pessoa, e o detalhe do pedido mostra "Usuário removido".
  - **B3:** 409 para o autor e para o colaborador aceito; senha errada continua 403; 204 depois de cancelar e depois de concluir; o pedido aberto e a candidatura pendente somem; e, na tela, o diálogo mostra o 409 e continua aberto.
- **Rodadas:** 4 de 5 passaram inteiras. A primeira parou no meio, logo depois de "extrato bate com o saldo de todos os usuários de teste", com `fetch failed: other side closed` vindo do backend. O backend não reiniciou nem registrou erro nesse intervalo. Tentei reproduzir isolando o keep-alive (conexão ociosa perto dos 5s do Node, com e sem `execFileSync` travando o event loop), em 70 tentativas, sem nenhuma falha. A causa não foi encontrada. O `chamar` do e2e agora diz qual rota caiu, para a próxima ocorrência apontar o ponto exato.
- **Visual:** o diálogo com o 409 a 375px, nos dois temas: a frase quebra em duas linhas, sem rolagem horizontal, e o diálogo continua utilizável.
- **Invariante da taxa:** a soma só dos saldos **não** se conserva na reserva, porque o crédito sai do autor e fica preso no pedido até concluir ou cancelar. O que se conserva é **saldos + reservas em aberto** (pedidos em andamento), e é isso que o `verificar-taxa.ts` confere em cada passo.

### Achados fora de escopo

- A queda intermitente da rodada 1 do e2e (`other side closed`), ainda sem causa encontrada.
- Entre a checagem do 409 e a exclusão da conta, uma aceitação simultânea ainda passaria. Fechar isso pede travar as linhas na mesma transação da exclusão, no `user.repository`.

---

## Faxina antes da Fase 18 (PR A)

**Data:** 2026-10-16
**Status:** Implementada, conferida, PR aberto
**Branch:** `chore/faxina`

### Contexto

Primeira das duas partes da faxina pedida em `SKILLHUB_FAXINA_PRE_FASE_18.md` (plano em `PLANO_FAXINA.md`). Este PR não muda o comportamento do produto; a única mudança visível é o "Excluir conta" desabilitado. Os ajustes de domínio (B1 a B3) vão num PR separado, `feat/ajustes-dominio`.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **A2 saiu do PR.** O `cn@0.4.0` já é o motor da shadcn que substitui `clsx` + `tailwind-merge` e resolve conflitos (`cn("w-1/2", "w-full")` dá `w-full`). Nenhuma dependência nova.
- **As 17A a 17D** também passaram a "Concluída".
- **O desabilitado neutro** vale só para o "Excluir conta", o único que fica desabilitado por regra.
- **As menções aos `.md` por nome** ficaram como estão (os nomes não mudaram), e `*:Zone.Identifier` entrou no `.gitignore`.

### Arquivos

| Item | Arquivo | Alteração |
|---|---|---|
| A7 | `docs/planos/`, `docs/especificacoes/`, `docs/CHANGELOG_MIGRACAO.md`, `.gitignore` | Os 14 `.md` da raiz movidos com `git mv`, sem mudar o conteúdo: os planos em `docs/planos/`, os documentos `SKILLHUB_*` em `docs/especificacoes/` e este changelog em `docs/`. |
| A3 | `frontend/src/lib/mock/servicos.ts` | **Removido** (zero importações). A pasta `lib/mock` continua, com os mocks de comunidade, pessoas e produtos. |
| A3 | `frontend/src/app/globals.css` | Removidas as variáveis `--sidebar-*` e `--chart-*` e o mapeamento delas no `@theme` (34 linhas). Nenhum componente, inclusive os da shadcn, as usava. |
| A4 | `frontend/src/components/auth/auth-ui.tsx` | O foco num campo sem ícone (a maioria dos campos do cadastro e o campo do diálogo de exclusão) animava `[data-field-icon]` mesmo sem alvo, e o GSAP avisava "target not found". A animação do ícone só roda se o campo tem ícone; nos que têm, o pulo continua igual. |
| A4 | `frontend/src/components/app/bottom-nav.tsx` | Mesmo aviso na casca a 440px: indo para Configurações, que não tem item no menu inferior, o pulo do ícone ativo procurava `[aria-current=page] svg` sem alvo. O pulo só roda se houver ícone ativo; entre os itens do menu, continua igual. A primeira bateria de 5 rodadas (abaixo) foi quem achou. |
| A6 | `frontend/src/components/app/delete-account-dialog.tsx` | Sem a confirmação, o botão fica em superfície neutra (`bg-foreground/10`, `text-foreground-secondary`), em vez do vermelho a 40%, que no tema claro ficava rosado. Durante o envio, continua vermelho com opacidade. |
| A5 | `e2e/fluxos.mjs` | Ver abaixo. |
| A4 | `e2e/fluxos.mjs` | Passo 15a2: console sem avisos nem erros em `/login`, `/cadastro` (com foco em cada campo), nas páginas da casca logada e no diálogo de exclusão. |
| A1 | `docs/CHANGELOG_MIGRACAO.md` | Status reais das 16.1 a 16.5, do switch de tema e das 17A a 17D, conferidos no `gh pr list` (todos mergeados). Entradas novas para os PRs #4 e #6. |

### A5: causa do e2e instável

A colmeia de hexágonos (entrar e sair da área logada) bloqueia cliques até voltar ao repouso: o overlay só passa a `pointer-events: none` no fim. O caminho até o passo 16 faz "Sair" pela sidebar e loga de novo na hora. Numa máquina lenta, o clique em "Entrar" caía durante a transição. O `waitForURL(...).catch(() => {})` engolia o tempo esgotado, e o passo 16 seguia sem sessão. Com a CPU desacelerada, a reprodução isolada falhou em 3 de 6 tentativas; sem desacelerar, a suíte sem mudanças passou em 4 de 4 rodadas.

Correção, só no caminho do passo 16, por condição e sem aumentar timeouts:
- `transicaoParada()` espera o overlay voltar a `pointer-events: none` depois do "Sair" e de cada login.
- Os dois logins do caminho deixam de engolir o `waitForURL`: se não chegarem em `/inicio`, o teste falha ali, com a mensagem certa.
- As duas esperas fixas de 1s viraram `entrarComErro("incorretos")`. A mensagem do login entra decodificando: o React escreve o texto final, e no quadro seguinte o GSAP o embaralha por cerca de 0,7s. Esperar só pelo texto passava nesse primeiro quadro, e a leitura caía no meio da decodificação (2 das 5 primeiras rodadas falharam assim). A espera agora exige ver o texto embaralhado e depois o final.

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 211/211 em 5 rodadas seguidas** (antes: 210/210; 1 novo, o do console). A primeira bateria de 5 deu 209, 209, 210, 210 e 210 de 211 e revelou os dois problemas descritos acima. Depois das correções, a segunda deu 5 de 5.
- **Visual (A3 e A6):** capturas antes e depois de Início, Serviços, Perfil e Configurações, a 375 e 1440px, nos dois temas, idênticas byte a byte (16 de 16). O diálogo de exclusão habilitado também ficou idêntico (4 de 4). Só o botão desabilitado mudou, como esperado: neutro e legível nos dois temas, com o texto a cerca de 7:1.

### Achados fora de escopo

- O `ServicoCard` tem `w-full` fixo a partir de `sm`.
- O `e2e/fluxos.mjs` ainda tem outras esperas que engolem o tempo esgotado (`.catch(() => {})`), fora do caminho do passo 16.
- Comentários de código citam `SKILLHUB_PAGINAS_DESIGN.md` e `SKILLHUB_RESPONSIVO_DESKTOP.md`, que não existem neste repositório (`bottom-nav.tsx`, `navegacao.ts`, `profile-dialog.tsx`, `page-container.tsx`, `use-drag-scroll.ts`).

---

## Fase 17D — Avaliações entre as partes

**Data:** 2026-10-16
**Status:** Concluída (PR #15)
**Branch:** `feat/avaliacoes`

### Contexto

Quarta e última subfase da Fase 17 (plano em `PLANO_17D.md`). Num pedido concluído, o autor avalia o colaborador e o colaborador avalia o autor, uma vez cada. A avaliação tem nota de 1 a 5 e comentário opcional. A estrutura (nota, pedido, par avaliador/avaliado, data) é a base para a Fase 22 derivar o ImpactScore; nada dele é calculado aqui.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **Média e total** ficam no resumo público `GET /usuarios/:id/avaliacoes`. O `AutorResumo` não muda.
- **`GET /servicos/:id/avaliacoes`** (só as partes) foi criado, para o diálogo saber se você já avaliou.
- **Visibilidade:** a avaliação aparece para a outra parte logo depois de enviada.
- **Perfil:** "Avaliações" passa a mostrar a média real. "Colaborações" e "Experiência" continuam placeholders.

Ajustes pedidos na conferência visual:
- O card de um pedido concluído que você ainda não avaliou mostra "Não avaliado".
- "Colaborações" passa a ser real.
- As estatísticas mostram "0", e não "00".

### Backend

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261016142656_avaliacao` | Model `Avaliacao`, exatamente o da Seção 17D. Relações inversas no `User` (`avaliacoesFeitas`, `avaliacoesRecebidas`) e no `Servico` (`avaliacoes`). |
| `src/modules/avaliacao/*` | **Novos.** Só as partes de um pedido concluído avaliam. <br>• O avaliado é decidido pelo servidor, nunca pelo corpo. <br>• A repetição (inclusive simultânea, pelo `@@unique` e o `P2002`) dá 409. <br>• Terceiros recebem 403; um pedido cancelado, para quem não é o autor, dá 404. <br>• O colaborador que excluiu a conta dá 409. <br>• A média vem de soma e contagem do `aggregate`, arredondada a uma casa; não fica guardada no `User`. |
| `src/api/routes/usuario.route.ts`, `routes/index.ts`, `servico.route.ts` | `GET /usuarios/:id/avaliacoes` (paginado por cursor, com `{ media, total }`), `POST` e `GET /servicos/:id/avaliacoes`. A rota se chama `usuario` para não se confundir com o módulo `user`, que não foi tocado. |
| `src/modules/usuario/*` | **Novos (conferência).** `GET /usuarios/:id/resumo` → `{ colaboracoes, media, total }`. Colaborações são os pedidos concluídos como autor ou colaborador. |
| `src/modules/servico/*`, `src/modules/candidatura/*` | **Conferência.** `avaliacaoPendente` em `/servicos/meus` e `/candidaturas/minhas`: concluído, com a outra parte para avaliar, e ainda sem a sua avaliação. |

### Frontend

| Arquivo | Alteração |
|---|---|
| `src/components/app/estrelas.tsx` | **Novo.** `Estrelas` (leitura, "N de 5 estrelas") e `SeletorEstrelas`, um grupo de rádio com setas, Home/End e prévia no hover. Os dois usam `faStar`; a vazia é a mesma estrela apagada, sem dependência nova. |
| `src/lib/avaliacoes.ts`, `src/types/avaliacao.ts` | **Novos.** O cliente da API, as chaves do SWR e o `formatMedia` ("4,5", e "–" sem avaliações). |
| `src/components/app/servico-detalhe-dialog.tsx` | Seção "Avaliação" no pedido concluído, para o autor e o colaborador aceito: <br>• o formulário (estrelas, comentário e "Enviar avaliação", desabilitado sem nota); <br>• "Sua avaliação"; <br>• "Avaliação de {nome}"; <br>• o aviso de colaborador que excluiu a conta. |
| `src/components/app/servico-card.tsx`, `app/(app)/servicos/page.tsx` | "Não avaliado" no card enquanto `avaliacaoPendente` valer; depois, "Concluído". |
| `src/app/(app)/perfil/page.tsx` | Pelo resumo público: "Colaborações" com o número real e "Avaliações" com a média. "Experiência" mostra "0", sem o zero à esquerda. |
| `e2e/fluxos.mjs` | Seção 15h, com 28 fluxos. |

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 210/210 (28 novos).** Cobrem:
  - **Pedido não concluído:** aberto ou em andamento dá 409.
  - **Fluxo:** as duas partes avaliam. Um `avaliadoId` no corpo é ignorado, e o comentário vazio vira `null`.
  - **Repetição:** 409. Duas ao mesmo tempo dão 201 e 409, com uma linha só.
  - **Terceiros:** o colaborador recusado e um cliente qualquer recebem 403.
  - **Validação:** nota 0, 6, 3.5, texto ou ausente, e comentário de 501 caracteres, dão 400.
  - **401 e 404,** inclusive o pedido cancelado visto por terceiros.
  - **Média e total:** batem com `round(avg(nota), 1)` e `count(*)` em SQL, e um usuário sem avaliações tem `null` e 0.
  - **Lista:** paginada e só com `id`, `fullName` e `urlPhoto` de quem avaliou.
  - **Exclusão de conta:** sem avaliação órfã (SQL), e a média de quem fica é recalculada. Avaliar o colaborador que saiu dá 409.
  - **"Não avaliado":** o `avaliacaoPendente` do autor, do colaborador aceito e do recusado. Na tela, o card passa de "Não avaliado" a "Concluído" depois de avaliar.
  - **Resumo:** colaborações conferidas contra SQL, para o colaborador e para o autor; 404 e 401.
  - **Tela:** o autor conclui e avalia; o colaborador vê a nota recebida e avalia pelo teclado; o Perfil mostra a média, as colaborações reais e "0" em Experiência.
- **Visual:**
  - Início, Serviços, Configurações e o detalhe de pedidos abertos (o próprio e o de outro usuário) ficaram idênticos byte a byte aos da 17C: 20 de 20, a 375 e 1440px, nos dois temas. A base repetiu igual em duas capturas.
  - O Perfil só muda nas estatísticas ("0" no lugar de "00").
  - As telas novas (avaliando, avaliação recebida, as duas avaliações e o Perfil com média) foram capturadas a 375 e 1440px, nos dois temas, sem erros no console.

### Achados fora de escopo

- **A média do colaborador na lista de candidaturas** ajudaria o autor a escolher. Ela mexe na resposta das candidaturas (17B).
- **As avaliações de quem exclui a conta somem** (o `Cascade` do documento). Se o ImpactScore (Fase 22) precisar do histórico completo, vale rever, por exemplo com `SetNull` no avaliador.

---

## Fase 17C — Créditos (reserva, pagamento, estorno e extrato)

**Data:** 2026-10-16
**Status:** Concluída (PR #14)
**Branch:** `feat/creditos`

### Contexto

Terceira subfase da Fase 17 (plano em `PLANO_17C.md`). Os créditos passam a circular:
- aceitar uma candidatura **reserva** o valor combinado do saldo do autor;
- concluir **paga** o colaborador;
- cancelar um pedido em andamento **estorna** ao autor.

Toda mudança de saldo gera uma linha no extrato, com o saldo depois dela.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **Créditos no piloto:** o script administrativo `creditos:conceder`. O módulo `auth` não foi tocado.
- **Pedido "a combinar" com valor proposto:** reserva o proposto. Sem remuneração nem proposta, não há movimentação.
- **Colaborador que excluiu a conta:** concluir dá 409, e cancelar estorna.
- **Extrato em diálogo:** abre por "Créditos e Pagamentos" (Configurações), por "Ver extrato" no chip e pelo card de créditos da sidebar.

### Backend

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261016022736_credito` | Enum `TipoTransacao` e model `TransacaoCredito`, exatamente os da Seção 17C. No `User`, só a relação `transacoes`. O `servicoId` é uma coluna simples, sem relação, para o extrato do colaborador não perder a referência se o pedido sumir. |
| `src/modules/credito/*`, `src/configs/creditos.ts`, `src/api/routes/credito.route.ts` | **Novos.** Um único `movimentar`, sempre dentro de transação. O débito é condicional (`credits >= valor`); sem saldo, devolve 409 "Créditos insuficientes" e tudo volta. Ele relê o saldo e grava a linha do extrato. Também: `reservar`, `pagar` (taxa arredondada para baixo; sem linha `TAXA` com taxa 0), `estornar`, `conceder` e `GET /creditos/extrato` (paginado por cursor). |
| `src/modules/candidatura/*` | A reserva entra na transação de aceitar. |
| `src/modules/servico/*` | Pagamento na transação de concluir, que só acontece com colaborador. Estorno na transação de cancelar, que agora só grava se o status não mudou. |
| `scripts/conceder-creditos.ts`, `scripts/check-creditos.mjs`, `package.json` | `npm run creditos:conceder -- --email … --valor …` registra um `BONUS`. `npm run check:creditos` reprova qualquer menção a `credits` fora de `src/modules/credito`. |
| `prisma/seed.ts` | Bônus de 500 créditos, uma vez, para os 8 clientes do seed, pelo mesmo caminho do script. |

**`PLATFORM_FEE_PERCENT`:** de 0 a 100, padrão 0, lida a cada operação; um valor inválido vira 0, com aviso no log. O `.env` não foi alterado.

### Frontend

| Arquivo | Alteração |
|---|---|
| `src/components/app/extrato-dialog.tsx` | **Novo.** Extrato com tipo, pedido, data, valor com sinal e cor e o saldo depois. Tem "Carregar mais" (`useSWRInfinite`) e os estados de carregando, vazio e erro. |
| `src/lib/creditos.ts`, `src/types/credito.ts` | **Novos.** `getExtrato`, `atualizarUsuario` (relê o `/auth/me`, sem um segundo estado de saldo) e o `formatCredits`, que saiu do chip. |
| `src/components/app/servico-detalhe-dialog.tsx` | Mostra "Aceitar reserva X créditos do seu saldo" e, em andamento, quanto está reservado. O saldo é relido depois de aceitar, concluir e cancelar. |
| `src/components/app/credits-chip.tsx`, `sidebar.tsx`, `app/(app)/configuracoes/page.tsx` | "Ver extrato" no popover; o card de créditos da sidebar abre o extrato; "Créditos e Pagamentos" deixa de ser "em breve". |
| `src/types/servico.ts` + backend `servico.repository.ts`, `servico.service.ts`, `candidatura.repository.ts` | **Achado na conferência visual:** o detalhe mostrava a remuneração publicada, e não a combinada. A resposta do pedido ganhou `valorCombinado`: o proposto pela candidatura aceita ou, sem proposta, a remuneração. O detalhe mostra esse valor. |
| `e2e/fluxos.mjs` | Seção 15g, com 18 fluxos. Na 15f, os autores recebem saldo antes de aceitar. |

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast` e `check:creditos` sem erros.
- **`./e2e/run.sh`: 182/182 (18 novos).** Cobrem:
  - **Bônus:** entra no saldo pelo script.
  - **Reserva:** usa o valor proposto, com `saldoApos` igual ao saldo.
  - **Saldo insuficiente:** 409, e o pedido continua aberto e a candidatura pendente.
  - **Pagamento:** sem linha de taxa.
  - **Valor combinado:** o pedido concluído mostra o proposto (60), e não o publicado (100), para o autor e para o colaborador.
  - **Estorno.**
  - **"A combinar":** com e sem proposta.
  - **Colaborador que saiu:** concluir dá 409, e cancelar estorna.
  - **Corrida:** um autor com saldo para um pedido só aceita dois ao mesmo tempo; o resultado é 200 e 409, e o saldo nunca fica negativo.
  - **Extrato x saldo:** a soma do extrato e o último `saldoApos` batem com `User.credits` para todos os usuários de teste.
  - **Extrato:** 401, paginação, só os próprios e sem dados pessoais.
  - **Tela:** o chip com o saldo novo; o extrato pelo chip e por Configurações.
- **Taxa maior que 0 (teste local, fora do repositório):** com `PLATFORM_FEE_PERCENT=15` e um pedido de 99 créditos, o resultado foi `RESERVA -99`, `RECEBIMENTO +99` e `TAXA -14` (`floor(14,85)`). O colaborador ficou com 85; líquido mais taxa = reserva.
- **Visual:** Serviços, Início e Configurações de quem não tem pedidos ficaram idênticos byte a byte aos da 17B (375 e 1440px, dois temas), inclusive a sidebar com o card virado botão. As telas novas (custo da reserva, saldo insuficiente, em andamento, extrato e extrato vazio) foram capturadas a 375 e 1440px, nos dois temas, sem erros no console.

### Achados fora de escopo

- Com taxa maior que 0, ela sai do colaborador e não vai para nenhuma conta: a plataforma não tem usuário. Quando a monetização for decidida, vale uma conta da plataforma para receber as linhas `TAXA`.

---

## Fase 17B — Candidaturas e contratação

**Data:** 2026-10-16
**Status:** Concluída (PR #13)
**Branch:** `feat/servicos-candidaturas`

### Contexto

Segunda subfase da Fase 17 (plano em `PLANO_17B.md`). Colaboradores se candidatam aos pedidos, o autor aceita um, o pedido fica em andamento e depois concluído. As datas `aceitoEm` e `concluidoEm` passam a ser preenchidas: são a base dos KPIs de latência de contratação e de volume de transações.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **O autor chega ao pedido** pela linha "Seus pedidos", e o card mostra "N candidaturas".
- **Linha "Suas candidaturas"** em Serviços, só para colaboradores.
- **Editar e cancelar pela tela** entram agora, no detalhe do autor.
- **Ao cancelar um pedido,** as candidaturas pendentes viram "Recusada", e a "Aceita" fica como histórico.
- **O "Saiba Mais" do Início** abre o mesmo detalhe.
- **Seed:** mais 2 colaboradores.
- **Quem não é colaborador** vê no detalhe o aviso "Só colaboradores podem se candidatar a pedidos".

### Backend

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261016013313_candidatura` | Enum `StatusCandidatura` e model `Candidatura`, exatamente os da Seção 17B, com `@@unique([servicoId, colaboradorId])`. No `User`, só `candidaturasEnviadas`; no `Servico`, `candidaturas`. Criada dentro do container, e as migrations antigas ficaram intactas. |
| `src/modules/candidatura/*`, `src/api/routes/candidatura.route.ts` | **Novos.** Rotas: `POST`/`GET /servicos/:id/candidaturas`, `GET /candidaturas/minhas`, `PATCH /candidaturas/:id/retirar` e `POST /candidaturas/:id/aceitar`. |
| `src/modules/servico/*`, `servico.route.ts`, `routes/index.ts` | `POST /servicos/:id/concluir`. Cancelar passa a valer também para pedidos em andamento e recusa as pendentes na mesma transação. A resposta ganha `colaborador`, `aceitoEm`, `concluidoEm` e, em `/meus`, `candidaturasPendentes`. |
| `prisma/seed.ts` | Mais `seed.ana` e `seed.pedro` (Colaboradores, senha `seed1234`), sem candidaturas. |

- **Aceitar:** tudo numa única transação.
  - O serviço só passa para em andamento se ainda estiver aberto, e essa condição fica no próprio `UPDATE`. Se a linha não muda, a resposta é 409. Isso resolve a corrida entre duas aceitações.
  - A candidatura escolhida vira "Aceita", e as outras pendentes viram "Recusada".
- **Privacidade:** pessoas saem sempre só com id, nome e foto.

### Frontend

| Arquivo | Alteração |
|---|---|
| `src/components/app/servico-detalhe-dialog.tsx` | **Novo.** O detalhe do pedido (o "Saiba Mais"), na casca dos modais do Perfil. O conteúdo muda conforme quem abre: <br>• **Colaborador:** "Candidatar-se", com mensagem e valor, ou o status da candidatura com "Retirar". <br>• **Autor:** as candidaturas com "Aceitar"; em andamento, o colaborador e "Marcar como concluído"; e ainda "Editar" e "Cancelar pedido", com confirmação. <br>• **Outros perfis:** o aviso. <br>Também tem o `ServicoModais`, que alterna entre o detalhe e a edição. |
| `src/types/candidatura.ts`, `src/lib/candidaturas.ts`, `src/lib/validation/candidatura.ts` | **Novos.** |
| `src/components/app/servico-card.tsx` | "Saiba Mais" abre o detalhe. No lugar da distância, o card mostra "N candidaturas", o status do pedido ou o da candidatura. |
| `src/components/app/publicar-servico-dialog.tsx` | Modo de edição (`servico` opcional, `PATCH`). |
| `src/app/(app)/servicos/page.tsx` | Linha "Suas candidaturas", só para colaboradores. |
| `src/app/(app)/inicio/servicos-recentes.tsx` | "Saiba Mais" abre o mesmo detalhe. |
| `src/types/servico.ts`, `src/lib/servicos.ts` | Os campos novos; `atualizarServico`, `cancelarServico` e `concluirServico`; `revalidarServicos` passa a cobrir também as candidaturas e o detalhe aberto. |
| `src/components/app/servico-card-esqueleto.tsx` | Correção de um conflito de classes (ver Ajustes). |
| `e2e/fluxos.mjs` | Seção 15f, com 29 fluxos. |

### Ajustes durante a implementação

- O formulário de candidatura deixou de ser um `<form>` dentro do `<form>` do `ProfileDialog`, que gerava erro do React no console.
- **O `cn` do projeto (pacote `cn`) não resolve conflitos de classe.** O "Cancelar pedido" saía cinza, e o esqueleto somava tamanhos. As duas coisas foram corrigidas sem trocar a biblioteca (ver Achados).

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build` e `check:cores` sem erros.
- **`./e2e/run.sh`: 164/164 (29 novos).** Cobrem:
  - **Fluxo completo:** publicar → duas candidaturas → aceitar → em andamento com `colaboradorId` e `aceitoEm` → a outra recusada → concluir com `concluidoEm` (datas conferidas no banco).
  - **Corrida:** duas aceitações em paralelo dão um 200 e um 409, e fica uma única "Aceita".
  - **Permissões e status:** 403 para cliente, autor, quem não é dono e quem não é autor; 409 para repetida, pedido não aberto, recusada, retirada e conclusão de pedido aberto; 400 e 401.
  - **Retirar e cancelar:** retirar uma pendente; cancelar um aberto recusa as pendentes; cancelar em andamento mantém a "Aceita".
  - **Privacidade** nas respostas de candidatura.
  - **Exclusão do colaborador aceito:** o serviço continua com `colaboradorId = null`, e as candidaturas dele somem.
  - **Tela:** candidatar-se pelo detalhe; o card com "1 candidatura"; o autor aceita pela tela.
- **Visual:**
  - Serviços e Início de quem não tem pedidos nem candidaturas ficaram idênticos byte a byte aos da 17A (375 e 1440px, dois temas).
  - O diálogo de detalhe foi capturado nos três papéis e nos estados aberto, em andamento e concluído, a 375 e 1440px, nos dois temas, sem erros no console.

### Achados fora de escopo

- O `cn` do projeto (`export { cn } from "cn"`) não resolve conflitos de classes do Tailwind. Usos antigos que sobrescrevem classes pelo `className`, como o `ServicoCard` com `w-full` na lista de resultados, dependem da ordem das regras no CSS. Vale avaliar trocar pelo `clsx` + `tailwind-merge`, que é o padrão do shadcn; seria uma dependência nova, então precisa de aprovação.
- A 17C (créditos) vai precisar de um ponto para debitar e creditar no "concluir"; a 17B só muda o status e as datas.

---

## Fase 17A — Domínio de Serviços (modelo, API, telas ligadas e seed)

**Data:** 2026-10-15
**Status:** Concluída (PR #12)
**Branch:** `feat/servicos-dominio`

### Contexto

Primeira subfase da Fase 17 do `SKILLHUB_SIDEBAR_E_DOMINIO.md` (plano em `PLANO_17A.md`). Serviços sai do mock: os pedidos passam a existir no banco, com API própria, e a página de Serviços e a seção de Serviços do Início leem a API via SWR, com o mesmo visual.

As datas e relações do modelo já servem aos KPIs da PIBITI:
- `aceitoEm` e `createdAt` dão a latência de contratação;
- `concluidoEm` dá o volume de transações.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **Distância:** `null` por enquanto; o card esconde o "à X km".
- **Botão "Publicar":** na linha do título.
- **Lista geral:** esconde os próprios pedidos.
- **"Serviços na sua área":** pedidos de autores da mesma cidade. "Mais próximos" sai do Organizar até existir distância.
- **Linha "Seus pedidos":** no topo de Serviços.
- **Filtros de remuneração, prazo e ordem:** continuam no cliente, sobre até 50 pedidos.

### Backend

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + migration `20261015204933_servico` | Enums `CategoriaServico` e `StatusServico` e model `Servico`, exatamente o da Seção 17A, com índices e com `colaboradorId`, `aceitoEm` e `concluidoEm` já criados. No `User`, só as duas relações inversas. Pedidos do autor caem em cascata; o colaborador vira `null`. Criada com `prisma migrate dev` dentro do container, e as migrations antigas ficaram intactas. |
| `src/utils/autorResumo.ts` | **Novo.** `toAutorResumo` e o `select` com só `id`, `fullName` e `urlPhoto`: o resto do usuário nem sai do banco nessas consultas. |
| `src/modules/servico/*` | **Novos.** Schema, repository, service e controller no padrão do módulo `user`, mais o `categoria.map.ts` (único mapa enum ↔ rótulo). |
| `src/api/routes/servico.route.ts`, `routes/index.ts` | **Rota nova** `/servicos`, com `authenticate`, e o registro dela. |
| `prisma/seed.ts`, `package.json` (`prisma.seed`) | **Seed de desenvolvimento.** <br>• Cria 8 usuários `seed.*@example.com`, todos com a senha `seed1234`, sem CPF, cidade São Paulo. <br>• Cria os 8 pedidos do antigo mock. <br>• É idempotente e recusa rodar com `NODE_ENV=production`. <br>• Para rodar: `docker compose exec backend npx prisma db seed`. |

**API** (todas as rotas com token):

| Rota | Comportamento |
|---|---|
| `GET /servicos` | Só pedidos abertos e sem os do próprio usuário. Filtros `categoria`, `q` (título e descrição, sem diferenciar maiúsculas) e `cidade` (do autor, que não sai na resposta). Paginação por `limit` e `cursor`. |
| `GET /servicos/meus` | Os pedidos do usuário, em qualquer status. |
| `GET /servicos/:id` | Detalhe. Um pedido cancelado só aparece para o autor. |
| `POST /servicos` | Exige perfil completo. |
| `PATCH /servicos/:id` | Só o autor (403) e só enquanto o pedido está aberto (409). |
| `DELETE /servicos/:id` | Muda para cancelado e não apaga a linha. Um pedido concluído não cancela (409). |

O `PLATFORM_FEE_PERCENT` ainda não é usado (é da 17C).

### Frontend

| Arquivo | Alteração |
|---|---|
| `src/types/servico.ts` | **Novo.** O tipo `Servico`, saído do mock: `distanciaKm` passa a `number \| null` e entra o `status`. Também as categorias e o `AutorResumo`. |
| `src/lib/servicos.ts` | **Novo.** Cliente da API e chaves do SWR, mais o `revalidarServicos`. Não fica em `lib/api/`, porque o `lib/api.ts` existente tornaria o import ambíguo. |
| `src/lib/validation/servico.ts` | **Novo.** As mesmas regras do backend para o formulário. |
| `src/components/app/publicar-servico-dialog.tsx` | **Novo.** Publicar pedido na casca dos modais do Perfil (`ProfileDialog`). |
| `src/components/app/servico-card-esqueleto.tsx` | **Novo.** Estado "carregando" (`GlassCard`, sem spinner). |
| `src/app/(app)/servicos/page.tsx` | <br>• **Dados:** SWR sobre a API; categoria, busca (com debounce de 300ms) e cidade vão na requisição. <br>• **Estados:** carregando, vazio e erro com "Tentar de novo". <br>• **Novidades na tela:** botão "Publicar", linha "Seus pedidos" (sempre visível; sem pedidos, mostra o convite "Você ainda não publicou nenhum pedido" com o botão "Publicar pedido") e "Serviços na sua área" pela cidade. |
| `src/components/app/servico-card.tsx` | Esconde a distância `null`. Em "Seus pedidos", mostra o status no lugar dela. |
| `src/app/(app)/inicio/servicos-recentes.tsx`, `grade.ts`, `page.tsx` | A seção "Serviços" do Início vira Client Component com SWR (8 pedidos), com o mesmo markup da 16.2. A página continua Server Component. |
| `e2e/fluxos.mjs` | Seção 15e com 26 fluxos (ver Validação). |

O `lib/mock/servicos.ts` ficou sem uso. A remoção fica para quando os outros mocks forem trocados, porque o `pessoas.ts` ainda serve Produtos e Comunidade.

### Validação

- `prisma migrate status` limpo; `tsc` (frontend e backend), `eslint`, `next build` e `check:cores` sem erros.
- **`./e2e/run.sh`: 135/135.** Os 26 fluxos novos cobrem:
  - **Publicar:** 201, e o autor sai só com id, nome e foto.
  - **Validação:** 400 nos 5 campos.
  - **Sem token:** 401.
  - **Perfil incompleto:** 403.
  - **Listagem:** o próprio pedido fica de fora; filtros de categoria, busca e cidade; paginação por cursor.
  - **Detalhe:** 200, e 404 (inclusive com um id que não é UUID).
  - **Editar e cancelar:** o autor consegue; outro usuário recebe 403 nos dois.
  - **Cancelado:** fica no banco, sai da lista e dá 404 para os outros; não se edita (409).
  - **Concluído:** não se cancela (409).
  - **Exclusão de conta:** apaga os pedidos do autor.
  - **Tela:** o convite de "Seus pedidos" vazio, publicar pelo diálogo, "Seus pedidos", busca de outro usuário e o Início com dados do banco.
- **Mesmo visual com o seed:** a 375, 440, 768 e 1440px, nos dois temas. As diferenças são as previstas: o botão "Publicar", sem "à X km", a ordem por pedidos mais recentes e "Seus pedidos". Os estados de carregando, vazio e erro foram forçados no navegador e capturados, e o "Tentar de novo" recupera a lista.

### Achados fora de escopo

- O `lib/mock/servicos.ts` está sem uso (ver acima).
- Editar e cancelar o próprio pedido pela tela, e a página de detalhe ("Saiba Mais"), ficam para a 17B; a API já permite editar e cancelar.

---

## Fase 16.2 — Início em layout desktop

**Data:** 2026-10-15
**Status:** Concluída (PR #11)
**Branch:** `feat/inicio-desktop`

### Contexto

Segunda subfase do `SKILLHUB_SIDEBAR_E_DOMINIO.md` (plano em `PLANO_16_2.md`). A partir de `xl` (1280px), o Início segue o frame `New Início - Desktop`:
- busca no topo;
- eventos na largura toda;
- duas colunas: colaboradores e 2 serviços à esquerda, 2 produtos numa coluna de 380px à direita.

Abaixo de `xl` nada muda.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **Busca "Buscar no SkillHub":** visível; ao enviar, mostra o `emBreve`.
- **De 1024 a 1279px:** o Início continua empilhado.
- **Card de evento:** usa a paleta da 16.3 (título `text-foreground`, botão principal ciano), e não o amarelo e o verde do frame.
- **"Ver mais...":** fica no fim da fileira de avatares. No frame ele está à direita do título.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/app/(app)/inicio/page.tsx` | Só classes `xl:` no mesmo markup, mais um `div` de grade em volta de Colaboradores, Serviços e Produtos (sem classes abaixo de `xl`). A saudação fica em linha com a busca. Os cards de evento ocupam a largura toda (208px). As trilhas de Serviços e Produtos viram grade de 2 colunas, e os cards além do 2º somem. Continua Server Component assíncrono lendo de `lib/mock`. |
| `frontend/src/app/(app)/inicio/busca-global.tsx` | **Novo.** `<form>` com o `SearchBar` (Client Component, porque o campo é controlado), só a partir de `xl`. Ao enviar, chama `emBreve("A busca global")`. |
| `frontend/src/app/(app)/inicio/mock.ts` | Os 3 títulos dos eventos sem emojis ("Novo Evento!", "Guia essencial", "Maratona Tech"). É a única mudança de dado. |
| `frontend/src/components/app/scroll-row.tsx` | Prop opcional `trilhaClassName`, acrescentada às classes da trilha. Sem a prop, o componente é idêntico. |
| `e2e/fluxos.mjs` | Seção 15d, a 1440×900: cabe sem rolar, sem rolagem lateral, 6 colaboradores, 2 serviços e 2 produtos, eventos com 3 dots, e a busca avisa "em breve". |

Não mudaram: `ServicoCard` e `ProdutoCard`. O frame usa os cards do próprio Início, não esses.

### Ajustes durante a implementação

- **Avatares:** 6 a partir de 1400px, não do `xl`. A 1280px, 6 avatares empurravam o "Ver mais..." para fora da coluna esquerda (cerca de 530px). Até 1399px aparecem 4. O link fica dentro da coluna de 1280 a 1920px (medido).
- **Card de evento:** no `xl`, o conteúdo fica centralizado verticalmente, com o botão logo abaixo da descrição, como no frame.

### Validação

- **Mobile e tablet inalterados:** Início a 375, 440, 768 e 1024px idêntico byte a byte nos dois temas. A captura "antes" foi tirada já sem os emojis, como pede o documento; a remoção dos emojis é a única diferença em relação à versão anterior.
- **Outras páginas:** Serviços e Produtos idênticas byte a byte a 375 e 1440px, nos dois temas. O `ScrollRow` sem a prop nova não mudou.
- **Desktop (escuro e claro):**
  - A 1440×900 e 1920×1080, a página cabe sem rolagem vertical (o conteúdo termina em 844px).
  - Nenhuma rolagem lateral de 1024 a 1920px.
  - O carrossel de eventos arrasta com o mouse e os dots levam a cada card.
  - A busca mostra o "Em breve".
- `tsc` (frontend e backend), `eslint`, `next build` e `check:cores` sem erros. `./e2e/run.sh`: 109/109 (104 anteriores, mais 5 do Início no desktop).

---

## Fase 16.5 — Tema claro (acabamento visual)

**Data:** 2026-10-15
**Status:** Concluída (PR #10)
**Branch:** `feat/tema-claro`

### Contexto

Última subfase do `SKILLHUB_CORES_E_TEMA.md` (plano em `PLANO_16_5.md`). Ela acerta os valores do tema claro tela a tela, em 4 rodadas, cada uma conferida pelo João Gabriel. O tema escuro não mudou.

Decisões tomadas na aprovação do plano: o João Gabriel aprovou sem responder as perguntas uma a uma, então segui as recomendações.
- **Fundo:** o fundo frio `#f4f7f7` continua, com cards brancos e borda reforçada.
- **Brilhos ciano no claro:** suaves, e o do logo sai.
- **Banner de Produtos no claro:** card branco com listras em `accent-text`.
- **Botão perigoso desabilitado:** fica como está, para uma revisão de estados futura.
- **`check-contrast.mjs`:** ganha os pares de `surface-2`.
- **Barra do navegador nas telas de entrada:** escura.
- **Base da branch:** depois do merge do switch (PR #9).

### Rodadas

| Rodada | Telas | Ajuste |
|---|---|---|
| 1. Moldura | todas | Brilhos ciano com valor por tema (escuro igual, claro suave, sem brilho no logo). Borda de vidro de 14% para 18%. Sidebar e menu inferior de 72% para 88% de opacidade. Chip, busca e filtros de 72% para 85%. |
| 2. Início, Serviços, Produtos | banner de Produtos | Tokens `--banner-bg`, `--banner-shadow` e `--stripe`: no claro, card branco com listras em ciano escuro (antes 1,57:1, as listras sumiam). |
| 3. Comunidade, Perfil, Configurações | Perfil | Token `--avatar-ring`: no claro, o anel do avatar no tom da curva decorativa. |
| 4. Sobreposições | filtro, popover de créditos | No claro, borda do vidro escuro de 8% para 12% e sombra dos popovers de 12% para 16%. |

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/app/globals.css` | Valores do claro das rodadas. Brilhos e `--glow-logo` com valor por tema. Tokens novos `--banner-bg`, `--banner-shadow`, `--stripe` e `--avatar-ring`, e as classes `bg-banner` e `border-avatar-ring`. |
| `frontend/src/app/(app)/produtos/page.tsx` | Banner usa `bg-banner`, `--banner-shadow` e `--stripe`. |
| `frontend/src/app/(app)/perfil/profile-hero.tsx` | Anel do avatar usa `border-avatar-ring`. |
| `frontend/src/lib/tema.ts`, `frontend/src/components/tema/tema-provider.tsx` | Barra do navegador escura nas telas de entrada, no script do `<head>` e no `aplicarTema`. O provedor reaplica o tema quando a rota muda. |
| `frontend/scripts/check-contrast.mjs` | Pares de texto principal, secundário, discreto e `accent-text` sobre `surface-2`, nos dois temas. |
| `e2e/fluxos.mjs` | Dois fluxos: barra clara na área logada e escura nas telas de entrada, com o tema claro. |
| `SKILLHUB_DESIGN_SYSTEM.md` | Coluna "Claro" da 8.2 deixa de ser provisória; valores por tema e tokens novos; barra do navegador na 8.5. |

### Validação

- `npm run check:contrast`: todos os pares passaram (48: 21 por tema, mais os 6 avatares). `npm run check:cores` verde.
- `tsc` (frontend e backend), `eslint` e `next build` sem erros. `./e2e/run.sh`: 104/104.
- **Escuro sem mudança:** 23 telas capturadas na base e no fim (6 páginas, popover de créditos, filtro, três diálogos e toast, a 375 e 1440px), idênticas byte a byte. A exceção é `servicos_375`, que varia 2 pixels até entre duas capturas da base sem mudança nenhuma (ruído de renderização).
- **Claro:** comparação de cada rodada entregue ao João Gabriel, e uma página final com todas as telas nos dois temas.

### Decisão em aberto: splash em rede lenta

O achado da 16.4 ("no claro, o carregamento da área logada aparece antes do splash escuro") não vem da ordem do HTML, como o plano supunha. A reordenação foi testada, não teve efeito e foi desfeita.

A causa medida:
- O HTML com o overlay chega cedo; o que demora são os pacotes de JavaScript.
- A animação CSS de segurança do overlay o esconde depois de 4s, de propósito, para a tela não travar sem JS.
- Daí em diante aparece o carregamento da área logada, que segue o tema.

Para mudar isso há duas saídas, e as duas pedem decisão:
- aumentar o tempo da animação de segurança (a tela fica presa mais tempo se o JS falhar);
- deixar o carregamento da área logada com o visual do splash (escuro, com o logo grande) nos dois temas.

### Achados fora de escopo

- O "Excluir conta" desabilitado parece rosa desbotado; vale uma revisão de estados (desabilitado, carregando) para todos os botões.
- Seguem abertos o aviso do GSAP no `/login` sem sessão e o ponto instável do e2e no passo 16 (anotados antes).

---

## Ajuste pós-16.4 — Switch de tema na sidebar

**Data:** 2026-10-15
**Status:** Concluído (PR #9)
**Branch:** `feat/switch-tema`

Pedido do João Gabriel depois do merge da 16.4: o atalho de tema da sidebar deixa de ser um botão com texto ("Tema claro" / "Tema escuro") e vira um switch compacto e animado, com Sol e Lua.

- **Linha "Tema" da sidebar** (`components/tema/alternar-tema.tsx`): mesma caixa de ícone e alinhamento dos outros itens, com um switch em pílula de 48×26px à direita. É um `role="switch"` com nome acessível "Tema escuro" e `aria-checked` ligado no escuro. Clicar no rótulo também alterna, e a tecla Espaço funciona.
- **Animação (GSAP):**
  - O botão ciano desliza até o lado do tema, com Sol à esquerda e Lua à direita.
  - A bolha estica no caminho e assenta com rebote elástico; os ícones não deformam, porque o esticão é só da bolha.
  - O ícone que sai gira e encolhe, e o que entra vem girando do outro lado.
  - No trilho, uma Lua discreta aparece no claro e três estrelas acendem em sequência no escuro.
  - Com "menos movimento", vai direto ao estado final.
- Só tokens de cor (o `check-cores` passa).
- `e2e/fluxos.mjs`: os fluxos do atalho passam a usar o switch, mais um fluxo de clique no rótulo.
- **Validação:**
  - `tsc`, `eslint` e `check:cores` verdes.
  - Quadros da animação capturados a 3x nos dois sentidos e com teclado.
  - `./e2e/run.sh`: 102/102 em duas de três rodadas. A outra caiu no passo 16 (exclusão de conta, a 440px), esperando o link "Configurações" depois de um login; não se repetiu (ver achado).

### Achado fora de escopo

- O e2e tem um ponto instável. No passo 16, o login com a senha nova usa `waitForURL(...).catch(() => {})`. Se o redirecionamento demora, o erro é engolido e o passo seguinte falha esperando o header. Vale trocar o `catch` silencioso por uma espera que reprove com mensagem clara.

---

## Fase 16.4 — Infraestrutura do tema claro/escuro

**Data:** 2026-10-15
**Status:** Concluída (PR #8)
**Branch:** `feat/tema-infra`

### Contexto

Segunda subfase do `SKILLHUB_CORES_E_TEMA.md` (plano em `PLANO_16_4.md`). O usuário escolhe Claro, Escuro ou Sistema, a escolha é lembrada e o carregamento não pisca. O tema claro ainda usa os valores provisórios da 16.3; o acabamento visual é da 16.5.

Decisões tomadas na aprovação do plano (todas as recomendações):
- **Provedor próprio, sem dependência**, no lugar do `next-themes`. Segue a receita do guia "Preventing flash before hydration" do Next 16. O `next-themes` está sem publicação desde março de 2025 e renderiza `<script>` num Client Component.
- Tema padrão Escuro.
- Telas de entrada e overlay da colmeia sempre escuros.
- Atalho na sidebar, nada no header do celular.
- "Aparência" logo depois de "Editar Perfil" em Configurações.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/lib/tema.ts` | **Novo**. Inclui: <br>• preferência no `localStorage`, com `try/catch` e memória da sessão quando não grava <br>• resolução de "Sistema" <br>• `aplicarTema` (classe `dark` e meta `theme-color`) <br>• store do `useSyncExternalStore`, que escuta trocas, outra aba e mudança do sistema <br>• texto do script inline, gerado das mesmas constantes |
| `frontend/src/components/tema/tema-provider.tsx` | **Novo**. `TemaProvider` e `useTema()`. O snapshot do servidor é o tema padrão (sem erro de hidratação). Reaplica o tema num `useLayoutEffect` lendo a preferência real, o que também corrige a remontagem do Strict Mode em dev. |
| `frontend/src/components/tema/seletor-tema.tsx` | **Novo**. Grupo de rádio Claro, Escuro e Sistema, com ícone e texto e com tabindex móvel, setas, Home e End. `useDescricaoTema` dá o estado em texto ("Em uso: ..."). |
| `frontend/src/components/tema/alternar-tema.tsx` | **Novo**. Atalho da sidebar. |
| `frontend/src/app/layout.tsx` | `suppressHydrationWarning` no `<html>`, script inline no `<head>` e `TemaProvider`. A classe `dark` fica como valor do servidor (o padrão). |
| `frontend/src/app/globals.css` | `color-scheme` por tema. As variáveis derivadas (aliases do shadcn e brilhos) passam para `:root, .dark`, para serem recalculadas em um `.dark` aninhado. Nenhum valor mudou. |
| `frontend/src/app/(auth)/layout.tsx` | Wrapper `dark` (telas de entrada sempre escuras). |
| `frontend/src/components/motion/page-transition.tsx` | Classe `dark` no overlay da colmeia. |
| `frontend/src/components/ui/sonner.tsx` | Toasts seguem o tema. |
| `frontend/src/app/(app)/configuracoes/page.tsx` | Linha "Aparência" com o seletor (entra na busca). |
| `frontend/src/components/app/sidebar.tsx` | Atalho de tema entre Configurações e Sair. |
| `frontend/src/components/app/perfil/profile-dialog.tsx`, `edit-nome-dialog.tsx` | Sai o `[color-scheme:dark]` fixo dos campos. |
| `frontend/src/lib/brand.ts` | `COR_BARRA` (cor da barra do navegador por tema). |
| `frontend/scripts/check-cores.mjs` | Confere `COR_BARRA` contra o `--background` de cada tema. A leitura dos blocos do CSS ignora listas de seletores. |
| `e2e/fluxos.mjs` | 13 fluxos de tema (Seção 15c). |
| `SKILLHUB_DESIGN_SYSTEM.md` | Seção 8.5 (tema). |

### Validação

- `./e2e/run.sh`: 101/101, sendo 88 anteriores e 13 de tema:
  - padrão Escuro
  - Claro troca na hora
  - toasts seguem o tema
  - a escolha sobrevive a recarregar
  - aba nova já pinta o primeiro quadro no tema escolhido
  - setas do teclado trocam a opção
  - Sistema segue o sistema e acompanha a troca com a página aberta
  - atalho da sidebar nos dois sentidos
  - telas de entrada escuras com o tema claro
  - `localStorage` bloqueado e valor inválido caem no escuro, sem erro
- **Sem piscada com rede lenta** (400ms de latência, 50 KB/s, cache desligado, pelo protocolo do Chrome): os 30 primeiros quadros saem no tema escolhido em Claro, Escuro e Sistema (claro).
- **Console do dev:** nenhum aviso de hidratação nem de `<script>`.
- `tsc` (frontend e backend), `eslint`, `next build`, `check:contrast` e `check:cores` verdes.
- **Escuro sem mudança:** capturas antes e depois das 6 páginas e das telas de entrada a 375 e 1440px, sem preferência gravada. Iguais byte a byte, exceto:
  - o rodapé da sidebar a 1440px (o item novo "Tema claro")
  - Configurações (a linha "Aparência")
  - 2 a 3 pixels de ruído de renderização em duas capturas (`servicos_375`, `cadastro_1440`)

### Achados fora de escopo

- **Rede lenta:** o estado de carregamento da área logada aparece antes do overlay da colmeia, porque o HTML do overlay vem depois do conteúdo. No claro, isso fica "tela clara, depois splash escuro". O comportamento já existia; é para olhar na 16.5.
- **Barra do navegador nas telas de entrada:** segue o tema escolhido, não o escuro fixo da tela. Para a 16.5.
- **Aviso do GSAP:** um "GSAP target not found" aparece no console ao cair no `/login` sem sessão. Não investiguei se já existia antes da 16.4.

---

## Fase 16.3 — Paleta de marca e contraste (tema escuro)

**Data:** 2026-10-15
**Status:** Concluída (PR #7)
**Branch:** `feat/paleta-cores`

### Contexto

Primeira subfase do `SKILLHUB_CORES_E_TEMA.md` (plano em `PLANO_16_3.md`). Cria a camada de tokens de cor e troca **todas** as cores escritas à mão dos componentes por eles, corrigindo os pares que reprovavam no contraste (o "Saiba Mais" tinha texto branco sobre ciano, 1,83:1). O tema continua fixo em escuro; os valores claros entram provisórios no `:root` para a 16.4 e a 16.5. Nenhum tamanho, posição, texto ou rota mudou, além do texto dos botões (decisão 2).

Decisões tomadas na aprovação do plano (todas as recomendações):
- Banners de Produtos seguem a marca: cartão escuro (`surface-2`) com listras ciano e o botão principal.
- Texto do botão principal sobe de 10px para 12px no celular.
- Título dos eventos do Início em `text-foreground` (sai o amarelo).
- As classes da paleta fixa do Tailwind (`text-white`, `bg-black/35`, `bg-zinc-100`...) também viram tokens, e o varredor as reprova.
- Os dois selos (câmera do Perfil e check do cadastro) mantêm sombras separadas, para o escuro não mudar.
- A branch parte da `main` depois do merge do PR #6 (`4c6897c`).

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/app/globals.css` | Tokens do documento (`.dark` e `:root` claro provisório), vidros, sombras, brilhos e fundos por variável (valores escuros iguais aos anteriores), seção de marca e `@theme inline` com as classes novas. As variáveis do shadcn apontam para os tokens. Gradiente do `body` por variável. |
| `frontend/src/lib/brand.ts` | **Novo** — cores de marca usadas em JavaScript: escala dos hexágonos, degradê e ladrilho da colmeia, brilhos do GSAP, `rgbCss` para o canvas, `AVATAR_CORES` (6 cores, 4,5:1 ou mais com branco) e `EVENTO_FUNDOS` (ciano, azul da marca, petróleo). |
| `frontend/scripts/check-contrast.mjs` | Movido da raiz, sem mudar valores (`npm run check:contrast`). |
| `frontend/scripts/check-cores.mjs` | **Novo** — `npm run check:cores`: reprova `#hex`, `rgb()` e classes da paleta fixa do Tailwind em `src/` (exceções: `globals.css` e `lib/brand.ts`) e confere se os tokens do `globals.css` e as cores dos avatares batem com o `check-contrast.mjs`. |
| `frontend/tailwind.config.mts` | Sai o bloco `colors` (código morto: o `@theme inline` já vencia); `accent-gradient` passa a `var(--brand-gradient)`. |
| `frontend/package.json` | Só os scripts `check:contrast` e `check:cores`. |
| Componentes compartilhados (`ui/cta-button`, `ui/content-card`, `ui/glass-card`, `ui/button`, `ui/dialog`, `ui/sonner`, `app/navegacao`, `app/sidebar`, `app/bottom-nav`, `app/credits-chip`, `app/app-header` e os demais de `components/`) | Cores pelo mapa 2.4. `ctaButtonClass`: texto escuro sobre ciano, hover `accent-hover`. Item ativo da sidebar com `accent-soft`. Iniciais dos avatares brancas fixas (`AVATAR_INICIAL`). |
| Páginas (`app/(app)/*`, `app/(auth)/*`) | Cores pelo mapa 2.4. Botões dos eventos e do banner de Produtos passam a usar `ctaButtonClass`. Perfil selecionado no cadastro e selo da câmera em ciano. `inicio/mock.ts` guarda a chave do fundo do evento. |
| `SKILLHUB_DESIGN_SYSTEM.md` | Seção 8 (regra de cor, tokens, botão principal, avatares); Seções 1, 2.2, 4 e 6 marcadas como substituídas no que ficou obsoleto. |
| `e2e/fluxos.mjs` | Só a linha 63: o helper `errTexts` procurava as mensagens pela classe da cor antiga (`p.text-[#ff6b6b]`) e passa a `p.text-danger`. Exceção ao plano aprovada durante a implementação. |

### Validação

- `npm run check:contrast`: todos os pares passaram (escuro, claro e avatares). `npm run check:cores`: nenhuma cor escrita à mão; teste negativo com um arquivo temporário (hex, `rgba()` dentro de classe e `text-white`) e com um token divergente reprova como esperado.
- `tsc --noEmit` (frontend e backend), `eslint` e `next build` sem erros. `./e2e/run.sh`: 88/88 (antes do ajuste do seletor, 83/88: os 5 fluxos que usam `errTexts`). As classes novas (`shadow-(--…)`, `drop-shadow-(--…)`, `bg-(image:--…)`) conferidas no CSS gerado.
- Capturas de página inteira antes e depois das 6 páginas e de `/`, `/login` e `/cadastro` a 375, 440, 1280 e 1440px (36 pares, "menos movimento" ligado): **nenhuma altura de página mudou**. Diferenças são as da Seção 5 do plano.

### Achados fora de escopo

- O overlay da transição e o fundo das telas de entrada usam `bg-background`; no tema claro isso fica claro enquanto o canvas da colmeia desenha ladrilhos escuros. Decidir na 16.4 (telas de entrada) e na 16.5.
- As variáveis `--sidebar-*` e `--chart-*` do shadcn continuam definidas sem uso.
- Para o plano da 16.4: atalho de tema na sidebar (recomendado) e no header do celular (não recomendado), além do seletor de Configurações. Detalhes na Seção 9 do `PLANO_16_3.md`.

---

## Transições de página na área logada (PR #6)

**Data:** 2026-10-15
**Status:** Concluída (PR #6)
**Branch:** `feat/transicao-area-logada`

### Contexto

Registro feito na faxina antes da Fase 18, a partir do commit `b93f712` e da descrição do PR #6; na época o trabalho não entrou neste changelog. As páginas do menu (Início, Serviços, Produtos, Comunidade, Perfil e Configurações) passam a trocar com uma transição suave, só no conteúdo. A colmeia de hexágonos do PR #4 continua para entrar e sair da área logada (login, cadastro, Sair). Quem escolhe entre as duas é o `PageTransitionProvider`, por `rotaDoMenu` em `navegacao.ts`.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/components/motion/page-transition.tsx` | Transição suave: só o `<main>` sobe e desfoca; header, sidebar e menu inferior ficam parados. A página nova entra em cascata. Um clique durante a entrada termina a entrada na hora e segue para a nova navegação. `navigate` ganha a opção `onCovered`. Com `prefers-reduced-motion`, troca sem animação. |
| `frontend/src/app/globals.css` | `[data-page-swap]`: a página nova monta escondida até a entrada assumir, sem piscar. |
| `frontend/src/components/app/sidebar.tsx`, `bottom-nav.tsx` | A caixa do item ativo da sidebar desliza até o destino já no clique; o ícone novo dá um pulo nos dois menus. |
| `frontend/src/components/app/page-title.tsx`, `app/(app)/inicio/page.tsx`, `app/(app)/configuracoes/page.tsx` | Título com `data-scramble`, que decodifica com os caracteres da Home. |
| `frontend/src/components/app/app-header.tsx`, `credits-chip.tsx` | O traço ciano dos campos do login vira barra de progresso no topo da coluna: avança na saída, completa e se recolhe para a direita na chegada. |
| `frontend/src/components/app/navegacao.ts` | `rotaDoMenu`. |
| `frontend/src/hooks/use-logout.ts` | O Sair só limpa a sessão com a tela coberta pela colmeia (antes disso, o guard da área logada redirecionaria sem animação). |

### Validação

Como registrado na descrição do PR:
- `./e2e/run.sh`: 88/88.
- `tsc --noEmit` e `eslint` limpos.
- Quadros capturados no meio da transição a 1280 e 440px.

A entrada anima só `opacity` (não `visibility`), para as seções não saírem da árvore de acessibilidade.

---

## Fase 16.1 — Casca do desktop com sidebar

**Data:** 2026-10-13
**Status:** Concluída (PR #5)
**Branch:** `feat/sidebar-desktop`

### Contexto

Primeira subfase do `SKILLHUB_SIDEBAR_E_DOMINIO.md` (plano em `PLANO_16_1.md`). A partir de `lg` (1024px) o menu pill inferior e o `AppHeader` dão lugar a uma **sidebar à esquerda** (designs/New Início - Desktop.png, node `719:131`), presa à viewport enquanto a página rola. Abaixo de `lg` nada muda. Só layout: nenhum dado, rota, endpoint ou fluxo mudou.

Decisões tomadas na aprovação do plano:
- O trabalho de animações (GSAP, transição de páginas) que estava sem commit saiu antes, no PR #4; esta branch parte da `main` depois desse merge (`fe74495`).
- Acima de 1496px a coluna de 1200px fica centralizada no espaço à direita da sidebar.
- O `BottomNav` passa a usar a mesma regra de item ativo da sidebar (prefixo, `rotaAtiva`); como ainda não há subrotas, nada muda na tela.
- No desktop o fim da página tem 24px (`lg:pb-6`), como o 24/24/24/0 do Figma.
- Fluxos de desktop acrescentados ao e2e.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/src/components/app/sidebar.tsx` | **Novo** — marca (link para `/inicio`), card de créditos (`ContentCard`, saldo real com `formatCredits`/`useCountUp`), "MENU", navegação (Início, Serviços, Produtos, Comunidade, Perfil) e Conta (Configurações, Sair). `sticky top-4`, `self-start`, altura `calc(100dvh-32px)`. Numa tela baixa a parte de cima rola e a Conta fica sempre visível. Ícones FontAwesome e Lucide numa caixa de largura fixa, para os rótulos alinharem. |
| `frontend/src/components/app/navegacao.ts` | **Novo** — lista única `NAV_ITENS` (cada menu escolhe a ordem), `NAV_VIDRO` (vidro compartilhado pelos dois menus) e `rotaAtiva` (`pathname === href` ou subrota). |
| `frontend/src/hooks/use-logout.ts` | **Novo** — o `sair` que estava em Configurações, usado também pela sidebar. Comportamento idêntico. |
| `frontend/src/app/(app)/layout.tsx` | A partir de `lg`, linha `flex lg:gap-8 lg:p-4` com a sidebar e a coluna da página. A coluna (`data-page-exit`) tem `lg:min-w-0 lg:overflow-x-clip`. A sidebar fica fora dela, então não afunda na transição de página. |
| `frontend/src/components/app/page-container.tsx` | Só `lg+`: `lg:max-w-5xl lg:px-12 xl:max-w-6xl` → `lg:max-w-[1200px] lg:pt-6 lg:pr-6 lg:pl-0`. |
| `frontend/src/components/app/bottom-nav.tsx` | Usa `NAV_ITENS`, `NAV_VIDRO` e `rotaAtiva`; `lg:hidden` no lugar de `lg:max-w-[520px]`. |
| `frontend/src/components/app/app-header.tsx` | Só `lg:hidden`. |
| `frontend/src/components/app/credits-chip.tsx` | Só `export` de `formatCredits` e `useCountUp`. |
| `frontend/src/app/(app)/configuracoes/page.tsx` | Só a troca do `sair` local pelo `useLogout`. |
| `frontend/src/app/(app)/inicio/page.tsx` | Só a classe dos avatares extras de colaboradores: `hidden lg:block` → `hidden xl:block`. |
| `e2e/fluxos.mjs` | Bloco de desktop (1280×800): sidebar visível com menu inferior e header ocultos, item ativo e ausência de rolagem horizontal nas 6 rotas, saldo do usuário e Sair pela sidebar. |

### Ajuste: rolagem horizontal e sidebar presa (receita de layout da Seção 16.1)

Dois erros clássicos de flexbox, descritos no bloco "Receita de layout" do documento:
- **Rolagem horizontal:** a coluna da página é um item `flex-1` numa linha. Com `min-width: auto` ela crescia até a largura da trilha dos carrosséis (`ScrollRow`), e a página rolava de lado (a 1440px, `scrollWidth` chegava a 1496). A correção foi `lg:min-w-0`, mais `lg:overflow-x-clip` por segurança, que corta sem criar contêiner de rolagem. As duas classes ficam **só na coluna**: overflow num ancestral da sidebar desligaria o `sticky`.
- **Sidebar presa:** o `aside` já usa `self-start` e altura própria (`h-[calc(100dvh-32px)]`), então não estica até a altura do conteúdo e o `sticky top-4` tem para onde grudar. Nenhum ancestral dele tem `overflow` diferente de `visible`. A rolagem continua sendo a da janela, sem contêiner interno.

### Validação

- **Mobile e tablet inalterados:** screenshots de página inteira das 6 páginas a 375, 440 e 768px, antes e depois, **idênticos byte a byte** (18 de 18). O método é determinístico: duas capturas da base deram 18 de 18 iguais, com o mouse fora da página para não pegar hover.
- **Desktop (Playwright, 1024, 1280, 1440 e 1920px, 6 rotas, abrindo pela sidebar e por carga direta):** `scrollWidth <= clientWidth`; topo do aside em 16px antes e depois de `scrollTo(0, 800)` e depois de rolar até o fim; nenhum ancestral do aside com overflow; carrosséis rolam dentro de si e o arraste com o mouse continua funcionando, sem mover a página.
- Item ativo correto nas 6 rotas (inclusive Configurações); a 1024×600 a parte de cima da sidebar rola e o Sair continua visível; Tab percorre marca, itens, Configurações e Sair com o anel no accent.
- Contraste sobre o vidro (`#0a0a0a`): texto inativo 15.9:1, ativo 9.0:1, rótulos cinza 7.5:1.
- `./e2e/run.sh`: 88/88 (73 anteriores + 15 de desktop). `tsc --noEmit` (frontend e backend), `eslint` e `next build` sem erros.

### Ajuste: colaboradores do Início entre 1024 e 1279px

A fileira de "Colaboradores Relevantes" mostrava 8 avatares a partir de `lg` (cerca de 907px), mas a coluna nova tem 688px a 1024. Com o `overflow-x-clip` a página não rolava mais de lado, porém o 8º avatar e o "Ver mais..." ficavam escondidos e inalcançáveis até ~1243px. Os avatares a partir do 5º passam a aparecer só a partir de `xl` (`hidden xl:block`): abaixo de 1280px a fileira mostra 4 avatares e o "Ver mais...", como no tablet; a partir de 1280px, os 8 cabem. Única mudança numa página de conteúdo, autorizada por João Gabriel.

### Achados fora de escopo

- Sem o header no desktop, as páginas mantêm a margem de topo pensada para ficar abaixo dele (cerca de 60px vazios acima do título). Fica para a 16.2.
- Os títulos dos eventos do Início ainda têm emojis; a 16.2 já prevê removê-los.

---

## Animações das telas de entrada e transição de páginas (PR #4)

**Data:** 2026-10-13
**Status:** Concluída (PR #4)
**Branch:** `feat/animacoes-auth`

### Contexto

Registro feito na faxina antes da Fase 18, a partir dos commits `657b7e3`, `65c550e`, `d2d9494` e `30e4256` e da descrição do PR #4; na época o trabalho não entrou neste changelog. Era animação que estava sem commit na `main` local e saiu num PR próprio antes da Fase 16.1 (como registrado no `PLANO_16_1.md`), porque o `app/(app)/layout.tsx` também é alterado pela sidebar.

### Arquivos

| Arquivo | Alteração |
|---|---|
| `frontend/package.json`, `package-lock.json` | Dependências `gsap` e `@gsap/react`. |
| `frontend/src/lib/gsap.ts` | **Novo.** Registro central dos plugins. |
| `frontend/src/components/motion/page-transition.tsx`, `hex.tsx` | **Novos.** Transição de páginas: uma colmeia de hexágonos cobre a tela a partir do clique e a rota troca por baixo. Na primeira carga, um splash. |
| `frontend/src/components/motion/magnetic.tsx` | **Novo.** Botões sociais "magnéticos". |
| `frontend/src/app/(app)/layout.tsx`, `app/layout.tsx`, `app/globals.css` | Wrapper `data-page-exit`, que afunda junto com a saída, e o provider da transição. |
| `frontend/src/app/(auth)/page.tsx`, `login/login-form.tsx`, `cadastro/cadastro-flow.tsx`, `layout.tsx` | Animações de entrada das telas `/`, `/login` e `/cadastro`; tremida e decodificação da mensagem de erro. |
| `frontend/src/components/auth/auth-background.tsx` | **Novo.** Fundo animado das telas de entrada. |
| `frontend/src/components/auth/auth-ui.tsx`, `profile-card.tsx`, `social-buttons.tsx` | Foco, blur e erro animados nos campos; cards de perfil e botões sociais. O botão do Google não aparecia depois da animação: o `transition-opacity` do CSS brigava com o `autoAlpha` do GSAP, então o hover passou a `transition-colors`. |
| `e2e/fluxos.mjs` | O teste do callback com erro espera a mensagem terminar de decodificar. |

### Validação

Como registrado na descrição do PR:
- `./e2e/run.sh`: 73/73.
- `tsc --noEmit` e `eslint` sem erros.
- `next build` ok.

Conferência visual não registrada na época.

---

## Fase 15 — Responsividade desktop

**Data:** 2026-09-28
**Status:** Concluída
**Branch:** `feat/responsivo-desktop`

### Contexto

As páginas da Fase 14 seguiam os valores do Figma (canvas mobile de 440px) em qualquer largura: no desktop o texto ficava minúsculo e os carrosséis só rolavam por touch/trackpad (com mouse, clicar e arrastar apenas selecionava texto). Seguindo `SKILLHUB_RESPONSIVO_DESKTOP.md`: **abaixo de `sm` (640px) nada muda**; a partir de `sm`/`lg`/`xl` o mesmo layout ganha coluna mais larga, texto maior e cards mais confortáveis. Os carrosséis **continuam carrossel** (não viraram grade) e agora também arrastam com o mouse. Sem mudanças de dados, rotas ou fluxos.

Decisões tomadas na aprovação do plano:
- O `PageContainer` substitui a `div` do `app/(app)/layout.tsx`, que já envolvia o header e todas as páginas; nenhuma página precisou trocar o próprio container.
- Padding mobile mantido em `23px` (o doc sugeria `19px`, o que mudaria o mobile).
- Breakpoint único: o que usava `md:` (Início, Perfil, componentes) passou para `sm:`/`lg:`, para todas as páginas crescerem nos mesmos pontos.
- O arraste começa inclusive sobre botões e links (o `ProdutoCard` inteiro é um botão); um limiar de 5px separa clique de arraste.

### Componentes

| Arquivo | Alteração |
|---|---|
| `frontend/src/components/app/page-container.tsx` | **Novo** — coluna das páginas: `max-w-[440px] px-[23px]` → `sm:max-w-2xl sm:px-8` → `lg:max-w-5xl lg:px-12` → `xl:max-w-6xl`. Usado no `app/(app)/layout.tsx` (antes `max-w-[1200px] px-[23px] md:px-10`). |
| `frontend/src/hooks/use-drag-scroll.ts` | **Novo** — arrastar com o mouse para rolar na horizontal. Só eventos de mouse (touch/trackpad seguem nativos). Cursor `grab`/`grabbing` apenas quando há o que rolar; durante o arraste, sem seleção de texto e sem scroll-snap (volta ao soltar e alinha no card mais próximo). Movimento acima de 5px descarta o clique do fim (captura), então soltar em cima de um "Saiba Mais" não o aciona; `dragstart` bloqueado para o navegador não "puxar" imagens e links. |
| `frontend/src/components/app/scroll-row.tsx` | Usa `useDragScroll`; sangramento até a borda só abaixo de `sm` (antes `md`); o "ir para o item" dos dots lê o `scroll-padding` real em vez de `23px` fixo. |
| `frontend/src/components/app/chip-row.tsx` | **Novo** — fileira de chips com o mesmo sangramento e o arraste; substitui as três `div` repetidas de Serviços (filtros), Produtos (categorias) e Comunidade (tags). |
| `frontend/src/components/app/page-title.tsx` | 32px → `sm:36px` → `lg:42px`. |
| `frontend/src/components/app/section-header.tsx` | 15px → `sm:18px` → `lg:20px`; seta 17px → `sm:20px`. |
| `frontend/src/components/app/search-bar.tsx` | Altura 35px → `sm:44px`; texto 12px → `sm:13px` → `lg:14px`. Visual `GlassCard` inalterado. |
| `frontend/src/components/app/filter-chip.tsx` | Altura 29px → `sm:34px` → `lg:36px`; texto 15px → `lg:16px`; opções do menu `sm:14px`. |
| `frontend/src/components/ui/cta-button.tsx` | 10px → `sm:12px` → `lg:13px` (vale também para o `ctaButtonClass`). |
| `frontend/src/components/app/servico-card.tsx` | 218px → `sm:260px` → `lg:290px`; título, descrição, autor e distância escalam. A partir de `sm` a altura deixa de ser fixa (o texto maior encostava no botão a 768px); numa fileira os cards seguem com a mesma altura. |
| `frontend/src/components/app/produto-card.tsx` | 180px → `sm:210px` → `lg:240px`, foto na mesma proporção, textos escalam, `sizes` da imagem por breakpoint. |
| `frontend/src/components/app/bottom-nav.tsx` | Continua fixo na base; `lg:max-w-[520px]`. |
| `frontend/src/components/app/app-header.tsx` | Sem alteração: o espaçamento lateral vem do `PageContainer`. |

### Páginas

| Arquivo | Alteração |
|---|---|
| `frontend/src/app/(app)/inicio/page.tsx` | `md:` → `sm:`/`lg:`. Cards de evento passam de "fração da largura" para largura fixa por breakpoint (`sm:400px`, `lg:440px`), como carrossel; serviços e produtos crescem; "Colaboradores Relevantes" mostra 4 avatares até `lg` e 8 a partir dele (com a coluna nova, 6 avatares não cabiam a 768px). |
| `frontend/src/app/(app)/servicos/page.tsx`, `produtos/page.tsx` | Espaçamentos e títulos de seção escalam; banners de Produtos com largura fixa por breakpoint (`sm:440px`, `lg:480px`); fileiras de chips via `ChipRow`. As listas de resultados filtrados continuam em grade (já eram desde a Fase 14). |
| `frontend/src/app/(app)/comunidade/page.tsx` | Feed, dúvidas, eventos e histórias escalam texto, avatar e padding. Feed e histórias ficam em coluna única (antes `md:grid-cols-2`, que com um item só deixava meia tela vazia). |
| `frontend/src/app/(app)/configuracoes/page.tsx` | Itens 64px → `sm:76px`, textos e chevron maiores. Coluna de 760px mantida. |
| `frontend/src/app/(app)/perfil/*` | `md:` → `sm:` (inclusive o sangramento da curva do topo, que precisa acompanhar o padding do container) e títulos um pouco maiores em `lg`. Coluna de 760px mantida. |

### Validação

- **Mobile inalterado:** screenshots de página inteira das 6 páginas a 375px e 440px, antes e depois, **idênticos byte a byte** (12 de 12).
- **Tablet e desktop:** conferência visual das 6 páginas a 768px e 1440px.
- **Arrastar com o mouse (Playwright, 768px e 1440px):** a fileira rola; soltar em cima de um "Saiba Mais" ou de um produto não o aciona; clique simples continua funcionando; nada é selecionado; o snap realinha ao soltar; as categorias de Produtos arrastam sem ativar filtro; fileira que cabe inteira não mostra cursor de arraste.
- `./e2e/run.sh`: 73/73 passando.
- `tsc --noEmit`, `eslint` e `next build` sem erros.
- Não testado: arraste por touch em aparelho real (o hook não escuta eventos de toque, então a rolagem nativa não é afetada).

---

## Fase 14 — Páginas Serviços, Produtos, Comunidade e Configurações; Perfil com modais

**Data:** 2026-09-28
**Status:** Concluída
**Branch:** `feat/paginas-design`

### Contexto

Implementação das telas finalizadas no Figma (`designs/New *.png`), seguindo o contrato de `SKILLHUB_PAGINAS_DESIGN.md`: correção de cor do menu inferior, dois componentes novos (`ContentCard` e `CtaButton`) convivendo com o `GlassCard`, as páginas Serviços/Produtos/Comunidade sobre uma camada de dados mockada já no formato assíncrono, Perfil editado por modais e a página de Configurações. Dashboard-Empresa e o papel "Empresa" ficaram **fora de escopo** — nada foi criado para eles.

Decisões tomadas na aprovação do plano:
- A engrenagem do header deixa de abrir um menu e passa a levar a `/configuracoes`. "Excluir conta" (já funcional) foi para dentro de **Privacidade e Segurança**.
- **Qualidades** continuam só com o nome (`competencias: string[]`): o mockup mostra uma descrição por qualidade, mas o schema não tem esse campo e não foi alterado.
- **Experiências Profissionais** ficam sem modal: não há nenhum campo no schema para editar (os números são placeholders) e o `New Perfil.png` não tem lápis nessa seção.
- Os modais do Perfil salvam **de verdade**: o backend já tinha `PATCH /api/user`, `POST /api/user/avatar` e `POST /api/user/curriculo`.

### Componentes base

| Arquivo | Alteração |
|---|---|
| `frontend/src/components/app/bottom-nav.tsx` | Item ativo `#00fff2` → `#3bd4cc` (accent oficial), brilho do ícone para `rgba(59,212,204,0.7)`. Fundo da pílula trocado pela classe da Seção 0 (vidro só com insets, sem brilho colorido). |
| `frontend/src/components/ui/content-card.tsx` | **Novo** — `ContentCard`, card de conteúdo com os valores exatos do Figma. Nome do arquivo `content-card.tsx` (o doc sugeria `card-content.tsx`) para bater com o do componente. |
| `frontend/src/components/ui/cta-button.tsx` | **Novo** — `CtaButton` com os valores da Seção 2. Acréscimos: `type="button"` por padrão, `hover:brightness-110`/`disabled:opacity-60`, e `ctaButtonClass` exportado para links com cara de CTA (o "Saiba Mais" do Início). Cor, raio e sombras são os do doc. |
| `frontend/src/components/ui/dialog.tsx` | **Novo** — `Dialog` do shadcn (`npx shadcn add dialog`, recusando sobrescrever o `button.tsx`, que tem a variante `skillhub`). Ajustes: overlay `bg-black/70` e rótulos "Fechar" em português. |
| `frontend/src/components/ui/sonner.tsx` | **Novo** — toaster do shadcn (`sonner`), com tema fixo escuro e o vidro escuro do design system. O `next-themes` que o shadcn instala junto foi removido (o site só tem tema escuro). Montado em `app/layout.tsx`. |
| `frontend/src/components/ui/glass-card.tsx` | **Não alterado**, como pedido. Continua em uso para busca, chips de filtro e tags. |
| `frontend/src/hooks/use-dismiss.ts` | Passa a aceitar vários refs (menus em portal ficam fora do elemento que os abre). |

### Camada de dados mockada (`frontend/src/lib/mock/`)

| Arquivo | Conteúdo |
|---|---|
| `pessoas.ts` | `AutorResumo = Pick<User, "id" \| "fullName" \| "urlPhoto">` (formato em que o backend devolverá o autor) e as pessoas dos mockups, com fotos do Unsplash. |
| `servicos.ts` | Tipo `Servico` (titulo, descricao, categoria, autor, distanciaKm, remuneracao, prazo, createdAt), `CATEGORIAS_SERVICO`, `SERVICOS_MOCK` e `getServicos()`. |
| `produtos.ts` | Tipos `Produto`, `Vendedor` (com `jovemAprendiz`) e `Destaque` (banners), `CATEGORIAS_PRODUTO`, mocks, `getProdutos()` e `getDestaques()`. |
| `comunidade.ts` | Tipo `Postagem` com discriminador `tipo` (`feed`, `duvida`, `evento`, `historia`), `TAGS_COMUNIDADE`, `POSTAGENS_MOCK` e `getPostagens()`. |

Todas as funções `get*()` já são `async` e as páginas as consomem via `useSWR` — quando os models existirem no backend, só o corpo da função muda (`api.get(...).then((r) => r.data)`). Os tipos são uma **proposta** para esses models, já que ainda não existem no Prisma.

Conteúdo: textos, nomes e preços tirados dos mockups. Onde o mockup corta o texto, foi completado: "Terço personalizado" (preço e vendedora inventados), "Mentoria sobre carreira" e "Curso de análise de dados para iniciantes". Remuneração e prazo dos serviços não aparecem nas telas e foram preenchidos só para os filtros funcionarem. As fotos (Unsplash, licença livre) aproximam os produtos do mockup; `images.unsplash.com` foi liberado em `next.config.ts`.

### Páginas

| Arquivo | Alteração |
|---|---|
| `frontend/src/app/(app)/servicos/page.tsx` | **Nova** — busca, chips Organizar/Categoria/Remuneração/Prazo (filtram e ordenam o mock no navegador), "Serviços na sua área" (até 5 km) e uma linha por categoria. Com filtro ativo, ou ao tocar na seta de uma linha, vira uma lista única de resultados com "Limpar filtros". |
| `frontend/src/app/(app)/produtos/page.tsx` | **Nova** — atalhos de categoria no topo (filtram), busca, carrossel de banners e uma linha por categoria com produtos. Categoria sem produtos mostra aviso. |
| `frontend/src/app/(app)/comunidade/page.tsx` | **Nova** — busca, tags (filtram), Feed de Postagens, Dúvidas e Eventos lado a lado, Histórias de sucesso. Tempo relativo ("há 1 hora") via `Intl.RelativeTimeFormat`. |
| `frontend/src/app/(app)/configuracoes/page.tsx` | **Nova** — os 7 itens em `ContentCard`, com busca. Editar Perfil → `/perfil`; Privacidade e Segurança → modal com o e-mail da conta, "Alterar senha" (em breve) e "Excluir conta" (reaproveita o `DeleteAccountDialog`); Sair → logout real. Os outros avisam "em breve". |
| `frontend/src/app/(app)/[secao]/page.tsx` | **Removido** — era o placeholder "em construção" de Serviços/Produtos/Comunidade. |
| `frontend/src/app/(app)/inicio/page.tsx`, `inicio/mock.ts` | Serviços e produtos do Início passam a vir de `lib/mock` (sem tipos `Servico`/`Produto` duplicados); cards viram `ContentCard`, produtos ganham foto e o "Saiba Mais" usa o visual do CTA. Eventos e colaboradores continuam no mock local. |
| `frontend/src/components/app/app-header.tsx` | Engrenagem vira link para `/configuracoes` (fica no accent quando a página está aberta); o menu com Sair/Excluir conta foi removido. |

Componentes compartilhados novos em `frontend/src/components/app/`: `page-title.tsx`, `search-bar.tsx` (com `normalizar()` para busca sem acento), `filter-chip.tsx` (menu em portal com posição fixa, porque a linha de chips rola na horizontal e cortaria um menu absoluto), `section-header.tsx`, `servico-card.tsx` e `produto-card.tsx`. `frontend/src/lib/em-breve.ts` centraliza o aviso "Em breve" para ações sem tela ainda (detalhes de serviço/produto, setas "ver tudo" da Comunidade, itens de Configurações).

### Perfil — edição por modais

| Arquivo | Alteração |
|---|---|
| `frontend/src/components/app/perfil/profile-dialog.tsx` | **Novo** — casca comum dos modais (Dialog com vidro escuro, título, erro da API, Cancelar/Salvar) e `DialogField` (campo com linha, em Inter). |
| `frontend/src/components/app/perfil/edit-nome-dialog.tsx` | **Novo** — dados pessoais: nome, telefone (com máscara) e gênero (só pessoa física). Envia ao `PATCH /user` apenas o que mudou. |
| `frontend/src/components/app/perfil/edit-qualidades-dialog.tsx` | **Novo** — editor de qualidades que antes era inline em `competencias-section.tsx`; Enter adiciona, Salvar grava. |
| `frontend/src/components/app/perfil/edit-curriculo-dialog.tsx` | **Novo** — envia/substitui o PDF por `POST /user/curriculo` (validação de tipo e 5MB mantida). |
| `frontend/src/app/(app)/perfil/profile-hero.tsx` | Removida a edição inline do nome; o lápis abre o modal. Troca de foto (câmera) continua igual. |
| `frontend/src/app/(app)/perfil/competencias-section.tsx`, `curriculo-section.tsx`, `page.tsx` | Lápis e "Adicionar qualidades"/"Enviar currículo" abrem os modais; cards de conteúdo passam de `GlassCard` para `ContentCard`. |

Os modais são montados só enquanto abertos, então o formulário sempre começa dos dados salvos.

### Dependências

- `sonner` adicionado (toasts). `next-themes` foi instalado pelo shadcn e removido em seguida.
- O container `frontend` do docker compose tem `node_modules` próprio: depois de puxar a branch, rodar `docker compose exec frontend npm install`.

### Testes (`e2e/fluxos.mjs`)

Atualizados para o novo fluxo: `loggedAs` confere o e-mail no modal de Privacidade; `sair` e `abrirExclusao` passam por `/configuracoes`; o teste do menu inferior confere o título da página Serviços em vez do "em construção"; a edição de nome usa o modal ("Editar dados pessoais" / "Salvar"); o envio de currículo abre o modal antes de escolher o arquivo.

### Validação

- `./e2e/run.sh`: 73/73 passando (login, cadastro, OAuth, Perfil com modais, uploads no Cloudinary, recuperação de senha, exclusão de conta), sem erros de JavaScript.
- Frontend: `tsc --noEmit` sem erros; `eslint` sem erros ou warnings; `next build` ok, com `/servicos`, `/produtos`, `/comunidade` e `/configuracoes` geradas.
- Conferência visual das seis telas a 440px (largura dos mockups) com Playwright, e das interações: filtros, busca, aviso "em breve", modais salvando e Sair.
