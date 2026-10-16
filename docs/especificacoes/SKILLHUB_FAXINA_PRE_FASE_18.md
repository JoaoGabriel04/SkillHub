# SkillHub: Faxina antes da Fase 18

Documento de instrução para o Claude Code. Segue o padrão de gate de aprovação: **nada é escrito, instalado ou migrado antes de o Gabriel aprovar o plano (Etapa 0)**.

Origem: revisão das Fases 16 e 17A a 17D (PRs #12 a #15, main em `5a935af`). Todas as recomendações da revisão entram aqui.

---

## 1. Regras (valem para tudo)

1. **Gate:** primeiro entregue `PLANO_FAXINA.md` (Etapa 0) e pare. Só implemente depois de "aprovado" explícito.
2. **Dois PRs separados**, na ordem abaixo. Cada um com branch própria a partir da `main` atualizada. Quem faz o merge é o Gabriel.
   - **PR A (`chore/faxina`):** itens A1 a A7. Não muda comportamento do produto.
   - **PR B (`feat/ajustes-dominio`):** itens B1 a B3. Muda regras de negócio e inclui migration.
3. Migrations só com `prisma migrate dev`, nunca editar migration existente.
4. Nada de dependência nova além de `clsx` e `tailwind-merge` (item A2). Qualquer outra, pare e pergunte.
5. Sem emojis na interface. Ícones só Lucide React ou FontAwesome. GET no frontend continua com SWR.
6. Não tocar em nada fora dos itens abaixo. Se achar outro problema, registre em "Achados fora de escopo" do changelog, não corrija.
7. Antes de dar por concluído, rodar e relatar: `prisma migrate status`, `tsc` (front e back), `eslint`, `next build`, `check:cores`, `check:contrast`, `check:creditos` e `./e2e/run.sh`. Informar o total de testes antes e depois.
8. **Organização de documentos (vale daqui em diante):** nenhum `.md` novo na raiz do repositório. Planos de fase vão em `docs/planos/`, especificações em `docs/especificacoes/`, e o changelog em `docs/`. Um único arquivo de plano por fase ou faxina (ex.: `docs/planos/PLANO_FAXINA.md`), sem criar arquivos extras para sub-partes além do plano e do changelog.
9. Documentar no `CHANGELOG_MIGRACAO.md` no mesmo padrão das entradas existentes (Contexto, Validação, Achados fora de escopo), com status correto.

---

## 2. Etapa 0: plano (obrigatório, sem escrever código)

Entregar `PLANO_FAXINA.md` (em `docs/planos/` se o A7 já estiver aprovado; senão na raiz, e o A7 o move) com, para cada item abaixo: arquivos que serão tocados, o que muda, testes novos ou ajustados, risco. Incluir as decisões já tomadas (seção 5) para o Gabriel poder contestar. Depois **parar e aguardar aprovação**.

---

## 3. PR A: faxina (sem mudança de comportamento)

### A1. Changelog em dia
- Trocar o status de "aguardando conferência visual e PR" para "Implementado, conferido, PR aberto" (ou "Concluída" se já mergeado) nas entradas 16.1 a 16.5 e "Ajuste pós-16.4 (switch de tema)". Conferir no histórico do git/PRs qual é o status real de cada uma antes de editar.
- Criar entradas para os PRs #4 e #6 (animações e transições da sidebar), no formato padrão, com o que mudou e como foi verificado. Se faltar informação para a validação, escrever apenas o que o git mostra e marcar "validação não registrada na época".
- Registrar neste PR a própria faxina.

### A2. `cn` com `clsx` + `tailwind-merge`
- Hoje `cn` é `export { cn } from "cn"` e não resolve conflitos de classes do Tailwind.
- Instalar `clsx` e `tailwind-merge`, criar `cn` no padrão shadcn em `lib/utils.ts` (ou onde o `cn` atual é reexportado, mantendo o mesmo caminho de import para não alterar centenas de arquivos).
- Remover a dependência `cn` antiga se nada mais a usar.
- Revisar usos que dependem da ordem das regras no CSS (ex.: `ServicoCard` com `w-full` na lista de resultados) e confirmar que o resultado visual é o mesmo.
- **Verificação visual obrigatória:** capturas antes e depois de Início, Serviços, Perfil e Configurações, a 375 e 1440px, nos dois temas, comparadas byte a byte como nas fases anteriores. Qualquer diferença deve ser explicada.

### A3. Remover código morto
- Apagar `lib/mock/servicos.ts` se `grep` confirmar zero importações. Se a pasta `lib/mock` ficar vazia, remover.
- Remover as variáveis `--sidebar-*` e `--chart-*` do CSS e do mapeamento do Tailwind **somente se** nenhum componente (inclusive shadcn) as referenciar. Mostrar o `grep` no plano. Se algum componente shadcn usar, manter só as usadas.
- Garantir `check:cores` e `check:contrast` passando depois.

### A4. Aviso do GSAP em `/login`
- Corrigir o aviso "target not found" em `/login` sem sessão: guardar a animação para só rodar quando o alvo existir (ref nula ou seletor ausente), mantendo `prefers-reduced-motion`.
- Confirmar zero warnings no console em `/login`, `/cadastro` e na casca logada.

### A5. E2E instável (excluir conta a 440px)
- Investigar a causa raiz do passo 16 (exclusão de conta a 440px): espera sem condição, animação, sobreposição de elemento ou dado compartilhado.
- Corrigir esperando por condição (não por tempo fixo) e rodar a suíte completa **5 vezes seguidas**; relatar 5/5 verdes.
- Não aumentar timeouts como solução.

### A6. Botão "Excluir conta" desabilitado no tema claro
- Hoje fica rosado. Deve usar tokens semânticos de estado desabilitado (opacidade ou cor de superfície neutra), legível e coerente com os outros botões desabilitados.
- Rodar `check:contrast`. Se o desabilitado não entra no validador, não inventar exceção: apenas conferir visualmente nos dois temas e anexar capturas.

### A7. Organizar os `.md` do repositório
Hoje a raiz tem 14 arquivos `.md` misturados (PLANO_16_1 a PLANO_17D, SKILLHUB_*, CHANGELOG). Os planos são o registro do gate de aprovação de cada fase, então ficam no histórico, mas fora da raiz.
- Estrutura alvo:
  - `docs/planos/`: `PLANO_16_1.md` a `PLANO_17D.md` e os próximos.
  - `docs/especificacoes/`: `SKILLHUB_SIDEBAR_E_DOMINIO.md`, `SKILLHUB_CORES_E_TEMA.md`, `SKILLHUB_DESIGN_SYSTEM.md`, este documento da faxina.
  - `docs/CHANGELOG_MIGRACAO.md`.
  - Raiz: só `README`, `docker-compose`, `.gitignore` e as pastas de código (`backend`, `frontend`, `e2e`, `designs`).
- Mover com `git mv` (preserva histórico), sem alterar o conteúdo dos arquivos.
- Atualizar **todas** as referências aos caminhos antigos: links entre os `.md`, `README`, `CLAUDE.md` (se existir), scripts (`check-*.mjs`, e2e) e comentários no código. Mostrar no plano o `grep` por cada nome de arquivo movido.
- Conferir que nenhum script ou validador lê um `.md` pelo caminho antigo (`check:cores`, `check:creditos`, etc.) e que continuam passando.
- Não apagar nenhum plano nem mesclar arquivos: só reorganizar.

---

## 4. PR B: ajustes de domínio (mudam regra de negócio)

### B1. Conta da plataforma para receber a taxa
Problema: com `PLATFORM_FEE_PERCENT > 0`, a linha `TAXA` sai do colaborador e não entra em nenhuma conta.
- Criar uma conta de sistema da plataforma, identificada por configuração (`PLATFORM_ACCOUNT_ID` ou e-mail fixo em variável de ambiente), criada pelo seed e por script idempotente. Ela **não faz login** (sem senha utilizável) e **não aparece** em listagens, busca, perfis públicos nem médias.
- Quando a taxa for maior que 0, o `concluir` credita a taxa nessa conta com uma linha `TAXA_RECEBIDA` (novo valor do enum de tipo, via migration), na mesma transação, pelo mesmo ponto único de escrita em `User.credits` (`credito.service`/`credito.repository`). O `check:creditos` deve continuar garantindo que só ali se escreve saldo.
- Taxa 0 (padrão do piloto): nenhuma linha extra, comportamento idêntico ao atual.
- Invariante a testar: a soma de todos os saldos (incluindo a plataforma) é conservada em reserva, pagamento e estorno; extrato x saldo bate também para a conta da plataforma.
- Testes: taxa 15% com pedido de 99 (`floor(14,85) = 14`), colaborador com 85, plataforma com 14; taxa 0 sem linha extra; conta da plataforma ausente de listagens e do login; exclusão de conta de usuário comum não afeta a plataforma.

### B2. Avaliações sobrevivem à exclusão de conta
Problema: `onDelete: Cascade` no avaliador apaga a avaliação recebida pelo outro, perdendo histórico para o ImpactScore (Fase 22).
- `Avaliacao.avaliador`: `onDelete: SetNull`, com `avaliadorId` opcional (migration).
- `Avaliacao.avaliado`: manter `Cascade` (se quem é avaliado sai, a avaliação sobre ele some, pois o perfil deixa de existir).
- Anonimizar: a avaliação de autor excluído aparece como "Usuário removido", sem nome nem foto, e continua contando na média de quem foi avaliado.
- Restrição de unicidade (um par por pedido) deve continuar válida com `avaliadorId` nulo (conferir comportamento de índice único com NULL no PostgreSQL e ajustar se necessário, por exemplo unique em `(servicoId, avaliadoId)`).
- Ajustar o teste "Exclusão de conta" da 17D: a avaliação deixa de sumir; a média de quem fica **não** muda; a lista pública mostra "Usuário removido" sem vazar dados.

### B3. Exclusão de conta com pedido em andamento
Problema: autor que exclui a conta com pedido em andamento apaga o pedido e os créditos reservados, e o colaborador não é avisado.
- Regra: **bloquear a exclusão (409)** enquanto a pessoa for autora de pedido "em andamento" **ou** colaboradora aceita de pedido em andamento, com mensagem clara em português ("Conclua ou cancele seus pedidos em andamento antes de excluir a conta").
- Cancelar o pedido continua estornando ao autor (comportamento atual), então o caminho para quem quer sair existe.
- Pedidos abertos e candidaturas pendentes continuam sendo removidos na exclusão como hoje.
- Tela: o diálogo de exclusão mostra a mensagem do 409 de forma legível, sem quebrar o fluxo.
- Atualizar os testes de exclusão que hoje assumem que dá para excluir com pedido em andamento (a 17C testa "colaborador que saiu": reconstruir esse cenário de outro jeito, por exemplo com a exclusão acontecendo antes da aceitação, ou por SQL de teste, e explicar a escolha no plano).
- Testes novos: 409 para autor com pedido em andamento; 409 para colaborador aceito; 200 após concluir ou cancelar; pedidos abertos somem.

---

## 5. Decisões já tomadas (contestáveis na Etapa 0)

| Tema | Decisão |
|---|---|
| Conta da plataforma | Conta de sistema oculta, sem login, configurada por variável de ambiente |
| Avaliações | `SetNull` no avaliador, `Cascade` no avaliado, exibição "Usuário removido" |
| Exclusão com pedido em andamento | Bloquear com 409 (autor e colaborador aceito) |
| `cn` | `clsx` + `tailwind-merge`, mantendo o caminho de import atual |
| Variáveis CSS não usadas | Remover só se `grep` provar que ninguém usa |
| E2E instável | Corrigir causa raiz, validar 5 execuções seguidas |

---

## 6. Fora de escopo (não fazer)

- Distância nos pedidos, bônus automático de créditos, qualquer coisa da Fase 18 em diante.
- Média do colaborador na lista de candidaturas (fica como sugestão para depois).
- Redesenhar telas ou mexer na paleta.

---

## 7. Entrega esperada

1. `PLANO_FAXINA.md` (Etapa 0) e pausa para aprovação.
2. PR A com A1 a A6 e changelog.
3. PR B com B1 a B3, migrations e changelog.
4. Em cada PR: resumo do que mudou, resultado de todos os validadores, contagem de testes antes e depois, capturas quando houver mudança visual, e "Achados fora de escopo".
