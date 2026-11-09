# Plano da subfase 18A: catálogo de produtos e contato

> Segue `docs/especificacoes/SKILLHUB_PRODUTOS_LOJA.md` (Seções 1, 3, 4 e 7) e o padrão dos planos da Fase 17.
> **Status: aprovado pelo João Gabriel em 03/11/2026** ("faça o recomendado"): todas as recomendações da Seção 9 (D1, D2, D3, D5, D8 a D15). Implementado na `feat/produtos-catalogo`; o registro está no `CHANGELOG_MIGRACAO.md`.

## 0. Estado real do repositório (conferido em 03/11/2026)

- **Base:** `origin/main` em `26ba19d` (merge do PR #17, ajustes de domínio). É a mesma que o documento cita.
- **Branch:** `feat/produtos-catalogo`, criada a partir de `origin/main`.
  - A `main` local estava atrasada (`e98935d`) e foi adiantada para `26ba19d`.
  - Dois arquivos de migration do PR #17 pertencem ao `root`, porque foram criados pelo `prisma migrate dev` dentro do container. O `git checkout` não consegue apagá-los nem regravá-los. Como o conteúdo deles é idêntico ao da `main`, a troca de branch foi feita sem tocar neles. **Isto não é problema do código, mas vai se repetir em toda migration nova criada no container.** Sugestão (fora de escopo): `sudo chown -R $USER backend/prisma/migrations`.
- **Documento:** `SKILLHUB_PRODUTOS_LOJA.md` estava na raiz, fora do git. Foi **movido** sem alteração para `docs/especificacoes/` (a raiz não deve ter `.md` novo, regra 12).
  - `SKILLHUB_DECISOES_SKILLMATCH_IMPACTSCORE.md` também está na raiz, fora do git e fora desta fase. **Não toquei nele.**
- **O que o documento descreve e confere:**
  - o mock em `frontend/src/lib/mock/produtos.ts`, com 7 produtos, 5 categorias e 2 destaques;
  - a página `/produtos`, que filtra o mock no cliente;
  - `ProdutoCard` com "Em breve";
  - não existe model, módulo nem rota de produto;
  - `multer` com a assinatura dos bytes, 5 MB, JPEG/PNG/WEBP;
  - `destroyAsset` com "melhor esforço" (não lança);
  - `AutorResumo`, `credito.service`, `PLATFORM_FEE_PERCENT` com padrão 0 e conta da plataforma;
  - avaliações com `servicoId` opcional (`SetNull`) e média por consulta (`avaliacaoService.mediaETotal`).
- **O que está diferente ou o documento não diz:**
  1. **O Início é Server Component** (`inicio/page.tsx` é `async` e chama `getProdutos()` do mock no servidor). A API exige o token, que só existe no navegador. Por isso a seção de Produtos vira um componente cliente, igual ao `ServicosRecentes` da 17A. O markup e as classes não mudam.
  2. **`multer` hoje só aceita um arquivo** (`singleFile`). É preciso um segundo formato, de vários arquivos (1 a 4), com as mesmas regras.
  3. **`uploadBuffer` usa `public_id` fixo por usuário** (para o avatar substituir o anterior). As fotos de produto precisam de um id por foto. A função já aceita o `publicId`, então não muda.
  4. **O cadastro de Empresa está desabilitado na tela** ("Em produção", e2e passo 9). Pela API ele existe. Na prática, nesta fase só Colaborador publica pela tela. Empresa publica pela API e pelo seed, e o e2e cobre os dois.
  5. **`lib/mock/pessoas.ts` só é usado por `lib/mock/produtos.ts`.** Quando a parte de produtos sair do mock (4.3), ele fica sem uso. O documento deixa essa limpeza para a 18C, e o plano respeita isso (ver risco R6).
  6. **Telefone:** o cadastro pela tela grava com máscara, como `(11) 98765-4321`. O e2e grava só os dígitos. A normalização (3.5) cobre os dois casos.
- **Último total do e2e no changelog:** 228/228. Confirmo o número na base antes de começar.

## 1. Arquivos

### 1.1. Backend

| Arquivo | O quê |
|---|---|
| `prisma/schema.prisma` + migration `produto` (via `prisma migrate dev` no container) | Enums e models da Seção 2 deste plano. No `User`, só a relação inversa `produtosVendidos`. |
| `src/modules/produto/categoria.map.ts` | **Novo.** Rótulos x enum, no mesmo formato do `categoria.map.ts` dos serviços. |
| `src/modules/produto/produto.schema.ts` | **Novo.** Zod: criar, atualizar, listar (com coerção, porque o multipart chega como texto). |
| `src/modules/produto/produto.repository.ts` | **Novo.** Única escrita em `Produto.estoque` e em `ProdutoImagem`. Escrita condicional (`updateMany`) no status e na troca de fotos. |
| `src/modules/produto/produto.service.ts` | **Novo.** Regras, `toProdutoResumo` / `toProdutoDetalhe`, upload e limpeza no Cloudinary, link do WhatsApp. |
| `src/modules/produto/produto.controller.ts` | **Novo.** `handleError` igual ao de `servico`. |
| `src/modules/produto/whatsapp.ts` | **Novo.** Normalização do telefone e montagem do `wa.me` (função pura, para testar isolada). |
| `src/api/routes/produto.route.ts` + `src/api/routes/index.ts` | **Novo** router `/produtos` com `authenticate`. `/meus` declarado antes de `/:id`. |
| `src/configs/multer.ts` | Novo `produtoFotosUpload` (campo `fotos`, até 4 arquivos), com o mesmo `imageKind` e as mesmas mensagens. O `singleFile` e os dois uploads atuais ficam como estão. |
| `src/modules/user/user.service.ts` | `deleteAccount`: antes de apagar, lê os `publicId` das fotos dos produtos do vendedor. Depois do `delete` (os produtos caem em cascata), apaga as fotos no Cloudinary junto do avatar e do currículo, com "melhor esforço". Leitura feita pelo `produtoService`; o `user.repository` não muda. |
| `prisma/seed.ts` | 8 produtos (4.4 do documento) e 1 vendedora Empresa de seed. |
| `e2e/run.sh` | `cleanup` também apaga do Cloudinary as fotos de produto dos usuários `e2e.*` (lidas da tabela `ProdutoImagem` antes do `delete`), para cobrir execuções interrompidas. |
| `e2e/fluxos.mjs` | Seção nova `15i. Produtos (Fase 18A)` (lista na Seção 5) e as imagens de teste: um JPEG, um WEBP e um arquivo de 5 MB + 1 byte. |

### 1.2. Frontend

| Arquivo | O quê |
|---|---|
| `src/types/produto.ts` | **Novo.** `CATEGORIAS_PRODUTO`, `ProdutoResumo`, `ProdutoDetalhe`, `StatusProduto` ("Ativo" \| "Pausado"). |
| `src/lib/produtos.ts` | **Novo.** Cliente da API, chaves do SWR e `revalidarProdutos()`, no padrão de `lib/servicos.ts`. |
| `src/lib/validation/produto.ts` | **Novo.** As mesmas regras do backend, mais as das fotos (tipo, 5 MB, 1 a 4). |
| `src/lib/mock/produtos.ts` | Sai tudo de produto. Ficam só `Destaque`, `DESTAQUES_MOCK` e `getDestaques`, com o comentário "campanhas da plataforma, estáticas até a Fase 19". |
| `src/components/app/produto-card.tsx` | Lê `ProdutoResumo`. Preço "N créditos", capa da API, etiqueta ("Esgotado" / "Pausado"), sem "(Jovem aprendiz)". O clique abre o detalhe. |
| `src/components/app/produto-card-esqueleto.tsx` | **Novo.** O contorno do card com blocos, como o `ServicoCardEsqueleto`. |
| `src/components/app/produto-detalhe-dialog.tsx` | **Novo.** Detalhe (Seção 4.2), mais `ProdutoModais` (detalhe ou edição), como o `ServicoModais`. |
| `src/components/app/publicar-produto-dialog.tsx` | **Novo.** Publicar e editar (Seção 4.3). |
| `src/app/(app)/produtos/page.tsx` | Lê a API. Filtros no servidor, "Seus produtos", "Publicar", estados de carregando, vazio e erro. |
| `src/app/(app)/inicio/produtos-relevantes.tsx` | **Novo.** A seção "Produtos Relevantes" como componente cliente, com **o mesmo markup** de hoje. |
| `src/app/(app)/inicio/page.tsx` | Troca o bloco da seção por `<ProdutosRelevantes />` e deixa de importar o mock. O resto não muda. |
| `src/app/(app)/inicio/mock.ts` | Só o comentário do topo ("produtos do Início vêm da API"). |

**Sem dependência nova** (back e front). A troca de ordem das fotos usa botões, sem biblioteca de arrastar.

### 1.3. Documentação

- `docs/planos/PLANO_18A.md` (este arquivo).
- `docs/especificacoes/SKILLHUB_PRODUTOS_LOJA.md` (movido da raiz, sem alteração).
- Entrada da 18A no `docs/CHANGELOG_MIGRACAO.md`, no padrão existente.

## 2. Schema Prisma final

```prisma
enum CategoriaProduto {
  ARTE_DECORACAO
  ALIMENTOS_BEBIDAS
  MODA_ACESSORIOS
  SERVICOS_DIGITAIS
  EDUCACAO_APOSTILAS
}

enum StatusProduto {
  ATIVO
  PAUSADO
  REMOVIDO // exclusão lógica (o histórico de pedidos da 18B usa snapshots)
}

// Produtos da loja (Fase 18A). Preço em créditos; estoque só é escrito pelo produto.repository.
model Produto {
  id            String           @id @default(uuid())
  nome          String           // 3 a 80
  descricao     String           // 10 a 1000
  categoria     CategoriaProduto
  preco         Int              // em créditos, >= 1
  estoque       Int              // >= 0; 0 = "Esgotado" (continua visível, sem compra)
  digital       Boolean          @default(false) // sem frete: o "envio" é a entrega digital
  whatsappAtivo Boolean          @default(true)
  status        StatusProduto    @default(ATIVO)
  vendedorId    String
  vendedor      User             @relation("ProdutosVendidos", fields: [vendedorId], references: [id], onDelete: Cascade)
  imagens       ProdutoImagem[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([status, categoria, createdAt])
  @@index([vendedorId])
}

model ProdutoImagem {
  id        String  @id @default(uuid())
  produtoId String
  produto   Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  url       String
  publicId  String? // Cloudinary; null nas fotos do seed
  ordem     Int     // 0 = capa

  @@index([produtoId])
}
```

No `User`: `produtosVendidos Produto[] @relation("ProdutosVendidos")`.

**Desvios do documento: nenhum no schema.** Considerei e descartei estes:
- **`@@unique([produtoId, ordem])`:** reordenar fotos exigiria duas passadas (ordens temporárias) só para não violar o índice. A ordem é regravada inteira, de 0 a n-1, dentro de uma transação que trava o produto (3.4). Isso já garante a consistência.
- **`@db.VarChar(80)` em `nome`:** os serviços não usam e o limite fica no Zod. Mantive o padrão.
- **CHECK de `estoque >= 0` e `preco >= 1` no banco:** o Prisma não gera CHECK sem SQL à mão na migration, e a regra 4 pede só `prisma migrate dev`. A garantia fica no Zod e, na 18B, no `updateMany` condicional (`estoque >= quantidade`).

## 3. Backend

### 3.1. Formato das respostas

Rótulos no lugar dos enums, como em `servico`:
- **categoria:** "Arte e Decoração", "Alimentos e Bebidas", "Moda e Acessórios", "Serviços Digitais", "Educação e Apostilas";
- **status:** "Ativo", "Pausado". `REMOVIDO` nunca sai na API.

```ts
// GET /produtos e GET /produtos/meus (meus acrescenta status e whatsappAtivo)
ProdutoResumo = { id, nome, preco, estoque, categoria, digital, capaUrl: string | null, vendedor: AutorResumo, createdAt }

// GET /produtos/:id, POST, PATCH
ProdutoDetalhe = ProdutoResumo & {
  descricao, status, whatsappAtivo,
  imagens: { id, url, ordem }[],               // sem publicId
  vendedorReputacao: { media: number | null, total: number }, // avaliacaoService.mediaETotal
  contatoDisponivel: boolean,                   // ativo && whatsappAtivo && vendedor com telefone
  updatedAt,
}
```

- **Fora de toda resposta de produto:** telefone, e-mail, CPF, CNPJ, endereço, nascimento e `publicId`.
  - O vendedor sai do banco com `AUTOR_RESUMO_SELECT`.
  - Para `contatoDisponivel`, o repositório lê **só** `phone: true` numa consulta à parte e devolve um booleano. O telefone nunca entra no objeto que vira resposta.
- **`contatoDisponivel` não estava no documento.** Ele permite mostrar "O vendedor não disponibilizou contato" sem um clique que daria 404. Ele revela só se existe telefone, informação que o 404 do `/contato` já revelaria. Ver decisão D8.

### 3.2. Endpoints (todos com `authenticate`)

| Rota | Regra | Erros |
|---|---|---|
| `GET /produtos` | Só `ATIVO` e `vendedorId != eu`. Filtros: `categoria` (rótulo), `busca` (até 100; `contains` sem diferenciar maiúsculas em nome, descrição e `vendedor.fullName`), `limit` 1 a 50 (padrão 20), `cursor` UUID. Ordem `createdAt desc, id desc`, `take limit+1`. Resposta `{ produtos, nextCursor }`. | 400 (filtro inválido), 401 |
| `GET /produtos/meus` | Todos os meus, menos `REMOVIDO`, com status, mais recentes primeiro. `{ produtos }`. Antes de `/:id`. | 401 |
| `GET /produtos/:id` | `ATIVO` para todos; `PAUSADO` só para o dono; `REMOVIDO`, inexistente ou id que não é UUID dá 404, sem consultar o banco no último caso. | 401, 404 |
| `POST /produtos` | Multipart: campos + `fotos` (1 a 4). Só `perfil` Colaborador ou Empresa com `profileComplete`. Ordem: (1) multer (tipo, tamanho, quantidade, assinatura); (2) Zod; (3) perfil; (4) upload ao Cloudinary; (5) `create` com as imagens numa escrita só. Se (5) falhar, as fotos enviadas são apagadas (melhor esforço). | 400, 401 (conta sumiu), 403 ("Só colaboradores e empresas vendem produtos" / "Complete seu perfil para publicar um produto"), 502 (Cloudinary) |
| `PATCH /produtos/:id` | Só o dono, não `REMOVIDO`. Aceita JSON (campos e `status`) ou multipart (campos + `fotos` novas + `imagens`). Detalhe em 3.4. `vendedorId` no corpo é descartado pelo Zod (`strip`). | 400, 401, 403 ("Só quem publicou pode alterar o produto"), 404 |
| `DELETE /produtos/:id` | Só o dono. `updateMany where { id, vendedorId, status != REMOVIDO }` → `REMOVIDO`. Depois, `destroyAsset` de cada foto (melhor esforço). As linhas de `ProdutoImagem` ficam, porque a 18B lê a capa, mas a URL deixa de abrir (ver R4). Responde 204. Repetir dá 404. | 401, 403, 404 |
| `GET /produtos/:id/contato` | 3.5 do documento. Dono → 400 "Este produto é seu". Produto não visível → 404 "Produto não encontrado". `PAUSADO` para quem não é dono → 404. Ativo sem telefone ou com `whatsappAtivo` desligado → 404 "O vendedor não disponibilizou contato". | 400, 401, 404 |

**Validação** (o mesmo Zod no criar e, `partial()`, no editar):
- `nome`: trim, 3 a 80.
- `descricao`: trim, 10 a 1000.
- `categoria`: um dos 5 rótulos.
- `preco`: `z.coerce.number().int().min(1)`. "0", "1.5", "" e "abc" dão 400.
- `estoque`: `int().min(0)`, com teto de 9999 (desvio pequeno: o documento não dá teto, e o teto evita estouro do `Int`).
- `digital` e `whatsappAtivo`: booleano ou `"true"`/`"false"` (multipart).
- `status` (só no PATCH): "Ativo" ou "Pausado".

**Erros de upload** (as mesmas mensagens de hoje, mais as de quantidade):

| Caso | Status | Mensagem |
|---|---|---|
| 0 fotos | 400 | "Envie de 1 a 4 fotos" |
| 5 ou mais | 400 | "Envie no máximo 4 fotos" |
| Tipo ou assinatura inválidos | 400 | "Tipo de arquivo inválido. Envie JPEG, PNG ou WEBP" / "Conteúdo do arquivo não corresponde a JPEG, PNG ou WEBP" |
| Acima de 5 MB | 400 | "Arquivo excede o limite de 5MB" |

### 3.3. Fotos no Cloudinary

- **`public_id`:** `Skillhub/produtos/<vendedorId>/<produtoId>-<imagemId>`, com os ids gerados no service (`crypto.randomUUID`) antes do upload.
  - O prefixo pelo vendedor deixa a limpeza manual simples e dá ao `run.sh` um caminho previsível.
  - Os uploads de uma requisição vão em paralelo (`Promise.all`). Se um falhar, os outros são apagados e a resposta é 502.
- **Limpeza com "melhor esforço"** (`destroyAsset` não lança) ao: remover o produto, remover uma foto no PATCH, excluir a conta e quando o banco falha depois do upload.
- **Fotos do seed:** `publicId` nulo, então não há o que apagar.

### 3.4. PATCH com fotos e corridas

- **Campo `imagens` (multipart):** lista JSON, em ordem, do resultado final.
  - Cada item é o `id` de uma foto que já existe ou `"nova:N"`, onde N é o índice do arquivo em `fotos`.
  - Exemplo: `["<id da 2ª>", "nova:0", "<id da 1ª>"]` deixa a antiga 2ª como capa, acrescenta uma nova e remove o resto.
  - **Sem `imagens`, as fotos não mudam.** Nesse caso, mandar arquivos dá 400.
- **Regras:**
  - o resultado precisa ter de 1 a 4 itens;
  - todo id existente precisa ser deste produto;
  - todo arquivo precisa ser citado uma vez;
  - senão, 400 sem upload.
- **Transação** (no repositório):
  1. trava o produto: `updateMany where { id, vendedorId, status: { in: [ATIVO, PAUSADO] } }`, que grava os campos editados. Se `count` for 0, dá 404 (ele foi removido no meio);
  2. relê as fotos atuais dentro da transação e confere se os ids citados ainda existem. Se uma edição simultânea já os removeu, dá 409 "As fotos mudaram enquanto você editava. Tente de novo.";
  3. apaga as não citadas, cria as novas e regrava `ordem` de 0 a n-1.
- **Concorrência:** o passo 1 trava a linha do produto, então duas edições simultâneas rodam uma depois da outra.
  - A segunda vê o resultado da primeira e passa ou dá 409.
  - O total nunca passa de 4 e nunca fica em 0.
- **Cloudinary:** o upload das novas acontece **antes** da transação. Se ela falhar, as novas são apagadas. Se passar, as removidas são apagadas depois.
- **Status:** `PAUSADO` ↔ `ATIVO` pelo mesmo `updateMany` condicional. Um produto removido nunca volta.

### 3.5. Contato (`whatsapp.ts`)

- **Normalização:** só os dígitos. Com 10 ou 11 dígitos, recebe `55` na frente. Com 12 ou 13 que já começam com `55`, fica como está. Qualquer outro formato conta como "sem telefone" (404), para não gerar link quebrado.
- **URL:** `https://wa.me/55DDDNUMERO?text=` seguido de `encodeURIComponent("Olá, vi seu produto <nome> no SkillHub e tenho interesse.")`.
- **Resposta:** `{ url }`, só nesta rota.

### 3.6. Exclusão de conta

- **`Produto.vendedor` em `Cascade`:** a exclusão apaga produtos e fotos no banco. A 18A não cria bloqueio novo (pedidos só existem na 18B).
- **Cloudinary:** o `user.service` lê os `publicId` antes do `delete` e chama o `destroyAsset` de cada um depois, junto dos do avatar e do currículo.

### 3.7. Seed

- **Vendedores:**
  - `seed.ana` e `seed.pedro`, que já são Colaboradores;
  - uma Empresa nova, `seed.ateliecosta@example.com`, "Ateliê Costa", com CNPJ fictício.
- **8 produtos** em ids fixos (`00000000-0000-4000-8001-…`), com `upsert` (o seed segue idempotente):
  - as 7 fotos do mock e mais uma do Unsplash, todas com `publicId` nulo;
  - preços inteiros próximos aos do mock (90, 100, 50, 300, 120, 200, 90, 40);
  - **digital:** o curso de Office365;
  - **esgotado:** "Casa de palito", com estoque 0;
  - **pausado:** "Terço personalizado".
- Os vendedores do seed ganham telefone fictício, para o contato funcionar localmente.

## 4. Frontend

Nenhuma linguagem visual nova. Tudo sai de `ProfileDialog`, `DialogField`, `CtaButton`, `ContentCard`, `ScrollRow`, `SectionHeader`, `Avatar`, `Estrelas` e dos padrões do `servico-detalhe-dialog`, `publicar-servico-dialog` e `extrato-dialog`. As cores vêm só de tokens.

### 4.1. `/produtos`

Layout igual ao de hoje, de cima para baixo:

```
Produtos                                  [+ Publicar]   ← só Colaborador/Empresa (igual ao de Serviços)
Arte e Decoração  Alimentos…  Moda…  Serviços Digitais  Educação…   ← chips (filtram no servidor)
[ ex: Livro de Programação ]                                         ← busca (debounce de 300ms, servidor)
── sem filtro ──
Destaques    (banners estáticos, como hoje)
Seus produtos                       ← só Colaborador/Empresa; vazio: ContentCard com "Publicar produto"
  [card][card][card] →              ← etiqueta "Pausado" / "Esgotado"
Arte e Decoração                 →  ← uma linha por categoria com itens (a seta aplica o filtro)
  [card][card][card]
…
── com filtro ──
Resultados (N)              Limpar filtros
  grade 2 / 3 / 5 colunas (a mesma de hoje)
```

- **Dados:**
  - linhas por categoria: uma requisição por categoria (`GET /produtos?categoria=X&limit=12`, ver D10);
  - resultados filtrados: `GET /produtos?categoria&busca&limit=50`;
  - "Seus produtos": `GET /produtos/meus`.
- **Estados:**
  - **carregando:** duas linhas de esqueleto (`ProdutoCardEsqueleto`), como em Serviços;
  - **erro:** "Não foi possível carregar os produtos." e "Tentar de novo";
  - **vazio:** "Nenhum produto encontrado." / "Ainda não há produtos nessa categoria." (os textos de hoje).
- **Cliente:** não vê "Publicar" nem "Seus produtos".

### 4.2. `ProdutoCard` e Início

- **`ProdutoCard`:** mesmas medidas.
  - Texto: "Pintura feita à mão - 90 créditos". O "- vendedor (Jovem aprendiz)" sai (D3).
  - Abaixo, uma linha com a etiqueta em `text-accent-text` ("Esgotado", "Pausado"), como a do `ServicoCard`, seguida de "Ver detalhes".
  - Sem capa (não deve acontecer, porque o mínimo é 1 foto): fundo `bg-surface-2` com o ícone de sacola.
  - O clique abre o detalhe.
- **Início ("Produtos Relevantes"):** o mesmo `ContentCard`, com as mesmas classes.
  - Abaixo do nome, "90 créditos" no lugar de "R$ 89,99".
  - `GET /produtos?limit=8` (os mais recentes de outros vendedores). A partir de `xl` mostra 2, como hoje.
  - Esqueleto ao carregar. Sem produtos ou com erro, a seção some, como `ServicosRecentes`.
  - O clique abre o detalhe (D11).

### 4.3. Detalhe do produto (`ProdutoDetalheDialog`, casca `ProfileDialog`)

```
Pintura feita à mão                         ×
Arte e Decoração · Físico                      ← description (status "Pausado" aparece aqui para o dono)
┌────────────────────────────┐
│        foto grande         │                 ← aspect 4:3, object-cover
└────────────────────────────┘
[▪][▪][▪][▪]                                   ← miniaturas (botões "Foto 2 de 4", aria-pressed)
(◉) Ana Ribeiro   ★★★★☆ 4,5 (12)              ← ou "Sem avaliações"
Descrição…
Preço        Estoque                           ← <dl> como "Remuneração / Prazo"
90 créditos  3 disponíveis | Esgotado
── quem não é o dono ──
[ Falar com o vendedor ]                       ← CtaButton; abre wa.me em nova aba
"O WhatsApp abre com o número do vendedor."    ← dica pequena, text-muted-foreground
(sem contato: "O vendedor não disponibilizou contato." no lugar do botão)
── o dono ──
                 Editar  Pausar|Ativar  Remover   ← "Remover" pede confirmação ("Remover este produto?" / Voltar / Sim, remover)
```

- **"Falar com o vendedor":** a aba é aberta **no clique** (`window.open("", "_blank")`), antes da requisição, para o Safari não bloquear o pop-up. Com a resposta, `opener = null` e a aba vai para o `url`. Com erro, a aba fecha e a mensagem aparece no diálogo.
- **O telefone só chega ao navegador se a pessoa clicar.** Abrir o detalhe não chama `/contato`.
- **Carrinho:** o botão de compra não aparece (18B).

### 4.4. Publicar e editar (`PublicarProdutoDialog`)

```
Publicar produto                            ×
O produto aparece para os outros usuários em Produtos.
Nome             [_______________________]
Descrição        [_______________________]
Categoria        [Escolha            ▾]
Preço (créditos) [___]   Estoque [___]
[ ] Produto digital (sem envio físico)
[◉] Receber contato pelo WhatsApp           ← switch; sem telefone no perfil: desligado e
                                              "Adicione um telefone no seu perfil para receber contatos."
Fotos (1 a 4; a primeira é a capa)
[capa ×][◂ ▸ ×][◂ ▸ ×][ + ]                 ← 72px; mover para a esquerda/direita, remover, adicionar
                                  Cancelar  Publicar
```

- **Fotos:** pré-visualização com `URL.createObjectURL`, revogada ao desmontar e ao remover.
  - O tipo e o tamanho são conferidos no cliente com as mesmas mensagens do Perfil. O servidor confere de novo.
  - O `<input type=file multiple>` fica escondido atrás do "+".
  - O switch é o mesmo componente visual do `AlternarTema` (`role="switch"`), sem copiar as cores na mão.
- **Edição:** abre preenchido e manda PATCH multipart com `imagens`. Se só os campos mudaram, manda JSON.

## 5. Testes e2e (seção `15i`, cobre a Seção 4.5 inteira)

As contas são criadas pela API, como na 15e: `e2e.produtos.colab` (Colaborador), `e2e.produtos.empresa` (Empresa), `e2e.produtos.cliente` (Cliente), `e2e.produtos.outro` (Colaborador) e `e2e.produtos.incompleto` (OAuth sem perfil, via SQL + token, como o usuário OAuth do `run.sh`).

**Publicar**
1. Colaborador publica com 1 foto: 201; capa = `ordem 0`; a URL está no Cloudinary (`cloudinaryHas`).
2. Empresa publica com 4 fotos (PNG, JPEG, WEBP, PNG): 201; `ordem` 0 a 3 na ordem do envio.
3. 0 fotos: 400. 5 fotos: 400. Nenhuma linha criada.
4. Arquivo `.png` com bytes de texto (assinatura falsa): 400. `text/plain`: 400.
5. Foto de 5 MB + 1 byte: 400 "Arquivo excede o limite de 5MB".
6. Validação: nome com 2 caracteres, preço `0`, preço `1.5`, estoque `-1`, categoria "Roxo" e descrição curta dão 400 com `details` em cada campo.
7. Cliente publicando: 403. Perfil incompleto: 403. Sem token: 401.
8. Nos casos de erro, nenhuma foto nova fica no Cloudinary (o erro acontece antes do upload).

**Listagem**

9. O próprio produto não aparece em `GET /produtos` do dono; aparece na lista dos outros.
10. Filtro por categoria: só a categoria pedida. Categoria inválida: 400.
11. Busca por trecho do nome, da descrição e do nome do vendedor, sem diferenciar maiúsculas.
12. Paginação por cursor: `limit=1` duas vezes devolve itens distintos, na ordem, e `nextCursor` nulo no fim. `limit=51`: 400.
13. `PAUSADO` e `REMOVIDO` não aparecem na lista. `GET /produtos/meus` mostra o pausado com status e não mostra o removido.

**Detalhe**

14. Ativo: 200 para outro usuário, com todas as fotos, `vendedor` só com `id`, `fullName` e `urlPhoto`.
15. Pausado: 200 para o dono e 404 para os outros. Removido: 404 para todos. Id inexistente e `nao-e-uuid`: 404.
16. `vendedorReputacao` = `round(avg(nota), 1)` e `count(*)` por SQL, em vendedor com avaliações (inseridas por SQL) e sem avaliações (`media: null, total: 0`).

**Edição e remoção**

17. PATCH por outro usuário: 403. DELETE por outro usuário: 403.
18. `vendedorId` no corpo é ignorado (o dono continua o mesmo no banco).
19. Pausar e ativar; editar campos; fotos: reordenar (troca a capa), adicionar uma e remover uma. A removida some do Cloudinary.
20. PATCH deixando 0 fotos ou 5 fotos: 400, e nada muda.
21. **Corrida:** duas edições simultâneas, cada uma acrescentando 2 fotos a um produto com 2. Uma dá 200 e a outra 400 ou 409; no banco ficam 4 e as `ordem` são 0 a 3.
22. **Corrida:** PATCH e DELETE simultâneos. O produto termina `REMOVIDO` e o PATCH dá 200 (se rodou antes) ou 404, nunca reativa.
23. DELETE: 204; `status = REMOVIDO` no banco; fotos fora do Cloudinary; segundo DELETE dá 404; PATCH depois dá 404.

**Contato e privacidade**

24. Sem token: 401.
25. Formato: `https://wa.me/55<ddd><número>?text=` com a mensagem e o nome do produto (com telefone com máscara e só com dígitos).
26. `whatsappAtivo` desligado: 404 "O vendedor não disponibilizou contato". Vendedor sem telefone (SQL): 404, a mesma mensagem.
27. Dono pedindo o próprio contato: 400. Produto pausado ou removido: 404.
28. **Varredura:** o telefone do vendedor (só os dígitos e com máscara) e o e-mail dele não aparecem no texto de **nenhuma** resposta de `GET /produtos`, `/produtos/meus`, `/produtos/:id`, `POST` e `PATCH`, nem em `GET /usuarios/:id/resumo`.

**Exclusão de conta**

29. A conta do vendedor é excluída pelo app (`DELETE /user`): os produtos e as `ProdutoImagem` dele somem do banco (SQL) e as fotos somem do Cloudinary.

**Telas (Colaborador a 440px; uma parte também a 1440px)**

30. Cliente: `/produtos` sem "Publicar" e sem "Seus produtos".
31. Colaborador sem produtos: "Seus produtos" com o convite. Publica pelo diálogo (2 fotos, troca a ordem, remove uma, adiciona outra) e o produto aparece em "Seus produtos" com a capa certa.
32. Erros no diálogo: arquivo grande e tipo errado avisam no cliente, sem requisição.
33. Outro usuário busca pelo nome e encontra o produto. O detalhe mostra o preço, o vendedor, "Sem avaliações" e "Falar com o vendedor". O clique abre uma aba em `https://wa.me/55…` (a navegação para fora é bloqueada com `context.route`).
34. Dono: no detalhe, "Pausar" muda a etiqueta para "Pausado"; "Ativar" volta. "Remover" com confirmação tira o produto da linha.
35. Estados: carregando (resposta atrasada com `page.route`: aparece o esqueleto), erro (resposta 500: aparece "Tentar de novo", e o clique recarrega) e vazio (busca sem resultado).
36. Início: "Produtos Relevantes" mostra produtos da API com "N créditos". Abrir um deles mostra o detalhe.
37. Console sem erros nem avisos em `/produtos` e nos dois diálogos (o mesmo critério da 15a2).

O total esperado é por volta de 228 + 60. Relato o número exato antes e depois, nas 5 rodadas.

## 6. Verificação visual

O mesmo método das Fases 16 e 17: script Playwright no scratchpad, fora do repositório, com usuário de teste com 0 crédito, mouse fora da página e espera pelo fim da transição. As capturas são de página inteira, a 375 e 1440px, nos dois temas, antes (na base `26ba19d`) e depois, comparadas por hash.

**Idênticas byte a byte** (pedido do documento, mais as que não deveriam mudar):
- `/servicos`
- `/perfil`
- `/configuracoes`
- `/comunidade`
- `/login` e `/cadastro` (telas de entrada, para garantir que nada global mudou)
- o diálogo de detalhe de um pedido de serviço aberto
- o popover de créditos

São 8 telas × 2 larguras × 2 temas = 32 capturas.

**Com diferença prevista** (listadas no changelog):
- `/produtos`: dados reais, preços em créditos, sem "Jovem aprendiz", "Publicar" e "Seus produtos" para quem vende;
- `/inicio`: só a seção "Produtos Relevantes", com as fotos do seed e "N créditos".

Na base, o Início e `/produtos` usam o mock. Para a comparação do Início sair limpa, a captura "depois" do Início também é feita **com a seção de produtos escondida por CSS** nas duas versões, e o resto da página precisa sair idêntico.

**Telas novas** para a conferência visual do João Gabriel e para o PR, a 375 e 1440px, nos dois temas:
- detalhe (comprador, dono e sem contato);
- publicar (vazio, com fotos e com erros);
- editar;
- confirmação de remoção;
- "Seus produtos" vazia e cheia;
- carregando e erro.

## 7. Validadores

Rodo e relato, no fim:
- `prisma migrate status`;
- `tsc --noEmit` no backend e no frontend;
- `eslint`;
- `next build`;
- `check:cores`, `check:contrast` e `check:creditos` (o `produto` não menciona `credits`);
- `./e2e/run.sh` **5 vezes seguidas**, com o total antes e depois.

## 8. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | O e2e passa a subir umas 12 fotos ao Cloudinary por rodada (60 nas 5). | Imagens de 1×1 (exceto a de 5 MB, que é barrada pelo multer antes do upload). Limpeza no fluxo e no `cleanup` do `run.sh`. O plano gratuito aguenta esse volume com folga. |
| R2 | Foto órfã no Cloudinary se o processo cair entre o upload e o banco. | O `public_id` tem o prefixo do vendedor, e o `cleanup` do e2e limpa as de teste. Em produção, a limpeza é manual (está no changelog). |
| R3 | `window.open` antes da requisição pode deixar uma aba em branco se o `/contato` falhar. | A aba fecha no erro. O `contatoDisponivel` evita o clique quando já se sabe que vai dar 404. |
| R4 | Remover um produto apaga as fotos no Cloudinary (como pede o documento). Na 18B, a capa guardada como snapshot num pedido antigo deixa de abrir. | Registrado como ponto de atenção para o plano da 18B: guardar a capa sem apagá-la enquanto houver pedido, ou mostrar um marcador. Não muda nada na 18A. |
| R5 | Comparação byte a byte do Início: a seção muda de Server Component para cliente, e isso pode atrasar a pintura. | A seção já tem altura de esqueleto. A comparação esconde só a seção, e o resto precisa sair igual. Se houver deslocamento, ele aparece no hash e eu relato. |
| R6 | `lib/mock/pessoas.ts` fica sem uso durante a 18A. | O documento deixa a limpeza para a 18C, e eu mantenho assim. O `eslint` não reclama de arquivo sem import. Se preferir, removo já na 18A (D12). |
| R7 | Uma requisição por categoria são 5 requisições na abertura de `/produtos`. | Em paralelo, com cache do SWR. Com o catálogo pequeno do piloto, o custo é desprezível. A alternativa está em D10. |
| R8 | As migrations criadas no container saem com dono `root` (Seção 0). | Não afeta o código. Aviso de novo no PR. |

## 9. Decisões (as da Seção 7 que afetam a 18A e as que surgiram no plano)

Da Seção 7 do documento, valem para a 18A: **1, 2, 3, 5 e 9**. A 4, a 6, a 7, a 8 e a 10 são da 18B e da 18C.

| # | Decisão | Recomendação |
|---|---|---|
| **D1** (Seção 7, nº 1) | Valor do crédito | **1 crédito = R$ 1 só para o indicador de renda, a levar ao professor.** Na 18A, isso aparece só num comentário em `types/produto.ts` e no changelog. Nada no código converte valores. |
| **D2** (Seção 7, nº 2) | Quem vende | **Colaborador e Empresa** com perfil completo. Cliente recebe 403 na API e não vê o botão. |
| **D3** (Seção 7, nº 3) | Selo "Jovem aprendiz" | **Remover agora** do card. Nenhum campo novo no perfil. |
| **D5** (Seção 7, nº 5) | Produto esgotado | **Visível, com a etiqueta "Esgotado"** no card e "Esgotado" no estoque do detalhe. Não sai da lista. |
| **D9** (Seção 7, nº 9) | Destaques | **Estáticos até a Fase 19**, em `lib/mock/produtos.ts` (que fica só com eles). |
| D8 | `contatoDisponivel` no detalhe (não está no documento) | **Incluir.** É um booleano, sem o telefone, e evita um botão que sempre daria 404. |
| D10 | Linhas por categoria em `/produtos` | **Uma requisição por categoria** (`limit=12`). Assim cada linha mostra os mais recentes dela, mesmo com o catálogo crescendo. A alternativa, uma requisição de 50 agrupada no cliente como em Serviços, esvazia categorias menos ativas quando passar de 50 produtos. |
| D11 | Clique no card do Início | **Abrir o detalhe** (como o "Saiba Mais" dos serviços no Início, 17B). Hoje ele leva para `/produtos`. |
| D12 | `lib/mock/pessoas.ts` | **Deixar para a 18C**, como diz o documento. |
| D13 | Nome do filtro de texto | **`busca`**, como na tabela da Seção 4.2 do documento. Em Serviços o nome é `q`. |
| D14 | PATCH das fotos | **Lista `imagens` com o resultado final, em ordem** (ids existentes e `"nova:N"`). Uma requisição só resolve adicionar, remover e reordenar. |
| D15 | Teto do estoque | **9999.** O documento não dá teto, e o teto evita valores absurdos e estouro do `Int`. |

## 10. Fora desta subfase

- Carrinho, checkout, pedidos, créditos e estoque baixando por compra (18B).
- Avaliações de pedido, a regra nova de exclusão de conta, `check:estoque` e a limpeza final do mock (18C).
- Chat, notificações, frete, promoções, disputas e recomendação.
- `SKILLHUB_DECISOES_SKILLMATCH_IMPACTSCORE.md` na raiz (não versionado, não tocado).
