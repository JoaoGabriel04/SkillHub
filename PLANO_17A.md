# Plano da subfase 17A: domínio de Serviços (modelo, API, telas ligadas e seed)

> Segue `SKILLHUB_SIDEBAR_E_DOMINIO.md` (Fase 17, Seções 17.0 e 17A, e as regras da Seção 1), `SKILLHUB_DESIGN_SYSTEM.md` (Seção 8) e `CHANGELOG_MIGRACAO.md`.
> Referência visual: `designs/New Serviços.png` e o Início das Fases 15 e 16.2.
> **Status: aprovado pelo João Gabriel em 15/10/2026** ("aprovado, pode seguir as recomendações"). Respostas: distância `null`; botão "Publicar" na linha do título; a lista geral esconde os próprios pedidos; "na sua área" pela cidade e sem "Mais próximos"; linha "Seus pedidos"; remuneração, prazo e ordem filtrados no cliente.

## 0. O que foi lido

- **Documento:** Seções 17, 17.0 e 17A do `SKILLHUB_SIDEBAR_E_DOMINIO.md` e a Seção 1 (regras).
- **Backend:**
  - `prisma/schema.prisma` e as 4 migrations existentes;
  - o módulo `user` inteiro, como padrão (schema, repository, service, controller com `handleError` local);
  - `utils/safeUser.ts`, `utils/AppError.ts`, `middlewares/authenticate.ts`, `api/routes/*`, `index.ts`, `package.json`, `Dockerfile` e o `docker-compose.yml`.
- **Frontend:**
  - `lib/mock/servicos.ts` e `pessoas.ts`;
  - `app/(app)/servicos/page.tsx` (que **já usa SWR**, só que sobre o mock) e `app/(app)/inicio/page.tsx`;
  - `components/app/servico-card.tsx`, `components/app/perfil/profile-dialog.tsx`, `lib/api.ts` e `lib/validation/auth.ts`.
- **Guia do Next 16:** `01-getting-started/06-fetching-data.md`. Em Client Components, o guia indica bibliotecas como o SWR (`useSWR` com `data`, `error` e `isLoading`), que é o padrão do projeto. Nada mudou de forma relevante para esta subfase.
- **Base:** `main` está em `b753e6a` (merge do PR #11). A branch `feat/servicos-dominio` sai de `origin/main`.
- **Como as migrations rodam:** o container do backend aplica `prisma migrate deploy` ao subir. A migration nova é criada com `docker compose exec backend npx prisma migrate dev --name servico`, dentro do container, onde o banco é o `postgres` da rede do compose. O arquivo gerado aparece em `backend/prisma/migrations/` pelo volume montado.

## 1. Backend

### 1.1. Modelo (`prisma/schema.prisma`, migration nova `servico`)

- Exatamente o modelo da Seção 17A: enums `CategoriaServico` e `StatusServico`, model `Servico` com os índices, e `colaboradorId`, `aceitoEm` e `concluidoEm` já criados e `null`.
- No `User`, **só** as duas relações inversas (`servicosPublicados` e `servicosExecutados`). Nenhum outro campo muda.
- **Comportamento na exclusão de conta**, pelo próprio Prisma:
  - os pedidos do autor somem em cascata (`onDelete: Cascade`);
  - o colaborador excluído vira `null` (`SetNull`).

  O `DELETE /user` do módulo `user` continua intocado.
- Migrations antigas intactas. Ao fim, `prisma migrate status` limpo.

### 1.2. Arquivos novos

| Arquivo | Conteúdo |
|---|---|
| `src/utils/autorResumo.ts` | `toAutorResumo({ id, fullName, urlPhoto })`: o único jeito de expor um usuário nas respostas de serviço, como o `toSafeUser`. O repository já seleciona só esses três campos do autor (`select`), então o resto nunca sai do banco nessa consulta. |
| `src/modules/servico/categoria.map.ts` | Um único mapa enum ↔ rótulo (`EDUCACAO` ↔ "Educação", `TECNOLOGIA` ↔ "Tecnologia", `DESIGN_ARTE` ↔ "Design e Arte", `REPAROS` ↔ "Reparos e Manutenção"), mais a lista de rótulos para o Zod. |
| `src/modules/servico/servico.schema.ts` | Zod com as regras da Seção 17A: <br>• título de 3 a 80 caracteres, depois de `trim`; <br>• descrição de 10 a 1000; <br>• categoria entre os rótulos; <br>• remuneração inteira ≥ 0, opcional, `null` = a combinar; <br>• prazo como data ISO futura, opcional, `null` = sem prazo; <br>• `PATCH` com os mesmos campos parciais; <br>• query da listagem: `categoria`, `q`, `cidade`, `limit` (padrão 20, máximo 50) e `cursor`. |
| `src/modules/servico/servico.repository.ts` | O Prisma fica só aqui: listagem, por id, do autor, criar, atualizar e cancelar. Também a leitura do usuário logado (`profileComplete`), feita pelo próprio repository de serviço, porque o módulo `user` não pode ser alterado. |
| `src/modules/servico/servico.service.ts` | Regras de negócio com `AppError`: <br>• **publicar:** só com perfil completo (403); <br>• **editar e cancelar:** só o autor (403); <br>• **editar:** só enquanto `ABERTO` (409); <br>• **cancelar:** já `CONCLUIDO` não cancela (409); <br>• **detalhe:** um `CANCELADO` só aparece para o autor (404 para os outros); <br>• conversão enum ↔ rótulo e datas em ISO. |
| `src/modules/servico/servico.controller.ts` | Controller com `handleError` local, no mesmo formato do `user` (`{ error }` e `details` do Zod). |
| `src/api/routes/servico.route.ts` | `servicoRouter.use(authenticate)` e as 6 rotas. **`/meus` vem antes de `/:id`.** |
| `prisma/seed.ts` | Seção 1.4. |

**Alterar:** `prisma/schema.prisma`; `src/api/routes/index.ts`, só para registrar `/servicos`; `backend/package.json`, só a chave `"prisma": { "seed": "tsx prisma/seed.ts" }` (o `tsx` já é dependência).
**Não tocar:** os módulos `auth` e `user`, o `safeUser.ts` e as migrations existentes.

### 1.3. Respostas

- **Formato:** `GET /servicos` devolve `{ servicos, nextCursor }`; `GET /servicos/meus` devolve `{ servicos }`; `GET`, `POST` e `PATCH /servicos/:id` devolvem `{ servico }` (`POST` com 201).
- **`DELETE /servicos/:id`:** muda para `CANCELADO`, devolve 200 com `{ servico }` e não apaga a linha.
- **Campos de cada serviço:** `id`, `titulo`, `descricao`, `categoria` (rótulo), `autor` (`AutorResumo`), `distanciaKm` (`null`, pergunta 1), `remuneracao`, `prazo`, `status` e `createdAt`.
- **Paginação:** por `cursor` (o `id` do último item), em ordem `createdAt desc, id desc`. `nextCursor` é `null` quando acabou.
- **Filtros:**
  - `q` busca no título e na descrição, sem diferenciar maiúsculas (`contains`, `mode: "insensitive"`);
  - `cidade` compara com a cidade do autor, sem diferenciar maiúsculas. A cidade não sai na resposta; só filtra.
- **Pedidos do próprio usuário:** ficam fora da lista geral (pergunta 3).

### 1.4. Seed de desenvolvimento

- `prisma/seed.ts`, idempotente (`upsert` por e-mail e por id fixo do pedido).
- **8 usuários fictícios**, com os nomes e fotos dos autores do mock (Carlos Magno, Lindalva Filho e os demais):
  - e-mails `seed.<nome>@example.com`, sem CPF, perfil completo, cidade "São Paulo";
  - senha de dev `seed1234`, com hash `bcryptjs`, documentada no topo do arquivo e no changelog.
- **Os 8 pedidos** do `SERVICOS_MOCK`.
- **Recusa rodar se `NODE_ENV === "production"`.**
- Para rodar: `docker compose exec backend npx prisma db seed`.
- O `e2e/run.sh` **não** depende do seed: os testes criam os próprios dados.

## 2. Frontend

### 2.1. Arquivos novos

| Arquivo | Conteúdo |
|---|---|
| `src/types/servico.ts` | O tipo `Servico`, movido do mock. É o mesmo de antes, com `distanciaKm: number \| null` e o campo novo `status`. Também `CATEGORIAS_SERVICO` e `CategoriaServico`. |
| `src/lib/servicos.ts` | Cliente da API com o `api` (axios): `getServicos(params)`, `getMeusServicos()`, `getServico(id)`, `criarServico(dados)`, e as chaves do SWR. **Não** em `lib/api/servicos.ts`, como sugere o documento: já existe `lib/api.ts`, e uma pasta `lib/api/` ao lado tornaria o `@/lib/api` ambíguo. |
| `src/lib/validation/servico.ts` | O mesmo Zod do backend para o formulário, no padrão de `lib/validation/auth.ts`, com o `fieldErrors` dele. |
| `src/components/app/publicar-servico-dialog.tsx` | Formulário de publicar dentro do `ProfileDialog` (a casca dos modais do Perfil, sem criar variação). Campos: título, descrição, categoria, remuneração opcional e prazo opcional. Sucesso: toast e `mutate`. |
| `src/components/app/servico-card-esqueleto.tsx` | Esqueleto do card para o estado "carregando" (`GlassCard` com blocos no lugar do texto, sem spinner). |
| `src/app/(app)/inicio/servicos-recentes.tsx` | A seção "Serviços" do Início como Client Component com SWR (8 primeiros), **com o mesmo markup da 16.2**: carrossel abaixo de `xl` e 2 lado a lado no `xl`. Esqueleto ao carregar e seção oculta se não houver pedidos. |

### 2.2. Alterar

| Arquivo | Alteração |
|---|---|
| `src/app/(app)/servicos/page.tsx` | <br>• **Dados:** troca o mock por SWR sobre a API. A chave inclui `categoria` e `q`, com a busca em debounce de 300ms, para não pedir a cada tecla. Remuneração, prazo e ordem continuam filtrando no cliente sobre o que veio, porque a API da 17A não tem esses filtros (pergunta 6). <br>• **Estados novos:** carregando (esqueletos), vazio ("Nenhum pedido encontrado") e erro (mensagem e "Tentar de novo", que chama `mutate`). <br>• **Botão de publicar** (pergunta 2). <br>• **"Serviços na sua área"** pela cidade (pergunta 4). <br>• **Seção "Seus pedidos"** (pergunta 5). |
| `src/components/app/servico-card.tsx` | Esconde o "à X km" quando `distanciaKm` é `null`. O tipo vem de `types/servico`. O resto do card não muda; o "Saiba Mais" continua no `emBreve`. |
| `src/app/(app)/inicio/page.tsx` | A seção "Serviços" vira o `<ServicosRecentes />`. Colaboradores, eventos e produtos continuam no mock. A página continua Server Component. |

**Não tocar:** `lib/mock/servicos.ts`, que fica sem uso (só deixamos de importá-lo, e a remoção fica anotada); os outros mocks e páginas; a sidebar e os tokens.

## 3. Testes (`e2e/fluxos.mjs`, seção nova)

Os fluxos chamam a API com o token de usuários de teste criados no próprio e2e: um Cliente autor, um Colaborador e um terceiro.

- **Publicar:** 201, e a resposta tem só `id`, `fullName` e `urlPhoto` no autor. O teste verifica que não aparece `email`, `cpf`, `phone`, `cidade` nem nenhum outro campo.
- **Validação:** título curto, descrição curta, categoria inválida, remuneração negativa e prazo no passado dão 400, com `details`.
- **Sem token:** 401.
- **Listar:** o pedido aparece para o outro usuário e não para o autor. Também os filtros de `categoria`, `q` (sem diferenciar maiúsculas) e `cidade`, e a paginação com `limit` e `cursor`.
- **Detalhe:** 200, e 404 para um id que não existe.
- **Editar:**
  - o autor consegue (200);
  - outro usuário recebe 403;
  - um pedido já cancelado dá 409.
- **Cancelar:**
  - o autor consegue (200, `CANCELADO`), e o pedido sai da lista;
  - o detalhe do cancelado dá 404 para os outros e 200 para o autor;
  - cancelar o pedido de outro dá 403.
- **Cancelar um concluído dá 409.** A 17A ainda não tem como concluir pela API (isso é da 17B), então o teste deixa um pedido seu como `CONCLUIDO` direto no banco, pelo mesmo canal de banco que o `run.sh` já usa, e confere o 409.
- **Exclusão de conta:** a conta do autor é excluída pela própria tela, e os pedidos dele somem (404 no detalhe).
- **Tela:** publicar pelo diálogo; o pedido aparece em "Seus pedidos"; outro usuário o vê na lista e na busca. Também a seção do Início com dados reais.
- **Limpeza:** o cleanup do `run.sh` (`e2e.%@example.com`) continua bastando, porque os pedidos caem em cascata com os usuários.

## 4. Verificação

- `prisma migrate status` limpo e as migrations antigas intactas.
- Todos os casos da Seção 3 verdes. `tsc` (front e back), `eslint`, `next build`, `check:cores` e `./e2e/run.sh` verdes.
- Com o seed, Serviços e o Início mostram os 8 pedidos do banco **com o mesmo visual**, a 375, 440, 768 e 1440px, nos dois temas.
- As diferenças esperadas, listadas nas capturas:
  - sem o "à X km" nos cards;
  - o botão de publicar;
  - "Seus pedidos";
  - os estados novos;
  - "Serviços na sua área" pela cidade.
- Os estados de carregando, vazio e erro são forçados no navegador (rede lenta, banco sem pedidos e API fora do ar) e capturados.

## 5. Perguntas em aberto

### Do documento

1. **Distância.** Recomendo **(a)**: `distanciaKm: null` por enquanto, e o card esconde a distância. O cálculo por coordenadas fica para uma subfase própria. A opção (c) exigiria escolher e aprovar um provedor externo de geocodificação, o que infla a 17A.
2. **Onde fica o botão "Publicar pedido".** O mockup não mostra. Recomendo **na linha do título "Serviços", à direita**: um botão compacto com `faPlus` e o texto "Publicar", no estilo do botão principal ciano. É visível nas duas larguras sem empurrar a busca nem os filtros. Alternativas:
   - um botão flutuante acima do menu inferior, que no celular disputa espaço com o menu;
   - um card "Publicar um pedido" no topo da lista, que ocupa uma linha inteira.
3. **A lista geral esconde os pedidos do próprio usuário?** Recomendo **esconder**, como o documento sugere, junto com a pergunta 5, para o pedido publicado não "sumir".

### Minhas (para você confirmar)

4. **"Serviços na sua área" e "Mais próximos" sem distância.** Hoje a linha "na sua área" e a ordem "Mais próximos" usam os km, que agora vêm `null`. Recomendo:
   - a linha "Serviços na sua área" passa a mostrar os pedidos da **mesma cidade** do usuário logado (o filtro `cidade` da API), e a seta dela abre a lista filtrada pela cidade;
   - a opção "Mais próximos" sai do "Organizar" até existir distância, e a ordem padrão fica "Mais recentes".
5. **"Seus pedidos".** Com a lista geral escondendo os próprios pedidos, quem publica não vê o pedido em lugar nenhum. Recomendo uma **linha "Seus pedidos" no topo de Serviços** (`GET /servicos/meus`), com os mesmos cards e o status quando não for "aberto". Ela só aparece para quem tem pedidos. **Editar e cancelar pela tela ficam fora da 17A** (a API já permite); o documento não pede, e esses fluxos ganham sentido na 17B, junto das candidaturas.
6. **Filtros de remuneração, prazo e ordem.** A API da 17A só filtra por categoria, busca e cidade. Recomendo manter esses três **no cliente**, sobre até 50 pedidos por requisição (o máximo da API). "Carregar mais", com o `cursor`, fica para quando o volume justificar; a API já está pronta para isso.

## 6. Achados fora de escopo

- `lib/mock/servicos.ts` fica sem uso depois da 17A. A remoção fica anotada no changelog, porque `pessoas.ts` ainda serve Produtos e Comunidade.
- A tela de detalhe do pedido (o "Saiba Mais") continua no `emBreve` até a 17B, como o documento manda.

## 7. Ajustes feitos durante a implementação

- **`ServicoCard`:** além de esconder a distância `null`, mostra o status ("Cancelado", "Em andamento", "Concluído") no lugar dela quando o pedido não está aberto. Isso só acontece na linha "Seus pedidos"; a lista geral só traz pedidos abertos. Era a forma de cumprir "com o status quando não for aberto" sem criar outro card.
- **`app/(app)/inicio/grade.ts` (novo):** a constante da grade do `xl` é usada pela página (Server Component) e pela seção de Serviços (Client Component). Um valor exportado de um arquivo `"use client"` chega ao servidor como referência de cliente, e não como texto, então a constante foi para um módulo comum.
- **Linha "Seus pedidos" sem a seta "ver tudo":** a lista inteira já está na linha. Editar e cancelar pela tela vêm na 17B.
- **e2e:** além do pedido concluído, o caso "perfil incompleto não publica (403)" também ajusta o banco direto (`profileComplete = false`) e depois restaura. Nenhuma conta de teste nasce com perfil incompleto pelo cadastro normal.- **"Seus pedidos" sempre visível** (pedido do João Gabriel na conferência). Quem ainda não publicou não tinha nenhum lugar de "meus pedidos", porque a linha só aparecia depois do primeiro pedido. Agora, sem pedidos, ela mostra "Você ainda não publicou nenhum pedido" e o botão "Publicar pedido". Enquanto `/servicos/meus` carrega, a linha não aparece, para não piscar a mensagem de vazio.

