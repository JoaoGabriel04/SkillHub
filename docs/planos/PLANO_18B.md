# Plano da subfase 18B: carrinho, checkout e pedido

> Segue `docs/especificacoes/SKILLHUB_PRODUTOS_LOJA.md` (Seções 1, 5, 7 e 8), o `PLANO_18A.md` e o padrão dos planos da Fase 17.
> **Status: aprovado pelo João Gabriel em 09/11/2026**, com as recomendações da Seção 9 e quatro ajustes, já incorporados abaixo e listados na Seção 11:
> (1) a exceção do D5 na condição do cancelamento e no item 53; (2) `pagarPedido` e `estornarPedido` usam `pedido.total` e abortam se a `RESERVA` não existir ou divergir; (3) os testes da 15i afetados pelo D6, com o front mandando `estoque` + `estoqueLido` só quando o campo mudou; (4) a taxa de falha do script de reprodução antes e depois, no changelog.
> Implementado na `feat/produtos-pedidos`. O registro (inclusive o resultado da Etapa 0, que não confirmou a causa, e os pequenos desvios da lista de arquivos) está no `CHANGELOG_MIGRACAO.md`.

## 0. Estado real do repositório (conferido em 09/11/2026)

- **Base:** `origin/main` em `1948361` (merge do PR #18, a 18A). É só o merge dos 4 commits da 18A, nada além.
- **Branch:** `feat/produtos-pedidos`, criada a partir de `1948361`.
  - A `main` local estava em `26ba19d` e foi adiantada para `1948361`.
  - **A migration da 18A com dono `root` travou a troca de branch de novo**, como previsto no changelog. O `git checkout` não consegue apagar nem regravar `20261104023202_produto/migration.sql`. O conteúdo é idêntico ao da `main`, então avancei só o índice (`git reset` misto para `origin/main`, que equivale ao fast-forward) e restaurei o resto. A árvore ficou igual à `origin/main`. A migration nova da 18B vai nascer com dono `root` também. Sugestão, fora do escopo: `sudo chown -R $USER backend/prisma/migrations`.
- **Último total do e2e:** 276/276 (5 de 5 rodadas na 18A).
- **O que o documento descreve e confere:**
  - `credito.service` com `reservar`, `pagar` e `estornar` e o `movimentar` com débito condicional (`updateMany` com `credits >= valor`);
  - `PLATFORM_FEE_PERCENT` com padrão 0, a taxa arredondada para baixo (`calcularTaxa`) e a conta da plataforma (`TAXA` e `TAXA_RECEBIDA`);
  - `TransacaoCredito.servicoId` como referência sem relação;
  - `zustand` 5 (o `persist` vem no próprio pacote) e `lucide-react` já instalados. **Não há dependência nova.**
- **Diferenças em relação ao documento:**
  1. **O `credito.service` só conhece `servicoId`.** `movimentar`, `registrar` e o `valorReservado` procuram a reserva pelo serviço. A 18B acrescenta o `pedidoId` sem mudar o caminho dos serviços (Seção 3.3).
  2. **`TransacaoCredito.user` é `Cascade`.** Quando uma conta é excluída, o extrato dela some, inclusive a `RESERVA` de um pedido em aberto. Isso pesa no item (c) e está detalhado na Seção 3.7. O documento diz que o `SetNull` no pedido "preserva o histórico dos KPIs (volume e renda)". Isso vale lendo o **pedido** (`status`, `total`, `concluidoEm`), não o extrato: o `RECEBIMENTO` do vendedor some se ele excluir a conta.
  3. **"Teste local fora do repositório, como em `verificar-taxa`" (5.7):** o `scripts/verificar-taxa.ts` **está** no repositório e é chamado pelo e2e. O que fica fora é a configuração: ele roda num processo à parte, com a taxa de 15% e uma conta da plataforma de teste, sem mexer no backend do compose. Proponho seguir o mesmo mecanismo (D9).
  4. **`AppError` só tem mensagem e status.** O 409 `PRECO_ALTERADO` e o `ESGOTADO` "apontando o produto" pedem um `code` e um `produtoId` na resposta. Proponho campos opcionais no `AppError`, sem mudar o que já existe (Seção 3.2).
  5. **Ícones:** o projeto usa Font Awesome na maior parte e Lucide em poucos lugares (`sidebar`, `dialog`, `sonner`). Os ícones novos da 18B serão Lucide, como pede o documento. Os existentes não mudam.
  6. **Fotos de produto removido:** na 18A, remover um produto apaga as fotos no Cloudinary (risco R4 da 18A). O `imagemUrl` do snapshot de um pedido antigo deixa de abrir. Isso é tratado em D7.

## 1. Etapa 0: diagnóstico do "socket hang up" (antes de qualquer código da 18B)

O e2e caiu com `socket hang up` (`apiRequestContext.post`, 18A) e com `other side closed` (`fetch`, PR #17), sem erro nem reinício no log do backend. A causa ficou em aberto nas duas vezes.

### 1.1. Hipótese, levantada com leitura de código, sem rodar nada

- **O servidor:** `app.listen(PORT)` em `backend/src/index.ts`, com os padrões do Node 24: `keepAliveTimeout` de **5s**. O servidor fecha conexões ociosas aos 5s.
- **O cliente:** o Playwright 1.61 usa **um agente HTTP global** (`httpHappyEyeballsAgent`, `keepAlive: true`, sem tempo máximo de ociosidade), compartilhado por todos os contextos. Um `ctx.request.post` num contexto **recém-criado** pode reaproveitar um socket que outro contexto usou segundos antes.
- **O gatilho:** o e2e chama `execFileSync` (`sql()`, `conceder()`, `cloudinaryHas()`, `docker compose exec`), que **trava o event loop do processo de teste** por centenas de milissegundos.
  - Nesse intervalo, o aviso de que o servidor fechou o socket (o FIN) chega, mas não é processado.
  - Quando o loop volta, o agente entrega como "livre" um socket que o servidor já fechou. O pedido sai, e a resposta é um `ECONNRESET` (`socket hang up` no Playwright, `other side closed` no `fetch`).
- **As duas quedas registradas batem com isso:**
  - a da 18A foi num `ctxAval.request.post` logo depois de passos com `sql()` (`e2e/fluxos.mjs:961`);
  - a do PR #17 foi num `fetch`, logo depois do "extrato bate com o saldo", que é uma consulta por `sql()`.

### 1.2. Roteiro (curto, antes da 18B)

1. **Reproduzir** com um script no scratchpad, fora do repositório. Ele faz um pedido por um contexto do Playwright, espera perto de 5s (entre 4,8 e 5,2s, com parte da espera bloqueando o loop com `execFileSync("sleep")`), cria outro contexto e faz um pedido novo. São 300 repetições, contando os `socket hang up`. Faço o mesmo com o `fetch` (undici).
2. **Olhar o container:**
   - `docker inspect backend` (RestartCount, OOMKilled);
   - `docker compose logs --timestamps backend` durante a reprodução (reinício do `tsx watch`, erro, aviso de pool);
   - `docker stats` (memória).
3. **Descartar o pool do Prisma:**
   - o padrão é `num_cpus * 2 + 1` conexões, e o `DATABASE_URL` do compose não define `connection_limit`;
   - um pool esgotado dá `P2024` (resposta 500, com log), não um socket cortado. Confiro no log e com `SHOW max_connections` e `pg_stat_activity` no meio de uma rodada.
4. **Testar a correção proposta:** `server.keepAliveTimeout = 65_000` e `server.headersTimeout = 66_000` no `index.ts` (o servidor passa a manter o socket mais tempo que qualquer pausa do cliente). Repito o script de reprodução antes e depois.
5. **Rodar as 5 rodadas.**

### 1.3. O que vale em cada resultado

- **Reproduzi, e a correção zera as falhas:** a correção entra num commit próprio, antes da 18B (`fix: keep-alive do servidor maior que o do cliente`). O changelog traz a **taxa de falha das 300 repetições antes e depois** da correção (ajuste 4), separada por cliente (Playwright e `fetch`).
- **Não reproduzi:** registro o que foi descartado (reinício, memória, pool, keep-alive) e a regra de 5 rodadas seguidas continua. **Nenhum retry no teste** e nenhum timeout maior para esconder a falha.
- **Risco da correção:** um `keepAliveTimeout` de 65s mantém conexões ociosas abertas por mais tempo. Isso é inofensivo no volume do piloto, e é o valor que se usa atrás de proxy ou balanceador. Num deploy atrás de proxy, o timeout do proxy precisa ser menor que o do Node (fica anotado no changelog).

## 2. Arquivos

### 2.1. Backend

| Arquivo | O quê |
|---|---|
| `src/index.ts` | Só se a Etapa 0 confirmar: `keepAliveTimeout` e `headersTimeout` (Seção 1). |
| `prisma/schema.prisma` + migration `pedido_produto` (via `prisma migrate dev` no container) | Seção 3.1. |
| `src/modules/pedido/` | **Novo:** `pedido.schema.ts` (Zod), `pedido.repository.ts` (o único que escreve em `PedidoProduto` e `ItemPedido`; abre as transações), `pedido.service.ts` (regras, respostas, contato), `pedido.controller.ts` e `status.map.ts` (rótulos). |
| `src/api/routes/pedido.route.ts` + `src/api/routes/index.ts` | **Novo** router `/pedidos`, todo com `authenticate`. `/compras` e `/vendas` antes de `/:id`. |
| `src/modules/produto/produto.repository.ts` | `baixarEstoque(tx, id, quantidade, precoEsperado)` e `devolverEstoque(tx, id, quantidade)`, os dois com `updateMany` condicional. Continua sendo o **único** que escreve em `Produto.estoque`. Também `paraCheckout(tx, ids)` (leitura) e, se D6 for aprovada, a condição `estoque: estoqueLido` no PATCH. |
| `src/modules/produto/produto.service.ts`, `produto.schema.ts` | Só se D6 for aprovada: `estoqueLido` no PATCH. |
| `src/modules/produto/whatsapp.ts` | `linkWhatsappPedido(telefone, primeiroItem)`, com a mensagem do pedido. A normalização não muda. |
| `src/modules/credito/credito.service.ts`, `credito.repository.ts` | `pedidoId` no `movimentar` e no `registrar`. Funções novas: `reservarPedido`, `pagarPedido` e `estornarPedido`. O extrato passa a mostrar "Pedido: …". Os caminhos de serviço não mudam (Seção 3.3). |
| `src/utils/AppError.ts` | Campos opcionais `code` e `extra` (Seção 3.2). Os usos de hoje não mudam. |
| `scripts/verificar-taxa.ts` | Os casos de pedido com 15% (Seção 3.6). |
| `scripts/pedidos-pendentes.ts` + `package.json` | **Novo** `npm run pedidos:pendentes`, só de listagem (Seção 3.8). |
| `e2e/fluxos.mjs`, `e2e/run.sh` | Seção `15j` (Seção 5). Os pedidos **não** caem com as contas (`SetNull`): o `cleanup` passa a apagar, antes das contas, os pedidos em que uma das partes é `e2e.*` (os itens vão em cascata). Os pedidos em que o próprio fluxo excluiu as duas contas (itens 35, 36 e 51 a 53) são apagados pelo fluxo, pelo id, no fim da seção. O e2e confere que nenhum pedido de teste sobra. |

### 2.2. Frontend

| Arquivo | O quê |
|---|---|
| `src/types/pedido.ts` | **Novo.** `PedidoResumo`, `PedidoDetalhe`, `StatusPedido`, `Papel`. |
| `src/types/credito.ts` | `pedido: { id, rotulo } \| null` na transação. |
| `src/lib/pedidos.ts` | **Novo.** Cliente da API e chaves do SWR, no padrão de `lib/produtos.ts`. |
| `src/lib/validation/pedido.ts` | **Novo.** Quantidade de 1 a 99 e observação de até 300 caracteres. |
| `src/stores/carrinho-store.ts` | **Novo.** Zustand com `persist` (Seção 5.1). |
| `src/components/app/botao-carrinho.tsx` | **Novo.** Ícone `ShoppingCart` (Lucide) com a contagem, no título de `/produtos`. |
| `src/components/app/carrinho-dialog.tsx` | **Novo.** O carrinho agrupado por vendedor. |
| `src/components/app/checkout-dialog.tsx` | **Novo.** Confirmação, saldo, observação e o estado de saldo insuficiente. |
| `src/components/app/pedido-card.tsx` (+ `pedido-card-esqueleto.tsx`) | **Novos.** Card de pedido nas linhas "Suas compras" e "Suas vendas". |
| `src/components/app/pedido-detalhe-dialog.tsx` | **Novo.** Linha do tempo, itens, a outra parte e as ações do papel. |
| `src/components/app/produto-detalhe-dialog.tsx` | "Adicionar ao carrinho" e "Comprar agora" (não aparecem para o dono). |
| `src/components/app/extrato-dialog.tsx` | "Pedido: nome do primeiro item (+N)". |
| `src/components/app/publicar-produto-dialog.tsx` | Só se D6 for aprovada: manda `estoqueLido` e trata o 409. |
| `src/app/(app)/produtos/page.tsx` | Carrinho no título, linhas "Suas compras" e "Suas vendas". |

### 2.3. Documentação

- `docs/planos/PLANO_18B.md` (este arquivo).
- Entrada da 18B no `docs/CHANGELOG_MIGRACAO.md`, com o "`docker compose up -d --build -V backend`" depois do merge e a "confirmação automática" como proposta de fase futura.

## 3. Backend

### 3.1. Schema Prisma final

```prisma
enum StatusPedidoProduto {
  AGUARDANDO_ENVIO
  ENVIADO
  CONCLUIDO
  CANCELADO
}

// desvio 1: enum no lugar de String (ver abaixo)
enum ParteDoPedido {
  COMPRADOR
  VENDEDOR
}

// Pedido de produtos (Fase 18B): um por vendedor em cada checkout. Total em créditos, reservado do comprador
// até a confirmação de recebimento (paga o vendedor) ou o cancelamento (estorna). SetNull nas partes: o pedido
// continua contando para os KPIs de volume e renda mesmo que uma conta seja excluída.
model PedidoProduto {
  id           String              @id @default(uuid())
  compradorId  String?
  comprador    User?               @relation("Compras", fields: [compradorId], references: [id], onDelete: SetNull)
  vendedorId   String?
  vendedor     User?               @relation("Vendas", fields: [vendedorId], references: [id], onDelete: SetNull)
  status       StatusPedidoProduto @default(AGUARDANDO_ENVIO)
  total        Int                 // em créditos, soma dos itens
  observacao   String?             // até 300
  canceladoPor ParteDoPedido?
  itens        ItemPedido[]
  createdAt    DateTime            @default(now())
  enviadoEm    DateTime?
  concluidoEm  DateTime?           // KPI: volume de transações concluídas e renda gerada (total)
  canceladoEm  DateTime?

  @@index([compradorId, createdAt])
  @@index([vendedorId, createdAt])
  @@index([status, enviadoEm])    // desvio 3: pedidos:pendentes
}

model ItemPedido {
  id            String        @id @default(uuid())
  pedidoId      String
  pedido        PedidoProduto @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  produtoId     String?       // SetNull: o histórico não depende do produto
  produto       Produto?      @relation(fields: [produtoId], references: [id], onDelete: SetNull)
  nome          String        // snapshot
  precoUnitario Int           // snapshot, em créditos
  quantidade    Int           // 1 a 99
  imagemUrl     String?       // snapshot da capa
  digital       Boolean       @default(false) // desvio 2: snapshot

  @@index([pedidoId])
  @@index([produtoId])          // desvio 4
}
```

Nos models existentes:
- `User`: `compras PedidoProduto[] @relation("Compras")` e `vendas PedidoProduto[] @relation("Vendas")`.
- `Produto`: `itensPedido ItemPedido[]`.
- `TransacaoCredito`: `pedidoId String?` (só referência, sem relação, como o `servicoId`) e `@@index([pedidoId])` (desvio 5).

**Desvios da Seção 5.1, cada um para você confirmar (D8):**
1. **`canceladoPor` como enum `ParteDoPedido`**, no lugar de `String`. O banco passa a recusar outro valor, e é o padrão do projeto (os status são todos enum). A API continua mandando o rótulo ("Comprador" ou "Vendedor").
2. **`ItemPedido.digital` (snapshot):** o detalhe mostra "Entregue" no lugar de "Enviado" para item digital (5.4: "para produto digital, é entregue"). Sem o snapshot, isso se perde quando o produto é removido ou o vendedor sai.
3. **`@@index([status, enviadoEm])`:** é a consulta do `pedidos:pendentes`.
4. **`@@index([produtoId])` no `ItemPedido`:** o `SetNull` em `Produto` faz o Postgres procurar os itens pelo `produtoId` a cada exclusão de produto (a exclusão de conta apaga os produtos em cascata). Sem o índice, isso varre a tabela.
5. **`@@index([pedidoId])` no `TransacaoCredito`:** `pagarPedido` e `estornarPedido` acham a reserva pelo pedido, e o extrato junta os nomes. O `servicoId` não tem índice hoje e continua sem (fora do escopo).

**Considerados e descartados:**
- **CHECK de `total >= 1` e `quantidade` de 1 a 99 no banco:** o motivo é o mesmo da 18A (só `prisma migrate dev`, sem SQL à mão). A regra fica no Zod e no service.
- **Endereço no pedido:** não entra (decisão 8 da Seção 7).

### 3.2. Respostas e erros

Rótulos no lugar dos enums:
- **status:** "Aguardando envio", "Enviado", "Concluído", "Cancelado";
- **canceladoPor:** "Comprador", "Vendedor".

```ts
// GET /pedidos/compras e GET /pedidos/vendas
PedidoResumo = {
  id, status, total, createdAt, enviadoEm, concluidoEm, canceladoEm,
  papel: "comprador" | "vendedor",
  primeiroItem: string, outrosItens: number, capaUrl: string | null,
  outraParte: AutorResumo | null,        // null: a conta foi excluída
}

// GET /pedidos/:id, POST /pedidos (lista), e as ações
PedidoDetalhe = PedidoResumo & {
  itens: { id, produtoId: string | null, nome, precoUnitario, quantidade, imagemUrl, digital }[],
  observacao: string | null,
  canceladoPor: "Comprador" | "Vendedor" | null,
  outraParteLocal: { cidade: string | null, bairro: string | null } | null, // nunca rua, número, CEP
  contatoDisponivel: boolean,             // status aberto && outra parte com telefone válido
}
```

- **Fora de toda resposta de pedido:** telefone, e-mail, CPF, CNPJ, rua, número, complemento, CEP, nascimento.
  - A outra parte sai com `AUTOR_RESUMO_SELECT`, mais `cidade` e `bairro` numa consulta separada.
  - O telefone, como na 18A, só é lido para montar o `contatoDisponivel` e o link.
- **`AppError` com `code` e `extra` opcionais:** o controller de pedido responde `{ error, code?, ...extra }`. Os outros controllers não mudam.
  - `409 { code: "PRECO_ALTERADO", produtoId, precoAtual }`
  - `409 { code: "ESGOTADO", produtoId, estoque }`
  - `409 { code: "INDISPONIVEL", produtoId }` (pausado ou removido)
  - `409 { code: "SALDO_INSUFICIENTE" }` ("Créditos insuficientes")
- **Deadlock ou conflito do Postgres:** `P2034`, ou `40P01` no `meta`. Não deve acontecer com a ordem de travas da Seção 3.4. Se acontecer, vira `409 { code: "CONFLITO" }` "Tente de novo", e não 500. Nenhum teste esconde isso: a corrida conta como sucesso só com 201/200 e 409 com o código esperado.

### 3.3. Créditos (item a)

O `credito.service` continua sendo o **único** a escrever em `User.credits`, e o `check:creditos` continua valendo.

- **`movimentar(tx, userId, tipo, valor, ref)`:** `ref` passa a ser `{ servicoId } | { pedidoId } | null`. O débito continua condicional (`updateMany` com `credits >= valor`); sem saldo, dá `409 SALDO_INSUFICIENTE`, e a transação de quem chamou volta inteira.
- **Funções novas, que recebem o `tx` do pedido:**
  - **`reservarPedido(tx, pedidoId, compradorId, total)`:** `RESERVA -total`.
  - **`pagarPedido(tx, pedido)`:**
    - o valor é o **`pedido.total`** (ajuste 2). Antes de pagar, confere que existe **exatamente uma** `RESERVA` do pedido e que ela vale `-pedido.total`. Se não existir ou divergir, lança um erro interno: a transação volta inteira, a resposta é 500 com log, e nenhum crédito se move;
    - credita `RECEBIMENTO +total` ao vendedor;
    - com taxa maior que 0, `TAXA -taxa` no vendedor e `TAXA_RECEBIDA +taxa` na plataforma, com a mesma `calcularTaxa` da 17C, **sobre o total do pedido**;
    - sem a conta da plataforma, falha e volta inteira, como nos serviços.
  - **`estornarPedido(tx, pedido)`:** `ESTORNO +pedido.total` ao comprador, sem taxa, com a mesma conferência da `RESERVA` (ajuste 2). **Só é chamada quando o comprador existe.** Com `compradorId` nulo (conta excluída, Seção 3.7), a reserva saiu com a conta e não há o que estornar; o cancelamento devolve só o estoque.
- **`reservar`, `pagar` e `estornar` dos serviços não mudam de comportamento.** Só passam o `ref` no formato novo.
- **Extrato:** com `pedidoId` e o pedido existindo, mostra "Pedido: <primeiro item> (+N)". Se o pedido sumiu, mostra "Pedido removido", como no serviço.

### 3.4. Ordem das operações e travas (itens a e b)

**Regra global, para não haver deadlock.** Toda transação que mexe em mais de uma linha trava nesta ordem:

1. a linha do `PedidoProduto` (quando ela já existe);
2. as linhas de `Produto`, **em ordem crescente de id**;
3. as linhas de `User`, sempre o comprador ou o vendedor **antes** da conta da plataforma, que é sempre a última.

Com duas transações sempre na mesma ordem, uma espera a outra, e nunca as duas esperam uma pela outra. Os caminhos de serviço da 17C já seguem a mesma regra (o `Servico`, depois o colaborador, depois a plataforma), e nenhum deles trava `Produto`.

**Checkout (`POST /pedidos`, Seção 5.3), uma transação:**
1. **Antes da transação:**
   - Zod: de 1 a 20 itens, sem `produtoId` repetido, `quantidade` inteira de 1 a 99, `precoEsperado` inteiro maior ou igual a 1, `observacao` de até 300;
   - perfil completo (403);
   - conta existente (401).
2. **`paraCheckout(tx, ids)`** lê os produtos, sem travar. Produto inexistente ou `REMOVIDO` dá `INDISPONIVEL`; `PAUSADO` também; produto do próprio comprador dá 403 "Você não pode comprar o seu próprio produto".
3. **Para cada item, em ordem crescente de `produtoId`:** `produtoRepository.baixarEstoque` faz `updateMany where { id, status: ATIVO, estoque >= quantidade, preco: precoEsperado }` com `estoque decrement`. Se `count` for 0, uma releitura diz por quê: preço diferente dá `PRECO_ALTERADO`, estoque baixo dá `ESGOTADO` e status diferente dá `INDISPONIVEL`. **Tudo volta.**
   - Colocar o preço e o status **na condição** fecha a corrida em que o vendedor edita o preço ou pausa entre a leitura (passo 2) e a escrita.
4. **Agrupa por vendedor**, em ordem de `vendedorId`, e cria um `PedidoProduto` por vendedor, com os itens em snapshot (`nome`, `precoUnitario`, `imagemUrl` da capa e `digital`). O total de cada pedido é a soma de `precoUnitario × quantidade`.
5. **Para cada pedido:** `creditoService.reservarPedido`. São débitos seguidos na mesma linha do comprador. Se o saldo não cobrir **todos**, o débito que falhar dá 409, e **tudo volta**: o estoque, os pedidos e as reservas anteriores.
6. **Resposta:** 201 `{ pedidos: PedidoDetalhe[] }`.

**Enviar (`POST /pedidos/:id/enviar`):** `updateMany where { id, vendedorId: eu, status: AGUARDANDO_ENVIO }` grava `ENVIADO` e `enviadoEm`. Se `count` for 0, a releitura dá 404, 403 ou 409.

**Confirmar recebimento (`POST /pedidos/:id/confirmar-recebimento`), uma transação:**
1. `updateMany where { id, compradorId: eu, status: ENVIADO, vendedorId: { not: null } }` grava `CONCLUIDO` e `concluidoEm`. Isso trava o pedido. Se `count` for 0, dá 404, 403 ou 409 (ver D5 para o vendedor nulo).
2. `creditoService.pagarPedido`: o vendedor, e depois a plataforma.

**Cancelar (`POST /pedidos/:id/cancelar`), uma transação:**
1. `updateMany` grava `CANCELADO`, `canceladoPor` e `canceladoEm`, e trava o pedido. A condição (ajuste 1, com a exceção do D5):
   ```
   where: { id, OR: [
     { compradorId: eu, status: AGUARDANDO_ENVIO },                  // comprador antes do envio
     { compradorId: eu, status: ENVIADO, vendedorId: null },         // D5: o vendedor excluiu a conta
     { vendedorId: eu, status: { in: [AGUARDANDO_ENVIO, ENVIADO] } }, // vendedor antes ou depois do envio
   ] }
   ```
   Se `count` for 0, a releitura dá 404, 403 ou 409.
2. Para cada item com `produtoId` não nulo, em ordem crescente: `produtoRepository.devolverEstoque` com `increment`. Vale mesmo para produto `PAUSADO` ou `REMOVIDO`: o estoque volta, e o produto continua fora da loja.
3. `creditoService.estornarPedido` devolve `pedido.total` ao comprador, conferindo a `RESERVA`. Sem comprador (conta excluída), não é chamada (Seção 3.7).

**Por que as corridas terminam em um sucesso e um 409 (item e):**

| Corrida | Onde se resolve |
|---|---|
| Dois compradores na última unidade | O `updateMany` do estoque trava a linha do produto. O segundo espera, relê `estoque = 0` na condição, `count` dá 0 e ele recebe 409 `ESGOTADO`. O estoque nunca fica negativo. |
| Dois checkouts com saldo para um | O débito condicional na linha do comprador. O segundo espera o primeiro, vê o saldo já debitado e recebe 409 `SALDO_INSUFICIENTE`. A transação dele volta inteira, **inclusive a baixa do estoque**. |
| Confirmar x cancelar | Os dois são `updateMany` com condição no **mesmo** pedido. O segundo espera, a condição de status já não vale, `count` dá 0 e ele recebe 409. Nunca paga e estorna o mesmo pedido. |
| Confirmar duas vezes | O mesmo: a segunda vê `CONCLUIDO` e recebe 409, sem pagar duas vezes. |

### 3.5. Endpoints (todos com `authenticate`)

| Rota | Regra | Erros |
|---|---|---|
| `POST /pedidos` | Checkout (3.4). Qualquer perfil completo compra, Cliente inclusive. | 400, 401, 403 (perfil incompleto, próprio produto), 409 (`PRECO_ALTERADO`, `ESGOTADO`, `INDISPONIVEL`, `SALDO_INSUFICIENTE`) |
| `GET /pedidos/compras` | Só os meus como comprador. `createdAt desc, id desc`; `limit` de 1 a 50 (padrão 20) e `cursor`. `{ pedidos, nextCursor }`. Antes de `/:id`. | 400, 401 |
| `GET /pedidos/vendas` | O mesmo, como vendedor. | 400, 401 |
| `GET /pedidos/:id` | Só as partes. Id que não é UUID ou que não existe dá 404; quem não é parte recebe 403. | 401, 403, 404 |
| `POST /pedidos/:id/enviar` | Vendedor, de `AGUARDANDO_ENVIO` para `ENVIADO`. | 401, 403, 404, 409 |
| `POST /pedidos/:id/confirmar-recebimento` | Comprador, de `ENVIADO` para `CONCLUIDO`, com o pagamento. | 401, 403, 404, 409 |
| `POST /pedidos/:id/cancelar` | Comprador só em `AGUARDANDO_ENVIO`; vendedor em `AGUARDANDO_ENVIO` ou `ENVIADO`. Estorna e devolve o estoque. | 401, 403, 404, 409 |
| `GET /pedidos/:id/contato` | Link `wa.me` **da outra parte**, só para as partes e só em `AGUARDANDO_ENVIO` ou `ENVIADO`. Pedido encerrado dá 409 "O pedido já foi encerrado". Outra parte sem telefone válido, ou sem conta, dá 404 "A outra parte não tem telefone cadastrado". | 401, 403, 404, 409 |

- **Ações fora da tabela da Seção 5.4 dão 409.** Por exemplo: enviar duas vezes, confirmar em `AGUARDANDO_ENVIO`, ou o comprador cancelar em `ENVIADO`.
- **Mensagem do contato:**
  - do comprador para o vendedor: "Olá, comprei <primeiro item> no SkillHub e quero combinar a entrega.";
  - do vendedor para o comprador: "Olá, vendi <primeiro item> para você no SkillHub e quero combinar a entrega.".
  - O `whatsappAtivo` do produto **não** vale aqui (D4).

### 3.6. Taxa (item d)

- **`PLATFORM_FEE_PERCENT`** com padrão 0, calculada **sobre o total do pedido**, arredondada para baixo, com a mesma `calcularTaxa`. Com taxa 0, não há linha de `TAXA` nem de `TAXA_RECEBIDA`, e o e2e confere isso.
- **Teste de 15%:** o `scripts/verificar-taxa.ts` ganha os casos de pedido. Ele roda no container com `PLATFORM_FEE_PERCENT=15` e a conta da plataforma de teste **só naquele processo**, chamado pelo e2e como hoje (D9). Casos:
  1. pedido de 99: `RESERVA -99`, `RECEBIMENTO +99`, `TAXA -14` e `TAXA_RECEBIDA +14`. Saldos: vendedor com 85, plataforma com 14;
  2. dois vendedores num carrinho: duas reservas, e cada confirmação paga a taxa do seu pedido;
  3. cancelamento: estorno inteiro, sem linha de taxa;
  4. **conservação:** a soma dos saldos (com a plataforma) mais as **reservas em aberto** não muda em nenhum passo. Reserva em aberto é a `RESERVA` de pedido `AGUARDANDO_ENVIO` ou `ENVIADO`, somada à de serviço `EM_ANDAMENTO`, que já existe;
  5. extrato x saldo bate para o comprador, os vendedores e a plataforma;
  6. sem a conta da plataforma, o confirmar falha e nada muda.

### 3.7. Histórico, remoção de produto e exclusão de conta (item c)

**Confirmado no schema da Seção 3.1:** `ItemPedido.produtoId` é `SetNull`, e `PedidoProduto.compradorId` e `vendedorId` são `SetNull`. O que acontece em cada caso:

| Situação | Pedidos já criados |
|---|---|
| **Produto removido** (`REMOVIDO`, exclusão lógica) | A linha do produto continua; o `produtoId` do item continua apontando para ela. O pedido segue o ciclo normal. Cancelar devolve o estoque a um produto que continua fora da loja (inofensivo). A capa do snapshot deixa de abrir porque a 18A apaga as fotos (D7). |
| **Vendedor exclui a conta** | Os produtos dele caem em cascata, e `ItemPedido.produtoId` vira `null` (o snapshot fica). `PedidoProduto.vendedorId` vira `null`. O comprador vê "Usuário removido". Pedidos concluídos e cancelados ficam inteiros. |
| **Comprador exclui a conta** | `PedidoProduto.compradorId` vira `null`. O extrato dele **some** (`TransacaoCredito.user` é `Cascade`), e a `RESERVA` vai junto. Os créditos eram dele e saem com a conta. Pedidos concluídos ficam, com `total` e `concluidoEm`, e continuam contando para volume e renda. |

**O que acontece hoje com pedido em aberto (sem o bloqueio, que é da 18C):**
- **Comprador sai com pedido em `AGUARDANDO_ENVIO` ou `ENVIADO`:**
  - o vendedor ainda pode enviar;
  - ninguém pode confirmar (não há comprador), então o vendedor nunca recebe;
  - o vendedor pode cancelar, o que devolve o estoque, e o estorno não acontece (não há conta nem reserva).
  - **Nada quebra:** `estornarPedido` sem reserva não faz nada, como o `estornar` de hoje.
- **Vendedor sai com pedido em `AGUARDANDO_ENVIO`:** o comprador pode cancelar, e o estorno volta inteiro. O estoque não volta, porque o produto não existe mais.
- **Vendedor sai com pedido em `ENVIADO`:** pela tabela da Seção 5.4, o comprador não pode cancelar, e confirmar não tem a quem pagar. **A reserva ficaria presa para sempre.** Ver D5.
- **A 18C fecha isso** com o 409 na exclusão de conta. A 18B só garante que nenhum desses casos dá 500 nem perde crédito de quem continua na plataforma. O e2e cobre os três casos (itens 51 a 53).

### 3.8. `npm run pedidos:pendentes` (item h)

`scripts/pedidos-pendentes.ts`, **só leitura.** Lista os pedidos `ENVIADO` com `enviadoEm` há mais de 7 dias (ou `--dias N`), do mais antigo para o mais novo. Mostra:
- o id do pedido, `enviadoEm` e quantos dias faz;
- o total e o primeiro item (+N);
- os ids do comprador e do vendedor.

Nenhum e-mail nem telefone. Sem pedidos, imprime "Nenhum pedido enviado há mais de 7 dias." A "confirmação automática" vai para o changelog como proposta de fase futura.

## 4. Frontend

Nenhuma linguagem visual nova. Tudo sai de `ProfileDialog`, `DialogField`, `CtaButton`, `ContentCard`, `ScrollRow`, `SectionHeader`, `Avatar` e dos padrões do `servico-detalhe-dialog` (linha do tempo, `<dl>`, ações por papel), do `extrato-dialog` e do `ProdutoCard`. As cores vêm só de tokens. Os ícones novos são Lucide: `ShoppingCart`, `Plus`, `Minus`, `Trash2`, `PackageCheck`, `Truck` e `MessageCircle`. Sem emojis. As transições respeitam `prefers-reduced-motion`, como o resto do app.

### 4.1. `/produtos`

```
Produtos                     [carrinho 3]  [+ Publicar]   ← o carrinho aparece para todos; Publicar só para quem vende
chips / busca                                             ← como hoje
Destaques
Suas compras                       →                      ← só se houver ao menos 1 (D10)
  [pedido][pedido] →
Suas vendas                        →                      ← só Colaborador/Empresa e se houver ao menos 1
  [pedido] →
Seus produtos …                                           ← como na 18A
Arte e Decoração …
```

**`PedidoCard`:** as mesmas medidas do `ProdutoCard`. Mostra:
- a capa do primeiro item;
- "Pintura feita à mão (+1)";
- "90 créditos";
- uma linha com o status em `text-accent-text` e "Ver detalhes".

Sem capa, ou com a imagem quebrada: o fundo `bg-surface-2` e o ícone de sacola (D7). O clique abre o detalhe.

### 4.2. Detalhe do produto (acréscimo)

```
Preço        Estoque
90 créditos  3 disponíveis
Quantidade   [ - ] 1 [ + ]                ← de 1 até o estoque (no máximo 99)
[ Adicionar ao carrinho ]  [ Comprar agora ]
[ Falar com o vendedor ]                  ← como na 18A
```

- **Esgotado:** os dois botões ficam desabilitados, com "Esgotado".
- **Dono:** nada de compra (Editar, Pausar e Remover, como na 18A).
- **Adicionar:** soma ao que já está no carrinho, até o estoque. Mostra um toast "Adicionado ao carrinho", com a ação "Ver carrinho".
- **Comprar agora:** abre o checkout só com aquele item e não mexe no carrinho (D11).

### 4.3. Carrinho (`CarrinhoDialog`, casca `ProfileDialog`)

```
Carrinho                                    ×
3 itens de 2 vendedores
── Ana Ribeiro ──────────────────────────────
[▪] Pintura feita à mão     [-] 1 [+]  [lixeira]
    90 créditos
[▪] Casa de palito          Indisponível [lixeira]  ← esgotado, pausado ou removido: fora do total
Subtotal                         90 créditos
── Ateliê Costa ─────────────────────────────
[▪] Terço personalizado     [-] 2 [+]  [lixeira]
Subtotal                        100 créditos
─────────────────────────────────────────────
Total                           190 créditos
                         Continuar comprando  [ Finalizar compra ]
```

- **Dados atuais:** o carrinho guarda só `produtoId` e `quantidade`. Ao abrir, ele busca cada produto com `GET /produtos/:id`, com SWR e no máximo 20 itens (D12).
  - Um 404 (pausado, removido ou inexistente) ou `estoque = 0` aparece como "Indisponível", fora do total.
  - Quantidade acima do estoque atual é reduzida na tela, com o aviso "Só há N disponíveis".
- **Vazio:** "Seu carrinho está vazio." e "Ver produtos".
- **Finalizar compra:** fica desabilitado sem item disponível. Leva ao checkout com os itens disponíveis.

### 4.4. Checkout (`CheckoutDialog`)

```
Finalizar compra                            ×
Os créditos ficam reservados até você confirmar o recebimento.
Ana Ribeiro · 1 item             90 créditos
Ateliê Costa · 2 itens          100 créditos
Total                           190 créditos
Seu saldo                       250 créditos
Observação (opcional)   [_____________________]   ← até 300, com contador
"O vendedor poderá falar com você pelo WhatsApp para combinar a entrega."
                              Voltar  [ Reservar 190 créditos ]
```

- **Saldo insuficiente**, conferido antes e também quando o servidor devolve 409 `SALDO_INSUFICIENTE`: o botão some, e aparece "Faltam N créditos." com "Ver extrato" (abre o `ExtratoDialog`).
- **`PRECO_ALTERADO` ou `ESGOTADO`:** a mensagem cita o produto ("O preço de Pintura feita à mão mudou para 95 créditos."). O carrinho é relido, e a pessoa volta para conferir. Nada é cobrado.
- **Sucesso:**
  - toast "Pedido feito" (ou "2 pedidos feitos", um por vendedor);
  - os itens comprados saem do carrinho;
  - o saldo é relido (`atualizarUsuario()`), e "Suas compras" é revalidada.

### 4.5. Detalhe do pedido (`PedidoDetalheDialog`)

```
Pedido de Pintura feita à mão (+1)           ×
Compra · Aguardando envio                       ← description: papel e status
● Pedido feito       09/11, 14:02               ← linha do tempo (o mesmo padrão do detalhe de serviço)
○ Enviado            —                          ← "Entregue" quando todos os itens são digitais
○ Recebido           —
(cancelado: ● Cancelado pelo vendedor 10/11, 09:15)
Itens
[▪] Pintura feita à mão   1 × 90 créditos
[▪] Moldura               1 × 30 créditos
Total                    120 créditos
Vendedor                                        ← "Comprador" quando quem abre é o vendedor
(◉) Ana Ribeiro · São Paulo, Centro             ← só cidade e bairro; conta excluída: "Usuário removido"
Observação: "Pode deixar na portaria."
[ Falar com o vendedor ]                        ← só em Aguardando envio e Enviado, com contato disponível
── ações do papel ──
comprador, Aguardando envio: [Cancelar pedido]
comprador, Enviado:          [Confirmar recebimento]   ← com confirmação: "Os 120 créditos vão para o vendedor."
vendedor, Aguardando envio:  [Cancelar pedido] [Marcar como enviado | Marcar como entregue]
vendedor, Enviado:           [Cancelar pedido]
```

- **Cancelar** pede confirmação ("Cancelar este pedido? Os créditos voltam para o comprador e o estoque é devolvido.").
- **Depois de cada ação:**
  - o saldo é relido;
  - as chaves de compras, vendas, "Seus produtos" e linhas de produtos são revalidadas (o estoque mudou);
  - o extrato é relido.

### 4.6. Carrinho no cliente (item g)

- **`useCarrinho`:** Zustand com `persist`.
  - O estado é `{ donoId, itens: { produtoId, quantidade, vendedorId, nome, preco, capaUrl }[] }`. Os campos extras são só para mostrar algo antes de a releitura chegar.
  - O `storage` é um adaptador próprio com `try/catch` em `getItem`, `setItem` e `removeItem`, sobre o `createJSONStorage`. Com o `localStorage` bloqueado, cheio ou em modo privado, o carrinho funciona na memória, só não é lembrado. Mesma ideia do `lib/tema.ts`.
  - Chave `skillhub-carrinho`.
- **Por conta:** se o usuário logado não for o `donoId`, o carrinho começa vazio. Duas contas no mesmo navegador não dividem carrinho, e nada da compra de um fica visível para o outro.
- **Agrupamento por vendedor e total:** calculados com os dados relidos da API, nunca com o preço guardado.

## 5. Testes e2e (seção `15j`, cobre a Seção 5.7 inteira e os itens a a i)

As contas são criadas pela API, com créditos pelo `creditos:conceder`, como na 15g:
- `e2e.pedidos.comprador` (Cliente);
- `e2e.pedidos.comprador2` (Colaborador);
- `e2e.pedidos.vendedor` (Colaborador);
- `e2e.pedidos.empresa` (Empresa);
- `e2e.pedidos.incompleto` (OAuth sem perfil).

Os produtos são publicados pela API com 1 foto (PNG 1×1), como na 15i. "Extrato bate" quer dizer a soma das linhas e o último `saldoApos` iguais a `User.credits`.

**Compra**
1. Compra simples: 201. O estoque cai na quantidade. A `RESERVA -total` vem com `pedidoId`, e o `saldoApos` está certo. O pedido fica `AGUARDANDO_ENVIO`, com os itens em snapshot (nome, preço, capa, digital).
2. Carrinho com 2 vendedores: dois pedidos, duas reservas, e os dois `createdAt` da mesma transação (o mesmo `xmin` no SQL, ou criados juntos).
3. Atomicidade: um item esgotado entre três dá 409 `ESGOTADO` apontando o produto. Nenhum pedido é criado, nenhuma reserva sai, e os estoques ficam como estavam.
4. Atomicidade por saldo: um carrinho de 2 vendedores em que o saldo cobre só o primeiro pedido dá 409, sem nenhum pedido, reserva nem baixa de estoque.
5. `PRECO_ALTERADO`: o vendedor muda o preço e o `precoEsperado` antigo dá 409, com `precoAtual`. Nada muda.
6. Produto pausado e produto removido: 409 `INDISPONIVEL`.
7. Comprar o próprio produto: 403.
8. Cliente compra: 201. Perfil incompleto: 403. Sem token: 401.
9. Validação (400): quantidade 0, 100 e 1.5; observação com 301 caracteres; 0 itens; 21 itens; `produtoId` repetido; `precoEsperado` ausente.

**Corridas (item e)**

10. Dois compradores na última unidade, ao mesmo tempo: um 201 e um 409 `ESGOTADO`. Estoque 0, nunca negativo. Só o vencedor teve reserva.
11. Dois checkouts simultâneos, com saldo para um: um 201 e um 409 `SALDO_INSUFICIENTE`. O saldo nunca fica negativo, e o estoque só caiu uma vez.
12. Confirmar x cancelar (vendedor) em `ENVIADO`, ao mesmo tempo: um 200 e um 409. Saldos e estoque batem com o vencedor (pago **ou** estornado, nunca os dois), e o extrato bate.
13. Confirmar duas vezes ao mesmo tempo: um 200 e um 409. Um só `RECEBIMENTO`.

Cada corrida repete 5 vezes por rodada, e as 5 precisam sair um sucesso e um 409.

**Ciclo**

14. Enviar (vendedor): `ENVIADO`, com `enviadoEm` gravado e conferido no banco.
15. Confirmar (comprador): `CONCLUIDO`, `concluidoEm` gravado, `RECEBIMENTO +total` no vendedor, e **nenhuma** linha de `TAXA` nem de `TAXA_RECEBIDA` com taxa 0. O extrato bate para os dois.
16. Transições inválidas dão 409: enviar duas vezes, confirmar em `AGUARDANDO_ENVIO`, enviar um pedido cancelado, cancelar um concluído.
17. Papel errado dá 403: o comprador tenta enviar, o vendedor tenta confirmar.
18. Pedido digital: o enviar funciona igual, e o detalhe tem `digital: true` nos itens.

**Cancelamentos**

19. Comprador antes do envio: `CANCELADO`, `canceladoPor` "Comprador", `canceladoEm` gravado; estorno inteiro e estoque devolvido, conferidos no banco.
20. Vendedor antes do envio: o mesmo, com "Vendedor".
21. Vendedor depois do envio: estorno e estoque devolvido.
22. Comprador depois do envio: 409, e nada muda.
23. Cancelar pedido de produto já removido: estorno, e o estoque volta à linha do produto (que continua `REMOVIDO`, fora da loja).

**Consultas e privacidade (item f)**

24. `GET /pedidos/compras` e `/vendas`: só os do usuário, mais recentes primeiro, com cursor (`limit=1` duas vezes devolve itens distintos, e `nextCursor` nulo no fim). `limit=51` dá 400.
25. `GET /pedidos/:id`: 200 para as duas partes; 403 para um terceiro; 404 para id inexistente e para `nao-e-uuid`.
26. `GET /pedidos/:id` traz a `cidade` e o `bairro` da outra parte, e **não** traz rua, número, complemento nem CEP (conferidos pelos valores gravados no cadastro).
27. Contato: o comprador recebe o link do vendedor e o vendedor recebe o do comprador, no formato `https://wa.me/55…?text=` com o primeiro item na mensagem. Funciona em `AGUARDANDO_ENVIO` e `ENVIADO`; em `CONCLUIDO` e `CANCELADO` dá 409; para um terceiro dá 403; sem token dá 401; com a outra parte sem telefone (SQL) dá 404.
28. **Varredura:** o telefone das duas partes (só dígitos e com máscara), o e-mail delas, a rua e o CEP não aparecem no texto de **nenhuma** resposta de `POST /pedidos`, `/compras`, `/vendas`, `/:id`, `/enviar`, `/confirmar-recebimento`, `/cancelar` e `GET /creditos/extrato`. O telefone só aparece em `/pedidos/:id/contato`.

**Créditos e taxa (itens a e d)**

29. O extrato do comprador mostra "Reserva" com `pedido.rotulo` "Pedido: <primeiro item> (+1)". O do vendedor mostra "Recebimento" com o mesmo rótulo.
30. Extrato x saldo continua batendo para todos os usuários de teste no fim da seção, inclusive os dos serviços.
31. `check:creditos` passa (rodado no fim, como os outros validadores).
32. Os 6 casos do `verificar-taxa.ts` com pedido (Seção 3.6), incluindo a **conservação de saldos mais reservas em aberto** em cada passo.

**Script (item h)**

33. `npm run pedidos:pendentes`: com um pedido `ENVIADO` e `enviadoEm` recuado 8 dias por SQL, ele aparece na lista; um enviado há 2 dias não aparece. A saída não tem e-mail nem telefone. A contagem de linhas no banco é a mesma antes e depois (só leitura).

**Histórico (item c)**

34. Remover (lógico) um produto com pedido em aberto: o pedido continua legível, com o snapshot, e o ciclo segue até `CONCLUIDO`.
35. Vendedor de um pedido concluído exclui a conta: o pedido continua para o comprador, com `outraParte: null` ("Usuário removido") e `produtoId: null` nos itens, e o `total` e o `concluidoEm` ficam.
36. Comprador de um pedido concluído exclui a conta: o pedido continua para o vendedor, e a renda (`total` de `CONCLUIDO`) continua somando para ele no SQL.

**Telas (Cliente a 440px; uma parte também a 1440px)**

37. Detalhe do produto: escolhe a quantidade (o "+" para no estoque), "Adicionar ao carrinho", e o ícone do carrinho mostra a contagem.
38. Carrinho com 2 vendedores: os grupos, os subtotais e o total. Com um item pausado pela API depois de adicionar, ele aparece "Indisponível" e fica fora do total.
39. Recarregar a página mantém o carrinho. Com o `localStorage` bloqueado (`addInitScript` que faz o `setItem` lançar), o carrinho funciona na sessão e a página não quebra.
40. Outra conta no mesmo navegador começa com o carrinho vazio.
41. Checkout: total, saldo, aviso de reserva e WhatsApp, observação, "Reservar N créditos". Depois: o toast, os itens fora do carrinho, o saldo do chip menor e "Suas compras" com os pedidos.
42. Saldo insuficiente: aparece "Faltam N créditos", e "Ver extrato" abre o extrato.
43. `PRECO_ALTERADO` pela tela: a mensagem cita o produto e o carrinho é relido.
44. Vendedor (outro contexto): "Suas vendas" com o pedido. O detalhe mostra o comprador com cidade e bairro. "Marcar como enviado" muda o status.
45. Comprador: "Confirmar recebimento", com confirmação. O status vira "Concluído", e o saldo do vendedor sobe (conferido pela API).
46. Cancelamento pela tela, pelo vendedor: a confirmação, "Cancelado pelo vendedor" na linha do tempo, e o saldo do comprador volta.
47. "Falar com o vendedor" no detalhe do pedido abre `https://wa.me/55…` (a navegação para fora é interceptada, como na 15i).
48. Comprar agora: abre o checkout só com o item, e o carrinho não muda.
49. Estados de "Suas compras": carregando (resposta atrasada) e erro (resposta 500, com "Tentar de novo").
50. Console sem erros nem avisos em `/produtos`, no carrinho, no checkout e no detalhe do pedido (o mesmo critério da 15a2).

**Exclusão de conta hoje (o comportamento atual, sem o bloqueio da 18C)**

51. Comprador com pedido `ENVIADO` exclui a conta: o vendedor ainda vê o pedido, confirmar não é possível para ninguém, e o cancelar do vendedor devolve o estoque, sem 500.
52. Vendedor com pedido `AGUARDANDO_ENVIO` exclui a conta: o comprador cancela, e o estorno volta inteiro.
53. Vendedor com pedido `ENVIADO` exclui a conta (D5, ajuste 1): o comprador cancela, recebe 200 com `canceladoPor` "Comprador", e o estorno de `pedido.total` volta inteiro; o confirmar dá 409 "O vendedor excluiu a conta". Com o vendedor ainda na conta, o mesmo cancelamento pelo comprador em `ENVIADO` continua dando 409 (item 22).

**Conferência da reserva (ajuste 2)**

54. Com a `RESERVA` do pedido apagada por SQL, confirmar dá 500, e nada muda: o pedido continua `ENVIADO`, sem `RECEBIMENTO`, e o saldo do vendedor fica igual.
55. Com a `RESERVA` alterada por SQL para um valor diferente de `-total`, cancelar dá 500, e nada muda (sem `ESTORNO`, estoque igual).

**Estoque editado x venda (D6)**

56. PATCH com `estoque` e sem `estoqueLido`: 400. PATCH só com outros campos (sem `estoque`): continua 200, sem exigir `estoqueLido`.
57. PATCH com `estoque` e o `estoqueLido` certo: 200.
58. Venda entre a leitura e o PATCH: o `estoqueLido` antigo dá 409 "O estoque mudou (houve uma venda). Confira e salve de novo.", e o estoque fica o da venda.
59. Tela: editar o nome sem mexer no estoque manda o PATCH **sem** `estoque` e `estoqueLido` (corpo interceptado com `page.route`); mudar o estoque manda os dois.

O total esperado é por volta de 276 + 66. Relato o número exato antes e depois, nas 5 rodadas.

## 6. Verificação visual

O mesmo método da 18A:
- as capturas da base são feitas com o frontend de `1948361` (os arquivos da 18B tirados de lado e restaurados depois, conferidos por hash), contra o mesmo backend e o mesmo banco;
- usuário Colaborador com 0 crédito, mouse fora da página, "menos movimento" ligado;
- duas capturas de cada lado, para separar ruído de diferença real.

**Idênticas byte a byte**, a 375 e 1440px, nos dois temas:
- `/servicos`
- `/perfil`
- `/configuracoes`
- `/comunidade`
- `/login`
- `/cadastro`
- `/inicio` (a seção de Produtos não muda na 18B)
- o detalhe de um pedido de serviço aberto
- o popover de créditos (só abaixo de `lg`, onde o chip existe)
- o extrato vazio

O ruído já conhecido da animação das telas de entrada (faixa y 125 a 179) é medido e relatado como na 18A.

**Com diferença prevista** (listadas no changelog):
- `/produtos`: o botão do carrinho no título e, para quem tem pedidos, "Suas compras" e "Suas vendas";
- o detalhe do produto: quantidade, "Adicionar ao carrinho" e "Comprar agora".

**Telas novas** para a sua conferência visual, a 375 e 1440px, nos dois temas:
- o carrinho (cheio, com indisponível, e vazio);
- o checkout (normal e saldo insuficiente);
- "Suas compras" e "Suas vendas";
- o detalhe do pedido em cada status e papel;
- as confirmações de cancelar e de confirmar recebimento;
- o extrato com linha de pedido.

## 7. Validadores

No fim, rodo e relato:
- `prisma migrate status`;
- `tsc --noEmit` no backend e no frontend;
- `eslint`;
- `next build`;
- `check:cores`, `check:contrast` e `check:creditos`;
- `./e2e/run.sh` **5 vezes seguidas**, com o total antes e depois.

## 8. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Deadlock entre transações que travam pedido, produto e usuário. | Ordem global de travas (3.4), e as corridas do e2e repetidas 5 vezes por rodada. Se ainda assim acontecer, vira `409 CONFLITO`, e não 500 (3.2). |
| R2 | O vendedor salva o estoque pelo PATCH (valor absoluto) logo depois de uma venda, e a baixa se perde (vende o que não tem). | D6: o PATCH com estoque exige o `estoqueLido`; se mudou, dá 409 "O estoque mudou (houve uma venda). Confira e salve de novo." |
| R3 | Reserva presa: o comprador nunca confirma, ou o vendedor sai com pedido `ENVIADO`. | `pedidos:pendentes` (só listagem) e D5. A confirmação automática vai como proposta para uma fase futura. |
| R4 | A capa do snapshot quebra depois que o produto é removido (as fotos saem do Cloudinary na 18A). | D7: o card e o detalhe mostram o marcador quando a imagem falha. |
| R5 | O carrinho guardado mostra dados velhos (preço, estoque). | O carrinho só guarda o id e a quantidade para valer. Tudo é relido ao abrir, e o servidor confere o `precoEsperado` e o estoque. |
| R6 | O telefone do comprador passa a ser visível ao vendedor pelo link. | É o que o documento pede (5.5, "o combinado acontece por aí"). O checkout avisa antes, e o link só sai para as partes e só com o pedido em aberto. |
| R7 | O `keepAliveTimeout` de 65s (Etapa 0) atrás de um proxy com timeout maior volta a ter a corrida. | Anotado no changelog: o timeout do proxy precisa ser menor que o do Node. |
| R8 | A migration nova sai com dono `root`. | Como na 18A: não afeta o código, e aviso no PR. |
| R9 | O e2e fica mais longo (cerca de 60 verificações, corridas repetidas e a taxa). | Imagens 1×1, a mesma limpeza da 15i e o tempo de cada rodada relatado. |

## 9. Decisões (as da Seção 7 que afetam a 18B e as que surgiram no plano)

Da Seção 7 do documento, valem para a 18B: **1, 4, 7, 8 e 10**. A 2, a 3, a 5 e a 9 já foram resolvidas na 18A (e continuam valendo). A 6 é da 18C.

| # | Decisão | Recomendação |
|---|---|---|
| **D1** (Seção 7, nº 1) | Valor do crédito | **1 crédito = R$ 1 só para o indicador de renda, a levar ao professor**, como na 18A. A renda de produtos vem de `PedidoProduto.total` com `CONCLUIDO`. Nada no código converte valores. |
| **D2** (Seção 7, nº 4) | Confirmação automática | **Script só de listagem (7 dias) e proposta de fase futura** no changelog. |
| **D3** (Seção 7, nº 7) | Pedido por vendedor | **Um pedido por vendedor**, numa só transação de checkout. |
| **D4** (Seção 7, nº 8) | Endereço de entrega | **Combinar pelo WhatsApp, sem copiar endereço.** O detalhe mostra só cidade e bairro. O `whatsappAtivo` do produto não vale para o contato do pedido, porque depois da compra as duas partes precisam combinar a entrega. O checkout avisa disso. |
| **D15** (Seção 7, nº 10) | Devolução e disputa | **Fora desta fase.** Registrado como risco no changelog. |
| D5 | Vendedor exclui a conta com pedido `ENVIADO` (até a 18C chegar) | **Deixar o comprador cancelar nesse caso** (`vendedorId` nulo), com o estorno. É a única exceção à tabela da Seção 5.4, e evita crédito preso sem ninguém para receber. Confirmar, sem vendedor, dá 409 "O vendedor excluiu a conta". A alternativa é seguir a tabela à risca e deixar a reserva presa até a 18C. |
| D6 | Estoque editado pelo vendedor x venda simultânea | **O PATCH com `estoque` exige o `estoqueLido`** (condição no `updateMany`) e dá 409 se mudou. É uma mudança pequena no endpoint da 18A, dentro da Fase 18. A alternativa é aceitar o valor absoluto e registrar o risco. |
| D7 | Capa de pedido depois de remover o produto | **Marcador na tela quando a imagem falha** (o ícone de sacola, como o card sem capa). Não muda a regra da 18A de apagar as fotos. A alternativa é não apagar a capa enquanto houver pedido, o que muda a 18A e deixa fotos para sempre. |
| D8 | Desvios do schema (3.1) | **Aceitar os 5:** enum `ParteDoPedido`, `ItemPedido.digital`, e os índices `[status, enviadoEm]`, `ItemPedido.[produtoId]` e `TransacaoCredito.[pedidoId]`. |
| D9 | Onde fica o teste de 15% | **Estender o `scripts/verificar-taxa.ts`**, que roda num processo à parte com a taxa e a conta de teste e é chamado pelo e2e, como hoje. "Fora do repositório" só ficam as variáveis de ambiente daquele processo. |
| D10 | "Suas compras" e "Suas vendas" vazias | **Esconder quando vazias.** Diferente do "Seus produtos", não há o que convidar a fazer, e assim `/produtos` de quem nunca comprou não ganha uma seção vazia. |
| D11 | "Comprar agora" | **Checkout só com aquele item, sem mexer no carrinho.** |
| D12 | Dados do carrinho | **Reaproveitar `GET /produtos/:id` por item** (no máximo 20, com SWR), sem rota nova. Um 404 vira "Indisponível". A alternativa é uma rota nova `GET /produtos?ids=`. |
| D13 | Limites do checkout | **De 1 a 20 itens distintos por checkout, 1 a 99 de cada.** O documento dá só a quantidade (1 a 99). O teto de itens limita o tamanho da transação. |
| D14 | Correção do keep-alive (Etapa 0) | **Entra num commit próprio no início da branch, se a reprodução confirmar a causa.** Se não confirmar, nada muda no código, e o que foi descartado vai para o changelog. |

## 10. Fora desta subfase

- **18C:**
  - avaliações do pedido;
  - o 409 na exclusão de conta com pedido em aberto;
  - o `check:estoque`;
  - a limpeza final do mock e de `lib/mock/pessoas.ts`.
- **Seção 8 do documento:**
  - chat, notificações e e-mail de pedido;
  - frete, rastreio, cupom e promoção;
  - devolução, disputa e mediação;
  - qualquer pagamento que não seja em créditos;
  - recomendação;
  - mudar a taxa, a conta da plataforma ou as regras de Serviços.
- `SKILLHUB_DECISOES_SKILLMATCH_IMPACTSCORE.md` na raiz (não versionado, não tocado).

## 11. Ajustes da aprovação

1. **Exceção do D5 na condição do cancelamento** (Seção 3.4) e no item 53.
2. **`pagarPedido` e `estornarPedido` usam `pedido.total`** e abortam (erro interno, a transação volta inteira) se a `RESERVA` do pedido não existir ou não valer `-total` (Seção 3.3; itens 54 e 55). A exceção é o comprador com a conta excluída, em que o estorno não é chamado.
3. **D6 e a 15i:** nenhum teste existente da 15i manda `estoque` no PATCH. Conferi todas as chamadas: `patchP` e `chamarForm("PATCH", …)` nas linhas 1115 a 1187 de `e2e/fluxos.mjs` mandam só nome, preço, status, `whatsappAtivo`, `vendedorId` e `imagens`. Nenhuma precisa mudar. O `estoqueLido` só é exigido quando o corpo traz `estoque`. O `PublicarProdutoDialog`, na edição, manda `estoque` + `estoqueLido` **só quando o campo mudou** (itens 56 a 59). O formulário de publicar (POST) não muda.
4. **Etapa 0:** o changelog traz a taxa de falha das 300 repetições antes e depois da correção (Seção 1.3).

