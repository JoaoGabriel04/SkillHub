# SkillHub: Fase 18, Produtos como loja (marketplace)

Documento de instrução para o Claude Code. Segue o padrão de gate de aprovação: **nada é escrito, instalado ou migrado antes de o Gabriel aprovar o plano de cada subfase.**

Decisões do Gabriel (3/11/2026), já fechadas:
- Produtos viram uma **loja de verdade**, como Shopee, TikTok Shop e Shein: catálogo, carrinho, pedido e entrega.
- Pagamento **só em créditos**, com checkout completo.
- Contato com o vendedor por **link de WhatsApp** (sem chat interno nesta fase).

---

## 1. Regras (valem para tudo)

1. **Gate por subfase.** Para cada subfase (18A, 18B, 18C), entregue primeiro `docs/planos/PLANO_18X.md` e pare. Só implemente depois de "aprovado" explícito. Não comece a 18B antes de a 18A estar mergeada.
2. **Um PR por subfase**, branch própria a partir da `main` atualizada. Quem faz o merge é o Gabriel.
3. **Não inicie nada fora desta fase** (Comunidade, Empresa, SkillMatch, ImpactScore, chat interno). Achados fora de escopo vão para o changelog, não para o código.
4. **Migrations só com `prisma migrate dev`**, nunca editar migration existente.
5. **Sem dependência nova** sem pedir aprovação no plano.
6. **Frontend:** SWR para GET, Zustand só onde já é padrão, Lucide ou FontAwesome para ícones, **sem emojis**, cores só por tokens semânticos (o `check:cores` precisa passar), `prefers-reduced-motion` respeitado.
7. **Backend:** Repository, Service, Controller, Route; Zod; `AppError`; `authenticate` em toda rota; privacidade pelo padrão `toAutorResumo`. **Nunca** expor e-mail, telefone, CPF, CNPJ, endereço ou data de nascimento em respostas de produto e pedido (a única exceção controlada é o link de WhatsApp, Seção 3.5).
8. **Créditos só pelo `credito.service`.** O `check:creditos` continua valendo e deve continuar passando. Estoque só é escrito pelo repositório do produto.
9. **Dinheiro e estoque com transação e escrita condicional** (`updateMany` com condição), nunca "lê, confere, grava". Toda regra de corrida precisa de teste.
10. **Páginas que não deveriam mudar ficam idênticas byte a byte** (capturas antes e depois, 375 e 1440px, nos dois temas), como nas fases 16 e 17.
11. Ao final de cada subfase rode e relate: `prisma migrate status`, `tsc` (front e back), `eslint`, `next build`, `check:cores`, `check:contrast`, `check:creditos` e `./e2e/run.sh` (total antes e depois). Rode o e2e **5 vezes seguidas** e relate.
12. Documente no `docs/CHANGELOG_MIGRACAO.md` no padrão existente (Contexto, Decisões, Arquivos, Validação, Achados fora de escopo). Planos em `docs/planos/`, nenhum `.md` novo na raiz.
13. **Telas sem desenho no Figma** (detalhe do produto, carrinho, checkout, publicar, compras e vendas): reaproveite os padrões já existentes (`servico-detalhe-dialog`, `publicar-servico-dialog`, `extrato-dialog`, `ProdutoCard`, `ScrollRow`). Não invente linguagem visual nova. O Gabriel faz a conferência visual antes do merge.

---

## 2. Estado atual (verificado na `main` em `26ba19d`)

- `frontend/src/lib/mock/produtos.ts`: 7 produtos de exemplo, 5 categorias (Arte e Decoração, Alimentos e Bebidas, Moda e Acessórios, Serviços Digitais, Educação e Apostilas) e 2 "destaques" (banners de guias da plataforma). O `Produto` do mock tem preço em reais e o vendedor com a marca "jovemAprendiz".
- `frontend/src/app/(app)/produtos/page.tsx`: chips de categoria, busca, banners e uma linha por categoria, lendo o mock por SWR. O `ProdutoCard` abre um "Em breve".
- A seção de Produtos do Início (coluna de 380px a partir de `xl`) também lê o mock.
- **Não existe** model `Produto`, módulo de backend, nem rota. Já existem: upload de imagem com `multer` (assinatura de bytes conferida, 5 MB, JPEG/PNG/WEBP) e Cloudinary (foto de perfil), `AutorResumo`, `credito.service` (`reservar`, `pagar`, `estornar`, `movimentar` com débito condicional), taxa configurável (`PLATFORM_FEE_PERCENT`, hoje 0) e conta da plataforma.
- Perfis: `Cliente`, `Colaborador`, `Empresa`. O `User` tem `phone`, `cidade`, `bairro`, mas nada de "jovem aprendiz".
- As Avaliações (17D) estão ligadas a `servicoId` (opcional, `SetNull`), e a média é calculada por consulta.

---

## 3. Visão geral e divisão

| Subfase | Entrega | Mexe em créditos? |
|---|---|---|
| **18A** | Catálogo: produtos no banco, publicar com fotos, editar, pausar, remover, busca e filtros, detalhe, contato por WhatsApp, Início lendo a API | Não |
| **18B** | Carrinho, checkout e pedido: reserva em créditos, estoque, envio, confirmação de recebimento, cancelamento e estorno, compras e vendas | **Sim** |
| **18C** | Avaliações do pedido, ajustes de exclusão de conta, limpeza do mock, validadores e fechamento | Não |

Os KPIs da PIBITI guiam o desenho: o **volume de transações** (200/mês) conta "serviços e produtos concluídos", e a **geração de renda** soma os pagamentos. Por isso os pedidos de produto têm `createdAt`, `enviadoEm` e `concluidoEm`, como os serviços têm `aceitoEm` e `concluidoEm`.

### 3.1 Unidade de preço (decisão a confirmar)

Como o pagamento é só em créditos, **o preço do produto é um inteiro em créditos**, e a tela mostra "N créditos". O mock em reais deixa de existir. Premissa recomendada para o piloto: **1 crédito = R$ 1,00**, usada só para o indicador de renda gerada. Ela precisa ser validada com o professor (ver Seção 7) e **não deve** ser gravada em lugar nenhum do código além de um comentário e do changelog.

### 3.2 Quem vende

Só **Colaborador** e **Empresa** publicam produtos. **Cliente** só compra. Todo perfil completo pode comprar. Ninguém compra o próprio produto.

### 3.3 Categorias

Um enum `CategoriaProduto` com as 5 categorias do desenho, mesmo padrão do `categoria.map.ts` dos serviços (valor do banco x rótulo da tela).

### 3.4 Fotos

De 1 a 4 fotos por produto, reaproveitando o upload existente (mesmas regras de tipo, assinatura e tamanho), com a primeira como capa. A foto cai no Cloudinary; ao remover o produto ou a conta, a limpeza das fotos é "melhor esforço" (falha não impede a exclusão).

### 3.5 Contato por WhatsApp

- O telefone do perfil é **privado**. Nenhuma resposta comum o inclui.
- `GET /produtos/:id/contato` (autenticado) devolve `{ url }` com `https://wa.me/55DDDNUMERO?text=...` e a mensagem pronta ("Olá, vi seu produto X no SkillHub e tenho interesse."), só se o produto estiver ativo, o vendedor tiver telefone e `whatsappAtivo` estiver ligado. Caso contrário, 404 com mensagem clara ("O vendedor não disponibilizou contato").
- O telefone é normalizado para dígitos, com 55 na frente quando tiver 10 ou 11 dígitos.
- O vendedor liga e desliga o contato por produto (`whatsappAtivo`, padrão ligado; desabilitado na tela se o perfil não tem telefone, com a dica de completar o perfil).
- O comprador sabe que, ao clicar, o WhatsApp dele abre com o número do vendedor visível (é o comportamento normal do `wa.me`).

---

## 4. Fase 18A: Catálogo e contato

### 4.1 Modelo (Prisma)

```prisma
enum CategoriaProduto { ARTE_DECORACAO ALIMENTOS_BEBIDAS MODA_ACESSORIOS SERVICOS_DIGITAIS EDUCACAO_APOSTILAS }
enum StatusProduto { ATIVO PAUSADO REMOVIDO }   // REMOVIDO = exclusão lógica (o histórico de pedidos usa snapshots)

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

O plano pode propor ajustes, mas deve justificá-los.

### 4.2 Endpoints (todos com `authenticate`)

| Método e rota | Regra |
|---|---|
| `GET /produtos` | Lista `ATIVO` de **outros** vendedores. Filtros: `categoria`, `busca` (nome, descrição, vendedor), paginação por cursor, `limit` até 50. Resposta resumida (id, nome, preço, estoque, categoria, capa, vendedor como `AutorResumo`). |
| `GET /produtos/meus` | Todos os meus, menos `REMOVIDO`, com o status. Declarar **antes** de `/:id`. |
| `GET /produtos/:id` | `ATIVO` para qualquer um; `PAUSADO` só para o dono; `REMOVIDO` ou inexistente, 404 (inclusive id que não é UUID). Inclui todas as fotos, descrição, `vendedor` (`AutorResumo`) e `vendedorReputacao: { media, total }` (a média de 17D, sem alterar o `AutorResumo`). |
| `POST /produtos` | Só Colaborador e Empresa com perfil completo. Multipart: campos + 1 a 4 fotos. |
| `PATCH /produtos/:id` | Só o dono, não `REMOVIDO`. Edita campos, `status` (`ATIVO` ou `PAUSADO`) e fotos (adicionar e remover, sempre ficando com 1 a 4). Um `vendedorId` no corpo é ignorado. |
| `DELETE /produtos/:id` | Só o dono. Marca `REMOVIDO` e apaga as fotos do Cloudinary (melhor esforço). |
| `GET /produtos/:id/contato` | Seção 3.5. Vendedor consultando o próprio produto recebe 400. |

Erros: 400 validação, 401, 403 (perfil ou não é o dono), 404, 409 onde fizer sentido. Paginação e filtros no padrão de `servico`.

### 4.3 Frontend

- `types/produto.ts`, `lib/produtos.ts` (cliente e chaves do SWR), `lib/validation/produto.ts`.
- **`/produtos` sem mudar o layout:** continua com chips, busca, banners e uma linha por categoria, agora lendo a API. Filtros e busca passam a ser do servidor. Estados de carregando (esqueleto), vazio e erro com "Tentar de novo", como nos Serviços.
- **`ProdutoCard`:** mantém o visual. Passa a mostrar o preço em créditos ("N créditos"), a capa vinda da API e o selo "Esgotado". O texto "(Jovem aprendiz)" **sai por enquanto**, porque não existe o dado (ver Seção 7). Clicar abre o detalhe.
- **Detalhe do produto** (diálogo, padrão do detalhe de serviço): fotos com troca, nome, preço, vendedor com foto e média de avaliações, descrição, estoque, tipo (físico ou digital) e o botão **"Falar com o vendedor"** (abre o link do WhatsApp em nova aba). Para o dono: editar, pausar e ativar, remover (com confirmação). O botão de compra entra na 18B.
- **Publicar produto** (diálogo): nome, descrição, categoria, preço, estoque, digital, WhatsApp, e fotos com pré-visualização, troca de ordem e remoção. Só aparece para Colaborador e Empresa. Para Cliente, a página não mostra o botão.
- **Linha "Seus produtos"** no topo de `/produtos` para quem vende, no padrão de "Seus pedidos".
- **Início:** a seção de Produtos vira leitura da API (2 itens a partir de `xl`, como hoje), sem mexer no layout da 16.2.
- **Destaques (banners de guias):** continuam estáticos num arquivo pequeno, com comentário dizendo que são campanhas da plataforma até a Fase 19. Remover só a parte de produtos de `lib/mock/produtos.ts`.

### 4.4 Seed

Cerca de 8 produtos em várias categorias e vendedores de teste, com fotos por URL (as mesmas do mock, `publicId` nulo), incluindo um digital, um esgotado e um pausado.

### 4.5 Testes e2e obrigatórios (18A)

- Publicar com 1 e com 4 fotos; 0 e 5 fotos dão 400; arquivo que não é imagem dá 400; foto acima de 5 MB dá erro.
- Validação: nome curto, preço 0 ou decimal, estoque negativo, categoria inválida, descrição curta.
- Perfil `Cliente` publicando: 403. Perfil incompleto: 403. Sem token: 401.
- Listagem: o próprio produto fica de fora; filtro por categoria; busca; paginação por cursor; `PAUSADO` e `REMOVIDO` não aparecem.
- Detalhe: 200; pausado visível só para o dono; removido e id inválido dão 404; `vendedorReputacao` confere com SQL.
- Edição e remoção só pelo dono (403 para os outros); `vendedorId` no corpo é ignorado.
- Contato: 401; formato do link; `whatsappAtivo` desligado e vendedor sem telefone dão 404; **o telefone não aparece em nenhuma outra resposta** (varredura das respostas de lista, detalhe, meus e vendedor).
- Exclusão de conta do vendedor apaga os produtos.
- Telas: publicar pelo diálogo, ver em "Seus produtos", buscar como outro usuário, falar com o vendedor, estados de carregando, vazio e erro.
- Visual: Serviços, Perfil, Configurações e Comunidade idênticos byte a byte. `/produtos` e Início com as diferenças previstas, listadas no changelog.

---

## 5. Fase 18B: Carrinho, checkout e pedido

### 5.1 Modelo

```prisma
enum StatusPedidoProduto { AGUARDANDO_ENVIO ENVIADO CONCLUIDO CANCELADO }

model PedidoProduto {
  id            String              @id @default(uuid())
  compradorId   String?
  comprador     User?               @relation("Compras", fields: [compradorId], references: [id], onDelete: SetNull)
  vendedorId    String?
  vendedor      User?               @relation("Vendas", fields: [vendedorId], references: [id], onDelete: SetNull)
  status        StatusPedidoProduto @default(AGUARDANDO_ENVIO)
  total         Int                 // em créditos, soma dos itens
  observacao    String?             // até 300
  canceladoPor  String?             // "COMPRADOR" | "VENDEDOR"
  itens         ItemPedido[]
  createdAt     DateTime            @default(now())
  enviadoEm     DateTime?
  concluidoEm   DateTime?
  canceladoEm   DateTime?

  @@index([compradorId, createdAt])
  @@index([vendedorId, createdAt])
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
  @@index([pedidoId])
}
```

`SetNull` em comprador e vendedor preserva o histórico dos KPIs (volume e renda), pelo mesmo motivo do `SetNull` nas avaliações.

Em `TransacaoCredito`, adicionar `pedidoId String?` (só referência, sem relação, como o `servicoId`). O extrato mostra "Pedido: nome do primeiro item (+N)" quando o pedido existe.

### 5.2 Carrinho

O carrinho vive **no cliente** (Zustand persistido em `localStorage`, com `try/catch` e funcionando sem ele). Guarda `produtoId` e `quantidade`. A tela do carrinho busca os dados atuais dos produtos e mostra os itens **agrupados por vendedor**, com subtotal por vendedor e total. Item esgotado, pausado ou removido aparece como indisponível e não entra no total.

### 5.3 Checkout

`POST /pedidos` com `{ itens: [{ produtoId, quantidade, precoEsperado }], observacao? }`. Em **uma única transação**:
1. Valida cada produto: `ATIVO`, de outro vendedor, quantidade dentro do estoque, preço igual ao `precoEsperado` (senão 409 `PRECO_ALTERADO`, para o comprador nunca pagar um valor que não viu).
2. Baixa o estoque com `updateMany` condicional (`estoque >= quantidade`); se não baixar, 409 `ESGOTADO` apontando o produto, e **tudo volta**.
3. Agrupa por vendedor e cria **um `PedidoProduto` por vendedor**, com os itens em snapshot.
4. **Reserva** o total de cada pedido do saldo do comprador (`RESERVA`, com `pedidoId`). Saldo insuficiente: 409 "Créditos insuficientes" e nada muda.
5. Responde com os pedidos criados.

O comprador precisa de perfil completo. Os créditos ficam reservados até a confirmação de recebimento ou o cancelamento.

### 5.4 Ciclo do pedido

| Ação | Quem | De, para | Efeito |
|---|---|---|---|
| `POST /pedidos/:id/enviar` | vendedor | `AGUARDANDO_ENVIO`, `ENVIADO` | grava `enviadoEm`. Para produto digital, é "entregue". |
| `POST /pedidos/:id/confirmar-recebimento` | comprador | `ENVIADO`, `CONCLUIDO` | **paga** o vendedor (`RECEBIMENTO`), com a taxa configurável (`TAXA` e `TAXA_RECEBIDA`, mesmo mecanismo da 17C, calculada sobre o total do pedido); grava `concluidoEm`. |
| `POST /pedidos/:id/cancelar` | comprador só em `AGUARDANDO_ENVIO`; vendedor em `AGUARDANDO_ENVIO` ou `ENVIADO` | para `CANCELADO` | **estorna** a reserva ao comprador e **devolve o estoque**, na mesma transação; grava `canceladoPor` e `canceladoEm`. |

Transições fora da tabela dão 409. Quem não é parte do pedido recebe 403 (e 404 para pedido inexistente). Duas ações simultâneas (confirmar e cancelar ao mesmo tempo, ou duas confirmações) resultam em um sucesso e um 409, com o saldo certo.

**Créditos parados:** não há tarefa agendada nesta fase. Se o comprador nunca confirmar, a reserva fica retida. Entregar um script administrativo **somente de listagem** (`npm run pedidos:pendentes`) com os pedidos `ENVIADO` há mais de 7 dias, e registrar a "confirmação automática" como proposta de fase futura no changelog.

### 5.5 Consultas e contato

- `GET /pedidos/compras` e `GET /pedidos/vendas`: paginados por cursor, só os do usuário.
- `GET /pedidos/:id`: só as partes. Mostra itens, status, datas, a outra parte como `AutorResumo`, e a **cidade e o bairro** da outra parte (nunca o endereço completo).
- `GET /pedidos/:id/contato`: devolve o link de WhatsApp **da outra parte**, só para as partes e só enquanto o pedido está `AGUARDANDO_ENVIO` ou `ENVIADO`. O combinado de entrega e retirada acontece por aí. Sem telefone cadastrado, 404 com mensagem clara.
- Nenhuma cópia do endereço de casa vai para o pedido.

### 5.6 Frontend

- Botão de carrinho (ícone e contagem) no título da página Produtos, e botão **"Adicionar ao carrinho"** e **"Comprar agora"** no detalhe.
- Diálogo do **carrinho**, **checkout** (total, saldo, aviso de que os créditos ficam reservados, campo de observação, aviso de que o vendedor poderá falar pelo WhatsApp) e **saldo insuficiente** com atalho para o extrato.
- Linhas **"Suas compras"** e **"Suas vendas"** em `/produtos`, e **detalhe do pedido** (diálogo) com linha do tempo de status e as ações cabíveis ao papel de quem abre.
- O saldo do chip de créditos e o extrato atualizam após cada ação.

### 5.7 Testes e2e obrigatórios (18B)

- Compra simples: estoque cai, reserva igual ao total, `saldoApos` certo, `RESERVA` com `pedidoId`.
- Carrinho com 2 vendedores: dois pedidos, uma transação, duas reservas.
- **Corrida por estoque:** dois compradores na última unidade, um 201 e um 409, estoque nunca negativo.
- **Corrida por saldo:** comprador com saldo para um pedido, dois checkouts simultâneos, um sucesso e um 409, saldo nunca negativo.
- Atomicidade: um item esgotado entre vários não cria pedido nenhum e não reserva nada.
- `PRECO_ALTERADO`; produto pausado ou removido; comprar o próprio produto (403); `Cliente` pode comprar; perfil incompleto (403); 401; validação (quantidade 0, 100, decimal; observação de 301).
- Ciclo completo: enviar, confirmar, pagamento ao vendedor sem linha de taxa com taxa 0; datas gravadas e conferidas no banco.
- Cancelamentos: comprador antes do envio, vendedor antes e depois do envio, comprador depois do envio (409); estorno e estoque devolvido conferidos.
- Corrida confirmar x cancelar e confirmar duas vezes.
- **Taxa de 15%** (teste local fora do repositório, como em `verificar-taxa`): conservação de **saldos mais reservas em aberto**.
- Privacidade: terceiros recebem 403 no pedido e no contato; respostas sem dados pessoais; link do contato só nas partes.
- Extrato x saldo continua batendo para todos os usuários de teste.
- Telas: carrinho, checkout, saldo insuficiente, compras, vendas, detalhe com cada ação.

---

## 6. Fase 18C: Avaliações, exclusão de conta e fechamento

- **Avaliações do pedido:** as duas partes avaliam após `CONCLUIDO`, uma vez cada, nota de 1 a 5 e comentário opcional, igual à 17D. Preferir reaproveitar o model `Avaliacao` com `pedidoId` opcional (`SetNull`, `@@unique([pedidoId, avaliadorId])`) e o mesmo serviço, em vez de duplicar. O plano precisa tratar a ambiguidade de `servicoId` e `pedidoId` ambos nulos (origem removida). A avaliação é **do vendedor e do comprador como pessoas**, não do produto.
- `GET /usuarios/:id/avaliacoes` e a média do Perfil passam a contar as duas origens. `avaliacaoPendente` nas compras e vendas. Endpoints `POST` e `GET /pedidos/:id/avaliacoes`.
- **Exclusão de conta:** estender a regra da faxina: 409 também se a pessoa for comprador ou vendedor de pedido `AGUARDANDO_ENVIO` ou `ENVIADO`. Pedidos concluídos ou cancelados ficam (`SetNull`).
- **Limpeza:** remover o que sobrar de produtos em `lib/mock/produtos.ts` (os destaques seguem), atualizar `lib/mock/pessoas.ts` se algo ficar sem uso, e atualizar o `check:creditos` se for preciso cobrir os novos pontos de escrita.
- **Validador de estoque:** script `check:estoque` que garante que `Produto.estoque` só é escrito no repositório do produto (mesma ideia do `check:creditos`).
- Changelog, atualização do roadmap em `SKILLHUB_SIDEBAR_E_DOMINIO.md` e testes e2e equivalentes aos da 17D (repetição, terceiros, validação, média contra SQL, exclusão de conta, telas).

---

## 7. Decisões em aberto (recomendação em negrito; o Gabriel confirma na aprovação de cada plano)

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| 1 | Valor do crédito | 1 crédito = R$ 1 / outra relação / sem relação | **1 crédito = R$ 1 só para o KPI de renda; levar ao professor.** |
| 2 | Quem vende | Só Colaborador e Empresa / todos | **Colaborador e Empresa** |
| 3 | Selo "Jovem aprendiz" | Remover agora / criar campo no perfil | **Remover agora.** O PIBITI foca em jovens talentos, então o selo provavelmente vira atributo do perfil, mas isso é decisão de pesquisa (Fase 19 ou 21). |
| 4 | Confirmação automática do recebimento | Agora / script de listagem e fase futura | **Script de listagem (7 dias) e fase futura** |
| 5 | Produto esgotado | Visível com "Esgotado" / escondido | **Visível com "Esgotado"** |
| 6 | Avaliação | Do vendedor e do comprador / por produto | **Das pessoas, nas duas pontas** (serve ao ImpactScore) |
| 7 | Pedido por vendedor | Um pedido por vendedor / um pedido único | **Um por vendedor** (a reserva e a entrega são independentes) |
| 8 | Endereço de entrega | Copiar do perfil / combinar pelo WhatsApp | **Combinar pelo WhatsApp**, sem copiar endereço |
| 9 | Destaques dos banners | Fase 19 / agora | **Fase 19**, estáticos até lá |
| 10 | Devolução e disputa | Agora / fora desta fase | **Fora desta fase.** Registrar como risco no changelog. |

---

## 8. Fora de escopo (não fazer)

- Chat interno, notificações, e-mail de pedido.
- Frete, cálculo de distância, rastreio, cupom, promoção, frete grátis.
- Devolução, disputa e mediação.
- Pagamento em dinheiro, Pix, cartão ou qualquer gateway.
- Recomendação de produtos e qualquer lógica de SkillMatch ou ImpactScore.
- Mudar a taxa, a conta da plataforma ou as regras de Serviços.

---

## 9. Entrega esperada, por subfase

1. `docs/planos/PLANO_18X.md` e pausa para aprovação.
2. Implementação, e2e, verificação visual e changelog.
3. PR com resumo do que mudou, resultado de todos os validadores, total de testes antes e depois (5 rodadas), capturas das telas novas a 375 e 1440px nos dois temas, e "Achados fora de escopo".
