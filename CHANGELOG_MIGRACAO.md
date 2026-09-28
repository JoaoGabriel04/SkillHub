# SkillHub — Changelog de Migração

> Registro de todas as fases de modernização do projeto.
> Cada entrada deve incluir: data, fase, responsável e resumo do que foi feito.
>
> As Fases 0 a 13 foram registradas no repositório anterior (`~/projetos/SkillHub/CHANGELOG_MIGRACAO.md`,
> estrutura `client/` + `server/`). Este arquivo continua a numeração a partir da reconstrução
> (`frontend/` + `backend/`).

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
