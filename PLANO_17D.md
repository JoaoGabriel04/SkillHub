# Plano da subfase 17D: avaliações entre as partes

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Seções 17.0 e 17D, e as regras da Seção 1), `PLANO_17C.md` e `CHANGELOG_MIGRACAO.md` (Fase 17C).
> **Status: aprovado pelo João Gabriel em 16/10/2026** ("aprovado, pode seguir as recomendações"). Respostas: média e total em `GET /usuarios/:id/avaliacoes`; o `GET /servicos/:id/avaliacoes` é criado; a avaliação fica visível logo depois de enviada; "Avaliações" do Perfil passa a mostrar a média real. A `feat/avaliacoes` parte de `origin/main` em `d29149a`.

## 0. O que foi lido e medido

- **Documento:** Seção 17D e as regras da 17.0. As que pesam aqui:
  - privacidade: quem avaliou sai só como `AutorResumo`;
  - nada de ImpactScore nem colunas de "dimensões";
  - a seção "Experiências Profissionais" do Perfil continua com os placeholders, a menos que este plano proponha outra coisa e você aprove (pergunta 4).
- **O que a 17B e a 17C deixaram:**
  - o pedido concluído tem `autorId`, `colaboradorId` (vira `null` se o colaborador excluir a conta) e `concluidoEm`;
  - a candidatura aceita continua como histórico.
  - As partes de um pedido são, portanto, o autor e o `colaboradorId` atual.
- **Não existe "resumo público" de usuário na API.** Só o `/auth/me` (o próprio usuário) e o `AutorResumo` embutido nas respostas. O módulo `user` não pode ser alterado. Ver pergunta 1.
- **O detalhe do pedido (`servico-detalhe-dialog.tsx`) não tem nada para o estado "Concluído".**
  - O autor vê só a descrição.
  - O colaborador aceito vê "Candidatura aceita".
  - É aí que entra o "Avaliar".
- **Ícones:** `faStar` já está em `@fortawesome/free-solid-svg-icons` (usado em Competências). O pacote `free-regular` (estrela vazada) não está instalado. As estrelas vazias serão a mesma `faStar` sólida em tom apagado, sem dependência nova.
- **Base:** `main` em `d29149a`.

## 1. Backend

### 1.1. Modelo (migration nova `avaliacao`, criada dentro do container)

- Model `Avaliacao` exatamente como na Seção 17D, inclusive `@@unique([servicoId, avaliadorId])` e `@@index([avaliadoId])`.
- Relações inversas, as únicas alterações em models existentes:
  - `User`: `avaliacoesFeitas` e `avaliacoesRecebidas`;
  - `Servico`: `avaliacoes`.

**O que a exclusão de conta faz** (consequência direta dos `Cascade` do documento, sem decisão nova):

| Quem exclui a conta | O que acontece com as avaliações |
|---|---|
| **Autor** | Os pedidos dele somem em cascata e, com eles, as duas avaliações de cada pedido. O colaborador perde a nota que recebeu desse autor. |
| **Colaborador** | O pedido fica, com `colaboradorId = null`. As avaliações que ele fez e as que recebeu somem. O autor perde a nota que recebeu dele. |

Nos dois casos, não sobra avaliação órfã. Como a média é **calculada na consulta** (nada é guardado no `User`), ela continua certa para os outros usuários, só sem a nota de quem saiu. Isso entra no e2e.

### 1.2. Regras

- **Quem avalia:** só as duas partes do pedido.
  - O autor avalia o `colaboradorId`.
  - O colaborador aceito avalia o autor.
  - O `avaliadoId` é **decidido pelo servidor**, nunca vem do corpo.
- **Quando:** só com o pedido `CONCLUIDO`. Antes disso, 409 "Só dá para avaliar um pedido concluído".
- **Uma vez cada:** a segunda tentativa dá 409 "Você já avaliou este pedido". Duas requisições ao mesmo tempo também dão 409, porque o `@@unique` barra e o erro `P2002` vira 409, como nas candidaturas.
- **Corpo:** `nota` inteira de 1 a 5; `comentario` opcional, com `trim` e até 500 caracteres (vazio vira `null`). Fora disso, 400 com `details` do Zod.
- **Respostas de erro:**

  | Caso | Status | Mensagem |
  |---|---|---|
  | Terceiro (nem autor nem colaborador aceito) | 403 | "Só quem participou do pedido pode avaliá-lo" |
  | Colaborador que já excluiu a conta (o autor tenta avaliar) | 409 | "O colaborador não está mais no SkillHub" |
  | Pedido inexistente, ou cancelado para quem não é o autor (mesma regra do `GET /servicos/:id`) | 404 | |
  | Sem token | 401 | |
- Não há edição nem exclusão de avaliação. O documento não pede, e "uma vez cada" fica mais simples de garantir assim.

### 1.3. Endpoints (todos com `authenticate`)

| Rota | O que faz |
|---|---|
| `POST /servicos/:id/avaliacoes` | Corpo `{ nota, comentario? }`. Devolve 201 com a avaliação. |
| `GET /usuarios/:id/avaliacoes?limit=&cursor=` | Avaliações **recebidas** pelo usuário, mais recentes primeiro, paginadas por cursor como a 17A. Devolve `{ media, total, avaliacoes, nextCursor }` (pergunta 1). Usuário inexistente: 404. |
| `GET /servicos/:id/avaliacoes` | **Novo, não está no documento (pergunta 2).** As até duas avaliações do pedido, para o diálogo saber se você já avaliou e mostrar o que cada parte deu. Só para as partes (403 para terceiros). |

**Formatos:**
- **Cada avaliação:** `{ id, nota, comentario, createdAt, avaliador, servico }`. O `avaliador` é um `AutorResumo` e o `servico` é `{ id, titulo }`. Na rota do pedido, vem também o `avaliado`, um `AutorResumo`.
- **`media`:** a média das notas com uma casa decimal (arredondada), ou `null` com `total = 0`. Ela e o `total` vêm de um `aggregate` do Prisma, conferido no e2e contra `round(avg(nota), 1)` em SQL.

### 1.4. Arquivos

**Criar:**
- `prisma/migrations/<data>_avaliacao/migration.sql`, gerada pelo `prisma migrate dev --name avaliacao`;
- `src/modules/avaliacao/` com `avaliacao.schema.ts`, `avaliacao.repository.ts`, `avaliacao.service.ts` e `avaliacao.controller.ts`;
- `src/api/routes/usuario.route.ts`: só o `GET /:id/avaliacoes`. O nome é `usuario`, e não `user`, para não se confundir com o módulo `user`, que não é tocado.

**Alterar:**
- `prisma/schema.prisma`: o model novo e as três relações inversas;
- `src/api/routes/index.ts`: monta `/usuarios`;
- `src/api/routes/servico.route.ts`: `POST` e `GET /:id/avaliacoes`.

**Não tocar:** os módulos `auth`, `user`, `credito`, `servico` e `candidatura` (só a rota do servico ganha duas linhas); os campos do `User`; as migrations antigas; o `.env`.

## 2. Frontend

### 2.1. Estrelas

`src/components/app/estrelas.tsx`, um componente com dois modos:
- **Exibição** (`nota`, `tamanho`): 5 `faStar`. As preenchidas usam `text-accent-text`, que já passa no `check:contrast` nos dois temas, e as vazias usam `text-foreground/20`. Tem `aria-label`, por exemplo "4 de 5 estrelas".
- **Seleção** (`value`, `onChange`): um `radiogroup` com 5 botões. Cada botão tem o nome "1 estrela", "2 estrelas"... O hover pré-visualiza a nota, e as setas do teclado mudam o valor.

Sem emoji e sem dependência nova.

### 2.2. Detalhe do pedido concluído

Em `servico-detalhe-dialog.tsx`, uma seção nova "Avaliação". Aparece para o autor e para o colaborador aceito quando o status é "Concluído". Os dados vêm de `GET /servicos/:id/avaliacoes` pelo SWR, com a chave `["avaliacoes", servicoId]`.
- **Ainda não avaliei:**
  - o texto "Como foi trabalhar com {nome}?";
  - as estrelas de seleção e um comentário opcional (`textarea`, 500 caracteres, o mesmo estilo da candidatura);
  - o `CtaButton` "Enviar avaliação", desabilitado sem nota.

  Ao enviar: `POST` com o cliente `api`, `mutate` da chave e o toast "Avaliação enviada".
- **Já avaliei:** "Sua avaliação", com as estrelas e o comentário.
- **A outra parte já avaliou:** "Avaliação de {nome}", com as estrelas e o comentário. A visibilidade é a da pergunta 3.
- **O colaborador excluiu a conta (visão do autor):** "O colaborador excluiu a conta.", sem formulário.

Os outros estados do diálogo (aberto, em andamento, os outros perfis) não mudam.

### 2.3. Perfil (pergunta 4, aprovada)

Em `perfil/page.tsx`, o número de "Avaliações" passa a ser a média real do próprio usuário, por exemplo "4,5", vinda de `GET /usuarios/{id}/avaliacoes?limit=1`. Sem avaliações, continua "–". "Colaborações" e "Experiência" continuam "00". O comentário de aviso no topo é atualizado.

### 2.4. Arquivos

**Criar:** `src/components/app/estrelas.tsx`, `src/types/avaliacao.ts` e `src/lib/avaliacoes.ts` (`getAvaliacoesDoServico`, `getAvaliacoesDoUsuario`, `avaliar` e as chaves do SWR).

**Alterar:** `src/components/app/servico-detalhe-dialog.tsx` e `src/app/(app)/perfil/page.tsx`.

**Não tocar:** `lib/api.ts`, `stores/auth-store.ts`, os outros componentes (`ServicoCard`, `ContentCard`, `CtaButton` são só reaproveitados) e `designs/*.png`.

## 3. Testes (`e2e/fluxos.mjs`, seção nova 15h)

Contas próprias (`e2e.avaliacoes.*`), com créditos pelo script de concessão, como na 15g. Os casos:
- **Pedido não concluído:** avaliar um aberto e um em andamento dá 409.
- **Fluxo:** o autor avalia o colaborador (201) e o colaborador avalia o autor (201). O `avaliadoId` gravado é o da outra parte, mesmo se o corpo mandar outro id.
- **Repetição:** a segunda avaliação do mesmo usuário dá 409. Duas ao mesmo tempo também: uma dá 201 e a outra 409, e fica uma linha só.
- **Terceiros:** um colaborador recusado e um cliente qualquer recebem 403.
- **Validação:** nota 0, 6, 3.5 e texto, e comentário com 501 caracteres, dão 400.
- **Casos de 401 e 404,** inclusive um pedido cancelado visto por terceiros.
- **Média e total:** um colaborador avaliado em 3 pedidos (notas 5, 4 e 4). `media` e `total` batem com `round(avg(nota), 1)` e `count(*)` em SQL.
- **Paginação e privacidade:** `GET /usuarios/:id/avaliacoes` pagina, e o `avaliador` só tem `id`, `fullName` e `urlPhoto`.
- **Exclusão de conta:**
  - um autor que avaliou o colaborador exclui a conta; não sobra avaliação órfã (conferido em SQL), e a média do colaborador é recalculada com as notas restantes, conferida em SQL;
  - o colaborador que sai: o autor recebe 409 ao tentar avaliar.
- **Tela:**
  - o autor abre o pedido concluído, escolhe 4 estrelas e envia; aparece "Sua avaliação";
  - o colaborador vê a avaliação recebida e consegue avaliar.

Verificação da Seção 1.4: `tsc` (frontend e backend), `eslint`, `next build`, `check:cores`, `check:contrast`, `check:creditos` e o e2e inteiro. Na parte visual:
- Serviços, Início e o diálogo de pedidos não concluídos idênticos byte a byte aos da 17C (375 e 1440px, dois temas);
- as telas novas (avaliar, já avaliado, avaliação recebida) capturadas a 375 e 1440px nos dois temas.

## 4. Perguntas em aberto

1. **Onde ficam média e total.** O documento diz "junto do resumo público", mas esse resumo não existe, e o módulo `user` não pode mudar.
   - **Recomendo:** `GET /usuarios/:id/avaliacoes` é o resumo público das avaliações e devolve `{ media, total }` junto da lista. Um único lugar, sem mexer no `AutorResumo`.
   - **Alternativa:** pôr `media` e `total` dentro do `AutorResumo` em todas as respostas de serviço e candidatura. Isso custa uma agregação por pessoa em cada lista e muda o tipo que a 17.0 fixa.
2. **Endpoint extra `GET /servicos/:id/avaliacoes`** (só para as partes). **Recomendo criar:** sem ele, o diálogo não sabe se você já avaliou aquele pedido. A alternativa seria filtrar `GET /usuarios/:id/avaliacoes` pelo pedido no cliente, o que exige buscar todas as páginas.
3. **Quando a outra parte vê a avaliação.**
   - **Recomendo:** logo depois de enviada. É simples, e o piloto é acompanhado.
   - **Alternativa:** avaliação "cega", em que cada um só vê a do outro depois de avaliar também. Ela evita retaliação, mas precisaria esconder a nota também na lista pública, o que complica a média.
4. **Ligar "Avaliações" do Perfil à média real.**
   - **Recomendo ligar só esse número:** o dado agora existe, e o "–" já é o estado vazio.
   - "Colaborações" (pedidos concluídos) e "Experiência" continuam placeholders. Ligar "Colaborações" ficaria para outra subfase.

## 5. Achados fora de escopo

- **A média do colaborador na lista de candidaturas** ajudaria o autor a escolher. Ela fica para depois, porque mexe na resposta das candidaturas (17B).
- **Avaliações de quem excluiu a conta somem** (é o `Cascade` do documento). Se a Fase 22 (ImpactScore) precisar do histórico completo, será preciso rever isso, por exemplo com `SetNull` no avaliador.

## 6. Ajustes feitos durante a implementação

- **Média sem arredondar um float.** Ela vem da soma e da contagem (`_sum` e `_count` do `aggregate`): `round(soma × 10 / total) / 10`. Partir do `_avg` arredondaria um valor que já é inexato, e um caso como 4,45 poderia sair diferente do `round(avg(nota), 1)` do Postgres.
- **Corpo com `avaliadoId`** é aceito e ignorado (o Zod descarta chaves desconhecidas). O e2e confere que o avaliado gravado é sempre a outra parte.
- **Comparação visual com a `seed.bruna`.** Os pedidos do `seed.carlos` estão concluídos no banco local e, por isso, ganham a seção nova de propósito.

