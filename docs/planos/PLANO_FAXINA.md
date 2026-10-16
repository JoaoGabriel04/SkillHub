# Plano da faxina antes da Fase 18

> Segue `SKILLHUB_FAXINA_PRE_FASE_18.md` (Seções 1 a 7) e `CHANGELOG_MIGRACAO.md` (até a Fase 17D).
> **Status: aprovado pelo João Gabriel em 16/10/2026** ("aprovado, pode seguir as recomendações"). Respostas seguindo as recomendações:
> 1. O A2 sai do PR A; o `cn` atual fica.
> 2. As 17A a 17D também passam a "Concluída".
> 3. O desabilitado neutro vale só para o "Excluir conta", o único que fica desabilitado por regra.
> 4. As menções por nome ficam como estão, e `*:Zone.Identifier` entra no `.gitignore`.
> 5. Pode a checagem mínima no `auth.service`.
> 6. `SetNull` também em `Avaliacao.servico`.
>
> Escrito na raiz antes da aprovação e movido para `docs/planos/` pelo A7.
> Base: `main` em `5a935af` (PR #15 mergeado), árvore limpa.

## 0. O que foi lido e medido

- **PRs:** os 15 PRs estão **mergeados** (`gh pr list`), inclusive os da 16.x, o switch de tema (#9) e as 17A a 17D (#12 a #15).
- **Changelog:**
  - 16.1 a 16.5 já dizem "Implementada, conferida, PR aberto". Só o "Ajuste pós-16.4 (switch de tema)" ainda diz "aguardando conferência visual e PR".
  - As 17A a 17D também dizem "PR aberto", mas estão mergeadas. Ver pergunta 2.
- **PRs #4 e #6:** não são da sidebar.
  - **#4 (`feat/animacoes-auth`):** GSAP, colmeia de hexágonos, splash e animações de `/`, `/login` e `/cadastro`.
  - **#6 (`feat/transicao-area-logada`):** transição suave entre as páginas do menu, com a barra de progresso e o item ativo da sidebar deslizando.
  - Os dois têm corpo de PR com validação (73/73 e 88/88 no e2e), então as entradas não ficam "não registradas".
- **`cn`: a premissa do A2 não se confirma.** O pacote `cn@0.4.0` é o motor da própria shadcn (`github.com/shadcn-ui/cn`), feito para substituir `clsx` + `tailwind-merge`, e **já resolve conflitos**. Testei no `node_modules` do projeto:

  | Entrada | Saída do `cn` atual |
  |---|---|
  | `w-1/2`, `w-full` | `w-full` |
  | `px-2`, `p-4` | `p-4` |
  | `bg-accent`, `bg-surface-2` | `bg-surface-2` |
  | `rounded-lg`, `rounded-[6px]` | `rounded-[6px]` |
  | `text-sm`, `text-danger` | `text-sm text-danger` (tamanho e cor, corretamente mantidos) |

  O `ServicoCard` com `w-full` sai `... sm:w-[260px] lg:w-[290px] w-full`: o `w-full` vence o `w-[218px]`, mas os responsivos ficam. O `tailwind-merge` faria o mesmo, porque variantes `sm:`/`lg:` são grupos separados. Ver pergunta 1.
- **Código morto:**
  - `lib/mock/servicos.ts`: zero importações (`grep -rn "mock/servicos" src` vazio).
  - `lib/mock/pessoas.ts` **continua em uso** por `produtos.ts` e `comunidade.ts`, então a pasta `lib/mock` não fica vazia.
- **`--sidebar-*` e `--chart-*`:**
  - Ninguém usa: o `grep -rnE "[a-z]-sidebar(-[a-z-]+)?\b|[a-z]-chart-[1-5]"` em `src` e `scripts` só acha o próprio `globals.css`.
  - O `shadcn/tailwind.css` importado também não cita nenhuma das duas (0 ocorrências).
  - Os 6 componentes de `components/ui` não citam.
  - Os validadores não leem esses nomes.
  - Detalhe: o `--chart-*` nem existe no bloco escuro.
- **Aviso do GSAP:** anotado na 16.4 e na 16.5 ("GSAP target not found" ao cair em `/login` sem sessão), nunca investigado. O `login-form.tsx` anima por seletor (`[data-logo]`, `[data-try]`, `[data-social]` etc.) dentro de `scope: root`.
- **E2E instável:**
  - O achado do switch de tema diz que a falha era esperar o link "Configurações" depois de um login.
  - Hoje o login com a senha nova (linha 301 do `fluxos.mjs`) faz `waitForURL("**/inicio").catch(() => {})`, engolindo o erro.
  - Há **42** esperas com `.catch(() => {})` no arquivo, e várias `waitForTimeout` fixas (linhas 70, 143, 298, 902).
  - O passo 16 (exclusão com senha) começa num `page.goto("/perfil")` que depende de a sessão ter sido criada nesse login.
- **"Excluir conta" desabilitado:**
  - Hoje é `bg-danger-fill ... disabled:opacity-40`, o que no claro dá o rosa desbotado.
  - Os outros botões desabilitados usam só opacidade (`disabled:opacity-50/60`) sobre o fundo deles.
  - Na 16.5 foi decidido deixar para depois (pergunta 4 daquele plano).
- **`.md` e referências** (`git grep`, fora dos próprios `.md`):
  - Nenhum script, validador ou e2e lê `.md`. O `check-cores` lê só `globals.css`, `check-contrast.mjs` e `brand.ts`, e o `check-creditos` só `.ts`.
  - O código cita **só o nome** `SKILLHUB_DESIGN_SYSTEM.md`, em comentários de 7 arquivos, sem caminho.
  - Entre os `.md`: `CHANGELOG_MIGRACAO` 22 menções, `SKILLHUB_SIDEBAR_E_DOMINIO` 22, `SKILLHUB_DESIGN_SYSTEM` 20, `SKILLHUB_CORES_E_TEMA` 9, `PLANO_16_1` 5, `PLANO_16_3` e `PLANO_17D` 3 cada, `PLANO_17A/B/C` 2 cada, `PLANO_16_2/4/5` 1 cada, a faxina 0.
  - Nenhuma é link Markdown (`](...)`); todas são nomes entre crases.
  - Não há `README` nem `CLAUDE.md` na raiz. Os de `frontend/` não citam os documentos.
- **Domínio:**
  - `concluir` chama `creditoService.pagar`, que grava `RECEBIMENTO +valor` e, com taxa, `TAXA -taxa` no colaborador. A taxa não entra em conta nenhuma.
  - `deleteAccount` (em `modules/user/user.service.ts`) só confere a senha e apaga o usuário.
  - `Avaliacao` tem `Cascade` no avaliador, no avaliado **e no serviço**.
  - Não existe listagem nem busca de usuários na API. Os pontos públicos são `GET /usuarios/:id/resumo` e `GET /usuarios/:id/avaliacoes`, e o `AutorResumo` embutido em pedidos, candidaturas e avaliações.
- **Testes hoje:** `./e2e/run.sh` na base `5a935af`: **210 de 210** (16/10/2026), igual ao registro da 17D.

---

## 1. PR A: `chore/faxina` (sem mudança de comportamento)

### A1. Changelog em dia

| | |
|---|---|
| **Arquivos** | `CHANGELOG_MIGRACAO.md` (já em `docs/` se o A7 vier antes no mesmo PR; ver ordem na Seção 4) |
| **O que muda** | • Status de 16.1 a 16.5 e do "Ajuste pós-16.4" passa a **"Concluída"** (ou "Concluído", no ajuste), porque todos foram mergeados. <br>• Entradas novas para os PRs #4 e #6, no formato padrão (Data, Status, Branch, Contexto, Arquivos, Validação), montadas do `git show --stat` e do corpo dos PRs. Títulos fiéis ao que eles são: "Animações das telas de entrada e transição de páginas (PR #4)" e "Transições de página na área logada (PR #6)", na posição cronológica (entre 15 e 16.1, e entre 16.1 e 16.3). <br>• Entrada da própria faxina (PR A). |
| **Testes** | Nenhum |
| **Risco** | Baixo. Só texto. |

### A2. `cn` com `clsx` + `tailwind-merge`

**Recomendo não fazer**, pela medição da Seção 0: o `cn` atual já é o substituto oficial dos dois pacotes, com conflito resolvido. Trocar seria um pacote equivalente por outros dois, sem ganho. Se você quiser manter, o plano é:

| | |
|---|---|
| **Arquivos** | `frontend/package.json` e `package-lock.json`; `src/lib/utils.ts` (`cn` no padrão shadcn: `twMerge(clsx(inputs))`); `src/components/ui/dialog.tsx` (único que importa `"cn"` direto, passa a `@/lib/utils`) |
| **O que muda** | O caminho `@/lib/utils` continua o mesmo nos 34 arquivos que o usam. Sai a dependência `cn`. |
| **Testes** | • Antes de trocar, roda um script no scratchpad que passa todas as 70 chamadas `cn(...)` estáticas pelos dois motores e lista as diferenças. <br>• Depois, as capturas pedidas: Início, Serviços, Perfil e Configurações, a 375 e 1440px, nos dois temas, antes e depois, comparadas por hash. Toda diferença é explicada. |
| **Risco** | Médio-baixo. O `tailwind-merge` sem configuração não conhece os tokens próprios (`text-danger`, `bg-glass`, `shadow-(--shadow-card)`) e pode agrupá-los diferente do `cn`. O script e as capturas pegam isso. |

Nos dois casos, o comportamento do `ServicoCard` com `w-full` (largura fixa a partir de `sm`) fica igual e vai para "Achados fora de escopo".

### A3. Código morto

| | |
|---|---|
| **Arquivos** | • `src/lib/mock/servicos.ts`: apagado. A pasta fica, com `pessoas`, `produtos` e `comunidade`. <br>• `src/app/globals.css`: saem as 13 linhas `--color-sidebar-*` e `--color-chart-*` do `@theme inline`, os 5 `--chart-*` e os 8 `--sidebar-*` do claro, e os 8 `--sidebar-*` do escuro. <br>• O `tailwind.config.mts` não tem esse mapeamento; nada a mudar ali. |
| **O que muda** | Nenhuma classe gerada é usada, então o CSS final só perde utilitários que nada referencia. |
| **Testes** | `check:cores`, `check:contrast`, `next build`. As capturas do A2 (ou do A6, se o A2 cair) confirmam que nada mudou. |
| **Risco** | Baixo. Um componente shadcn adicionado no futuro (`sidebar`, `chart`) vai precisar das variáveis de volta; o `npx shadcn add` as recria. |

### A4. Aviso do GSAP em `/login`

| | |
|---|---|
| **Arquivos** | `src/app/(auth)/login/login-form.tsx` e, se a reprodução apontar, `components/auth/auth-ui.tsx` ou `components/motion/page-transition.tsx` |
| **O que muda** | • Primeiro reproduzo com Playwright, capturando o `console` em `/login` sem sessão, para achar **qual** seletor está ausente. <br>• O suspeito é um alvo que só existe em parte dos estados (por exemplo, `[data-alert] [role=alert]` sem erro, ou um `[data-*]` que some quando o `status` muda para "redirecionando"). <br>• A correção guarda a animação: só cria o tween se o alvo existir (`root.current?.querySelector(...)`), sem mudar a animação de quem tem o alvo. <br>• `prefersReducedMotion()` continua sendo a primeira checagem. |
| **Testes** | Novo passo no e2e: abrir `/login`, `/cadastro` e uma página da casca logada, coletando `page.on("console")` de nível `warning` e `error`, e reprovar se houver algum. Os `pageErrors` atuais só pegam exceções. |
| **Risco** | Baixo. Se a ausência vier de outro arquivo, eu digo qual antes de mexer. |

### A5. E2E instável (passo 16, exclusão de conta a 440px)

| | |
|---|---|
| **Arquivos** | `e2e/fluxos.mjs` |
| **O que muda** | • **Investigar primeiro:** rodar a suíte em laço, com `trace` do Playwright ligado só no contexto principal, até reproduzir. A hipótese do registro é o login da linha 301: o `waitForURL(...).catch(() => {})` engole o tempo esgotado, e o `goto("/perfil")` do passo 16 chega antes do cookie de sessão. A causa real vai no changelog. <br>• **Corrigir por condição, não por tempo:** nesse caminho, trocar o `.catch(() => {})` por uma espera que falha com mensagem (URL `/inicio` e o heading "SkillHub" visível). <br>• Antes do passo 16, esperar a sessão estar pronta: o `h1` do Perfil, e não só o `goto`. <br>• Trocar as `waitForTimeout` do passo 16 (linha 902) por espera do `role=alert`. <br>• Timeouts não aumentam. Não mexo nas outras 40 esperas silenciosas: só nas do caminho que leva ao passo 16, para não mudar a suíte inteira (as outras vão para "Achados fora de escopo"). |
| **Testes** | Suíte completa **5 vezes seguidas**, relatando 5/5. |
| **Risco** | Médio. Se a causa for no app (por exemplo, o refresh do token correndo com a navegação), aviso antes de mexer, porque aí sai do "sem mudança de comportamento". |

### A6. "Excluir conta" desabilitado

| | |
|---|---|
| **Arquivos** | `src/components/app/delete-account-dialog.tsx` (e o "Cancelar pedido" de `servico-detalhe-dialog.tsx`, se você quiser o mesmo tratamento para o outro botão de perigo; ver pergunta 3) |
| **O que muda** | O desabilitado deixa de ser `danger-fill` a 40% e passa a uma superfície neutra, só com tokens: `disabled:bg-surface-2 disabled:text-foreground-secondary disabled:hover:brightness-100`, mantendo o `cursor-not-allowed` e sem opacidade extra. Nos dois temas, para ficar igual entre eles. |
| **Testes** | `check:contrast` não cobre estado desabilitado. Não invento exceção: capturas do diálogo vazio e preenchido, a 375 e 1440px, nos dois temas. O e2e já confere `isDisabled`/`isEnabled`. |
| **Risco** | Baixo. É mudança visual pequena, e é a única deste PR que muda a tela (de propósito). |

### A7. Organização dos `.md`

| | |
|---|---|
| **Movimentos (`git mv`, conteúdo intacto)** | • `docs/planos/`: `PLANO_16_1` a `PLANO_17D` (9) e este `PLANO_FAXINA.md`. <br>• `docs/especificacoes/`: `SKILLHUB_SIDEBAR_E_DOMINIO.md`, `SKILLHUB_CORES_E_TEMA.md`, `SKILLHUB_DESIGN_SYSTEM.md` e `SKILLHUB_FAXINA_PRE_FASE_18.md`. <br>• `docs/CHANGELOG_MIGRACAO.md`. |
| **Referências** | Todas as menções são **nomes de arquivo** entre crases, sem caminho, e os nomes não mudam, então continuam certas. Proposta: não reescrever as 90+ menções. Só ajustar as que dão um caminho explícito, se o `grep` final achar alguma. Ver pergunta 4. |
| **Validadores** | Nenhum lê `.md` (conferido). Rodo todos depois do movimento. |
| **Fica na raiz** | `.gitignore`, `docker-compose.yml`, `backend/`, `frontend/`, `e2e/`, `designs/`. Não existe `README` na raiz, e eu não crio. |
| **Risco** | Baixo. O `SKILLHUB_FAXINA_PRE_FASE_18.md` ainda não está no git (está como não rastreado); entra no PR já no lugar novo. O `:Zone.Identifier` do Windows ao lado dele não entra; apago o arquivo local ou ponho no `.gitignore` (pergunta 4). |

---

## 2. PR B: `feat/ajustes-dominio`

A branch sai da `main` depois do merge do PR A.

### B1. Conta da plataforma para a taxa

**Identificação:** `PLATFORM_ACCOUNT_ID`, com padrão fixo no código em `src/configs/creditos.ts`, como a taxa. O `.env` não é alterado.
- Valor: `00000000-0000-4000-8000-000000000001`, com e-mail `plataforma@skillhub.invalid` e nome "SkillHub".
- Por id, e não por e-mail, porque é o que as consultas usam.
- O domínio `.invalid` é reservado e nunca entrega e-mail.

| | |
|---|---|
| **Migration** (`prisma migrate dev --name taxa_recebida`, dentro do container) | `TAXA_RECEBIDA` no enum `TipoTransacao`. Nada mais no schema. |
| **Criação** | • `backend/scripts/garantir-conta-plataforma.ts` (`npm run plataforma:garantir`): `upsert` por id, sem senha, `profileComplete: true`, `perfil: null`. É idempotente. <br>• O seed chama a mesma função. Ela fica em `src/modules/credito/plataforma.ts`, para o `check:creditos` continuar tratando o módulo de créditos como o único dono do assunto. |
| **Pagamento** | `creditoService.pagar`, na mesma transação: com `taxa > 0`, `TAXA -taxa` no colaborador e `TAXA_RECEBIDA +taxa` na plataforma, os dois pelo `movimentar`. Com taxa 0, nada muda: nenhuma linha extra. <br>Se a conta da plataforma não existir e a taxa for maior que 0, o `concluir` falha com 500 e a mensagem "Conta da plataforma ausente; rode npm run plataforma:garantir" no log. A transação volta inteira, e o pedido não é concluído com dinheiro sumindo. |
| **Sem login** | A conta não tem senha nem `googleId`/`discordId`, então o `/auth/login` já responde "E-mail ou senha incorretos". Falta fechar duas portas: <br>• **"Esqueci a senha":** hoje geraria um link e deixaria definir uma senha. <br>• **OAuth que casa por e-mail.** <br>A proposta é uma checagem `ehContaPlataforma(id)` em `auth.service`, nesses dois caminhos e no login, tratando a conta como inexistente. É uma alteração mínima no módulo `auth`, que as fases 17 deixaram intocado. Ver pergunta 5. |
| **Oculta** | • `GET /usuarios/:id/resumo` e `GET /usuarios/:id/avaliacoes` dão 404 para ela. <br>• Ela nunca é parte de pedido, então não entra em médias nem em `AutorResumo`. <br>• Não há listagem nem busca de usuários hoje. Quando a Fase 18+ criar alguma, a regra fica registrada no changelog. |
| **Extrato** | Rótulo "Taxa recebida" no `ROTULO`. |
| **`check:creditos`** | Continua passando: o script e o `plataforma.ts` não escrevem `credits` fora do módulo. |

**Testes.** A taxa é lida do ambiente do processo, e o backend do compose roda com 0. O teste com 15% vira um script versionado, `backend/scripts/verificar-taxa.ts`.
- **Como roda:** o `fluxos.mjs` chama `docker compose exec -e PLATFORM_FEE_PERCENT=15 backend npx tsx scripts/verificar-taxa.ts`. A variável vale só para esse processo, e ele chama `servicoService`/`creditoService` direto, sem HTTP.
- **Com 15% e um pedido de 99:**
  - `RESERVA -99`, `RECEBIMENTO +99`, `TAXA -14` e `TAXA_RECEBIDA +14`;
  - colaborador com 85 e plataforma com +14;
  - extrato x saldo batendo para os três, inclusive a plataforma.
- **Invariante:** a soma de todos os saldos do banco antes e depois de reservar, concluir com taxa e cancelar com estorno é a mesma.
- **No e2e via HTTP:**
  - taxa 0, sem `TAXA` nem `TAXA_RECEBIDA` (estende o teste atual);
  - login, "esqueci a senha" e resumo da plataforma recusados;
  - um usuário comum que exclui a conta não muda o saldo nem o extrato da plataforma.
- **Limpeza:** para não sujar o extrato da plataforma real (o `run.sh` não a apaga, porque o e-mail não é `e2e.*`), o script roda com uma **conta de plataforma de teste** (`PLATFORM_ACCOUNT_ID` de teste no mesmo `-e`, e-mail `e2e.plataforma@example.com`), que o `cleanup` apaga como as outras. A conta real fica intocada.

**Risco:** médio. É o primeiro crédito "de sistema" e mexe no caminho do dinheiro. A cobertura é a do invariante e a do extrato x saldo.

### B2. Avaliações sobrevivem à exclusão de conta

**O documento precisa de um ajuste, senão a regra não funciona para o autor.** Hoje `Avaliacao.servico` também é `Cascade`, e `Servico.autor` é `Cascade`. Quando o **autor** exclui a conta, os pedidos dele somem e levam as duas avaliações de cada um, com ou sem `SetNull` no avaliador. É exatamente o caso do teste da 17D citado no documento (autor que avaliou o colaborador com 1 e sai). O `SetNull` sozinho só salva o caso do colaborador que sai.

**Proposta (pergunta 6):** `SetNull` também em `Avaliacao.servico`.

| | |
|---|---|
| **Migration** (`avaliacao_sobrevive`) | `avaliadorId String?` com `onDelete: SetNull`; `servicoId String?` com `onDelete: SetNull`; `avaliado` continua `Cascade`. |
| **Unicidade** | Mantenho `@@unique([servicoId, avaliadorId])`. No PostgreSQL, `NULL` não colide em índice único, então linhas anonimizadas não conflitam entre si. As linhas novas sempre têm os dois preenchidos, porque quem foi excluído não avalia mais, e aí o índice segue barrando a repetição e a corrida. <br>A troca por `(servicoId, avaliadoId)` sugerida no documento não ajuda: com `servicoId` nulo também não colide, e o par do avaliado é equivalente ao do avaliador num pedido de duas partes. Fica como está. |
| **API** | `toAvaliacaoResposta`: `avaliador` vira `null` quando a conta foi excluída, e `servico` vira `null` quando o pedido sumiu. Nunca há id, nome ou foto de quem saiu. |
| **Média** | Já é calculada por `avaliadoId`, então continua contando. |
| **Frontend** | • `types/avaliacao.ts`: `avaliador: AutorResumo \| null`. <br>• `servico-detalhe-dialog.tsx`: "Avaliação de Usuário removido", com o avatar de iniciais neutro, e o `find` de "minha" com `?.`. <br>Não existe hoje tela com a lista pública de avaliações de um usuário (o Perfil usa só o resumo), então é só esse ponto. |
| **Testes ajustados** | • "Autor que exclui a conta": a avaliação continua, o colaborador fica com média 3,5 e total 4 (não muda), e a lista pública mostra `avaliador: null`, `servico: null`, sem nenhum campo do excluído. <br>• "Colaborador que saiu": a nota 2 que ele deu ao autor continua, e o resumo do autor passa a total 2. <br>• A consulta `orfas()` passa a contar só o avaliado sem usuário. |
| **Testes novos** | O detalhe do pedido na tela mostra "Usuário removido". |
| **Risco** | Médio. Muda o resultado de dois testes da 17D de propósito, e o ImpactScore (Fase 22) passa a ver avaliações sem pedido. |

### B3. Exclusão bloqueada com pedido em andamento

| | |
|---|---|
| **Arquivos** | • `modules/user/user.service.ts` (`deleteAccount`), que chama uma checagem nova `servicoService.temPedidoEmAndamento(userId)` (autor **ou** `colaboradorId` com `status = EM_ANDAMENTO`), depois de validar a senha e antes de apagar. <br>• `servico.repository.ts`, com a consulta. |
| **Regra** | 409 "Conclua ou cancele seus pedidos em andamento antes de excluir a conta". <br>A senha é validada antes, para o 409 não revelar nada a quem não tem a senha. <br>Pedidos abertos e candidaturas pendentes continuam caindo em cascata. |
| **Tela** | O `delete-account-dialog.tsx` já mostra `getApiErrorMessage(err)` no `FormAlert`. Confiro na captura que a frase longa quebra bem a 375px e que o diálogo continua aberto e utilizável. Se precisar, ajusto só o layout do alerta. |
| **Testes ajustados** | Os cenários "em andamento sem colaborador" (17B, linha 574, e 17C, "colaborador aceito que sai") deixam de ser alcançáveis pela API, mas o código de `concluir` (409 "Cancele o pedido") e de `cancelar` (estorno) continua existindo para dados antigos. Reconstruo o estado com **SQL de teste**: `delete from "User" where id = ...`. É o mesmo `ON DELETE SET NULL` do banco que a exclusão pelo app disparava antes, então o cenário é idêntico ao real de antes. A alternativa do documento (excluir antes da aceitação) não chega lá: a candidatura cai junto, e não há quem aceitar. |
| **Testes novos** | • 409 para autor com pedido em andamento. <br>• 409 para colaborador aceito. <br>• 200 (204, como hoje) depois de concluir e depois de cancelar. <br>• Pedidos abertos do autor somem na exclusão. <br>• Senha errada com pedido em andamento continua 403 (a senha vem antes). <br>• Na tela: o diálogo mostra a mensagem do 409. |
| **Risco** | Médio. Mexe no módulo `user`, que as fases 17 deixaram intocado; aqui é inevitável, porque a exclusão mora nele. |

---

## 3. Decisões (as da Seção 5 do documento e as que este plano acrescenta)

| Tema | Decisão | Origem |
|---|---|---|
| Conta da plataforma | Oculta, sem login, por `PLATFORM_ACCOUNT_ID` com padrão no código; e-mail `.invalid` | Documento + plano |
| Bloqueio de login da plataforma | Checagem mínima em `auth.service` (login, "esqueci a senha", OAuth por e-mail) | Plano (pergunta 5) |
| Taxa com conta da plataforma ausente | 500 e rollback; nunca conclui com dinheiro sumindo | Plano |
| Teste com taxa 15% | Script versionado rodado no container com a variável só no processo, chamado pelo e2e, com conta de plataforma de teste | Plano |
| Avaliações | `SetNull` no avaliador, `Cascade` no avaliado, **`SetNull` no serviço**; `null` na API e "Usuário removido" na tela | Documento + plano (pergunta 6) |
| Unicidade da avaliação | Mantém `(servicoId, avaliadorId)` | Plano |
| Exclusão com pedido em andamento | 409 para autor e colaborador aceito, depois da senha | Documento |
| Testes de "colaborador que saiu" | Estado reconstruído com `delete` por SQL | Plano |
| `cn` | **Manter o `cn` atual** (já é `clsx` + `tailwind-merge` em um) | Plano contesta o documento (pergunta 1) |
| Variáveis CSS | Remover `--sidebar-*` e `--chart-*`; nenhum uso | Documento, confirmado |
| E2E instável | Causa raiz, só no caminho do passo 16, 5/5 | Documento |
| Botão perigoso desabilitado | Superfície neutra (`surface-2` e `foreground-secondary`), nos dois temas | Plano |
| Referências aos `.md` | Só nomes, que não mudam; reescrever só caminhos explícitos | Plano (pergunta 4) |

## 4. Ordem dos commits

**PR A (`chore/faxina`):**
1. A7, movimento dos `.md` (primeiro, para os outros itens já editarem `docs/CHANGELOG_MIGRACAO.md`)
2. A3, código morto
3. A2, se aprovado
4. A4, GSAP
5. A6, botão desabilitado
6. A5, e2e (por último, para as 5 rodadas valerem com tudo junto)
7. A1, changelog

**PR B (`feat/ajustes-dominio`):**
1. Migration e B2
2. Migration e B1
3. B3
4. Testes
5. Changelog

Em cada PR:
- **Validadores:** `prisma migrate status`, `tsc` (front e back), `eslint`, `next build`, `check:cores`, `check:contrast`, `check:creditos` e `./e2e/run.sh`.
- **Contagem de testes:** antes e depois.
- **Capturas:** quando houver mudança visual.
- **"Achados fora de escopo"**, que já tem estes candidatos:
  - `ServicoCard` com `w-full` fixo a partir de `sm`;
  - as outras esperas silenciosas do e2e;
  - comentários de código que citam `SKILLHUB_PAGINAS_DESIGN.md` e `SKILLHUB_RESPONSIVO_DESKTOP.md`, que não existem neste repositório (`bottom-nav.tsx`, `navegacao.ts`, `profile-dialog.tsx`, `page-container.tsx`, `use-drag-scroll.ts`).

## 5. Perguntas

1. **A2:** o `cn` atual já resolve conflitos (tabela da Seção 0). Posso **retirar o A2** do PR A? Ou você prefere trocar mesmo assim por `clsx` + `tailwind-merge`, com o script de comparação e as capturas?
2. **A1:** as 17A a 17D também estão mergeadas, mas dizem "PR aberto". Atualizo para "Concluída" junto com as 16.x? O documento só cita as 16.x.
3. **A6:** aplico o mesmo desabilitado neutro ao "Cancelar pedido" do detalhe, o outro botão de perigo? Hoje ele nunca fica desabilitado por regra, só durante o envio.
4. **A7:** posso deixar as menções por nome como estão (continuam certas)? E o `SKILLHUB_FAXINA_PRE_FASE_18.md:Zone.Identifier` do Windows: apago o arquivo local, ou ponho `*:Zone.Identifier` no `.gitignore`?
5. **B1:** posso fazer a alteração mínima no `auth.service`, para "esqueci a senha" e OAuth não abrirem a conta da plataforma? Sem ela, alguém com acesso à caixa daquele e-mail (em dev, o Mailpit) conseguiria definir uma senha.
6. **B2:** posso pôr `SetNull` também em `Avaliacao.servico`? Sem isso, a avaliação continua sumindo quando quem sai é o **autor**, que é o caso que o documento quer corrigir.
