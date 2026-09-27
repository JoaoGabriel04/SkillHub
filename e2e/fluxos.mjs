// Testes de fluxo (login, cadastro, sessão, OAuth, menus) contra o app rodando no docker compose.
// Rode pelo ./e2e/run.sh: ele prepara o usuário OAuth de teste, passa o token e limpa o banco no fim.
// Tudo que é criado aqui usa e-mails e2e.*@example.com.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const OUT = process.env.E2E_OUT ?? ".output"; // screenshots
const OAUTH_TOKEN = process.env.E2E_OAUTH_TOKEN; // access token de um usuário OAuth sem perfil
const OAUTH_REFRESH = process.env.E2E_OAUTH_REFRESH; // refresh token dele (cookie que o callback real grava)
const OAUTH_ID = process.env.E2E_OAUTH_ID; // id desse usuário, para conferir os arquivos dele no Cloudinary
if (!OAUTH_TOKEN || !OAUTH_REFRESH || !OAUTH_ID) throw new Error("E2E_OAUTH_* não definidos — rode pelo ./e2e/run.sh");

// Arquivo existe no Cloudinary? Consulta pela SDK dentro do container do backend (que tem as credenciais).
const COMPOSE_FILE = new URL("../docker-compose.yml", import.meta.url).pathname;
const cloudinaryHas = (publicId, resourceType) =>
  execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "node", "-e",
    `const { v2: c } = require("cloudinary");
     c.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
     c.api.resource(process.argv[1], { resource_type: process.argv[2] }).then(() => console.log("sim"), () => console.log("nao"));`,
    publicId, resourceType], { encoding: "utf8" }).trim() === "sim";

// Arquivos de teste: PNG 1×1 e um PDF mínimo válido
const PNG = { name: "foto.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") };
const PDF = { name: "curriculo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n") };
const firstBytes = async (download) => readFileSync(await download.path()).subarray(0, 5).toString();

// Mailpit (caixa de entrada de dev do docker-compose): conta e lê os e-mails enviados a um endereço
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";
const mailsTo = async (email) => (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()).messages;
// o backend envia sem aguardar: espera chegar um e-mail além dos `before` que já havia
const waitResetLink = async (email, before) => {
  for (let i = 0; i < 20; i++) {
    const msgs = await mailsTo(email);
    if (msgs.length > before) {
      const { Text } = await (await fetch(`${MAILPIT}/api/v1/message/${msgs[0].ID}`)).json();
      return Text.match(/https?:\/\/\S+\/redefinir-senha\?token=[\w-]+/)?.[0] ?? null;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 } });
const page = await ctx.newPage();
const pageErrors = []; page.on("pageerror", (e) => pageErrors.push(e.message));
// BrasilAPI bloqueada: estes testes preenchem o endereço na mão (o autopreenchimento tem teste próprio)
await page.route("https://brasilapi.com.br/**", (r) => r.abort());
const B = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const API = process.env.E2E_API_URL ?? "http://localhost:7000";
const results = { passed: 0, failed: 0 };
const ok = (label, cond, extra = "") => {
  results[cond ? "passed" : "failed"]++;
  console.log(`${cond ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`);
};
const alertText = async () => (await page.locator("[role=alert]:not(#__next-route-announcer__)").allTextContents()).join(" | ");
const openMenu = async () => { await page.getByRole("button", { name: "Configurações" }).click(); };
const loggedAs = async (email) => { await page.getByRole("heading", { name: "SkillHub" }).waitFor({ timeout: 8000 }).catch(() => {}); await openMenu(); const ok = await page.getByText(email).isVisible().catch(() => false); await page.keyboard.press("Escape"); return ok; };
const sair = async () => { await openMenu(); await page.getByRole("menuitem", { name: "Sair" }).click(); };
const errTexts = async () => (await page.locator("p.text-\\[\\#ff6b6b\\]").allTextContents());

// 1. login vazio
await page.goto(B + "/login"); await page.getByRole("button", { name: "Entrar", exact: true }).click();
ok("login vazio mostra erros de campo", (await errTexts()).length === 2, (await errTexts()).join(" / "));
// 2. senha errada
await page.getByPlaceholder("Email").fill("naoexiste@example.com"); await page.getByPlaceholder("Senha").fill("x");
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForTimeout(800);
ok("senha errada mostra erro da API", (await alertText()).includes("incorretos"), await alertText());
// 3. esqueceu a senha (o fluxo completo é a seção 15)
await page.getByRole("link", { name: "Esqueceu a senha?" }).click(); await page.waitForURL("**/esqueci-senha**");
await page.getByRole("link", { name: "Voltar para o login" }).click(); await page.waitForURL("**/login");
ok("'Esqueceu a senha?' abre a recuperação e volta ao login", page.url().endsWith("/login"));
// 4. cadastro Cliente
await page.getByRole("link", { name: "Cadastre-se" }).click(); await page.waitForURL("**/cadastro");
ok("Continuar desabilitado sem perfil", await page.getByRole("button", { name: "Continuar" }).isDisabled());
await page.getByRole("radio", { name: "Cliente" }).click();
ok("card Cliente marcado", (await page.getByRole("radio", { name: "Cliente" }).getAttribute("aria-checked")) === "true");
await page.getByRole("button", { name: "Continuar" }).click();
await page.getByRole("button", { name: "Criar conta" }).click();
ok("cadastro vazio mostra erros", (await errTexts()).length >= 13, `${(await errTexts()).length} erros`);
await page.getByPlaceholder("Nome completo").fill("Cliente Teste E2E");
await page.getByPlaceholder("CPF").fill("11122233344");
ok("máscara de CPF", (await page.getByPlaceholder("CPF").inputValue()) === "111.222.333-44", await page.getByPlaceholder("CPF").inputValue());
await page.getByLabel("Data de nascimento").fill("1999-05-10");
await page.locator("select").nth(0).selectOption("Outro");
await page.getByPlaceholder("Telefone").fill("11987654321");
ok("máscara de telefone", (await page.getByPlaceholder("Telefone").inputValue()) === "(11) 98765-4321", await page.getByPlaceholder("Telefone").inputValue());
await page.getByPlaceholder("CEP").fill("01310100");
await page.getByPlaceholder("Rua").fill("Rua Teste"); await page.getByLabel("Número").fill("100"); await page.getByPlaceholder("Bairro").fill("Centro"); await page.getByPlaceholder("Cidade").fill("São Paulo");
await page.locator("select").nth(1).selectOption("SP");
await page.getByPlaceholder("Email", { exact: true }).fill("e2e.cliente@example.com");
await page.getByPlaceholder("Confirmar email").fill("e2e.outro@example.com");
await page.getByPlaceholder("Senha", { exact: true }).fill("senha123");
await page.getByPlaceholder("Confirmar senha").fill("senha123");
await page.getByRole("button", { name: "Criar conta" }).click();
ok("e-mails diferentes bloqueados no front", (await errTexts()).includes("Os e-mails não coincidem"));
await page.getByPlaceholder("Confirmar email").fill("e2e.cliente@example.com");
await page.screenshot({ path: `${OUT}/cadastro_preenchido.png`, fullPage: true });
await page.getByRole("button", { name: "Criar conta" }).click();
await page.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});
ok("cadastro Cliente → /inicio", page.url().endsWith("/inicio"), page.url() + " " + (await alertText()));
ok("/inicio mostra o usuário logado", await loggedAs("e2e.cliente@example.com"));
// 5. reload mantém sessão (cookie de refresh)
await page.reload();
ok("recarregar mantém a sessão", await loggedAs("e2e.cliente@example.com"));
// 6. logado não vê /login
await page.goto(B + "/login"); await page.waitForURL("**/inicio", { timeout: 5000 }).catch(() => {});
ok("logado em /login é mandado pra /inicio", page.url().endsWith("/inicio"));
// 7. sair
await sair(); await page.waitForURL("**/login", { timeout: 5000 }).catch(() => {});
ok("sair → /login", page.url().endsWith("/login"));
await page.goto(B + "/inicio"); await page.waitForURL("**/login", { timeout: 5000 }).catch(() => {});
ok("deslogado em /inicio vai pro /login", page.url().endsWith("/login"));
// 8. login com lembre de mim desmarcado → cookie de sessão
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill("senha123");
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 5000 }).catch(() => {});
let ck = (await ctx.cookies()).find((c) => c.name === "refresh_token");
ok("login sem 'lembre de mim' → cookie de sessão", page.url().endsWith("/inicio") && ck?.expires === -1, `expires=${ck?.expires}`);
await sair(); await page.waitForURL("**/login");
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill("senha123");
await page.getByText("Lembre de mim").click();
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 5000 }).catch(() => {});
ck = (await ctx.cookies()).find((c) => c.name === "refresh_token");
ok("login com 'lembre de mim' → cookie de 7 dias", ck && ck.expires > Date.now() / 1000 + 6 * 86400, `expires em ${ck ? ((ck.expires - Date.now() / 1000) / 86400).toFixed(1) : "?"} dias`);
await sair(); await page.waitForURL("**/login");
// 9. Empresa desabilitada ("Em produção")
await page.goto(B + "/cadastro"); const emp = page.getByRole("radio", { name: /Empresa/ });
ok("card Empresa desabilitado", await emp.isDisabled());
ok("faixa 'Em produção' visível", await page.getByText("Em produção").isVisible());
await emp.click({ force: true });
ok("clicar na Empresa não seleciona", (await emp.getAttribute("aria-checked")) === "false" && (await page.getByRole("button", { name: "Continuar" }).isDisabled()));
// 10. CPF duplicado vindo do backend
await page.goto(B + "/cadastro"); await page.getByRole("radio", { name: "Colaborador" }).click(); await page.getByRole("button", { name: "Continuar" }).click();
await page.getByPlaceholder("Nome completo").fill("Outro Teste"); await page.getByPlaceholder("CPF").fill("11122233344");
await page.getByLabel("Data de nascimento").fill("1990-01-01"); await page.locator("select").nth(0).selectOption("Feminino");
await page.getByPlaceholder("Telefone").fill("11987654321"); await page.getByPlaceholder("CEP").fill("01310100");
await page.getByPlaceholder("Rua").fill("Rua Teste"); await page.getByLabel("Número").fill("100"); await page.getByPlaceholder("Bairro").fill("Centro"); await page.getByPlaceholder("Cidade").fill("São Paulo"); await page.locator("select").nth(1).selectOption("SP");
await page.getByPlaceholder("Email", { exact: true }).fill("e2e.dup@example.com"); await page.getByPlaceholder("Confirmar email").fill("e2e.dup@example.com");
await page.getByPlaceholder("Senha", { exact: true }).fill("senha123"); await page.getByPlaceholder("Confirmar senha").fill("senha123");
await page.getByRole("button", { name: "Criar conta" }).click(); await page.waitForTimeout(1200);
ok("CPF já cadastrado mostra erro do backend", (await alertText()).includes("CPF já cadastrado"), await alertText());
// 11. retorno de OAuth com erro
await page.goto(B + "/auth/callback?error=discord_falhou"); await page.waitForURL("**/login**", { timeout: 5000 }).catch(() => {});
ok("callback com erro → /login com aviso", (await alertText()).includes("Discord"), page.url());
// 12. retorno de OAuth de conta nova → completar perfil como Colaborador
// o backend grava o refresh_token antes de redirecionar para o callback do front
await ctx.addCookies([{ name: "refresh_token", value: OAUTH_REFRESH, url: API, httpOnly: true }]);
await page.goto(B + `/auth/callback?token=${OAUTH_TOKEN}&setup=1`); await page.waitForURL("**/cadastro?completar=1", { timeout: 8000 }).catch(() => {});
ok("OAuth novo → /cadastro?completar=1", page.url().includes("completar=1"), page.url());
ok("token saiu da URL", !page.url().includes("token="));
await page.getByRole("radio", { name: "Colaborador" }).click(); await page.getByRole("button", { name: "Continuar" }).click();
ok("nome do Google pré-preenchido", (await page.getByPlaceholder("Nome completo").inputValue()) === "Usuario OAuth E2E");
ok("sem campos de email/senha no completar", (await page.getByPlaceholder("Senha", { exact: true }).count()) === 0);
await page.getByPlaceholder("CPF").fill("99988877766"); await page.getByLabel("Data de nascimento").fill("2001-02-03");
await page.locator("select").nth(0).selectOption("Masculino"); await page.getByPlaceholder("Telefone").fill("11912345678");
await page.getByPlaceholder("CEP").fill("30130010"); await page.getByPlaceholder("Rua").fill("Rua Teste"); await page.getByLabel("Número").fill("100"); await page.getByPlaceholder("Bairro").fill("Centro"); await page.getByPlaceholder("Cidade").fill("Belo Horizonte"); await page.locator("select").nth(1).selectOption("MG");
await page.getByRole("button", { name: "Concluir cadastro" }).click();
ok("colaborador sem competência bloqueado", (await errTexts()).includes("Informe ao menos uma competência"));
await page.getByPlaceholder("Competências (separadas por vírgula)").fill("Designer, Técnico");
await page.getByRole("button", { name: "Concluir cadastro" }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});
ok("perfil completado → /inicio", page.url().endsWith("/inicio") && (await loggedAs("e2e.oauth@example.com")), page.url() + " " + (await alertText()));

await page.getByRole("link", { name: "Serviços" }).last().click(); await page.waitForURL("**/servicos");
ok("menu inferior leva a /servicos (em construção)", await page.getByText("Esta seção está em construção.").isVisible());
ok("item ativo do menu é Serviços", (await page.getByRole("link", { name: "Serviços" }).last().getAttribute("aria-current")) === "page");

// 13. Perfil — segue logado como o Colaborador que veio do OAuth (qualidades "Designer, Técnico", sem senha)
const qualidades = page.locator("section", { has: page.getByRole("heading", { name: "Qualidades" }) }).locator("ul > li");
await page.getByRole("link", { name: "Perfil" }).last().click(); await page.waitForURL("**/perfil");
await page.locator("h1").waitFor();
ok("perfil mostra nome e tipo de conta", (await page.textContent("h1")) === "Usuario OAuth E2E" && (await page.getByText("Colaborador", { exact: true }).isVisible()));
ok("Colaborador vê Qualidades e Currículo", (await page.locator("main h2").allTextContents()).join(",") === "Experiências Profissionais,Qualidades,Currículo");
ok("qualidades do cadastro listadas", (await qualidades.allTextContents()).join(",") === "Designer,Técnico", (await qualidades.allTextContents()).join(","));

// nome
await page.getByRole("button", { name: "Editar nome" }).click();
await page.getByLabel("Nome completo").fill("ab"); await page.getByRole("button", { name: "Salvar nome" }).click();
ok("nome curto rejeitado", (await alertText()).includes("3 letras"), await alertText());
await page.getByLabel("Nome completo").fill("  Nome Editado E2E  "); await page.getByRole("button", { name: "Salvar nome" }).click();
await page.locator("h1", { hasText: "Nome Editado E2E" }).waitFor({ timeout: 8000 }).catch(() => {});
await page.reload(); await page.locator("h1").waitFor();
ok("nome salvo (sem espaços) e mantido ao recarregar", (await page.textContent("h1")) === "Nome Editado E2E", await page.textContent("h1"));
await page.getByRole("button", { name: "Editar nome" }).click(); await page.keyboard.press("Escape");
ok("Esc cancela a edição do nome", (await page.getByLabel("Nome completo").count()) === 0);

// qualidades
const novaQualidade = page.getByPlaceholder("Nova qualidade (ex.: Designer)");
await page.getByRole("button", { name: "Editar qualidades" }).click();
await novaQualidade.fill("designer"); await novaQualidade.press("Enter");
ok("qualidade repetida rejeitada", (await alertText()).includes("já está na lista"), await alertText());
await novaQualidade.fill("Desenvolvedor Web"); await novaQualidade.press("Enter");
await page.getByRole("button", { name: "Remover Designer" }).click();
await page.getByRole("button", { name: "Salvar", exact: true }).click();
await qualidades.filter({ hasText: "Desenvolvedor Web" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("qualidades adicionadas/removidas e salvas", (await qualidades.allTextContents()).join(",") === "Técnico,Desenvolvedor Web", (await qualidades.allTextContents()).join(","));
await page.getByRole("button", { name: "Editar qualidades" }).click();
await page.getByRole("button", { name: "Remover Técnico" }).click(); await page.getByRole("button", { name: "Remover Desenvolvedor Web" }).click();
await page.getByRole("button", { name: "Salvar", exact: true }).click();
ok("lista de qualidades vazia não salva", (await alertText()).includes("ao menos uma"), await alertText());
await page.getByRole("button", { name: "Cancelar", exact: true }).click();
ok("cancelar restaura as qualidades", (await qualidades.count()) === 2);

// foto
await page.locator('input[type="file"][accept*="image"]').setInputFiles(PNG);
await page.locator('img[src*="cloudinary"], img[src*="_next/image"]').first().waitFor({ timeout: 30000 }).catch(() => {});
ok("foto enviada e exibida", (await page.locator('img[src*="cloudinary"], img[src*="_next/image"]').count()) > 0);

// currículo
const cvInput = page.locator('input[type="file"][accept="application/pdf"]');
ok("sem currículo mostra 'Enviar currículo'", await page.getByRole("button", { name: "Enviar currículo (PDF)" }).isVisible());
await cvInput.setInputFiles(PNG);
ok("currículo que não é PDF rejeitado", (await alertText()).includes("PDF"), await alertText());
await cvInput.setInputFiles(PDF);
await page.getByRole("button", { name: "Visualizar Currículo" }).waitFor({ timeout: 30000 }).catch(() => {});
ok("currículo enviado mostra Visualizar e Download", await page.getByRole("button", { name: "Download" }).isVisible());
const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
ok("download entrega o PDF", (await firstBytes(download)) === "%PDF-" && download.suggestedFilename() === "curriculo-nome-editado-e2e.pdf", download.suggestedFilename());
// o headless não tem visualizador de PDF: a aba nova recebe o arquivo como download
const [tab] = await Promise.all([ctx.waitForEvent("page"), page.getByRole("button", { name: "Visualizar Currículo" }).click()]);
const viewed = await tab.waitForEvent("download", { timeout: 15000 }).catch(() => null);
ok("visualizar abre o PDF em nova aba", viewed !== null && (await firstBytes(viewed)) === "%PDF-");
await tab.close();
ok("foto e currículo estão no Cloudinary", cloudinaryHas(`Skillhub/avatars/${OAUTH_ID}`, "image") && cloudinaryHas(`Skillhub/curriculos/${OAUTH_ID}`, "raw"));

// 14. Excluir conta sem senha (OAuth): confirma digitando EXCLUIR
const dialog = page.getByRole("dialog");
const confirmar = dialog.getByRole("button", { name: "Excluir conta" });
const abrirExclusao = async () => { await openMenu(); await page.getByRole("menuitem", { name: "Excluir conta" }).click(); await dialog.waitFor(); };
await abrirExclusao();
ok("conta OAuth confirma com a palavra EXCLUIR", (await dialog.locator('input[type="text"]').count()) === 1 && (await dialog.getByText("EXCLUIR", { exact: true }).isVisible()));
await dialog.locator("input").fill("excluí");
ok("palavra errada mantém o botão desabilitado", await confirmar.isDisabled());
await dialog.locator("input").fill("excluir");
ok("'excluir' em minúsculas habilita", await confirmar.isEnabled());
await confirmar.click(); await page.waitForURL("**/login?conta=excluida", { timeout: 10000 }).catch(() => {});
ok("conta OAuth excluída → login com aviso", page.url().endsWith("/login?conta=excluida") && (await page.getByRole("status").textContent()) === "Sua conta foi excluída.", page.url());
ok("foto e currículo apagados do Cloudinary", !cloudinaryHas(`Skillhub/avatars/${OAUTH_ID}`, "image") && !cloudinaryHas(`Skillhub/curriculos/${OAUTH_ID}`, "raw"));

// 15. Recuperação de senha (o Cliente do começo; o e-mail chega no Mailpit)
const NOVA_SENHA = "novaSenha1";
const status = () => page.getByRole("status").textContent().catch(() => "");
// sessão aberta em outro navegador antes da troca: deve ser encerrada por ela
const outroNavegador = await browser.newContext({ viewport: { width: 440, height: 956 } });
const sessaoAntiga = await outroNavegador.newPage(); sessaoAntiga.on("pageerror", (e) => pageErrors.push(e.message));
await sessaoAntiga.goto(B + "/login");
await sessaoAntiga.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await sessaoAntiga.getByPlaceholder("Senha").fill("senha123");
await sessaoAntiga.getByRole("button", { name: "Entrar", exact: true }).click(); await sessaoAntiga.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});

await page.getByPlaceholder("Email").fill("e2e.cliente@example.com");
await page.getByRole("link", { name: "Esqueceu a senha?" }).click(); await page.waitForURL("**/esqueci-senha**");
ok("'Esqueceu a senha?' leva o e-mail digitado", (await page.getByPlaceholder("Email").inputValue()) === "e2e.cliente@example.com");
await page.getByPlaceholder("Email").fill("ninguem.e2e@example.com"); await page.getByRole("button", { name: "Enviar link" }).click();
await page.getByRole("status").waitFor({ timeout: 8000 }).catch(() => {});
ok("e-mail sem conta recebe a mesma resposta", (await status()).includes("Se houver uma conta com ninguem.e2e@example.com"), await status());
await page.getByRole("button", { name: "Usar outro e-mail" }).click();
const antes = (await mailsTo("e2e.cliente@example.com")).length;
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByRole("button", { name: "Enviar link" }).click();
await page.getByRole("status").waitFor({ timeout: 8000 }).catch(() => {});
const resetLink = await waitResetLink("e2e.cliente@example.com", antes);
ok("e-mail de recuperação chega com o link", resetLink !== null, resetLink ?? "nenhum e-mail");
ok("nenhum e-mail para endereço sem conta", (await mailsTo("ninguem.e2e@example.com")).length === 0);

await page.goto(B + "/redefinir-senha?token=invalido");
await page.getByRole("link", { name: "Pedir um novo link" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("link inválido avisa e oferece um novo", (await alertText()).includes("inválido ou expirado"), await alertText());
await page.goto(resetLink ?? B);
const novaSenha = page.getByPlaceholder("Nova senha", { exact: true });
await novaSenha.waitFor({ timeout: 8000 }).catch(() => {});
await novaSenha.fill(NOVA_SENHA); await page.getByPlaceholder("Confirmar nova senha").fill("outraSenha");
await page.getByRole("button", { name: "Salvar nova senha" }).click();
ok("senhas diferentes bloqueadas", (await errTexts()).includes("As senhas não coincidem"));
await page.getByPlaceholder("Confirmar nova senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Salvar nova senha" }).click();
await page.waitForURL("**/login?senha=redefinida", { timeout: 10000 }).catch(() => {});
ok("senha redefinida → login com aviso", (await status()) === "Senha redefinida. Entre com a nova senha.", page.url());
await page.goto(resetLink ?? B);
await page.getByRole("link", { name: "Pedir um novo link" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("link já usado não vale de novo", (await alertText()).includes("inválido ou expirado"), await alertText());

await sessaoAntiga.reload(); await sessaoAntiga.waitForURL("**/login", { timeout: 10000 }).catch(() => {});
ok("sessão aberta antes da troca foi encerrada", sessaoAntiga.url().endsWith("/login"), sessaoAntiga.url());
await outroNavegador.close();

await page.goto(B + "/login");
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill("senha123");
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForTimeout(1000);
ok("senha antiga não entra mais", (await alertText()).includes("incorretos"), await alertText());
await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});
ok("entra com a senha nova", page.url().endsWith("/inicio"), page.url());

// 16. Excluir conta com senha (o Cliente, já com a senha nova), com uma segunda aba aberta
await page.goto(B + "/perfil"); await page.locator("h1").waitFor();
ok("Cliente vê só as estatísticas no perfil", (await page.locator("main h2").allTextContents()).join(",") === "Experiências Profissionais");
const outraAba = await ctx.newPage(); outraAba.on("pageerror", (e) => pageErrors.push(e.message));
await outraAba.goto(B + "/perfil"); await outraAba.locator("h1").waitFor();

await abrirExclusao();
ok("conta com senha pede a senha", (await dialog.locator('input[type="password"]').count()) === 1);
ok("botão desabilitado sem senha", await confirmar.isDisabled());
await page.keyboard.press("Escape");
ok("Esc fecha o modal", (await dialog.count()) === 0);
await abrirExclusao(); await page.mouse.click(5, 5);
ok("clique fora fecha o modal", (await dialog.count()) === 0);
await abrirExclusao();
await dialog.locator("input").fill("errada"); await confirmar.click();
await dialog.getByRole("alert").waitFor({ timeout: 8000 }).catch(() => {});
ok("senha errada não exclui", (await dialog.getByRole("alert").textContent().catch(() => "")) === "Senha incorreta" && page.url().endsWith("/perfil"));
await dialog.locator("input").fill(NOVA_SENHA); await confirmar.click();
await page.waitForURL("**/login?conta=excluida", { timeout: 10000 }).catch(() => {});
ok("senha certa exclui → login com aviso", page.url().endsWith("/login?conta=excluida"), page.url());

await outraAba.getByRole("button", { name: "Editar nome" }).click();
await outraAba.getByLabel("Nome completo").fill("Outro Nome"); await outraAba.getByRole("button", { name: "Salvar nome" }).click();
await outraAba.waitForURL("**/login", { timeout: 10000 }).catch(() => {});
ok("outra aba aberta cai no login ao editar", outraAba.url().endsWith("/login"), outraAba.url());
await outraAba.close();

await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForTimeout(1000);
ok("conta excluída não entra de novo", (await alertText()).includes("incorretos"), await alertText());

ok("sem erros de JavaScript na página", pageErrors.length === 0, pageErrors.join(" | "));
await browser.close();

console.log(`\n${results.passed} de ${results.passed + results.failed} passaram`);
if (results.failed) process.exitCode = 1;
