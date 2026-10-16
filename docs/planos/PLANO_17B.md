# Plano da subfase 17B: candidaturas e contratação

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Seções 17.0 e 17B, e as regras da Seção 1), `PLANO_17A.md` e `CHANGELOG_MIGRACAO.md` (Fase 17A).
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("aprovado, pode seguir as recomendações"). Respostas: o autor chega pela linha "Seus pedidos", com a contagem no card; linha "Suas candidaturas" para colaboradores; editar e cancelar pela tela entram na 17B; pendentes viram "Recusada" no cancelamento; o "Saiba Mais" do Início abre o mesmo detalhe; mais 2 colaboradores no seed; cliente vê o texto explicativo. A `feat/servicos-candidaturas` parte de `origin/main` em `a55ca57`.

## 0. O que foi lido

- **Documento:** Seção 17B e as regras de domínio da 17.0 (quem pode o quê, privacidade, IDs, exclusão de conta, mensagens em português).
- **O que a 17A deixou:** o módulo `servico` (schema, repository, service e controller), o `toAutorResumo`, a rota `/servicos` e o seed. No frontend, a página de Serviços (com a linha "Seus pedidos"), o `ServicoCard`, o `PublicarServicoDialog`, o `lib/servicos.ts` e a seção 15e do e2e.
- **Cadastro de colaborador:** `/auth/register/colaborador` usa o mesmo formulário do cliente, com `perfil = "Colaborador"`. O e2e cria colaboradores pela API, como já faz com clientes.
- **Base:** `main` está em `a55ca57` (merge do PR #12). A branch `feat/servicos-candidaturas` sai de `origin/main`.

## 1. Backend

### 1.1. Modelo (migration nova `candidatura`, criada dentro do container)

- Exatamente o da Seção 17B: enum `StatusCandidatura` e model `Candidatura` com `@@unique([servicoId, colaboradorId])` e o índice.
- **Relações inversas:**
  - No `User`, só `candidaturasEnviadas`, a única alteração permitida.
  - No `Servico` (model da 17A), `candidaturas Candidatura[]`.
- **Exclusão de conta:**
  - Se o colaborador é excluído, as candidaturas dele caem em cascata, e um serviço em andamento com ele fica com `colaboradorId = null` (`SetNull`, da 17A), sem quebrar.
  - Se o pedido some (autor excluído), as candidaturas dele também somem.

### 1.2. Endpoints (todos com `authenticate`)

| Rota | Regra |
|---|---|
| `POST /servicos/:id/candidaturas` | Só `Colaborador` (403). Nunca no próprio pedido (403). Pedido `ABERTO` (409). Uma por colaborador (409 ao repetir, garantido também pelo `@@unique`). Mensagem de 10 a 500 caracteres; `valorProposto` inteiro ≥ 0, opcional. |
| `GET /servicos/:id/candidaturas` | Só o autor (403). Lista com o colaborador em `AutorResumo`. |
| `GET /candidaturas/minhas` | As candidaturas do usuário logado, cada uma com o resumo do serviço (o mesmo formato da 17A). |
| `PATCH /candidaturas/:id/retirar` | Só o colaborador dono (403) e só `PENDENTE` (409). Vira `RETIRADA`. |
| `POST /candidaturas/:id/aceitar` | Só o autor do pedido (403). Ver 1.3. |
| `POST /servicos/:id/concluir` | Só o autor (403) e só `EM_ANDAMENTO` (409). O serviço vira `CONCLUIDO` com `concluidoEm = now()`. |
| `DELETE /servicos/:id` (17A) | **Muda só neste ponto:** o autor também pode cancelar um pedido `EM_ANDAMENTO`. As candidaturas não são apagadas (pergunta 4). `CONCLUIDO` continua dando 409. |

### 1.3. Aceitar, numa transação

Tudo dentro de um único `prisma.$transaction`:
1. **Trava:** primeiro, `updateMany` no serviço **com a condição `status = ABERTO`**, passando para `EM_ANDAMENTO`, com `colaboradorId` e `aceitoEm = now()`. Se nenhuma linha mudar, o pedido não está mais aberto e a transação lança 409.
2. **Candidaturas:** a escolhida vira `ACEITA` (exigindo que esteja `PENDENTE`; senão, 409), e as outras `PENDENTE` do mesmo pedido viram `RECUSADA`.

A condição no próprio `UPDATE` é o que resolve a **corrida**: com duas aceitações ao mesmo tempo, o banco deixa só uma mudar a linha, e a outra recebe 409. O e2e testa isso disparando as duas em paralelo.

### 1.4. Respostas

- **Candidatura:** `{ id, mensagem, valorProposto, status, createdAt, colaborador: AutorResumo }`. O status vai como rótulo ("Pendente", "Aceita", "Recusada", "Retirada"), como no serviço.
  - Em `/candidaturas/minhas`, entra `servico` (o resumo da 17A) no lugar de `colaborador`.
- **O serviço da 17A ganha:**
  - `colaborador: AutorResumo | null`, `aceitoEm` e `concluidoEm`;
  - só em `/servicos/meus`, `candidaturasPendentes: number`, a contagem para o card (pergunta 1).
- **Privacidade:** nenhuma resposta traz outro dado pessoal além de `id`, `fullName` e `urlPhoto`. O e2e confere isso também nas candidaturas.

### 1.5. Arquivos

**Criar:**
- `src/modules/candidatura/` com `candidatura.schema.ts`, `candidatura.repository.ts`, `candidatura.service.ts` e `candidatura.controller.ts`, no mesmo padrão;
- `src/api/routes/candidatura.route.ts` (`/candidaturas/...`);
- a migration `candidatura`.

**Alterar:**
- `prisma/schema.prisma`;
- `src/api/routes/servico.route.ts` (as rotas `/:id/candidaturas` e `/:id/concluir`);
- `src/api/routes/index.ts` (registro);
- `src/modules/servico/servico.service.ts` e `servico.repository.ts` (concluir, cancelar em andamento e os campos novos da resposta);
- `prisma/seed.ts` (pergunta 6).

**Não tocar:** os módulos `auth` e `user`, as migrations antigas.

## 2. Frontend

### 2.1. Detalhe do pedido ("Saiba Mais")

O "Saiba Mais" do `ServicoCard` deixa de chamar `emBreve` e abre um **diálogo de detalhe**: o `components/ui/dialog.tsx` com o vidro escuro dos modais do Perfil. Ele mostra a descrição completa, a categoria, a remuneração ("a combinar" quando `null`), o prazo ("sem prazo"), o autor (avatar e nome) e o status. O conteúdo muda conforme quem abre:

- **Colaborador, num pedido aberto de outra pessoa:**
  - o botão "Candidatar-se" abre, no próprio diálogo, o campo de mensagem e o valor opcional;
  - se ele já se candidatou, aparece o status da candidatura e, enquanto estiver pendente, "Retirar candidatura".
- **Cliente ou Empresa, num pedido de outra pessoa:** o texto "Só colaboradores podem se candidatar a pedidos", sem botão (pergunta 7).
- **O autor:**
  - **Aberto:** a lista de candidaturas (avatar, nome, mensagem e valor proposto), cada uma com "Aceitar".
  - **Em andamento:** o colaborador escolhido e "Marcar como concluído".
  - **Aberto ou em andamento:** "Editar" (só aberto) e "Cancelar pedido", com confirmação (pergunta 3).

### 2.2. Onde cada um encontra o que é seu

- **O autor (pergunta 1, do documento):** pela linha **"Seus pedidos"**, que a 17A já deixou sempre visível em Serviços. O "Saiba Mais" de cada card abre o detalhe com as candidaturas. O card ganha, no lugar da distância, **"3 candidaturas"** quando houver pendentes; quando não estiver aberto, o status, como na 17A.
- **O colaborador (pergunta 2):** uma linha nova **"Suas candidaturas"** em Serviços, só para colaboradores, logo abaixo de "Seus pedidos". Os cards mostram o status da candidatura no lugar da distância. Sem candidaturas, a linha não aparece.

### 2.3. Arquivos

**Criar:**
- `src/types/candidatura.ts` e `src/lib/candidaturas.ts` (cliente da API e chaves do SWR);
- `src/lib/validation/candidatura.ts`;
- `src/components/app/servico-detalhe-dialog.tsx`.

**Alterar:**
- `components/app/servico-card.tsx`: "Saiba Mais" abre o detalhe, e o card mostra a contagem de candidaturas ou o status;
- `components/app/publicar-servico-dialog.tsx`: modo de edição (`servico` opcional, `PATCH`), reaproveitando o mesmo formulário;
- `app/(app)/servicos/page.tsx`: a linha "Suas candidaturas";
- `app/(app)/inicio/servicos-recentes.tsx`: "Saiba Mais" abre o mesmo detalhe (pergunta 5);
- `types/servico.ts` e `lib/servicos.ts`: os campos e as funções novas (concluir, cancelar, editar).

## 3. Testes (`e2e/fluxos.mjs`, seção nova 15f)

As contas são criadas pela API: autor (Cliente), dois colaboradores e um cliente sem permissão.

- **Fluxo completo:** publicar → dois colaboradores se candidatam → o autor vê as duas → aceita uma → o serviço fica `EM_ANDAMENTO` com `colaboradorId` e `aceitoEm` preenchidos; a outra vira `RECUSADA` → concluir → `CONCLUIDO` com `concluidoEm`. As datas são conferidas no banco.
- **Corrida:** num pedido com duas candidaturas, as duas aceitações saem em paralelo. Uma dá 200 e a outra 409, e o serviço termina com um único colaborador.
- **Permissões e status:**
  - cliente se candidatando: 403;
  - autor no próprio pedido: 403;
  - candidatura repetida: 409;
  - pedido não aberto: 409;
  - mensagem curta: 400;
  - lista de candidaturas por quem não é o autor: 403;
  - aceitar por quem não é o autor: 403;
  - aceitar uma candidatura retirada ou recusada: 409;
  - retirar a de outro: 403;
  - retirar uma não pendente: 409;
  - concluir por quem não é o autor: 403;
  - concluir um pedido aberto: 409;
  - cancelar em andamento: 200;
  - cancelar concluído: 409 (continua);
  - sem token: 401.
- **Privacidade:** nas respostas de candidatura e em `/minhas`, nenhum dado pessoal além de `id`, `fullName` e `urlPhoto`.
- **Exclusão:** um colaborador aceito exclui a conta → o serviço continua, com `colaboradorId = null`, e as candidaturas dele somem.
- **Tela:**
  - um colaborador abre o detalhe e se candidata;
  - o autor abre "Seus pedidos" e aceita;
  - o card mostra a contagem e o status.

## 4. Verificação

- `prisma migrate status` limpo e as migrations antigas intactas.
- `tsc` (front e back), `eslint`, `next build`, `check:cores` e `./e2e/run.sh` verdes.
- Capturas do diálogo de detalhe nos três papéis e nos estados aberto, em andamento e concluído, a 375 e 1440px, nos dois temas. Também Serviços com "Seus pedidos" e "Suas candidaturas".
- As telas sem pedido próprio nem candidatura continuam iguais às do fim da 17A.

## 5. Perguntas em aberto

### Do documento

1. **Como o autor chega ao próprio pedido.** Recomendo **a linha "Seus pedidos" que já existe** (17A, sempre visível), com o "Saiba Mais" abrindo o detalhe e as candidaturas. O card mostra "N candidaturas" quando houver pendentes. Não cria aba nem página nova.

### Minhas (para você confirmar)

2. **Onde o colaborador vê as próprias candidaturas.** Recomendo a linha **"Suas candidaturas"** em Serviços, só para colaboradores, com o status em cada card. O documento cria o `GET /candidaturas/minhas`, mas não diz onde ele aparece.
3. **Editar e cancelar o próprio pedido pela tela.** Recomendo **incluir na 17B**, dentro do detalhe do autor: "Editar" (só aberto) reaproveita o formulário de publicar; "Cancelar pedido" pede confirmação. A API já existe desde a 17A, e na 17A eu disse que isso viria agora.
4. **Candidaturas pendentes quando o pedido é cancelado.** O documento diz para não apagar. Recomendo que as `PENDENTE` virem **`RECUSADA`** no cancelamento, na mesma transação, para o colaborador não ficar vendo "pendente" num pedido que não existe mais. A `ACEITA` de um pedido em andamento continua `ACEITA`, como histórico.
5. **"Saiba Mais" dos cards do Início.** Hoje eles levam para Serviços. Recomendo que **abram o mesmo detalhe**, para o botão fazer a mesma coisa nos dois lugares.
6. **Seed.** Todos os usuários do seed são clientes, então ninguém consegue testar uma candidatura no ambiente local. Recomendo acrescentar **2 colaboradores** (`seed.ana` e `seed.pedro`, com a mesma senha de dev), sem candidaturas prontas.
7. **Quem não é colaborador, no detalhe.** Recomendo mostrar o texto "Só colaboradores podem se candidatar a pedidos", sem botão. Esconder tudo deixaria a pessoa sem saber por que não pode.

## 6. Achados fora de escopo

- A distância continua `null`; o cálculo por coordenadas segue como subfase própria.
- A 17C (créditos) vai precisar de um ponto para debitar e creditar no "concluir"; a 17B só muda o status e as datas.

## 7. Ajustes feitos durante a implementação

- **`ServicoModais` (em `servico-detalhe-dialog.tsx`):** um par detalhe/edição usado pelo `ServicoCard` e pelos cards do Início, para os dois abrirem os mesmos modais sem repetir código. O "Editar" do detalhe troca um modal pelo outro.
- **Formulário de candidatura sem `<form>`:** o `ProfileDialog` já envolve o conteúdo num `<form>`, e um `<form>` dentro de outro gerava erro do React no console (visto nas capturas). O bloco virou `div`, e o botão chama o envio direto.
- **O `cn` do projeto não resolve conflitos de classe:** ele vem do pacote `cn`, que só junta as classes, sem o `tailwind-merge`. Por isso:
  - o "Cancelar pedido" saía cinza; os botões do detalhe agora separam a base da cor;
  - o `ServicoCardEsqueleto` (17A) somava os tamanhos do `className` aos padrão; agora o `className` substitui o tamanho padrão inteiro.
- **"Saiba Mais" dos cards do Início:** era link (`<a>`) e virou botão, com as mesmas classes. As capturas do Início continuaram idênticas byte a byte.

