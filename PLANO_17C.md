# Plano da subfase 17C: créditos (reserva, pagamento, estorno e extrato)

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Seções 17.0 e 17C, e as regras da Seção 1), `PLANO_17B.md` e `CHANGELOG_MIGRACAO.md` (Fase 17B).
> **Status: aprovado pelo João Gabriel em 16/10/2026** ("aprovado, pode seguir as recomendações"). Respostas: script administrativo `creditos:conceder`; pedido "a combinar" reserva o valor proposto; concluir sem colaborador dá 409 e o cancelamento estorna; extrato em diálogo (Configurações, chip e sidebar). A `feat/creditos` parte de `origin/main` em `31af23a`.

## 0. O que foi lido e medido

- **Documento:** Seção 17C e as regras da 17.0. As que pesam aqui: o saldo continua `Int`, a taxa vem de `PLATFORM_FEE_PERCENT` com padrão 0, e o módulo `auth` não é tocado (a pergunta 1 prevê uma exceção).
- **O que a 17B deixou:** a aceitação já roda numa única transação (`candidaturaRepository.aceitar`), e concluir e cancelar ficam no `servico.service`. A 17C entra exatamente nesses três pontos.
- **Nenhum código altera `User.credits` hoje.** Todo mundo nasce com 0 e o valor nunca muda, então o módulo novo é o único ponto de escrita desde o começo.
- **Frontend:** o usuário vem de `GET /auth/me` e fica no `useAuthStore` (`setUser`). O saldo da sidebar e do `CreditsChip` sai de lá.
- **Variáveis:** o backend lê `process.env` direto, e as regras proíbem alterar o `.env`. Então `PLATFORM_FEE_PERCENT` tem padrão 0 no código.
- **Base:** `main` está em `31af23a` (merge do PR #13). A branch `feat/creditos` sai de `origin/main`.

## 1. Backend

### 1.1. Modelo (migration nova `credito`, criada dentro do container)

- Enum `TipoTransacao` e model `TransacaoCredito`, exatamente os da Seção 17C. No `User`, só a relação inversa `transacoes`.
- **`servicoId` é uma coluna simples, sem relação.** O documento deixa escolher entre isso e `SetNull`:
  - com `SetNull`, quando um pedido some (o autor exclui a conta e os pedidos caem em cascata), o extrato **do colaborador** perderia a referência ao serviço que pagou;
  - com a coluna simples, a linha continua apontando para o id original.

  O extrato é histórico e não deve mudar depois de escrito.

### 1.2. Um único ponto que mexe no saldo

`src/modules/credito/credito.service.ts` exporta `movimentar(tx, { userId, tipo, valor, servicoId })`, que **só roda dentro de uma transação do Prisma**:

1. **Débito** (`valor < 0`): `updateMany` no usuário com a condição `credits >= -valor`, decrementando. Se nenhuma linha mudar, lança **409 "Créditos insuficientes"** e a transação inteira volta.
   **Crédito** (`valor > 0`): `update` incrementando.
   Nunca "ler, calcular e gravar".
2. Lê o saldo novo **na mesma transação** (a linha fica travada pelo `UPDATE` até o commit) e grava a `TransacaoCredito` com esse `saldoApos`.

Nenhum outro lugar do código altera `credits`. Para garantir isso, o `check:cores` ganha uma irmã, `npm run check:creditos` no backend: um `grep` que reprova qualquer escrita em `credits` fora do `credito.service.ts` e do schema.

### 1.3. Onde entra em cada fluxo

**Valor combinado:** o `valorProposto` da candidatura aceita ou, se ela não propôs valor, a `remuneracao` do pedido. Se os dois forem `null` ("a combinar" sem proposta), **não há movimentação** (pergunta 2).

| Fluxo | Onde | O que acontece |
|---|---|---|
| **Reserva** | `candidaturaRepository.aceitar` (transação da 17B) | Depois de travar o serviço como `EM_ANDAMENTO`, `movimentar(autor, RESERVA, -valor)`. Com saldo insuficiente, o 409 desfaz **toda** a aceitação: o serviço continua `ABERTO` e as candidaturas continuam como estavam. |
| **Pagamento** | `servico.service.concluir`, agora numa transação | O valor reservado é lido da linha `RESERVA` do serviço (fonte única; o `Servico` não ganha coluna nova). Com taxa: `taxa = floor(valor × % / 100)`. O colaborador recebe `RECEBIMENTO +valor` e, só se `taxa > 0`, `TAXA -taxa`. Assim, pagamento líquido + taxa = valor reservado, e a taxa aparece no extrato de quem pagou por ela. |
| **Estorno** | `servico.service.cancelar` (pedido `EM_ANDAMENTO`) | `movimentar(autor, ESTORNO, +valor reservado)`, na mesma transação que cancela. |
| **Sem remuneração** | todos | Sem linha `RESERVA`, nada acontece na conclusão nem no cancelamento. |

- **Arredondamento da taxa:** para baixo (`floor`), a favor de quem recebe. Valores inválidos de `PLATFORM_FEE_PERCENT` (não numéricos, negativos ou acima de 100) viram 0, com um aviso no log ao subir. A variável é lida a cada operação, então um teste local pode mudá-la sem rebuild.
- **Colaborador que excluiu a conta com o pedido em andamento:** não há para quem pagar. Ver pergunta 3.

### 1.4. Extrato

`GET /creditos/extrato?limit=&cursor=` (com token), mais recentes primeiro, com a mesma paginação por cursor da 17A. Cada item: `{ id, tipo, valor, saldoApos, createdAt, servico }`.
- `tipo` vai como rótulo: "Bônus", "Reserva", "Estorno", "Recebimento" e "Taxa da plataforma".
- `servico` é `{ id, titulo }` ou `null`. O título é buscado pelos `servicoId` da página; um pedido que já não existe aparece como `null`.

### 1.5. Arquivos

**Criar:**
- `src/modules/credito/` com `credito.schema.ts`, `credito.repository.ts`, `credito.service.ts` e `credito.controller.ts`;
- `src/configs/creditos.ts` (a leitura da taxa);
- `src/api/routes/credito.route.ts`;
- a migration `credito`;
- `scripts/conceder-creditos.ts` (pergunta 1);
- `scripts/check-creditos.mjs` (o `grep` da 1.2).

**Alterar:**
- `prisma/schema.prisma`;
- `src/modules/candidatura/candidatura.repository.ts` (reserva na transação de aceitar);
- `src/modules/servico/servico.service.ts` e `servico.repository.ts` (pagamento e estorno);
- `src/api/routes/index.ts`;
- `backend/package.json`, só os scripts `creditos:conceder` e `check:creditos`;
- `prisma/seed.ts`, para dar saldo aos usuários do seed pelo mesmo `movimentar`, como `BONUS`.

**Não tocar:**
- os módulos `auth` e `user`, se a pergunta 1 seguir a recomendação;
- o tipo da coluna `credits`;
- o `.env`.

## 2. Frontend

- **Saldo sempre atualizado:** um `atualizarUsuario()` em `lib/` faz `GET /auth/me` e chama `setUser`, o mesmo caminho que o `SessionProvider` já usa. Ele é chamado depois de aceitar, concluir e cancelar no detalhe do pedido. Não existe um segundo estado de saldo.
- **Detalhe do pedido (17B):**
  - perto do "Aceitar", o custo fica visível, por exemplo "Aceitar reserva 100 créditos do seu saldo";
  - com saldo insuficiente, o erro da API ("Créditos insuficientes") aparece no próprio diálogo, como os outros erros;
  - no pedido em andamento, o autor vê quanto está reservado.
- **Extrato (pergunta 4):** um diálogo "Extrato de créditos", na casca dos modais do Perfil. Ele abre:
  - pelo item **"Créditos e Pagamentos"** de Configurações, que hoje mostra "em breve";
  - pelo link **"Ver extrato"** no popover do `CreditsChip`;
  - pelo card de créditos da sidebar.

  O diálogo mostra uma lista com tipo, pedido, valor (verde para entrada, vermelho para saída, com sinal e texto, não só cor) e saldo depois; "Carregar mais" pelo cursor; e os estados de carregando, vazio ("Nenhuma movimentação ainda") e erro.
- **Arquivos:**
  - criar: `src/types/credito.ts`, `src/lib/creditos.ts` (extrato e `atualizarUsuario`) e `src/components/app/extrato-dialog.tsx`;
  - alterar: `servico-detalhe-dialog.tsx`, `credits-chip.tsx`, `sidebar.tsx` (o card de créditos abre o extrato) e `app/(app)/configuracoes/page.tsx` (o item deixa o "em breve").

## 3. Testes

**e2e** (`fluxos.mjs`, seção nova 15g). Os créditos de teste são dados pelo próprio script de concessão, chamado pelo `docker compose exec`, como o e2e já faz com o banco.
- **Reserva:** aceitar debita do autor o valor proposto (ou a remuneração), e a linha `RESERVA` tem `saldoApos` igual ao `User.credits`.
- **Saldo insuficiente:** dá 409, a aceitação não acontece (pedido `ABERTO`, candidatura `PENDENTE`) e o saldo não muda.
- **Pagamento:** concluir credita o colaborador, sem linha `TAXA` (taxa 0).
- **Estorno:** cancelar em andamento devolve a reserva ao autor.
- **"A combinar" sem proposta:** não move créditos em nenhum fluxo.
- **Corrida:** um autor com saldo para **um** pedido só aceita, ao mesmo tempo, candidaturas em **dois** pedidos diferentes. Uma passa e a outra dá 409, e o saldo nunca fica negativo (conferido no banco).
- **Conferência geral:** para cada usuário de teste, a soma do extrato bate com `User.credits`, e o último `saldoApos` é igual ao saldo.
- **Extrato:** 401 sem token; a paginação; só as próprias transações; sem dado pessoal.
- **Tela:** o saldo do chip muda depois de aceitar; o extrato abre pelo chip e por Configurações.

**Taxa maior que 0 (teste local, como o documento pede):** um script de verificação roda dentro do container com `PLATFORM_FEE_PERCENT=15` e faz reservar → concluir com usuários de teste. Ele confere que `RECEBIMENTO + TAXA = RESERVA` e o arredondamento para baixo. Fica fora do repositório; o resultado vai para o changelog.

## 4. Verificação

- `prisma migrate status` limpo; `tsc` (front e back), `eslint`, `next build`, `check:cores`, `check:creditos` e `./e2e/run.sh` verdes.
- Capturas do detalhe com o custo da reserva, do erro de saldo insuficiente e do extrato (com movimentações, vazio e carregando), a 375 e 1440px, nos dois temas.

## 5. Perguntas em aberto

### Do documento

1. **Como o usuário ganha créditos na fase piloto.** Recomendo **(b), um script administrativo**: `npm run creditos:conceder -- --email fulano@exemplo.com --valor 100`, que roda no container e registra um `BONUS` pelo mesmo `movimentar`.
   - Não toca no módulo `auth`, que é a regra.
   - Serve também para quem **já tem conta** (o bônus de boas-vindas só valeria para contas novas).
   - Na fase piloto, quem distribui créditos é a equipe, de forma controlada, o que combina com uso gratuito e acompanhado.
   - O seed dá saldo aos usuários de teste pelo mesmo caminho.

   A opção (a), o bônus automático `WELCOME_CREDITS`, pode vir depois se o piloto crescer. A (c) deixaria ninguém contratar até lá.

### Minhas (para você confirmar)

2. **Pedido "a combinar" com valor proposto.** O documento diz que serviço sem remuneração não move créditos. Mas se o colaborador propôs um valor e o autor aceitou, esse é o valor combinado. Recomendo **reservar o valor proposto**, e só não mover nada quando não houver nem remuneração nem proposta. Se preferir a leitura literal, "a combinar" nunca move créditos, mesmo com proposta.
3. **Colaborador excluiu a conta com o pedido em andamento.** Não há quem receba. Recomendo que **"Marcar como concluído" dê 409** com a mensagem "O colaborador não está mais no SkillHub. Cancele o pedido para receber os créditos de volta", e que o cancelamento estorne normalmente. Pagar a ninguém ou sumir com os créditos não faz sentido.
4. **Tela do extrato.** Recomendo **um diálogo**, sem rota nova nem item novo no menu. Ele abre pelo item "Créditos e Pagamentos" de Configurações (que hoje é "em breve"), pelo "Ver extrato" do chip e pelo card de créditos da sidebar. Com isso, o link do chip fica "aprovado no plano", como o documento exige.

## 6. Achados fora de escopo

- A taxa, quando for maior que 0, sai do colaborador e não vai para conta nenhuma: a plataforma não tem usuário. Quando a monetização for decidida, vale um usuário ou uma conta da plataforma para receber as linhas `TAXA`.

## 7. Ajustes feitos durante a implementação

- **Cancelar com trava de status (corrige uma brecha da 17A/17B).** O cancelar gravava sem conferir o status. Agora ele lê o status e só grava se ainda for o mesmo (condição no `UPDATE`). Sem isso, cancelar e concluir ao mesmo tempo poderiam pagar o colaborador **e** devolver a reserva ao autor. O concluir também ganhou a condição "com colaborador" no `UPDATE`.
- **Integração sem tirar o Prisma dos repositories.** A reserva, o pagamento e o estorno entram como funções executadas **dentro** das transações que já existiam (aceitar, concluir e cancelar), passadas pelo service. Um 409 de saldo desfaz a operação inteira.
- **`check:creditos` sem exceções.** A palavra `credits` só aparece em `src/modules/credito/`. O script de concessão lê o saldo como `saldo`, devolvido pelo serviço.
- **e2e da 15f (17B).** Aceitar passou a reservar créditos, então os autores da 15f recebem saldo pelo script de concessão logo depois de criados. O resto da seção ficou igual.
- **`formatCredits` passou para `lib/creditos.ts`.** O chip o reexporta, então quem importava dele não muda. Isso evita o chip e o extrato importarem um ao outro.
- **O valor reservado de um pedido em andamento,** no detalhe do autor, vem da candidatura aceita (a lista de candidaturas também é carregada em andamento).
- **Remuneração do pedido = valor combinado (achado na conferência visual).** O detalhe mostrava sempre a remuneração publicada (100), mesmo depois de aceitar uma proposta de 120 e de reservar os 120. A resposta do pedido ganhou `valorCombinado`: o proposto pela candidatura aceita ou, sem proposta, a remuneração. Antes de aceitar, ele é igual à remuneração. O campo "Remuneração" do detalhe usa esse valor, e `remuneracao` continua sendo o valor publicado. Limite conhecido: se o colaborador aceito excluir a conta, a candidatura vai junto (cascade), e o valor volta a ser o publicado; a reserva e o estorno não mudam, porque vêm do extrato.
