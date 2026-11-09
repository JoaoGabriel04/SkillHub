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
// A engrenagem do header leva a /configuracoes: lá ficam Sair e, em Privacidade e Segurança, o e-mail da conta e o Excluir conta
const openConfig = async () => { await page.getByRole("link", { name: "Configurações" }).click(); await page.waitForURL("**/configuracoes"); };
const openPrivacidade = async () => { await openConfig(); await page.getByRole("button", { name: /Privacidade e Segurança/ }).click(); };
const loggedAs = async (email) => { await page.getByRole("heading", { name: "SkillHub" }).waitFor({ timeout: 8000 }).catch(() => {}); await openPrivacidade(); const ok = await page.getByText(email).isVisible().catch(() => false); await page.keyboard.press("Escape"); return ok; };
const sair = async () => { await openConfig(); await page.getByRole("button", { name: /^Sair/ }).click(); };
const errTexts = async () => (await page.locator("p.text-danger").allTextContents());
// Entrar com erro esperado: a mensagem entra "decodificando" (ScrambleText). O React escreve o texto final e, no quadro
// seguinte, o GSAP o embaralha; esperar só pelo texto passaria nesse primeiro quadro. Espera embaralhar e voltar ao final.
const entrarComErro = async (texto) => {
  await page.evaluate(() => { window.__embaralhou = false; });
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForFunction((t) => {
    const s = document.querySelector("[data-alert] [role=alert]")?.textContent ?? "";
    if (s && !s.includes(t)) window.__embaralhou = true;
    return window.__embaralhou && s.includes(t);
  }, texto, { polling: "raf", timeout: 8000 }).catch(() => {}); // o ok abaixo reprova com o texto
};
// A colmeia (entrar/sair da área logada) bloqueia cliques até a fase voltar a "idle" (pointer-events: none no overlay).
// Interagir com a tela antes disso, ou seguir depois de um waitForURL que estourou em silêncio, corre com a transição:
// era a causa do passo 16 instável (login logo depois do Sair pela sidebar, numa máquina lenta).
const transicaoParada = (p = page) =>
  p.waitForFunction(() => getComputedStyle(document.querySelector(".page-transition-overlay")).pointerEvents === "none");

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
// a mensagem entra "decodificando" (ScrambleText); espera o texto final
await page.locator("[role=alert]", { hasText: "Discord" }).waitFor({ timeout: 3000 }).catch(() => {});
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
ok("menu inferior leva a /servicos", await page.getByRole("heading", { name: "Serviços", level: 1 }).isVisible());
ok("item ativo do menu é Serviços", (await page.getByRole("link", { name: "Serviços" }).last().getAttribute("aria-current")) === "page");

// 13. Perfil — segue logado como o Colaborador que veio do OAuth (qualidades "Designer, Técnico", sem senha)
const qualidades = page.locator("section", { has: page.getByRole("heading", { name: "Qualidades" }) }).locator("ul > li");
await page.getByRole("link", { name: "Perfil" }).last().click(); await page.waitForURL("**/perfil");
await page.locator("h1").waitFor();
ok("perfil mostra nome e tipo de conta", (await page.textContent("h1")) === "Usuario OAuth E2E" && (await page.getByText("Colaborador", { exact: true }).isVisible()));
ok("Colaborador vê Qualidades e Currículo", (await page.locator("main h2").allTextContents()).join(",") === "Experiências Profissionais,Qualidades,Currículo");
ok("qualidades do cadastro listadas", (await qualidades.allTextContents()).join(",") === "Designer,Técnico", (await qualidades.allTextContents()).join(","));

// nome (modal de dados pessoais)
await page.getByRole("button", { name: "Editar dados pessoais" }).click();
await page.getByLabel("Nome completo").fill("ab"); await page.getByRole("button", { name: "Salvar", exact: true }).click();
ok("nome curto rejeitado", (await alertText()).includes("3 letras"), await alertText());
await page.getByLabel("Nome completo").fill("  Nome Editado E2E  "); await page.getByRole("button", { name: "Salvar", exact: true }).click();
await page.locator("h1", { hasText: "Nome Editado E2E" }).waitFor({ timeout: 8000 }).catch(() => {});
await page.reload(); await page.locator("h1").waitFor();
ok("nome salvo (sem espaços) e mantido ao recarregar", (await page.textContent("h1")) === "Nome Editado E2E", await page.textContent("h1"));
await page.getByRole("button", { name: "Editar dados pessoais" }).click(); await page.keyboard.press("Escape");
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
await page.getByRole("button", { name: "Enviar currículo (PDF)" }).click(); // abre o modal do currículo
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
const abrirExclusao = async () => {
  if (!page.url().endsWith("/configuracoes")) await openConfig();
  await page.getByRole("button", { name: /Privacidade e Segurança/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir conta" }).click();
  await page.getByRole("dialog", { name: "Privacidade e Segurança" }).waitFor({ state: "detached" });
  await dialog.waitFor();
};
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
await entrarComErro("incorretos");
ok("senha antiga não entra mais", (await alertText()).includes("incorretos"), await alertText());
await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }); await transicaoParada();
ok("entra com a senha nova", page.url().endsWith("/inicio"), page.url());

// 15a2. Console limpo: nenhum aviso ou erro em /login, /cadastro (com foco em cada campo, inclusive os sem ícone),
// na casca logada e no diálogo de exclusão. Falha de rede esperada (o 401 do refresh sem sessão) não conta.
const ctxConsole = await browser.newContext({ viewport: { width: 440, height: 956 } });
const pc = await ctxConsole.newPage();
const avisosConsole = [];
pc.on("console", (m) => {
  if (["warning", "error"].includes(m.type()) && !m.text().startsWith("Failed to load resource"))
    avisosConsole.push(`${new URL(pc.url()).pathname}: ${m.text()}`);
});
pc.on("pageerror", (e) => pageErrors.push(e.message));
await pc.goto(B + "/cadastro"); await pc.getByRole("radio", { name: "Cliente" }).click(); await pc.getByRole("button", { name: "Continuar" }).click();
await pc.getByPlaceholder("Nome completo").waitFor();
for (const campo of await pc.locator("input:visible, select:visible").all()) await campo.focus();
await pc.goto(B + "/login");
await pc.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await pc.getByPlaceholder("Senha").fill(NOVA_SENHA);
await pc.getByRole("button", { name: "Entrar", exact: true }).click(); await pc.waitForURL("**/inicio");
for (const [nome, rota] of [["Serviços", "/servicos"], ["Produtos", "/produtos"], ["Comunidade", "/comunidade"], ["Perfil", "/perfil"]]) {
  await pc.getByRole("link", { name: nome }).last().click(); await pc.waitForURL("**" + rota);
}
await pc.getByRole("link", { name: "Configurações" }).click(); await pc.waitForURL("**/configuracoes");
await pc.getByRole("button", { name: /Privacidade e Segurança/ }).click();
await pc.getByRole("dialog").getByRole("button", { name: "Excluir conta" }).click();
await pc.getByRole("dialog", { name: "Privacidade e Segurança" }).waitFor({ state: "detached" });
await pc.getByRole("dialog").locator("input").focus(); // o aviso do GSAP sai na hora, dentro do onFocus
ok("console sem avisos em /login, /cadastro, na casca e no diálogo de exclusão", avisosConsole.length === 0, avisosConsole.join(" | "));
await ctxConsole.close();

// 15b. Desktop (lg+): a sidebar substitui o menu inferior e o header; navega, marca o item ativo e sai por ela
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(B + "/inicio"); await page.getByRole("heading", { name: "SkillHub" }).waitFor();
const sidebar = page.getByRole("complementary", { name: "Barra lateral" });
ok("desktop: sidebar visível, menu inferior e header ocultos",
  (await sidebar.isVisible()) && (await page.locator("nav.fixed").isHidden()) && (await page.locator("header").isHidden()));
const semRolagemLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
for (const [label, rota] of [["Serviços", "/servicos"], ["Produtos", "/produtos"], ["Comunidade", "/comunidade"], ["Perfil", "/perfil"], ["Início", "/inicio"], ["Configurações", "/configuracoes"]]) {
  const link = sidebar.getByRole("link", { name: label, exact: true });
  await link.click(); await page.waitForURL("**" + rota);
  ok(`desktop: sidebar leva a ${rota} e marca ${label}`, (await link.getAttribute("aria-current")) === "page" && (await sidebar.locator("[aria-current=page]").count()) === 1);
  ok(`desktop: ${rota} sem rolagem horizontal`, await semRolagemLateral());
}
ok("desktop: créditos da sidebar vêm do usuário", (await sidebar.getByText("Seus créditos").isVisible()) && (await sidebar.getByText("0,00").first().isVisible()));

// 15c. Tema (Fase 16.4): Aparência em Configurações, atalho da sidebar, persistência, "Sistema" e sem piscada
const temaHtml = () => page.evaluate(() => (document.documentElement.classList.contains("dark") ? "escuro" : "claro"));
const aparencia = page.getByRole("radiogroup", { name: "Aparência" });
const marcada = async () => aparencia.locator("[role=radio][aria-checked=true]").textContent();
const PRIMEIRO_QUADRO = () => requestAnimationFrame(() => {
  window.__temaPrimeiroQuadro = document.documentElement.classList.contains("dark") ? "escuro" : "claro";
});
ok("tema: padrão é Escuro", (await temaHtml()) === "escuro" && (await marcada()) === "Escuro");
await aparencia.getByRole("radio", { name: "Claro" }).click();
ok("tema: Claro troca na hora, sem recarregar", (await temaHtml()) === "claro" && (await page.getByText("Em uso: Claro").isVisible()));
ok("tema: barra do navegador clara na área logada", (await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.content)) === "#f4f7f7");
await page.getByRole("button", { name: /Notificações/ }).click();
await page.locator("[data-sonner-toast]").first().waitFor();
ok("tema: toasts seguem o tema", (await page.locator("[data-sonner-toaster]").getAttribute("data-sonner-theme")) === "light");
await page.reload(); await aparencia.waitFor();
ok("tema: escolha sobrevive a recarregar", (await temaHtml()) === "claro" && (await marcada()) === "Claro");
const abaTema = await ctx.newPage(); await abaTema.addInitScript(PRIMEIRO_QUADRO);
await abaTema.goto(B + "/inicio"); await abaTema.getByRole("heading", { name: "SkillHub" }).waitFor();
ok("tema: sem piscada (aba nova já pinta o primeiro quadro no claro)", (await abaTema.evaluate(() => window.__temaPrimeiroQuadro)) === "claro");
await abaTema.close();
await aparencia.getByRole("radio", { name: "Claro" }).focus(); await page.keyboard.press("ArrowRight");
ok("tema: setas do teclado trocam a opção", (await marcada()) === "Escuro" && (await temaHtml()) === "escuro" &&
  (await page.evaluate(() => document.activeElement?.textContent)) === "Escuro");
await page.emulateMedia({ colorScheme: "light" });
await aparencia.getByRole("radio", { name: "Sistema" }).click();
ok("tema: Sistema segue o sistema", (await temaHtml()) === "claro" && (await page.getByText("Em uso: Sistema (agora claro)").isVisible()));
await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(200);
ok("tema: Sistema acompanha a troca com a página aberta", (await temaHtml()) === "escuro");
await page.emulateMedia({ colorScheme: null });
await aparencia.getByRole("radio", { name: "Escuro" }).click();
const atalhoTema = sidebar.getByRole("switch", { name: "Tema escuro" });
ok("tema: switch da sidebar ligado no escuro", (await atalhoTema.getAttribute("aria-checked")) === "true");
await atalhoTema.click();
ok("tema: switch da sidebar alterna", (await temaHtml()) === "claro" && (await atalhoTema.getAttribute("aria-checked")) === "false" && (await marcada()) === "Claro");
await sidebar.locator("label").filter({ hasText: "Tema" }).getByText("Tema", { exact: true }).click();
ok("tema: clicar no rótulo também alterna", (await temaHtml()) === "escuro" && (await atalhoTema.getAttribute("aria-checked")) === "true");
// telas de entrada sempre escuras, localStorage bloqueado e valor inválido: navegadores à parte (sem sessão)
const semSessao = async (prepara) => {
  const c = await browser.newContext({ viewport: { width: 440, height: 956 } });
  await c.addInitScript(prepara);
  const p = await c.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(B + "/login"); await p.getByRole("button", { name: "Entrar", exact: true }).waitFor();
  const r = await p.evaluate(() => ({
    html: document.documentElement.classList.contains("dark") ? "escuro" : "claro",
    fundo: getComputedStyle(document.querySelector("main")).getPropertyValue("--background").trim(),
    barra: document.querySelector('meta[name="theme-color"]')?.content,
  }));
  await c.close(); return { ...r, erros };
};
const entrada = await semSessao(() => localStorage.setItem("skillhub-tema", "claro"));
ok("tema: telas de entrada ficam escuras com o tema claro", entrada.html === "claro" && entrada.fundo === "#101010", JSON.stringify(entrada));
ok("tema: barra do navegador escura nas telas de entrada, mesmo no claro", entrada.barra === "#101010", JSON.stringify(entrada));
const bloqueado = await semSessao(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("bloqueado"); } }));
ok("tema: localStorage bloqueado cai no escuro, sem erro", bloqueado.html === "escuro" && bloqueado.erros.length === 0, bloqueado.erros.join(" | "));
const invalido = await semSessao(() => localStorage.setItem("skillhub-tema", "roxo"));
ok("tema: valor inválido cai no escuro", invalido.html === "escuro");
// 15d. Início no desktop (Fase 16.2, designs/New Início - Desktop.png): a 1440×900 cabe sem rolar
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(B + "/inicio"); await page.getByRole("heading", { name: "SkillHub" }).waitFor(); await page.waitForTimeout(800);
const visiveis = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length).length, sel);
ok("início desktop: cabe em 1440×900 sem rolar", await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
ok("início desktop: sem rolagem horizontal", await semRolagemLateral());
ok("início desktop: 6 colaboradores, 2 serviços e 2 produtos",
  (await page.locator("main ul [role=img]").evaluateAll((els) => els.filter((e) => e.getClientRects().length).length)) === 6 &&
  (await visiveis('[aria-label="Serviços"] > *')) === 2 && (await visiveis('[aria-label="Produtos"] > *')) === 2);
ok("início desktop: eventos seguem em carrossel com dots", (await page.getByRole("button", { name: /Ir para o item/ }).count()) === 3);
await page.getByRole("searchbox", { name: "Buscar no SkillHub" }).fill("design"); await page.keyboard.press("Enter");
ok("início desktop: busca global avisa 'em breve'", ((await page.locator("[data-sonner-toast]").first().textContent({ timeout: 3000 }).catch(() => "")) ?? "").includes("A busca global"));
await page.setViewportSize({ width: 1280, height: 800 });
await sidebar.getByRole("button", { name: "Sair" }).click(); await page.waitForURL("**/login", { timeout: 8000 }).catch(() => {});
ok("desktop: Sair da sidebar leva ao login", page.url().endsWith("/login"), page.url());
await transicaoParada();
await page.setViewportSize({ width: 440, height: 956 });
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }); await transicaoParada();

// 15e. Serviços (Fase 17A): API com os casos de erro, privacidade do autor, exclusão em cascata e a tela
const sql = (q) => execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "postgres", "psql", "-U", "skillhub", "-d", "skillhub", "-tAc", q], { encoding: "utf8" }).trim();
const chamar = async (metodo, rota, token, corpo) => {
  const r = await fetch(`${API}/api${rota}`, {
    method: metodo,
    headers: { ...(corpo && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: corpo && JSON.stringify(corpo),
  }).catch((e) => { throw new Error(`${metodo} ${rota}: ${e.cause?.message ?? e.message}`, { cause: e }); }); // diz qual chamada caiu
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
};
const contaServicos = async (nome, cpf, cidade) => {
  const email = `e2e.servicos.${nome}@example.com`;
  const { corpo } = await chamar("POST", "/auth/register/cliente", null, {
    fullName: `Servicos ${nome} E2E`, phone: "11987654321", cpf, dataNascimento: "1990-01-01", genero: "Outro",
    cep: "01310-100", rua: "Rua Teste", numero: "1", bairro: "Centro", cidade, estado: "SP",
    email, confirmEmail: email, password: "senha123", confirmPassword: "senha123",
  });
  return corpo.accessToken;
};
const [autor, outro, excluido] = [await contaServicos("autor", "900.000.000-01", "Recife"), await contaServicos("outro", "900.000.000-02", "São Paulo"), await contaServicos("excluido", "900.000.000-03", "São Paulo")];
const pedido = (extra = {}) => ({ titulo: "Pedido E2E de fumaça", descricao: "Descrição do pedido de teste do e2e", categoria: "Tecnologia", remuneracao: 50, ...extra });
const ids = (lista) => lista.corpo.servicos.map((s) => s.id);

ok("serviços: sem token dá 401", (await chamar("GET", "/servicos")).status === 401);
const criado = await chamar("POST", "/servicos", autor, pedido());
ok("serviços: publicar dá 201 com status Aberto", criado.status === 201 && criado.corpo.servico.status === "Aberto", JSON.stringify(criado.corpo));
const p1 = criado.corpo.servico.id;
ok("serviços: autor só com id, nome e foto", JSON.stringify(Object.keys(criado.corpo.servico.autor).sort()) === '["fullName","id","urlPhoto"]' &&
  !/email|cpf|cnpj|phone|cidade|password|googleId|dataNascimento/.test(JSON.stringify(criado.corpo)));
const pedidoInvalido = await chamar("POST", "/servicos", autor, { titulo: "ab", descricao: "curta", categoria: "Roxo", remuneracao: -1, prazo: "2020-01-01" });
ok("serviços: validação dá 400 com os 5 campos", pedidoInvalido.status === 400 && pedidoInvalido.corpo.details?.length === 5, JSON.stringify(pedidoInvalido.corpo));
sql(`update "User" set "profileComplete" = false where email = 'e2e.servicos.excluido@example.com'`);
ok("serviços: perfil incompleto não publica (403)", (await chamar("POST", "/servicos", excluido, pedido())).status === 403);
sql(`update "User" set "profileComplete" = true where email = 'e2e.servicos.excluido@example.com'`);

ok("serviços: o pedido aparece para os outros", ids(await chamar("GET", "/servicos?limit=50", outro)).includes(p1));
ok("serviços: e não na lista geral do autor (está em /meus)", !ids(await chamar("GET", "/servicos?limit=50", autor)).includes(p1) &&
  ids(await chamar("GET", "/servicos/meus", autor)).includes(p1));
ok("serviços: filtro de categoria", ids(await chamar("GET", `/servicos?limit=50&categoria=${encodeURIComponent("Tecnologia")}`, outro)).includes(p1) &&
  !ids(await chamar("GET", `/servicos?limit=50&categoria=${encodeURIComponent("Educação")}`, outro)).includes(p1));
ok("serviços: busca sem diferenciar maiúsculas", ids(await chamar("GET", "/servicos?limit=50&q=FUMA%C3%87A", outro)).includes(p1));
ok("serviços: filtro de cidade do autor", ids(await chamar("GET", "/servicos?limit=50&cidade=recife", outro)).includes(p1) &&
  !ids(await chamar("GET", "/servicos?limit=50&cidade=Natal", outro)).includes(p1));
for (let i = 0; i < 2; i++) await chamar("POST", "/servicos", autor, pedido({ titulo: `Pedido E2E página ${i}` }));
const pag1 = await chamar("GET", "/servicos?limit=2&cidade=Recife", outro);
const pag2 = await chamar("GET", `/servicos?limit=2&cidade=Recife&cursor=${pag1.corpo.nextCursor}`, outro);
ok("serviços: paginação por cursor", ids(pag1).length === 2 && pag1.corpo.nextCursor && ids(pag2).length === 1 && pag2.corpo.nextCursor === null &&
  !ids(pag2).some((id) => ids(pag1).includes(id)));

ok("serviços: detalhe dá 200", (await chamar("GET", `/servicos/${p1}`, outro)).corpo.servico?.id === p1);
ok("serviços: detalhe inexistente dá 404", (await chamar("GET", "/servicos/00000000-0000-4000-8000-999999999999", outro)).status === 404 &&
  (await chamar("GET", "/servicos/abc", outro)).status === 404);
const editado = await chamar("PATCH", `/servicos/${p1}`, autor, { titulo: "Pedido E2E editado" });
ok("serviços: o autor edita", editado.status === 200 && editado.corpo.servico.titulo === "Pedido E2E editado");
ok("serviços: outro usuário não edita (403)", (await chamar("PATCH", `/servicos/${p1}`, outro, { titulo: "Invasão" })).status === 403);
ok("serviços: outro usuário não cancela (403)", (await chamar("DELETE", `/servicos/${p1}`, outro)).status === 403);
const cancelado = await chamar("DELETE", `/servicos/${p1}`, autor);
ok("serviços: o autor cancela (vira Cancelado, a linha fica)", cancelado.status === 200 && cancelado.corpo.servico.status === "Cancelado" &&
  sql(`select status from "Servico" where id = '${p1}'`) === "CANCELADO");
ok("serviços: cancelado sai da lista e some para os outros", !ids(await chamar("GET", "/servicos?limit=50", outro)).includes(p1) &&
  (await chamar("GET", `/servicos/${p1}`, outro)).status === 404 && (await chamar("GET", `/servicos/${p1}`, autor)).status === 200);
ok("serviços: cancelado não se edita (409)", (await chamar("PATCH", `/servicos/${p1}`, autor, { titulo: "Depois de cancelar" })).status === 409);
// concluir pela API só existe na 17B: o teste marca direto no banco
const pConcluido = (await chamar("POST", "/servicos", autor, pedido({ titulo: "Pedido E2E concluído" }))).corpo.servico.id;
sql(`update "Servico" set status = 'CONCLUIDO', "concluidoEm" = now() where id = '${pConcluido}'`);
ok("serviços: concluído não se cancela (409)", (await chamar("DELETE", `/servicos/${pConcluido}`, autor)).status === 409);
const pExcluido = (await chamar("POST", "/servicos", excluido, pedido({ titulo: "Pedido de quem vai sair" }))).corpo.servico.id;
const saiu = await chamar("DELETE", "/user", excluido, { password: "senha123" });
ok("serviços: excluir a conta apaga os pedidos do autor", saiu.status === 204 && (await chamar("GET", `/servicos/${pExcluido}`, outro)).status === 404 &&
  sql(`select count(*) from "Servico" where id = '${pExcluido}'`) === "0");

// tela: o Cliente logado publica pelo diálogo; o pedido aparece em "Seus pedidos" e para outro usuário
await page.goto(B + "/servicos"); await page.getByRole("heading", { name: "Serviços", level: 1 }).waitFor();
const convite = page.getByText("Você ainda não publicou nenhum pedido.", { exact: false });
await convite.waitFor({ timeout: 8000 }).catch(() => {});
ok("serviços (tela): sem pedidos, Seus pedidos aparece vazio com o convite", await convite.isVisible());
await page.getByRole("button", { name: "Publicar pedido", exact: true }).click();
const dialogo = page.getByRole("dialog", { name: "Publicar pedido" });
await dialogo.getByRole("button", { name: "Publicar" }).click();
ok("serviços (tela): formulário vazio mostra os erros", await dialogo.getByText("O título precisa ter ao menos 3 caracteres").isVisible());
await dialogo.getByLabel("Título").fill("Pedido pela tela E2E");
await dialogo.getByLabel("Descrição").fill("Pedido publicado pelo diálogo no teste e2e");
await dialogo.getByLabel("Categoria").selectOption("Educação");
await dialogo.getByLabel("Remuneração (créditos)").fill("80");
await dialogo.getByRole("button", { name: "Publicar" }).click();
await dialogo.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
const seus = page.getByRole("region", { name: "Seus pedidos" });
await seus.waitFor({ timeout: 8000 }).catch(() => {});
ok("serviços (tela): publicado aparece em Seus pedidos", (await seus.getByText("Pedido pela tela E2E").count()) === 1);
ok("serviços (tela): e para outro usuário na busca", (await chamar("GET", `/servicos?limit=50&q=${encodeURIComponent("pela tela E2E")}`, outro)).corpo.servicos.length === 1);
await page.goto(B + "/inicio"); await page.getByRole("heading", { name: "SkillHub" }).waitFor();
const secaoServicos = page.getByRole("region", { name: "Serviços" });
await secaoServicos.locator("h3").first().waitFor({ timeout: 8000 }).catch(() => {});
ok("serviços (tela): Início mostra pedidos do banco", (await secaoServicos.getByText("Servicos autor E2E").count()) > 0);

// 15f. Candidaturas e contratação (Fase 17B): fluxo completo, corrida de aceitações, permissões e a tela
const contaPerfil = async (nome, cpf, perfil) => {
  const email = `e2e.candidaturas.${nome}@example.com`;
  const { corpo } = await chamar("POST", `/auth/register/${perfil}`, null, {
    fullName: `Candidaturas ${nome} E2E`, phone: "11987654321", cpf, dataNascimento: "1990-01-01", genero: "Outro",
    cep: "01310-100", rua: "Rua Teste", numero: "1", bairro: "Centro", cidade: "São Paulo", estado: "SP",
    email, confirmEmail: email, password: "senha123", confirmPassword: "senha123",
  });
  return corpo.accessToken;
};
const autorB = await contaPerfil("autor", "900.000.001-01", "cliente");
// desde a Fase 17C aceitar reserva créditos do autor: os autores de teste recebem saldo pelo script de concessão
const conceder = (email, valor) =>
  execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "npm", "run", "-s", "creditos:conceder", "--", "--email", email, "--valor", String(valor)], { encoding: "utf8" });
conceder("e2e.candidaturas.autor@example.com", 1000);
conceder("e2e.cliente@example.com", 500);
const colabA = await contaPerfil("colaba", "900.000.001-02", "colaborador");
const colabB = await contaPerfil("colabb", "900.000.001-03", "colaborador");
const clienteB = await contaPerfil("cliente", "900.000.001-04", "cliente");
const novoPedido = async (titulo) => (await chamar("POST", "/servicos", autorB, pedido({ titulo }))).corpo.servico.id;
const candidatarB = (servicoId, token, mensagem = "Posso fazer isso nesta semana.") => chamar("POST", `/servicos/${servicoId}/candidaturas`, token, { mensagem, valorProposto: 40 });
const semDadosPessoais = (corpo) => !/email|cpf|cnpj|phone|cidade|password|googleId|dataNascimento/.test(JSON.stringify(corpo));

// fluxo completo
const pFluxo = await novoPedido("Pedido E2E de candidaturas");
const cA = await candidatarB(pFluxo, colabA);
ok("candidaturas: colaborador se candidata (201, Pendente)", cA.status === 201 && cA.corpo.candidatura.status === "Pendente" && semDadosPessoais(cA.corpo));
const cB = await candidatarB(pFluxo, colabB);
ok("candidaturas: só Colaborador se candidata (403)", (await candidatarB(pFluxo, clienteB)).status === 403);
ok("candidaturas: não no próprio pedido (403)", (await candidatarB(pFluxo, autorB)).status === 403);
ok("candidaturas: uma por colaborador (409)", (await candidatarB(pFluxo, colabA)).status === 409);
ok("candidaturas: mensagem curta dá 400", (await chamar("POST", `/servicos/${pFluxo}/candidaturas`, colabB, { mensagem: "oi" })).status === 400);
ok("candidaturas: sem token dá 401", (await chamar("GET", "/candidaturas/minhas")).status === 401);
const listaAutor = await chamar("GET", `/servicos/${pFluxo}/candidaturas`, autorB);
ok("candidaturas: o autor vê as duas, só com id, nome e foto", listaAutor.status === 200 && listaAutor.corpo.candidaturas.length === 2 &&
  JSON.stringify(Object.keys(listaAutor.corpo.candidaturas[0].colaborador).sort()) === '["fullName","id","urlPhoto"]' && semDadosPessoais(listaAutor.corpo));
ok("candidaturas: só o autor vê a lista (403)", (await chamar("GET", `/servicos/${pFluxo}/candidaturas`, colabA)).status === 403);
const meusB = await chamar("GET", "/servicos/meus", autorB);
ok("candidaturas: Seus pedidos conta as pendentes", meusB.corpo.servicos.find((x) => x.id === pFluxo)?.candidaturasPendentes === 2);
ok("candidaturas: só o autor aceita (403)", (await chamar("POST", `/candidaturas/${cA.corpo.candidatura.id}/aceitar`, colabB)).status === 403);
ok("candidaturas: só o dono retira (403)", (await chamar("PATCH", `/candidaturas/${cA.corpo.candidatura.id}/retirar`, colabB)).status === 403);
ok("candidaturas: concluir pedido aberto dá 409", (await chamar("POST", `/servicos/${pFluxo}/concluir`, autorB)).status === 409);
const aceita = await chamar("POST", `/candidaturas/${cA.corpo.candidatura.id}/aceitar`, autorB);
const [stServ, colabId, aceitoEm] = sql(`select status, "colaboradorId" is not null, "aceitoEm" is not null from "Servico" where id = '${pFluxo}'`).split("|");
ok("candidaturas: aceitar põe o pedido em andamento com colaborador e aceitoEm", aceita.status === 200 && aceita.corpo.candidatura.status === "Aceita" &&
  stServ === "EM_ANDAMENTO" && colabId === "t" && aceitoEm === "t");
const minhasB = await chamar("GET", "/candidaturas/minhas", colabB);
ok("candidaturas: a outra vira Recusada (e /minhas traz o resumo do serviço)", minhasB.corpo.candidaturas.find((c) => c.servico.id === pFluxo)?.status === "Recusada" && semDadosPessoais(minhasB.corpo));
ok("candidaturas: aceitar uma recusada dá 409", (await chamar("POST", `/candidaturas/${cB.corpo.candidatura.id}/aceitar`, autorB)).status === 409);
ok("candidaturas: retirar uma não pendente dá 409", (await chamar("PATCH", `/candidaturas/${cA.corpo.candidatura.id}/retirar`, colabA)).status === 409);
ok("candidaturas: candidatar a pedido em andamento dá 409", (await candidatarB(pFluxo, await contaPerfil("tarde", "900.000.001-05", "colaborador"))).status === 409);
ok("candidaturas: só o autor conclui (403)", (await chamar("POST", `/servicos/${pFluxo}/concluir`, colabA)).status === 403);
const concluido = await chamar("POST", `/servicos/${pFluxo}/concluir`, autorB);
ok("candidaturas: concluir preenche concluidoEm", concluido.status === 200 && concluido.corpo.servico.status === "Concluído" &&
  sql(`select "concluidoEm" is not null from "Servico" where id = '${pFluxo}'`) === "t");
ok("candidaturas: concluído continua sem cancelar (409)", (await chamar("DELETE", `/servicos/${pFluxo}`, autorB)).status === 409);

// retirar e cancelar
const pRetirar = await novoPedido("Pedido E2E para retirar");
const cRet = await candidatarB(pRetirar, colabA);
const retirada = await chamar("PATCH", `/candidaturas/${cRet.corpo.candidatura.id}/retirar`, colabA);
ok("candidaturas: o colaborador retira a pendente", retirada.status === 200 && retirada.corpo.candidatura.status === "Retirada");
ok("candidaturas: aceitar uma retirada dá 409", (await chamar("POST", `/candidaturas/${cRet.corpo.candidatura.id}/aceitar`, autorB)).status === 409);
await candidatarB(pRetirar, colabB);
await chamar("DELETE", `/servicos/${pRetirar}`, autorB);
ok("candidaturas: cancelar o pedido recusa as pendentes", (await chamar("GET", "/candidaturas/minhas", colabB)).corpo.candidaturas.find((c) => c.servico.id === pRetirar)?.status === "Recusada");
const pAndamento = await novoPedido("Pedido E2E em andamento para cancelar");
const cAnd = await candidatarB(pAndamento, colabB);
await chamar("POST", `/candidaturas/${cAnd.corpo.candidatura.id}/aceitar`, autorB);
const cancelAnd = await chamar("DELETE", `/servicos/${pAndamento}`, autorB);
ok("candidaturas: o autor cancela um pedido em andamento (a aceita fica no histórico)", cancelAnd.status === 200 && cancelAnd.corpo.servico.status === "Cancelado" &&
  sql(`select status from "Candidatura" where id = '${cAnd.corpo.candidatura.id}'`) === "ACEITA");

// corrida: duas aceitações ao mesmo tempo no mesmo pedido
const pCorrida = await novoPedido("Pedido E2E da corrida");
const [r1, r2] = [await candidatarB(pCorrida, colabA), await candidatarB(pCorrida, colabB)];
const corrida = await Promise.all([r1, r2].map((c) => chamar("POST", `/candidaturas/${c.corpo.candidatura.id}/aceitar`, autorB)));
ok("candidaturas: corrida de duas aceitações (uma 200, outra 409, um colaborador só)", corrida.map((r) => r.status).sort().join() === "200,409" &&
  sql(`select count(*) from "Candidatura" where "servicoId" = '${pCorrida}' and status = 'ACEITA'`) === "1",
  corrida.map((r) => r.status).join());

// colaborador aceito que sai: desde a faxina pré-Fase 18 o app recusa (409, ver 15g). O estado continua possível em dados
// antigos, então é reconstruído pelo mesmo ON DELETE do banco que a exclusão pelo app disparava: o serviço continua,
// sem colaborador, e as candidaturas dele somem
const pExcl = await novoPedido("Pedido E2E do colaborador que sai");
const cExcl = await candidatarB(pExcl, colabA);
await chamar("POST", `/candidaturas/${cExcl.corpo.candidatura.id}/aceitar`, autorB);
const saiuColab = await chamar("DELETE", "/user", colabA, { password: "senha123" });
sql(`delete from "User" where email = 'e2e.candidaturas.colaba@example.com'`);
ok("candidaturas: colaborador aceito que sai (por SQL) deixa o serviço sem ele", saiuColab.status === 409 &&
  sql(`select status || '|' || coalesce("colaboradorId", 'null') from "Servico" where id = '${pExcl}'`) === "EM_ANDAMENTO|null" &&
  sql(`select count(*) from "Candidatura" where id = '${cExcl.corpo.candidatura.id}'`) === "0");

// tela: um colaborador se candidata ao pedido que o Cliente publicou pela tela (15e); o Cliente aceita
const ctxColab = await browser.newContext({ viewport: { width: 440, height: 956 } });
const tokenColabTela = await contaPerfil("tela", "900.000.001-06", "colaborador");
await ctxColab.request.post(`${API}/api/auth/login`, { data: { email: "e2e.candidaturas.tela@example.com", password: "senha123" } });
const pageColab = await ctxColab.newPage(); pageColab.on("pageerror", (e) => pageErrors.push(e.message));
await pageColab.goto(B + "/servicos"); await pageColab.getByRole("heading", { name: "Serviços", level: 1 }).waitFor();
const cardTela = pageColab.getByRole("region", { name: "Educação" }).locator("div", { has: pageColab.getByText("Pedido pela tela E2E", { exact: true }) }).last();
await cardTela.getByRole("button", { name: "Saiba Mais" }).first().click();
const detalheColab = pageColab.getByRole("dialog", { name: "Pedido pela tela E2E" });
await detalheColab.getByRole("button", { name: "Candidatar-se" }).click();
await detalheColab.getByLabel("Mensagem para quem publicou").fill("Sou professor e posso ajudar nesta semana.");
await detalheColab.getByRole("button", { name: "Enviar candidatura" }).click();
await detalheColab.getByText("Candidatura").filter({ hasText: "pendente" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("candidaturas (tela): o colaborador se candidata pelo detalhe", await detalheColab.getByText("pendente").isVisible());
await ctxColab.close();
await page.goto(B + "/servicos"); await page.getByRole("region", { name: "Seus pedidos" }).waitFor();
const cardMeu = page.getByRole("region", { name: "Seus pedidos" }).locator("div", { has: page.getByText("Pedido pela tela E2E", { exact: true }) }).last();
await cardMeu.getByText("1 candidatura").waitFor({ timeout: 8000 }).catch(() => {});
ok("candidaturas (tela): o card de Seus pedidos mostra a contagem", await cardMeu.getByText("1 candidatura").isVisible());
await cardMeu.getByRole("button", { name: "Saiba Mais" }).first().click();
const detalheAutor = page.getByRole("dialog", { name: "Pedido pela tela E2E" });
await detalheAutor.getByRole("button", { name: "Aceitar" }).click();
await detalheAutor.getByRole("button", { name: "Marcar como concluído" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("candidaturas (tela): o autor aceita e o pedido fica em andamento", await detalheAutor.getByRole("button", { name: "Marcar como concluído" }).isVisible());
await page.keyboard.press("Escape");

// 15g. Créditos (Fase 17C): reserva ao aceitar, pagamento ao concluir, estorno ao cancelar, extrato e corrida
const contaCreditos = async (nome, cpf, perfil) => {
  const email = `e2e.creditos.${nome}@example.com`;
  const { corpo } = await chamar("POST", `/auth/register/${perfil}`, null, {
    fullName: `Creditos ${nome} E2E`, phone: "11987654321", cpf, dataNascimento: "1990-01-01", genero: "Outro",
    cep: "01310-100", rua: "Rua Teste", numero: "1", bairro: "Centro", cidade: "São Paulo", estado: "SP",
    email, confirmEmail: email, password: "senha123", confirmPassword: "senha123",
  });
  return { email, token: corpo.accessToken };
};
const saldoDe = (email) => Number(sql(`select credits from "User" where email = '${email}'`));
// extrato x saldo: a soma das movimentações e o último saldoApos batem com User.credits
const extratoBate = (email) =>
  sql(`select (u.credits = coalesce((select sum(valor) from "TransacaoCredito" t where t."userId" = u.id), 0))
        and (u.credits = coalesce((select "saldoApos" from "TransacaoCredito" t where t."userId" = u.id order by "createdAt" desc, id desc limit 1), 0))
       from "User" u where email = '${email}'`) === "t";
const autorC = await contaCreditos("autor", "900.000.002-11", "cliente");
const colabC = await contaCreditos("colab", "900.000.002-12", "colaborador");
conceder(autorC.email, 100);
const pedidoC = async (remuneracao, titulo) =>
  (await chamar("POST", "/servicos", autorC.token, { titulo, descricao: "Pedido de teste dos créditos", categoria: "Tecnologia", remuneracao })).corpo.servico.id;
const candidatarC = async (servicoId, valorProposto = null) =>
  (await chamar("POST", `/servicos/${servicoId}/candidaturas`, colabC.token, { mensagem: "Posso fazer isso nesta semana.", valorProposto })).corpo.candidatura.id;
const aceitarC = (candidaturaId, token = autorC.token) => chamar("POST", `/candidaturas/${candidaturaId}/aceitar`, token);

ok("créditos: bônus pelo script entra no saldo e no extrato", saldoDe(autorC.email) === 100 && extratoBate(autorC.email));
const pReserva = await pedidoC(100, "Créditos: reserva");
const aceiteReserva = await aceitarC(await candidatarC(pReserva, 60));
ok("créditos: aceitar reserva o valor proposto do autor", aceiteReserva.status === 200 && saldoDe(autorC.email) === 40 &&
  sql(`select valor || '|' || "saldoApos" from "TransacaoCredito" where "servicoId" = '${pReserva}' and tipo = 'RESERVA'`) === "-60|40" && extratoBate(autorC.email));
const pCaro = await pedidoC(500, "Créditos: caro demais");
const cCaro = await candidatarC(pCaro);
const semSaldo = await aceitarC(cCaro);
ok("créditos: sem saldo dá 409 e a aceitação não acontece", semSaldo.status === 409 && semSaldo.corpo.error === "Créditos insuficientes" &&
  sql(`select status from "Servico" where id = '${pCaro}'`) === "ABERTO" && sql(`select status from "Candidatura" where id = '${cCaro}'`) === "PENDENTE" &&
  saldoDe(autorC.email) === 40);
const concluidoReserva = await chamar("POST", `/servicos/${pReserva}/concluir`, autorC.token);
ok("créditos: o pedido concluído mostra o valor combinado, não o publicado", concluidoReserva.corpo.servico.remuneracao === 100 &&
  concluidoReserva.corpo.servico.valorCombinado === 60 && (await chamar("GET", `/servicos/${pReserva}`, colabC.token)).corpo.servico.valorCombinado === 60);
ok("créditos: concluir paga o colaborador (sem linha de taxa com taxa 0)", saldoDe(colabC.email) === 60 &&
  sql(`select count(*) from "TransacaoCredito" where "servicoId" = '${pReserva}' and tipo in ('TAXA', 'TAXA_RECEBIDA')`) === "0" && extratoBate(colabC.email));
const pEstorno = await pedidoC(30, "Créditos: estorno");
await aceitarC(await candidatarC(pEstorno));
const saldoAntesEstorno = saldoDe(autorC.email);
await chamar("DELETE", `/servicos/${pEstorno}`, autorC.token);
ok("créditos: cancelar em andamento devolve a reserva", saldoAntesEstorno === 10 && saldoDe(autorC.email) === 40 && extratoBate(autorC.email));
const pCombinar = await pedidoC(null, "Créditos: a combinar");
await aceitarC(await candidatarC(pCombinar));
await chamar("POST", `/servicos/${pCombinar}/concluir`, autorC.token);
ok("créditos: a combinar sem proposta não move créditos", saldoDe(autorC.email) === 40 && saldoDe(colabC.email) === 60 &&
  sql(`select count(*) from "TransacaoCredito" where "servicoId" = '${pCombinar}'`) === "0");
const pCombinarProposta = await pedidoC(null, "Créditos: a combinar com proposta");
await aceitarC(await candidatarC(pCombinarProposta, 20));
ok("créditos: a combinar com proposta reserva o valor proposto", saldoDe(autorC.email) === 20);
// colaborador aceito que sai: concluir dá 409, cancelar estorna
const colabSai = await contaCreditos("sai", "900.000.002-13", "colaborador");
const pSai = await pedidoC(10, "Créditos: colaborador sai");
const cSai = (await chamar("POST", `/servicos/${pSai}/candidaturas`, colabSai.token, { mensagem: "Posso fazer isso amanhã." })).corpo.candidatura.id;
await aceitarC(cSai);
sql(`delete from "User" where email = '${colabSai.email}'`); // o app recusaria (409); ver a 15f
const concluirSemColab = await chamar("POST", `/servicos/${pSai}/concluir`, autorC.token);
ok("créditos: sem colaborador, concluir dá 409", concluirSemColab.status === 409 && /Cancele o pedido/.test(concluirSemColab.corpo.error));
await chamar("DELETE", `/servicos/${pSai}`, autorC.token);
ok("créditos: e cancelar devolve a reserva", saldoDe(autorC.email) === 20 && extratoBate(autorC.email));
// corrida: saldo para um pedido só, duas aceitações em pedidos diferentes ao mesmo tempo
const autorR = await contaCreditos("corrida", "900.000.002-14", "cliente");
conceder(autorR.email, 50);
const pedidoR = async (titulo) => (await chamar("POST", "/servicos", autorR.token, { titulo, descricao: "Pedido da corrida de créditos", categoria: "Tecnologia", remuneracao: 50 })).corpo.servico.id;
const [pr1, pr2] = [await pedidoR("Corrida 1"), await pedidoR("Corrida 2")];
const [cr1, cr2] = [await candidatarC(pr1), await candidatarC(pr2)];
const corridaC = await Promise.all([aceitarC(cr1, autorR.token), aceitarC(cr2, autorR.token)]);
ok("créditos: corrida de duas aceitações sem saldo para as duas (200 e 409, saldo nunca negativo)",
  corridaC.map((x) => x.status).sort().join() === "200,409" && saldoDe(autorR.email) === 0 &&
  sql(`select count(*) from "TransacaoCredito" t join "User" u on u.id = t."userId" where u.email = '${autorR.email}' and tipo = 'RESERVA'`) === "1" &&
  extratoBate(autorR.email), corridaC.map((x) => x.status).join());
ok("créditos: extrato bate com o saldo de todos os usuários de teste", [autorC.email, colabC.email, autorR.email, "e2e.candidaturas.autor@example.com"].every(extratoBate));
// exclusão bloqueada com pedido em andamento (faxina pré-Fase 18): autor e colaborador aceito; a senha vem antes
const MSG_ANDAMENTO = "Conclua ou cancele seus pedidos em andamento antes de excluir a conta";
const PLATAFORMA = "00000000-0000-4000-8000-000000000001";
const plataformaAgora = () => sql(`select credits || '|' || (select count(*) from "TransacaoCredito" where "userId" = '${PLATAFORMA}') from "User" where id = '${PLATAFORMA}'`);
const plataformaAntes = plataformaAgora();
const autorX = await contaCreditos("bloqautor", "900.000.002-15", "cliente");
const colabX = await contaCreditos("bloqcolab", "900.000.002-16", "colaborador");
const colabX2 = await contaCreditos("bloqcolab2", "900.000.002-17", "colaborador");
conceder(autorX.email, 30);
const pedidoX = async (titulo) => (await chamar("POST", "/servicos", autorX.token, { titulo, descricao: "Pedido da exclusão bloqueada", categoria: "Tecnologia", remuneracao: 10 })).corpo.servico.id;
const candidatarX = async (servicoId, colab) => (await chamar("POST", `/servicos/${servicoId}/candidaturas`, colab.token, { mensagem: "Posso fazer isso amanhã." })).corpo.candidatura.id;
const contratarX = async (titulo, colab) => {
  const id = await pedidoX(titulo);
  await aceitarC(await candidatarX(id, colab), autorX.token);
  return id;
};
const excluirConta = (conta, password = "senha123") => chamar("DELETE", "/user", conta.token, { password });
const existe = (email) => sql(`select count(*) from "User" where email = '${email}'`) === "1";
const pXCancelar = await contratarX("Exclusão: cancelar", colabX);
const pXConcluir = await contratarX("Exclusão: concluir", colabX2);
const pXAberto = await pedidoX("Exclusão: aberto");
const cXPendente = await candidatarX(pXAberto, colabX2);
const [bAutor, bColab, bSenha] = [await excluirConta(autorX), await excluirConta(colabX), await excluirConta(autorX, "errada")];
ok("exclusão: 409 para o autor e para o colaborador aceito de pedido em andamento, e nada muda", bAutor.status === 409 && bAutor.corpo.error === MSG_ANDAMENTO &&
  bColab.status === 409 && bColab.corpo.error === MSG_ANDAMENTO && existe(autorX.email) && existe(colabX.email) && saldoDe(autorX.email) === 10 &&
  sql(`select string_agg(status::text, ',' order by titulo) from "Servico" where id in ('${pXCancelar}', '${pXConcluir}')`) === "EM_ANDAMENTO,EM_ANDAMENTO",
  `${bAutor.status} ${bAutor.corpo?.error} | ${bColab.status}`);
ok("exclusão: senha errada com pedido em andamento continua 403", bSenha.status === 403 && bSenha.corpo.error === "Senha incorreta");
await chamar("DELETE", `/servicos/${pXCancelar}`, autorX.token);
const xColabSai = await excluirConta(colabX);
ok("exclusão: depois do cancelamento, o colaborador exclui a conta (204); o autor segue bloqueado pelo outro pedido",
  xColabSai.status === 204 && !existe(colabX.email) && (await excluirConta(autorX)).status === 409);
await chamar("POST", `/servicos/${pXConcluir}/concluir`, autorX.token);
const xAutorSai = await excluirConta(autorX);
ok("exclusão: depois de concluir, o autor exclui a conta (204), e o pedido aberto e a candidatura pendente somem", xAutorSai.status === 204 &&
  !existe(autorX.email) && sql(`select count(*) from "Servico" where id = '${pXAberto}'`) === "0" && sql(`select count(*) from "Candidatura" where id = '${cXPendente}'`) === "0");
// conta da plataforma: existe, não entra, não ganha senha, não tem perfil público e não muda com o e2e (taxa 0)
const loginPlataforma = await chamar("POST", "/auth/login", null, { email: "plataforma@skillhub.invalid", password: "qualquer123" });
await chamar("POST", "/auth/forgot-password", null, { email: "plataforma@skillhub.invalid" });
ok("plataforma: existe, mas o login e o \"esqueci a senha\" a tratam como inexistente", sql(`select count(*) from "User" where id = '${PLATAFORMA}' and password is null`) === "1" &&
  loginPlataforma.status === 400 && loginPlataforma.corpo.error === "E-mail ou senha incorretos" &&
  sql(`select count(*) from "PasswordResetToken" where "userId" = '${PLATAFORMA}'`) === "0");
ok("plataforma: sem resumo nem avaliações públicas (404)", (await chamar("GET", `/usuarios/${PLATAFORMA}/resumo`, colabC.token)).status === 404 &&
  (await chamar("GET", `/usuarios/${PLATAFORMA}/avaliacoes`, colabC.token)).status === 404);
ok("plataforma: exclusões de contas comuns e pagamentos com taxa 0 não mudam o saldo nem o extrato dela", plataformaAgora() === plataformaAntes && extratoBate("plataforma@skillhub.invalid"),
  `${plataformaAntes} -> ${plataformaAgora()}`);
// taxa de 15%: script no container, com a taxa e uma conta da plataforma de teste só naquele processo (o backend continua com 0)
const taxa = JSON.parse(execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "-e", "PLATFORM_FEE_PERCENT=15",
  "-e", "PLATFORM_ACCOUNT_ID=00000000-0000-4000-8000-0000000e2e01", "-e", "PLATFORM_ACCOUNT_EMAIL=e2e.plataforma@example.com",
  "backend", "npx", "tsx", "scripts/verificar-taxa.ts"], { encoding: "utf8" }).trim().split("\n").at(-1));
for (const r of taxa) ok(r.nome, r.ok, r.info);
ok("taxa 15%: o script conferiu os 12 casos (6 de serviço e 6 de pedido)", taxa.length === 12, taxa.length);

// extrato
ok("créditos: extrato sem token dá 401", (await chamar("GET", "/creditos/extrato")).status === 401);
const ext1 = await chamar("GET", "/creditos/extrato?limit=2", autorC.token);
const ext2 = await chamar("GET", `/creditos/extrato?limit=50&cursor=${ext1.corpo.nextCursor}`, autorC.token);
ok("créditos: extrato paginado, mais recentes primeiro", ext1.corpo.transacoes.length === 2 && !!ext1.corpo.nextCursor &&
  ext1.corpo.transacoes[0].createdAt >= ext1.corpo.transacoes[1].createdAt && ext2.corpo.transacoes.at(-1).tipo === "Bônus" &&
  !ext2.corpo.transacoes.some((t) => ext1.corpo.transacoes.some((u) => u.id === t.id)));
ok("créditos: extrato só do próprio usuário e sem dados pessoais", (await chamar("GET", "/creditos/extrato?limit=50", colabC.token)).corpo.transacoes.every((t) => t.tipo === "Recebimento") &&
  semDadosPessoais(ext1.corpo));
// tela: o Cliente aceitou pela tela na 15f (reserva de 80 dos 500): o chip já mostra o saldo novo e o extrato abre
await page.goto(B + "/inicio"); await page.getByRole("heading", { name: "SkillHub" }).waitFor();
const chip = page.getByRole("button", { name: /^Créditos: / });
ok("créditos (tela): o chip mostra o saldo depois de aceitar", (await chip.getAttribute("aria-label")) === "Créditos: 420,00", await chip.getAttribute("aria-label"));
await chip.click(); await page.getByRole("button", { name: "Ver extrato" }).click();
const extratoTela = page.getByRole("dialog", { name: "Extrato de créditos" });
await extratoTela.getByText("Reserva").first().waitFor({ timeout: 8000 }).catch(() => {});
ok("créditos (tela): o extrato abre pelo chip com a reserva e o bônus", (await extratoTela.getByText("Reserva").count()) > 0 && (await extratoTela.getByText("Bônus").count()) > 0);
await page.keyboard.press("Escape");
await page.goto(B + "/configuracoes"); await page.getByRole("button", { name: /Créditos e Pagamentos/ }).click();
ok("créditos (tela): Configurações abre o extrato", await page.getByRole("dialog", { name: "Extrato de créditos" }).isVisible());
await page.keyboard.press("Escape");

// 15h. Avaliações (Fase 17D): só as partes de um pedido concluído, uma vez cada; média x SQL; exclusão de conta e a tela
const contaAval = async (nome, cpf, perfil) => {
  const email = `e2e.avaliacoes.${nome}@example.com`;
  const { corpo } = await chamar("POST", `/auth/register/${perfil}`, null, {
    fullName: `Avaliacoes ${nome} E2E`, phone: "11987654321", cpf, dataNascimento: "1990-01-01", genero: "Outro",
    cep: "01310-100", rua: "Rua Teste", numero: "1", bairro: "Centro", cidade: "São Paulo", estado: "SP",
    email, confirmEmail: email, password: "senha123", confirmPassword: "senha123",
  });
  const { corpo: me } = await chamar("GET", "/auth/me", corpo.accessToken);
  return { email, token: corpo.accessToken, id: me.user.id };
};
const autorV = await contaAval("autor", "900.000.003-01", "cliente");
const colabV = await contaAval("colab", "900.000.003-02", "colaborador");
const colabV2 = await contaAval("colab2", "900.000.003-03", "colaborador");
const clienteV = await contaAval("cliente", "900.000.003-04", "cliente");
// "a combinar" sem proposta: não move créditos, então ninguém precisa de saldo
const pedidoV = async (autor, titulo) =>
  (await chamar("POST", "/servicos", autor.token, { titulo, descricao: "Pedido de teste das avaliações", categoria: "Tecnologia", remuneracao: null })).corpo.servico.id;
const candidatarV = async (servicoId, colab) =>
  (await chamar("POST", `/servicos/${servicoId}/candidaturas`, colab.token, { mensagem: "Posso fazer isso nesta semana." })).corpo.candidatura.id;
const contratarV = async (autor, colab, titulo) => {
  const id = await pedidoV(autor, titulo);
  await chamar("POST", `/candidaturas/${await candidatarV(id, colab)}/aceitar`, autor.token);
  return id;
};
const concluidoV = async (autor, colab, titulo) => {
  const id = await contratarV(autor, colab, titulo);
  await chamar("POST", `/servicos/${id}/concluir`, autor.token);
  return id;
};
const avaliarV = (servicoId, token, corpo = { nota: 5 }) => chamar("POST", `/servicos/${servicoId}/avaliacoes`, token, corpo);

const pAbertoV = await pedidoV(autorV, "Avaliações: aberto");
const pAndamentoV = await contratarV(autorV, colabV, "Avaliações: em andamento");
ok("avaliações: pedido aberto ou em andamento dá 409", (await avaliarV(pAbertoV, autorV.token)).status === 409 &&
  (await avaliarV(pAndamentoV, autorV.token)).status === 409 && (await avaliarV(pAndamentoV, colabV.token)).status === 409);
// p1: o colab2 também se candidata e fica recusado quando o colab é aceito
const p1V = await pedidoV(autorV, "Avaliações: fluxo");
const c1V = await candidatarV(p1V, colabV);
await candidatarV(p1V, colabV2);
await chamar("POST", `/candidaturas/${c1V}/aceitar`, autorV.token);
await chamar("POST", `/servicos/${p1V}/concluir`, autorV.token);
const deAutor = await avaliarV(p1V, autorV.token, { nota: 5, comentario: "  Ótimo trabalho  ", avaliadoId: clienteV.id });
ok("avaliações: o autor avalia o colaborador (o avaliado sai do pedido, nunca do corpo)", deAutor.status === 201 &&
  deAutor.corpo.avaliacao.avaliado.id === colabV.id && deAutor.corpo.avaliacao.comentario === "Ótimo trabalho" &&
  sql(`select "avaliadoId" from "Avaliacao" where id = '${deAutor.corpo.avaliacao.id}'`) === colabV.id);
const deColab = await avaliarV(p1V, colabV.token, { nota: 4, comentario: "" });
ok("avaliações: o colaborador avalia o autor (comentário vazio vira null)", deColab.status === 201 &&
  deColab.corpo.avaliacao.avaliado.id === autorV.id && deColab.corpo.avaliacao.comentario === null);
ok("avaliações: avaliar de novo dá 409", (await avaliarV(p1V, autorV.token)).status === 409);
ok("avaliações: terceiros (colaborador recusado e um cliente) recebem 403", (await avaliarV(p1V, colabV2.token)).status === 403 &&
  (await avaliarV(p1V, clienteV.token)).status === 403 && (await chamar("GET", `/servicos/${p1V}/avaliacoes`, clienteV.token)).status === 403);
const doP1 = await chamar("GET", `/servicos/${p1V}/avaliacoes`, colabV.token);
ok("avaliações: as partes veem as duas avaliações do pedido", doP1.status === 200 && doP1.corpo.avaliacoes.length === 2 && semDadosPessoais(doP1.corpo));
// corrida: duas avaliações do autor ao mesmo tempo
const p2V = await concluidoV(autorV, colabV, "Avaliações: corrida");
const corridaV = await Promise.all([avaliarV(p2V, autorV.token, { nota: 4 }), avaliarV(p2V, autorV.token, { nota: 4 })]);
ok("avaliações: duas ao mesmo tempo (201 e 409, uma linha só)", corridaV.map((r) => r.status).sort().join() === "201,409" &&
  sql(`select count(*) from "Avaliacao" where "servicoId" = '${p2V}'`) === "1", corridaV.map((r) => r.status).join());
// validação, 401 e 404
const p3V = await concluidoV(autorV, colabV, "Avaliações: validação");
// "Não avaliado" nos cards: concluído e ainda sem a avaliação de quem lista
const pendenteEm = async (rota, token, id) => {
  const { corpo } = await chamar("GET", rota, token);
  return (corpo.servicos ?? corpo.candidaturas.map((c) => c.servico)).find((x) => x.id === id)?.avaliacaoPendente;
};
ok("avaliações: avaliacaoPendente em Seus pedidos e Suas candidaturas", (await pendenteEm("/servicos/meus", autorV.token, p3V)) === true &&
  (await pendenteEm("/servicos/meus", autorV.token, p1V)) === false && (await pendenteEm("/servicos/meus", autorV.token, pAbertoV)) === false &&
  (await pendenteEm("/candidaturas/minhas", colabV.token, p3V)) === true && (await pendenteEm("/candidaturas/minhas", colabV.token, p1V)) === false &&
  (await pendenteEm("/candidaturas/minhas", colabV2.token, p1V)) === false);
const invalidas = await Promise.all([{ nota: 0 }, { nota: 6 }, { nota: 3.5 }, { nota: "texto" }, {}, { nota: 3, comentario: "x".repeat(501) }].map((c) => avaliarV(p3V, autorV.token, c)));
ok("avaliações: nota fora de 1 a 5, não inteira ou ausente e comentário longo dão 400", invalidas.every((r) => r.status === 400 && r.corpo.details?.length),
  invalidas.map((r) => r.status).join());
await avaliarV(p3V, autorV.token, { nota: 4 });
const pCanceladoV = await pedidoV(autorV, "Avaliações: cancelado");
await chamar("DELETE", `/servicos/${pCanceladoV}`, autorV.token);
const idQueNaoExiste = "00000000-0000-4000-8000-000000000000";
ok("avaliações: sem token 401; pedido inexistente ou cancelado (para terceiros) 404", (await avaliarV(p1V)).status === 401 &&
  (await avaliarV(idQueNaoExiste, autorV.token)).status === 404 && (await avaliarV(pCanceladoV, colabV.token)).status === 404);
// média e total x SQL (o colab tem 5, 4 e 4)
const mediaSql = (id) => sql(`select coalesce(round(avg(nota), 1)::text, 'null') || '|' || count(*) from "Avaliacao" where "avaliadoId" = '${id}'`);
const resumoV = async (id, q = "") => (await chamar("GET", `/usuarios/${id}/avaliacoes${q}`, clienteV.token)).corpo;
const rColab = await resumoV(colabV.id);
ok("avaliações: média e total do colaborador batem com o SQL", `${rColab.media}|${rColab.total}` === mediaSql(colabV.id) && rColab.media === 4.3 && rColab.total === 3,
  `${rColab.media}|${rColab.total} x ${mediaSql(colabV.id)}`);
const rSem = await resumoV(clienteV.id);
ok("avaliações: sem avaliações, média null e total 0", rSem.media === null && rSem.total === 0 && rSem.avaliacoes.length === 0);
const pagV1 = await resumoV(colabV.id, "?limit=2");
const pagV2 = await resumoV(colabV.id, `?limit=2&cursor=${pagV1.nextCursor}`);
ok("avaliações: lista paginada, mais recentes primeiro, e avaliador só com id, nome e foto", pagV1.avaliacoes.length === 2 && !!pagV1.nextCursor &&
  pagV2.avaliacoes.length === 1 && pagV2.nextCursor === null && pagV1.avaliacoes[0].createdAt >= pagV1.avaliacoes[1].createdAt &&
  pagV1.avaliacoes.every((a) => Object.keys(a.avaliador).sort().join() === "fullName,id,urlPhoto") && semDadosPessoais(pagV1));
const resumoUsuario = async (id, token = clienteV.token) => chamar("GET", `/usuarios/${id}/resumo`, token);
const colabSql = (id) => sql(`select count(*) from "Servico" where status = 'CONCLUIDO' and ('${id}' in ("autorId", coalesce("colaboradorId", '')))`);
const rResumo = (await resumoUsuario(colabV.id)).corpo;
ok("avaliações: resumo público com colaborações, média e total (x SQL)", rResumo.colaboracoes === 3 && String(rResumo.colaboracoes) === colabSql(colabV.id) &&
  rResumo.media === 4.3 && rResumo.total === 3 && Object.keys(rResumo).sort().join() === "colaboracoes,media,total");
ok("avaliações: resumo conta os pedidos do autor também; inexistente 404 e sem token 401", (await resumoUsuario(autorV.id)).corpo.colaboracoes === 3 &&
  (await resumoUsuario(idQueNaoExiste)).status === 404 && (await resumoUsuario(colabV.id, null)).status === 401);
ok("avaliações: lista de usuário inexistente 404 e sem token 401", (await chamar("GET", `/usuarios/${idQueNaoExiste}/avaliacoes`, clienteV.token)).status === 404 &&
  (await chamar("GET", `/usuarios/${colabV.id}/avaliacoes`)).status === 401);
// exclusão de conta: um autor que avaliou o colab (nota 1) sai; o colab volta a 5, 4 e 4
const autorSai = await contaAval("autorsai", "900.000.003-05", "cliente");
await avaliarV(await concluidoV(autorSai, colabV, "Avaliações: autor que sai"), autorSai.token, { nota: 1 });
const antesSaida = await resumoV(colabV.id);
await chamar("DELETE", "/user", autorSai.token, { password: "senha123" });
const depoisSaida = await resumoV(colabV.id);
// desde a faxina pré-Fase 18 a avaliação sobrevive: avaliador e pedido viram null (o pedido some com a conta do autor)
const orfas = () => sql(`select count(*) from "Avaliacao" a where not exists (select 1 from "User" u where u.id = a."avaliadoId")`);
const daQueSaiu = depoisSaida.avaliacoes.find((a) => a.nota === 1);
ok("avaliações: a avaliação de quem exclui a conta continua e a média do colaborador não muda", antesSaida.total === 4 && antesSaida.media === 3.5 &&
  depoisSaida.total === 4 && depoisSaida.media === 3.5 && `${depoisSaida.media}|${depoisSaida.total}` === mediaSql(colabV.id) && orfas() === "0",
  `${antesSaida.media}|${antesSaida.total} -> ${depoisSaida.media}|${depoisSaida.total}`);
ok("avaliações: na lista pública ela aparece sem avaliador nem pedido, sem nenhum dado de quem saiu", daQueSaiu?.avaliador === null && daQueSaiu?.servico === null &&
  !JSON.stringify(depoisSaida).includes(autorSai.id) && !JSON.stringify(depoisSaida).includes("autorsai"), JSON.stringify(daQueSaiu));
// o colaborador que sai depois de concluir: o autor não tem mais quem avaliar, e a nota que ele deu continua
const colabSaiV = await contaAval("colabsai", "900.000.003-06", "colaborador");
const pSaiV = await concluidoV(autorV, colabSaiV, "Avaliações: colaborador que sai");
await avaliarV(pSaiV, colabSaiV.token, { nota: 2 });
await chamar("DELETE", "/user", colabSaiV.token, { password: "senha123" });
const semColabV = await avaliarV(pSaiV, autorV.token);
const rAutor = await resumoV(autorV.id);
ok("avaliações: colaborador que saiu (409 ao avaliar, a nota dele continua, nada órfão, sem \"Não avaliado\")", semColabV.status === 409 && semColabV.corpo.error === "O colaborador não está mais no SkillHub" &&
  rAutor.total === 2 && rAutor.media === 3 && orfas() === "0" && (await pendenteEm("/servicos/meus", autorV.token, pSaiV)) === false, `${rAutor.media}|${rAutor.total}`);
// na tela, o autor vê a nota recebida como "Usuário removido"
const ctxRemovido = await browser.newContext({ viewport: { width: 440, height: 956 } });
await ctxRemovido.request.post(`${API}/api/auth/login`, { data: { email: autorV.email, password: "senha123" } });
const pageRemovido = await ctxRemovido.newPage(); pageRemovido.on("pageerror", (e) => pageErrors.push(e.message));
await pageRemovido.goto(B + "/servicos"); await pageRemovido.getByRole("region", { name: "Seus pedidos" }).waitFor();
const cardRemovido = pageRemovido.getByRole("region", { name: "Seus pedidos" }).locator("div", { has: pageRemovido.getByText("Avaliações: colaborador que sai", { exact: true }) }).last();
await cardRemovido.getByRole("button", { name: "Saiba Mais" }).first().click();
const detalheRemovido = pageRemovido.getByRole("dialog", { name: "Avaliações: colaborador que sai" });
await detalheRemovido.getByText("Avaliação de Usuário removido").waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): a nota de quem saiu aparece como \"Usuário removido\"", await detalheRemovido.getByText("Avaliação de Usuário removido").isVisible() &&
  await detalheRemovido.getByRole("img", { name: "2 de 5 estrelas" }).isVisible());
await ctxRemovido.close();

// tela: o Cliente conclui pela tela o pedido aceito na 15f e avalia com 4 estrelas
await page.goto(B + "/servicos"); await page.getByRole("region", { name: "Seus pedidos" }).waitFor();
const cardAval = page.getByRole("region", { name: "Seus pedidos" }).locator("div", { has: page.getByText("Pedido pela tela E2E", { exact: true }) }).last();
await cardAval.getByRole("button", { name: "Saiba Mais" }).first().click();
const detalheAval = page.getByRole("dialog", { name: "Pedido pela tela E2E" });
await detalheAval.getByRole("button", { name: "Marcar como concluído" }).click();
const notaTela = detalheAval.getByRole("radiogroup", { name: /^Nota para / });
await notaTela.waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): concluir oferece a avaliação, com o envio desabilitado sem nota", await notaTela.isVisible() &&
  await detalheAval.getByRole("button", { name: "Enviar avaliação" }).isDisabled());
await notaTela.getByRole("radio", { name: "4 estrelas" }).click();
await detalheAval.getByLabel("Comentário (opcional)").fill("Explicou tudo com calma.");
await detalheAval.getByRole("button", { name: "Enviar avaliação" }).click();
await detalheAval.getByText("Sua avaliação").waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): o autor avalia e vê a própria avaliação", await detalheAval.getByText("Sua avaliação").isVisible() &&
  await detalheAval.getByRole("img", { name: "4 de 5 estrelas" }).isVisible() && await detalheAval.getByText("Explicou tudo com calma.").isVisible());
await page.keyboard.press("Escape");
await cardAval.getByText("Concluído", { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): depois de avaliar, o card do autor mostra Concluído", await cardAval.getByText("Concluído", { exact: true }).isVisible());
// o colaborador vê a avaliação recebida e avalia o Cliente com 5 estrelas (pelo teclado)
const ctxAval = await browser.newContext({ viewport: { width: 440, height: 956 } });
await ctxAval.request.post(`${API}/api/auth/login`, { data: { email: "e2e.candidaturas.tela@example.com", password: "senha123" } });
const pageAval = await ctxAval.newPage(); pageAval.on("pageerror", (e) => pageErrors.push(e.message));
await pageAval.goto(B + "/servicos"); await pageAval.getByRole("region", { name: "Suas candidaturas" }).waitFor();
const cardColabAval = pageAval.getByRole("region", { name: "Suas candidaturas" }).locator("div", { has: pageAval.getByText("Pedido pela tela E2E", { exact: true }) }).last();
ok("avaliações (tela): o card do colaborador mostra Não avaliado", await cardColabAval.getByText("Não avaliado", { exact: true }).isVisible());
await cardColabAval.getByRole("button", { name: "Saiba Mais" }).first().click();
const detalheColabAval = pageAval.getByRole("dialog", { name: "Pedido pela tela E2E" });
await detalheColabAval.getByText(/^Avaliação de /).waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): o colaborador vê a avaliação que recebeu", await detalheColabAval.getByRole("img", { name: "4 de 5 estrelas" }).isVisible());
const notaColab = detalheColabAval.getByRole("radiogroup", { name: /^Nota para / });
await notaColab.getByRole("radio", { name: "1 estrela" }).focus();
await pageAval.keyboard.press("End");
ok("avaliações (tela): as setas e o End escolhem a nota", (await notaColab.getByRole("radio", { name: "5 estrelas" }).getAttribute("aria-checked")) === "true");
await detalheColabAval.getByRole("button", { name: "Enviar avaliação" }).click();
await detalheColabAval.getByText("Sua avaliação").waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): o colaborador avalia o autor", await detalheColabAval.getByRole("img", { name: "5 de 5 estrelas" }).isVisible());
await pageAval.keyboard.press("Escape");
await cardColabAval.getByText("Concluído", { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): e depois de avaliar, Concluído", await cardColabAval.getByText("Concluído", { exact: true }).isVisible());
await ctxAval.close();
await page.goto(B + "/perfil"); await page.locator("h1").waitFor();
const mediaPerfil = page.locator("dl div", { has: page.getByText("Avaliações", { exact: true }) }).locator("dd");
await mediaPerfil.filter({ hasText: "5,0" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("avaliações (tela): o Perfil mostra a média real", (await mediaPerfil.textContent()) === "5,0", await mediaPerfil.textContent());
const numeroPerfil = (rotulo) => page.locator("dl div", { has: page.getByText(rotulo, { exact: true }) }).locator("dd").textContent();
const colabCliente = sql(`select count(*) from "Servico" s join "User" u on u.id in (s."autorId", s."colaboradorId") where s.status = 'CONCLUIDO' and u.email = 'e2e.cliente@example.com'`);
ok("avaliações (tela): Colaborações reais e Experiência sem o zero à esquerda", (await numeroPerfil("Colaborações")) === colabCliente && colabCliente !== "0" &&
  (await numeroPerfil("Experiência")) === "0", `${await numeroPerfil("Colaborações")} x ${colabCliente}`);

// 15i. Produtos (Fase 18A): publicar com fotos, validação e perfis, listagem, detalhe, edição e remoção (com corridas),
// contato por WhatsApp e privacidade do telefone, exclusão de conta do vendedor e a tela
const respostasProd = []; // corpo de toda resposta de produto desta seção (menos /contato), para a varredura do telefone
const registra = (r) => (respostasProd.push(JSON.stringify(r.corpo)), r);
const chamarForm = async (metodo, rota, token, campos = {}, arquivos = []) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(campos)) body.append(k, typeof v === "string" ? v : JSON.stringify(v));
  for (const a of arquivos) body.append("fotos", new Blob([a.buffer], { type: a.mimeType }), a.name);
  const r = await fetch(`${API}/api${rota}`, { method: metodo, headers: token ? { Authorization: `Bearer ${token}` } : {}, body })
    .catch((e) => { throw new Error(`${metodo} ${rota}: ${e.cause?.message ?? e.message}`, { cause: e }); });
  return { status: r.status, corpo: await r.json() };
};
// JPEG e WEBP de verdade (o Cloudinary decodifica a imagem), gerados pelo próprio Chromium
const imagemCanvas = async (tipo) => Buffer.from((await page.evaluate((t) => {
  const c = document.createElement("canvas"); c.width = 4; c.height = 4;
  const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 4, 4);
  return c.toDataURL(t).split(",")[1];
}, tipo)), "base64");
const JPEG = { name: "foto.jpg", mimeType: "image/jpeg", buffer: await imagemCanvas("image/jpeg") };
const WEBP = { name: "foto.webp", mimeType: "image/webp", buffer: await imagemCanvas("image/webp") };
const GRANDE = { name: "grande.png", mimeType: "image/png", buffer: Buffer.concat([PNG.buffer, Buffer.alloc(5 * 1024 * 1024 + 1 - PNG.buffer.length)]) };
const FALSA = { name: "falsa.png", mimeType: "image/png", buffer: Buffer.from("isto nao e uma imagem") };
const TEXTO = { name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("isto e texto") };
const TEL_COLAB = "(11) 98888-7766", TEL_EMPRESA = "1133334444";
const contaProd = async (nome, perfil, doc, phone = "11987654321") => {
  const email = `e2e.produtos.${nome}@example.com`;
  const base = { fullName: `Produtos ${nome} E2E`, phone, cep: "01310-100", rua: "Rua Teste", numero: "1", bairro: "Centro", cidade: "São Paulo", estado: "SP",
    email, confirmEmail: email, password: "senha123", confirmPassword: "senha123" };
  const { corpo } = await chamar("POST", `/auth/register/${perfil}`, null,
    perfil === "empresa" ? { ...base, cnpj: doc } : { ...base, cpf: doc, dataNascimento: "1990-01-01", genero: "Outro" });
  const { corpo: me } = await chamar("GET", "/auth/me", corpo.accessToken);
  return { email, token: corpo.accessToken, id: me.user.id };
};
const vendedorP = await contaProd("colab", "colaborador", "900.000.018-01", TEL_COLAB);
const empresaP = await contaProd("empresa", "empresa", "90.000.018/0001-01", TEL_EMPRESA);
const clienteP = await contaProd("cliente", "cliente", "900.000.018-02");
const outroP = await contaProd("outro", "colaborador", "900.000.018-03");
// perfil incompleto: conta de login social que ainda não terminou o cadastro (como a do run.sh)
const incompletoId = sql(`insert into "User" (id, email, "fullName", perfil, "profileComplete") values (gen_random_uuid(), 'e2e.produtos.incompleto@example.com', 'Produtos incompleto E2E', 'Colaborador', false) returning id`).split("\n")[0];
const incompletoToken = execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "node", "-e",
  "console.log(require('jsonwebtoken').sign({ sub: process.argv[1] }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '15m' }))", incompletoId], { encoding: "utf8" }).trim();
const camposProd = (extra = {}) => ({ nome: "Produto E2E de fumaça", descricao: "Descrição do produto de teste do e2e", categoria: "Arte e Decoração", preco: "30", estoque: "3", ...extra });
const publicIdsDe = (produtoId) => sql(`select "publicId" from "ProdutoImagem" where "produtoId" = '${produtoId}' order by ordem`).split("\n").filter(Boolean);
const extensoes = (produto) => produto.imagens.map((i) => i.url.split(".").pop());
const cloudinaryConta = (prefixo) => Number(execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "node", "-e",
  `const { v2: c } = require("cloudinary");
   c.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
   c.api.resources({ type: "upload", prefix: process.argv[1], max_results: 100 }).then((r) => console.log(r.resources.length), () => console.log(-1));`,
  prefixo], { encoding: "utf8" }).trim());

// publicar
const prod1 = registra(await chamarForm("POST", "/produtos", vendedorP.token, camposProd(), [PNG]));
const pProd1 = prod1.corpo.produto?.id;
ok("produtos: Colaborador publica com 1 foto (capa no Cloudinary)", prod1.status === 201 && prod1.corpo.produto.imagens.length === 1 &&
  prod1.corpo.produto.imagens[0].ordem === 0 && prod1.corpo.produto.capaUrl === prod1.corpo.produto.imagens[0].url && cloudinaryHas(publicIdsDe(pProd1)[0], "image"),
  `${prod1.status} ${JSON.stringify(prod1.corpo).slice(0, 200)}`);
const prodEmp = registra(await chamarForm("POST", "/produtos", empresaP.token,
  camposProd({ nome: "Apostila E2E da empresa", descricao: "Material de apoio vendido pela empresa no e2e", categoria: "Educação e Apostilas", preco: "80", digital: true }),
  [PNG, JPEG, WEBP, PNG]));
const pEmp = prodEmp.corpo.produto?.id;
ok("produtos: Empresa publica com 4 fotos, na ordem do envio", prodEmp.status === 201 && extensoes(prodEmp.corpo.produto).join() === "png,jpg,webp,png" &&
  prodEmp.corpo.produto.imagens.map((i) => i.ordem).join() === "0,1,2,3" && prodEmp.corpo.produto.digital === true, `${prodEmp.status} ${extensoes(prodEmp.corpo.produto ?? { imagens: [] })}`);
const contaProdutos = (id) => sql(`select count(*) from "Produto" where "vendedorId" = '${id}'`);
const zeroFotos = await chamarForm("POST", "/produtos", vendedorP.token, camposProd());
const cincoFotos = await chamarForm("POST", "/produtos", vendedorP.token, camposProd(), [PNG, PNG, PNG, PNG, PNG]);
ok("produtos: 0 e 5 fotos dão 400 e não criam nada", zeroFotos.status === 400 && zeroFotos.corpo.error === "Envie de 1 a 4 fotos" &&
  cincoFotos.status === 400 && cincoFotos.corpo.error === "Envie no máximo 4 fotos" && contaProdutos(vendedorP.id) === "1", `${zeroFotos.corpo.error} | ${cincoFotos.corpo.error}`);
const falsa = await chamarForm("POST", "/produtos", vendedorP.token, camposProd(), [FALSA]);
const texto = await chamarForm("POST", "/produtos", vendedorP.token, camposProd(), [TEXTO]);
ok("produtos: arquivo que não é imagem dá 400 (conteúdo e tipo)", falsa.status === 400 && falsa.corpo.error.startsWith("Conteúdo do arquivo não corresponde") &&
  texto.status === 400 && texto.corpo.error.startsWith("Tipo de arquivo inválido"), `${falsa.corpo.error} | ${texto.corpo.error}`);
const grande = await chamarForm("POST", "/produtos", vendedorP.token, camposProd(), [GRANDE]);
ok("produtos: foto acima de 5 MB dá 400", grande.status === 400 && grande.corpo.error === "Arquivo excede o limite de 5MB", grande.corpo.error);
const prodInvalido = await chamarForm("POST", "/produtos", vendedorP.token, { nome: "ab", descricao: "curta", categoria: "Roxo", preco: "0", estoque: "-1" }, [PNG]);
const decimal = await chamarForm("POST", "/produtos", vendedorP.token, camposProd({ preco: "1.5" }), [PNG]);
const camposInvalidos = (prodInvalido.corpo.details ?? []).map((d) => d.field).sort().join();
ok("produtos: validação (nome curto, descrição curta, categoria, preço 0 e decimal, estoque negativo)", prodInvalido.status === 400 &&
  camposInvalidos === "categoria,descricao,estoque,nome,preco" && decimal.status === 400 && decimal.corpo.details?.[0]?.field === "preco", camposInvalidos);
const doCliente = await chamarForm("POST", "/produtos", clienteP.token, camposProd(), [PNG]);
const doIncompleto = await chamarForm("POST", "/produtos", incompletoToken, camposProd(), [PNG]);
const semTokenP = await chamarForm("POST", "/produtos", null, camposProd(), [PNG]);
ok("produtos: Cliente 403, perfil incompleto 403, sem token 401", doCliente.status === 403 && doCliente.corpo.error === "Só colaboradores e empresas vendem produtos" &&
  doIncompleto.status === 403 && doIncompleto.corpo.error === "Complete seu perfil para publicar um produto" && semTokenP.status === 401,
  `${doCliente.status} ${doIncompleto.status} ${semTokenP.status}`);
ok("produtos: nenhum erro deixa foto no Cloudinary", cloudinaryConta(`Skillhub/produtos/${vendedorP.id}/`) === 1 &&
  cloudinaryConta(`Skillhub/produtos/${clienteP.id}/`) === 0 && cloudinaryConta(`Skillhub/produtos/${incompletoId}/`) === 0);

// listagem
const listaP = async (token, query = "") => registra(await chamar("GET", `/produtos${query}`, token));
const idsP = (r) => (r.corpo.produtos ?? []).map((p) => p.id);
ok("produtos: o próprio produto fica de fora da lista; os outros o veem", !idsP(await listaP(vendedorP.token, "?busca=E2E&limit=50")).includes(pProd1) &&
  idsP(await listaP(outroP.token, "?busca=E2E&limit=50")).includes(pProd1));
const porCategoria = await listaP(outroP.token, `?categoria=${encodeURIComponent("Educação e Apostilas")}&limit=50`);
ok("produtos: filtro por categoria (e categoria inválida dá 400)", idsP(porCategoria).includes(pEmp) && !idsP(porCategoria).includes(pProd1) &&
  porCategoria.corpo.produtos.every((p) => p.categoria === "Educação e Apostilas") && (await listaP(outroP.token, "?categoria=Roxo")).status === 400);
const busca = async (termo) => idsP(await listaP(outroP.token, `?busca=${encodeURIComponent(termo)}&limit=50`));
const [porNome, porDescricao, porVendedor] = [await busca("produto e2e DE FUMAÇA"), await busca("apoio vendido"), await busca("produtos colab e2e")];
ok("produtos: busca por nome, descrição e vendedor, sem diferenciar maiúsculas", porNome.includes(pProd1) && !porNome.includes(pEmp) &&
  porDescricao.includes(pEmp) && !porDescricao.includes(pProd1) && porVendedor.includes(pProd1) && !porVendedor.includes(pEmp));
const todosE2E = idsP(await listaP(outroP.token, "?busca=E2E&limit=50"));
const paginados = []; let cursorP = null;
do {
  const r = await listaP(outroP.token, `?busca=E2E&limit=1${cursorP ? `&cursor=${cursorP}` : ""}`);
  paginados.push(...idsP(r)); cursorP = r.corpo.nextCursor;
} while (cursorP && paginados.length < 60);
ok("produtos: paginação por cursor percorre tudo, na ordem, e termina em null (limit 51 dá 400)", paginados.join() === todosE2E.join() && todosE2E.length >= 2 &&
  (await listaP(outroP.token, "?limit=51")).status === 400, `${paginados.length} x ${todosE2E.length}`);

// detalhe
const detalheP = async (id, token) => registra(await chamar("GET", `/produtos/${id}`, token));
const det1 = await detalheP(pProd1, outroP.token);
ok("produtos: detalhe 200 com fotos, descrição e o vendedor só com id, nome e foto", det1.status === 200 && det1.corpo.produto.imagens.length === 1 &&
  det1.corpo.produto.descricao === "Descrição do produto de teste do e2e" && Object.keys(det1.corpo.produto.vendedor).sort().join() === "fullName,id,urlPhoto" &&
  det1.corpo.produto.contatoDisponivel === true);
// avaliações recebidas pelo vendedor (inseridas no banco: a 18A não cria avaliação de produto)
sql(`insert into "Avaliacao" (id, "avaliadoId", nota) values (gen_random_uuid(), '${vendedorP.id}', 5), (gen_random_uuid(), '${vendedorP.id}', 4)`);
const reputacaoSql = (id) => sql(`select coalesce(round(avg(nota)::numeric, 1)::text, 'null') || '|' || count(*) from "Avaliacao" where "avaliadoId" = '${id}'`);
const repV = (await detalheP(pProd1, outroP.token)).corpo.produto.vendedorReputacao;
const repE = (await detalheP(pEmp, outroP.token)).corpo.produto.vendedorReputacao;
ok("produtos: vendedorReputacao confere com o SQL (com e sem avaliações)", `${repV.media}|${repV.total}` === reputacaoSql(vendedorP.id) && repV.media === 4.5 &&
  `${repE.media}|${repE.total}` === reputacaoSql(empresaP.id) && repE.media === null && repE.total === 0, `${repV.media}|${repV.total} x ${reputacaoSql(vendedorP.id)}`);
ok("produtos: id inexistente e id que não é UUID dão 404", (await detalheP("00000000-0000-4000-8000-00000000dead", outroP.token)).status === 404 &&
  (await detalheP("nao-e-uuid", outroP.token)).status === 404 && (await chamar("GET", `/produtos/${pProd1}`)).status === 401);

// edição e remoção
const patchP = async (id, token, corpo) => registra(await chamar("PATCH", `/produtos/${id}`, token, corpo));
ok("produtos: só o dono edita e remove (403 para os outros)", (await patchP(pProd1, outroP.token, { nome: "Tomado" })).status === 403 &&
  (await chamar("DELETE", `/produtos/${pProd1}`, outroP.token)).status === 403 && sql(`select status from "Produto" where id = '${pProd1}'`) === "ATIVO");
const comVendedorId = await patchP(pProd1, vendedorP.token, { preco: 45, vendedorId: outroP.id });
ok("produtos: vendedorId no corpo é ignorado", comVendedorId.status === 200 && comVendedorId.corpo.produto.preco === 45 &&
  sql(`select "vendedorId" from "Produto" where id = '${pProd1}'`) === vendedorP.id);
const pausado = await patchP(pProd1, vendedorP.token, { status: "Pausado" });
const meusP = async (token) => registra(await chamar("GET", "/produtos/meus", token)).corpo.produtos;
ok("produtos: pausado some da lista e do detalhe dos outros; o dono vê, com o status", pausado.corpo.produto?.status === "Pausado" &&
  !idsP(await listaP(outroP.token, "?busca=E2E&limit=50")).includes(pProd1) && (await detalheP(pProd1, outroP.token)).status === 404 &&
  (await detalheP(pProd1, vendedorP.token)).status === 200 && (await meusP(vendedorP.token)).find((p) => p.id === pProd1)?.status === "Pausado");
ok("produtos: ativar devolve à lista", (await patchP(pProd1, vendedorP.token, { status: "Ativo" })).corpo.produto?.status === "Ativo" &&
  idsP(await listaP(outroP.token, "?busca=E2E&limit=50")).includes(pProd1));
// fotos: acrescenta uma nova como capa, reordena (JSON) e troca a antiga por outra nova
const [fotoA] = (await detalheP(pProd1, vendedorP.token)).corpo.produto.imagens;
const comNova = registra(await chamarForm("PATCH", `/produtos/${pProd1}`, vendedorP.token, { imagens: ["nova:0", fotoA.id] }, [JPEG]));
const [fotoB] = comNova.corpo.produto?.imagens ?? [];
ok("produtos: PATCH acrescenta uma foto nova como capa", comNova.status === 200 && extensoes(comNova.corpo.produto).join() === "jpg,png" &&
  comNova.corpo.produto.capaUrl === fotoB.url, `${comNova.status} ${JSON.stringify(comNova.corpo).slice(0, 160)}`);
const reordenado = await patchP(pProd1, vendedorP.token, { imagens: [fotoA.id, fotoB.id] });
ok("produtos: PATCH reordena (a capa volta a ser a antiga)", reordenado.corpo.produto?.imagens.map((i) => i.id).join() === `${fotoA.id},${fotoB.id}`);
const publicIdA = publicIdsDe(pProd1)[0];
const trocada = registra(await chamarForm("PATCH", `/produtos/${pProd1}`, vendedorP.token, { imagens: [fotoB.id, "nova:0"] }, [WEBP]));
ok("produtos: PATCH remove uma foto (some do Cloudinary) e acrescenta outra", trocada.status === 200 && extensoes(trocada.corpo.produto).join() === "jpg,webp" &&
  !cloudinaryHas(publicIdA, "image"));
const antesFotos = publicIdsDe(pProd1).join();
const semFotos = await patchP(pProd1, vendedorP.token, { imagens: [] });
const cincoNoPatch = await chamarForm("PATCH", `/produtos/${pProd1}`, vendedorP.token, { imagens: [fotoB.id, "nova:0", "nova:1", "nova:2", "nova:3"] }, [PNG, PNG, PNG, PNG]);
ok("produtos: PATCH que deixaria 0 ou 5 fotos dá 400 e nada muda", semFotos.status === 400 && cincoNoPatch.status === 400 && publicIdsDe(pProd1).join() === antesFotos,
  `${semFotos.status} ${cincoNoPatch.status}`);
// corrida: duas edições ao mesmo tempo, cada uma acrescentando 2 fotos a um produto com 2. A trava do produto faz uma
// esperar a outra: a segunda parte do resultado da primeira (fica a lista dela), e nunca passa de 4
const prodCorrida = registra(await chamarForm("POST", "/produtos", vendedorP.token, camposProd({ nome: "Produto E2E da corrida" }), [PNG, PNG])).corpo.produto;
const listaCorrida = { imagens: [...prodCorrida.imagens.map((i) => i.id), "nova:0", "nova:1"] };
const corridas = await Promise.all([0, 1].map(() => chamarForm("PATCH", `/produtos/${prodCorrida.id}`, vendedorP.token, listaCorrida, [PNG, PNG])));
const ordensCorrida = sql(`select string_agg(ordem::text, ',' order by ordem) from "ProdutoImagem" where "produtoId" = '${prodCorrida.id}'`);
ok("produtos: corrida de edições de fotos nunca passa de 4 (ordens 0 a 3)", corridas.some((r) => r.status === 200) &&
  corridas.every((r) => r.status === 200 || r.status === 409) && ordensCorrida === "0,1,2,3", `${corridas.map((r) => r.status)} ${ordensCorrida}`);
// corrida: editar (ativar) e remover ao mesmo tempo; o produto termina removido, nunca reativado
const [editaJunto, removeJunto] = await Promise.all([patchP(prodCorrida.id, vendedorP.token, { status: "Ativo", nome: "Produto E2E reativado" }), chamar("DELETE", `/produtos/${prodCorrida.id}`, vendedorP.token)]);
ok("produtos: corrida editar x remover termina REMOVIDO", removeJunto.status === 204 && [200, 404].includes(editaJunto.status) &&
  sql(`select status from "Produto" where id = '${prodCorrida.id}'`) === "REMOVIDO", `${editaJunto.status} ${removeJunto.status}`);
const pDel = registra(await chamarForm("POST", "/produtos", vendedorP.token, camposProd({ nome: "Produto E2E a remover" }), [PNG])).corpo.produto.id;
const publicIdDel = publicIdsDe(pDel)[0];
const removido = await chamar("DELETE", `/produtos/${pDel}`, vendedorP.token);
ok("produtos: remover marca REMOVIDO, apaga a foto do Cloudinary e repetir dá 404", removido.status === 204 &&
  sql(`select status from "Produto" where id = '${pDel}'`) === "REMOVIDO" && !cloudinaryHas(publicIdDel, "image") &&
  (await chamar("DELETE", `/produtos/${pDel}`, vendedorP.token)).status === 404 && (await patchP(pDel, vendedorP.token, { nome: "Volta" })).status === 404);
ok("produtos: removido não aparece em lista, meus nem detalhe (nem para o dono)", !idsP(await listaP(outroP.token, "?busca=E2E&limit=50")).includes(pDel) &&
  !(await meusP(vendedorP.token)).some((p) => p.id === pDel) && (await detalheP(pDel, vendedorP.token)).status === 404 && (await detalheP(pDel, outroP.token)).status === 404);

// contato
const contatoP = (id, token) => chamar("GET", `/produtos/${id}/contato`, token);
const textoContato = (nome) => encodeURIComponent(`Olá, vi seu produto ${nome} no SkillHub e tenho interesse.`);
const c1 = await contatoP(pProd1, outroP.token);
const cEmp = await contatoP(pEmp, outroP.token);
ok("contato: link do wa.me com 55, os dígitos do telefone e a mensagem (telefone com máscara e sem)", c1.status === 200 &&
  c1.corpo.url === `https://wa.me/5511988887766?text=${textoContato("Produto E2E de fumaça")}` && cEmp.corpo.url === `https://wa.me/551133334444?text=${textoContato("Apostila E2E da empresa")}`,
  `${c1.corpo.url} | ${cEmp.corpo.url}`);
ok("contato: sem token 401; o próprio produto 400", (await contatoP(pProd1)).status === 401 && (await contatoP(pProd1, vendedorP.token)).status === 400);
await patchP(pProd1, vendedorP.token, { whatsappAtivo: false });
const desligado = await contatoP(pProd1, outroP.token);
ok("contato: whatsappAtivo desligado dá 404 com a mensagem (e o detalhe avisa)", desligado.status === 404 && desligado.corpo.error === "O vendedor não disponibilizou contato" &&
  (await detalheP(pProd1, outroP.token)).corpo.produto.contatoDisponivel === false);
await patchP(pProd1, vendedorP.token, { whatsappAtivo: true });
sql(`update "User" set phone = null where id = '${empresaP.id}'`);
const semTelefone = await contatoP(pEmp, outroP.token);
ok("contato: vendedor sem telefone dá 404 com a mesma mensagem", semTelefone.status === 404 && semTelefone.corpo.error === "O vendedor não disponibilizou contato" &&
  (await detalheP(pEmp, outroP.token)).corpo.produto.contatoDisponivel === false);
sql(`update "User" set phone = '${TEL_EMPRESA}' where id = '${empresaP.id}'`);
await patchP(pProd1, vendedorP.token, { status: "Pausado" });
ok("contato: produto pausado ou removido dá 404", (await contatoP(pProd1, outroP.token)).status === 404 && (await contatoP(pDel, outroP.token)).status === 404);
await patchP(pProd1, vendedorP.token, { status: "Ativo" });
// privacidade: telefone e e-mail do vendedor em nenhuma resposta (lista, meus, detalhe, publicar, editar e resumo)
registra(await chamar("GET", `/usuarios/${vendedorP.id}/resumo`, outroP.token));
await meusP(empresaP.token);
const vazamentos = ["98888-7766", "988887766", "1133334444", vendedorP.email, empresaP.email, "publicId"].filter((t) => respostasProd.some((r) => r.includes(t)));
ok("produtos: o telefone (e o e-mail) não aparece em nenhuma outra resposta", vazamentos.length === 0 && respostasProd.length > 20, `${vazamentos} (${respostasProd.length} respostas)`);

// exclusão de conta do vendedor: produtos e fotos somem do banco e do Cloudinary
const saiP = await contaProd("sai", "colaborador", "900.000.018-04");
const prodSai = (await chamarForm("POST", "/produtos", saiP.token, camposProd({ nome: "Produto de quem sai" }), [PNG])).corpo.produto.id;
const publicIdSai = publicIdsDe(prodSai)[0];
const saiuP = await chamar("DELETE", "/user", saiP.token, { password: "senha123" });
ok("produtos: excluir a conta do vendedor apaga os produtos e as fotos", saiuP.status === 204 &&
  sql(`select count(*) from "Produto" where "vendedorId" = '${saiP.id}'`) === "0" && sql(`select count(*) from "ProdutoImagem" where "produtoId" = '${prodSai}'`) === "0" &&
  !cloudinaryHas(publicIdSai, "image"), `${saiuP.status}`);

// telas
const avisosProd = [];
const contextoProd = async (email) => {
  const c = await browser.newContext({ viewport: { width: 440, height: 956 } });
  await c.request.post(`${API}/api/auth/login`, { data: { email, password: "senha123" } });
  const p = await c.newPage();
  p.on("pageerror", (e) => pageErrors.push(e.message));
  // não contam: o 500 injetado de propósito (estado de erro) e o aviso do preload do logo do cabeçalho, que já
  // existia antes da 18A e não é de produtos (achado fora de escopo no changelog)
  const ignorado = (t) => t.includes("Failed to load resource") || /Logo-Skillhub\.png.*preloaded using link preload/.test(t);
  p.on("console", (m) => ["warning", "error"].includes(m.type()) && !ignorado(m.text()) && avisosProd.push(m.text()));
  return { c, p };
};
const tituloProdutos = (p) => p.getByRole("heading", { name: "Produtos", exact: true }).waitFor();
// Cliente: sem Publicar e sem Seus produtos
const telaCliente = await contextoProd(clienteP.email);
await telaCliente.p.goto(B + "/produtos"); await tituloProdutos(telaCliente.p);
await telaCliente.p.getByRole("region", { name: "Arte e Decoração" }).waitFor({ timeout: 10000 }).catch(() => {});
ok("produtos (tela): Cliente não vê Publicar nem Seus produtos", (await telaCliente.p.getByRole("button", { name: "Publicar" }).count()) === 0 &&
  (await telaCliente.p.getByText("Seus produtos").count()) === 0);
await telaCliente.c.close();
// Colaborador sem produtos: convite, e publica pelo diálogo
const telaP = await contaProd("tela", "colaborador", "900.000.018-05", "(11) 97777-6655");
const { c: ctxTela, p: pTela } = await contextoProd(telaP.email);
await pTela.goto(B + "/produtos"); await tituloProdutos(pTela);
await pTela.getByText("Você ainda não publicou nenhum produto.").waitFor({ timeout: 10000 }).catch(() => {});
ok("produtos (tela): Seus produtos vazio convida a publicar", await pTela.getByText("Você ainda não publicou nenhum produto.").isVisible());
await pTela.getByRole("button", { name: "Publicar", exact: true }).click();
const dPub = pTela.getByRole("dialog", { name: "Publicar produto" });
await dPub.waitFor();
const postsProduto = []; pTela.on("request", (r) => r.method() === "POST" && r.url().includes("/api/produtos") && postsProduto.push(r.url()));
const escolherFotos = (arquivos) => dPub.getByLabel("Escolher fotos").setInputFiles(arquivos.map((a) => ({ name: a.name, mimeType: a.mimeType, buffer: a.buffer })));
await escolherFotos([GRANDE]);
const erroGrande = await dPub.getByText("Cada imagem deve ter até 5MB.").isVisible();
await escolherFotos([TEXTO]);
ok("produtos (tela): foto grande e tipo errado avisam sem enviar nada", erroGrande && await dPub.getByText("Use imagens JPEG, PNG ou WEBP.").isVisible() &&
  postsProduto.length === 0 && (await dPub.getByRole("listitem").count()) === 1);
await dPub.getByLabel("Nome").fill("Produto pela tela E2E");
await dPub.getByLabel("Descrição").fill("Feito para testar a publicação pela tela");
await dPub.getByLabel("Categoria").selectOption("Moda e Acessórios");
await dPub.getByLabel("Preço (créditos)").fill("35");
await dPub.getByLabel("Estoque").fill("2");
await escolherFotos([PNG, JPEG]);
await dPub.getByRole("button", { name: "Mover a foto 2 para a esquerda" }).click(); // o JPEG vira a capa
await dPub.getByRole("button", { name: "Remover a foto 2" }).click(); // sai o PNG
await escolherFotos([WEBP]);
await dPub.getByRole("button", { name: "Publicar", exact: true }).click();
const seusProdutos = pTela.getByRole("region", { name: "Seus produtos" });
await seusProdutos.getByText(/Produto pela tela E2E/).waitFor({ timeout: 15000 }).catch(() => {});
const pTelaId = sql(`select id from "Produto" where "vendedorId" = '${telaP.id}'`);
const urlsTela = sql(`select string_agg(url, ',' order by ordem) from "ProdutoImagem" where "produtoId" = '${pTelaId}'`).split(",").map((u) => u.split(".").pop());
ok("produtos (tela): publicado pelo diálogo aparece em Seus produtos, com a capa escolhida", await seusProdutos.getByText(/Produto pela tela E2E/).isVisible() &&
  urlsTela.join() === "jpg,webp", urlsTela.join());
// outro usuário busca, abre o detalhe e fala com o vendedor (a navegação para o wa.me é interceptada)
const { c: ctxOutro, p: pOutro } = await contextoProd(outroP.email);
await ctxOutro.route("https://wa.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>wa.me</p>" }));
await pOutro.goto(B + "/produtos"); await tituloProdutos(pOutro);
await pOutro.getByRole("searchbox", { name: "Buscar produtos" }).fill("pela tela E2E");
const cardProdTela = pOutro.getByRole("button", { name: /Produto pela tela E2E/ });
await cardProdTela.waitFor({ timeout: 10000 }).catch(() => {});
await cardProdTela.click();
const dDet = pOutro.getByRole("dialog", { name: "Produto pela tela E2E" });
await dDet.getByRole("button", { name: "Falar com o vendedor" }).waitFor({ timeout: 10000 }).catch(() => {});
ok("produtos (tela): outro usuário busca e vê o detalhe (preço, estoque, vendedor sem avaliações)", await dDet.getByText("35 créditos").isVisible() &&
  await dDet.getByText("2 disponíveis").isVisible() && await dDet.getByText("Produtos tela E2E").isVisible() && await dDet.getByText("Sem avaliações").isVisible());
const [aba] = await Promise.all([ctxOutro.waitForEvent("page"), dDet.getByRole("button", { name: "Falar com o vendedor" }).click()]);
await aba.waitForURL(/wa\.me/, { timeout: 10000 }).catch(() => {});
ok("produtos (tela): Falar com o vendedor abre o WhatsApp numa nova aba", aba.url().startsWith("https://wa.me/5511977776655?text="), aba.url());
await aba.close();
await pOutro.keyboard.press("Escape");
// o dono pausa, ativa e remove pelo detalhe
const cardDono = seusProdutos.getByRole("button", { name: /Produto pela tela E2E/ });
await cardDono.click();
const dDono = pTela.getByRole("dialog", { name: "Produto pela tela E2E" });
await dDono.getByRole("button", { name: "Pausar" }).click();
await dDono.getByRole("button", { name: "Ativar" }).waitFor({ timeout: 8000 }).catch(() => {});
await pTela.keyboard.press("Escape");
await cardDono.getByText("Pausado").waitFor({ timeout: 8000 }).catch(() => {});
ok("produtos (tela): Pausar marca o card como Pausado", await cardDono.getByText("Pausado").isVisible());
await cardDono.click();
await dDono.getByRole("button", { name: "Ativar" }).click();
await dDono.getByRole("button", { name: "Pausar" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("produtos (tela): Ativar volta", await dDono.getByRole("button", { name: "Pausar" }).isVisible());
await dDono.getByRole("button", { name: "Remover" }).click();
await dDono.getByRole("button", { name: "Sim, remover" }).click();
await pTela.getByText("Você ainda não publicou nenhum produto.").waitFor({ timeout: 8000 }).catch(() => {});
ok("produtos (tela): Remover com confirmação tira o produto de Seus produtos", await pTela.getByText("Você ainda não publicou nenhum produto.").isVisible() &&
  sql(`select status from "Produto" where id = '${pTelaId}'`) === "REMOVIDO");
await ctxTela.close();
// estados: carregando (resposta atrasada), erro com "Tentar de novo" e vazio
const listaDeProdutos = (url) => url.pathname === "/api/produtos";
// a resposta atrasada pode chegar depois do unroute (e da navegação seguinte): aí o continue não vale mais
await pOutro.route(listaDeProdutos, async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue().catch(() => {}); });
await pOutro.goto(B + "/produtos"); await tituloProdutos(pOutro);
ok("produtos (tela): esqueleto enquanto carrega", await pOutro.locator("[aria-busy=true]").first().isVisible());
await pOutro.unroute(listaDeProdutos, undefined);
await pOutro.route(listaDeProdutos, (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"falha"}' }));
await pOutro.goto(B + "/produtos"); await tituloProdutos(pOutro);
await pOutro.getByText("Não foi possível carregar os produtos.").waitFor({ timeout: 15000 }).catch(() => {});
const temErro = await pOutro.getByText("Não foi possível carregar os produtos.").isVisible();
await pOutro.unroute(listaDeProdutos);
await pOutro.getByRole("button", { name: "Tentar de novo" }).click();
await pOutro.getByRole("region", { name: "Educação e Apostilas" }).waitFor({ timeout: 10000 }).catch(() => {});
ok("produtos (tela): erro com Tentar de novo, que recarrega", temErro && await pOutro.getByRole("region", { name: "Educação e Apostilas" }).isVisible());
await pOutro.getByRole("searchbox", { name: "Buscar produtos" }).fill("zzzz nada por aqui");
await pOutro.getByText("Nenhum produto encontrado.").waitFor({ timeout: 8000 }).catch(() => {});
ok("produtos (tela): busca sem resultado mostra o vazio", await pOutro.getByText("Nenhum produto encontrado.").isVisible());
// Início: produtos da API em créditos; o clique abre o detalhe
await pOutro.goto(B + "/inicio"); await pOutro.getByRole("heading", { name: "SkillHub" }).waitFor();
const relevantes = pOutro.getByRole("region", { name: "Produtos" });
await relevantes.getByText(/créditos$/).first().waitFor({ timeout: 10000 }).catch(() => {});
const primeiroNome = await relevantes.locator("h3").first().textContent();
await relevantes.getByRole("button").first().click();
await pOutro.getByRole("dialog", { name: primeiroNome ?? "" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("produtos (tela): o Início mostra os produtos em créditos e abre o detalhe", await pOutro.getByRole("dialog", { name: primeiroNome ?? "" }).isVisible(),
  primeiroNome ?? "");
await ctxOutro.close();
ok("produtos (tela): console sem avisos nem erros", avisosProd.length === 0, avisosProd.slice(0, 3).join(" | "));

// 15j. Pedidos (Fase 18B): checkout com reserva, estoque e um pedido por vendedor, corridas, ciclo, cancelamentos,
// consultas e privacidade, créditos, histórico, exclusão de conta (sem o bloqueio da 18C), conferência da reserva,
// estoque editado x venda (D6) e as telas do carrinho, do checkout e do pedido
const respostasPed = []; // corpo de toda resposta de pedido (e do extrato) desta seção, para a varredura de dados pessoais
const api = async (metodo, rota, token, corpo) => { const r = await chamar(metodo, rota, token, corpo); respostasPed.push(JSON.stringify(r.corpo)); return r; };
const TEL_COMPRADOR = "(21) 97777-1212", TEL_VENDEDOR = "11966665544";
const RUA_SECRETA = "Rua Pedido Secreto", NUM_SECRETO = "987A", CEP_SECRETO = "04567-890", COMPL_SECRETO = "Bloco Sigiloso";
const contaPed = async (nome, perfil, doc, phone) => {
  const email = `e2e.pedidos.${nome}@example.com`;
  const base = { fullName: `Pedidos ${nome} E2E`, phone, cep: CEP_SECRETO, rua: RUA_SECRETA, numero: NUM_SECRETO, complemento: COMPL_SECRETO,
    bairro: "Vila Teste", cidade: "Campinas", estado: "SP", email, confirmEmail: email, password: "senha123", confirmPassword: "senha123" };
  const { corpo } = await chamar("POST", `/auth/register/${perfil}`, null,
    perfil === "empresa" ? { ...base, cnpj: doc } : { ...base, cpf: doc, dataNascimento: "1990-01-01", genero: "Outro" });
  const { corpo: me } = await chamar("GET", "/auth/me", corpo.accessToken);
  return { email, token: corpo.accessToken, id: me.user.id };
};
const compradorA = await contaPed("comprador", "cliente", "900.000.019-01", TEL_COMPRADOR);
const comprador2 = await contaPed("comprador2", "colaborador", "900.000.019-02", "11955554433");
const comprador3 = await contaPed("comprador3", "cliente", "900.000.019-05", "11922221100");
const vendA = await contaPed("vendedor", "colaborador", "900.000.019-03", TEL_VENDEDOR);
const vendB = await contaPed("empresa", "empresa", "90.000.019/0001-01", "1144445555");
const terceiro = await contaPed("terceiro", "cliente", "900.000.019-04", "11933332211");
const incPedId = sql(`insert into "User" (id, email, "fullName", perfil, "profileComplete") values (gen_random_uuid(), 'e2e.pedidos.incompleto@example.com', 'Pedidos incompleto E2E', 'Cliente', false) returning id`).split("\n")[0];
const incPedToken = execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "node", "-e",
  "console.log(require('jsonwebtoken').sign({ sub: process.argv[1] }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '15m' }))", incPedId], { encoding: "utf8" }).trim();
conceder(compradorA.email, 5000);
conceder(comprador2.email, 50);

// produtos direto no banco (sem Cloudinary): a foto é uma URL do seed, com publicId nulo. Cada produto ganha uma URL
// própria (o mesmo arquivo, com um parâmetro a mais): o next/image guarda o lazy/eager de cada imagem pela URL, e cópias da
// mesma URL em linhas diferentes (uma acima da dobra, outra abaixo) davam um falso aviso de LCP com lazy
const FOTO_SEED = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=70&fit=crop";
let fotosCriadas = 0;
const prodSql = (vendedorId, nome, preco, estoque, { digital = false, status = "ATIVO" } = {}) => {
  const foto = `${FOTO_SEED}&e2e=${++fotosCriadas}`;
  const id = sql(`insert into "Produto" (id, nome, descricao, categoria, preco, estoque, digital, status, "vendedorId", "updatedAt")
    values (gen_random_uuid(), '${nome}', 'Produto de teste dos pedidos E2E', 'ARTE_DECORACAO', ${preco}, ${estoque}, ${digital}, '${status}', '${vendedorId}', now()) returning id`).split("\n")[0];
  sql(`insert into "ProdutoImagem" (id, "produtoId", url, ordem) values (gen_random_uuid(), '${id}', '${foto}', 0)`);
  return id;
};
const estoqueDe = (id) => Number(sql(`select estoque from "Produto" where id = '${id}'`));
const statusPed = (id) => sql(`select status from "PedidoProduto" where id = '${id}'`);
const linhasDe = (pedidoId) => sql(`select coalesce(string_agg(tipo || ' ' || valor, ',' order by "createdAt", id), '') from "TransacaoCredito" where "pedidoId" = '${pedidoId}'`);
const pedidosDoComprador = (id) => Number(sql(`select count(*) from "PedidoProduto" where "compradorId" = '${id}'`));
const it = (produtoId, quantidade, precoEsperado) => ({ produtoId, quantidade, precoEsperado });
const comprar = (conta, itens, observacao) => api("POST", "/pedidos", conta.token, { itens, ...(observacao !== undefined && { observacao }) });
const acaoPed = (id, acao, conta) => api("POST", `/pedidos/${id}/${acao}`, conta?.token);
const detalhePed = (id, conta) => api("GET", `/pedidos/${id}`, conta?.token);
const pedidoUnico = async (comprador, produtoId, quantidade, preco) => (await comprar(comprador, [it(produtoId, quantidade, preco)])).corpo.pedidos?.[0]?.id;
const status2 = (rs) => rs.map((r) => r.status).sort().join(",");
const apagarDepois = []; // pedidos em que o fluxo excluiu as duas contas: o cleanup não os acha pelas partes

// compra
const pA = prodSql(vendA.id, "Caneca E2E", 40, 5);
const saldoA0 = saldoDe(compradorA.email);
const rPed1 = await comprar(compradorA, [it(pA, 2, 40)], "Pode deixar na portaria.");
const ped1 = rPed1.corpo.pedidos?.[0];
ok("pedidos: o Cliente compra; o estoque cai, a reserva com o pedidoId sai do saldo e o extrato bate", rPed1.status === 201 && rPed1.corpo.pedidos.length === 1 &&
  ped1.status === "Aguardando envio" && ped1.total === 80 && estoqueDe(pA) === 3 && linhasDe(ped1.id) === "RESERVA -80" &&
  saldoDe(compradorA.email) === saldoA0 - 80 && extratoBate(compradorA.email), `${rPed1.status} ${JSON.stringify(rPed1.corpo).slice(0, 200)}`);
ok("pedidos: itens em snapshot (nome, preço, quantidade, capa e digital) e a observação", ped1?.itens[0].nome === "Caneca E2E" && ped1.itens[0].precoUnitario === 40 &&
  ped1.itens[0].quantidade === 2 && ped1.itens[0].imagemUrl === sql(`select url from "ProdutoImagem" where "produtoId" = '${pA}'`) && ped1.itens[0].digital === false && ped1.observacao === "Pode deixar na portaria.");
const pB1 = prodSql(vendA.id, "Quadro E2E", 30, 4), pB3 = prodSql(vendA.id, "Moldura E2E", 15, 4);
const pB2 = prodSql(vendB.id, "Apostila E2E do pedido", 50, 10, { digital: true });
const rPed2 = await comprar(compradorA, [it(pB1, 1, 30), it(pB2, 2, 50), it(pB3, 1, 15)]);
const ped2A = rPed2.corpo.pedidos?.find((p) => p.outraParte?.id === vendA.id), ped2B = rPed2.corpo.pedidos?.find((p) => p.outraParte?.id === vendB.id);
ok("pedidos: carrinho com 2 vendedores vira 2 pedidos e 2 reservas, na mesma transação", rPed2.status === 201 && rPed2.corpo.pedidos.length === 2 &&
  ped2A?.total === 45 && ped2B?.total === 100 && linhasDe(ped2A.id) === "RESERVA -45" && linhasDe(ped2B.id) === "RESERVA -100" &&
  sql(`select count(distinct xmin::text) from "PedidoProduto" where id in ('${ped2A.id}', '${ped2B.id}')`) === "1" &&
  ped2A.primeiroItem === "Moldura E2E" && ped2A.outrosItens === 1, `${rPed2.status} ${JSON.stringify(rPed2.corpo).slice(0, 200)}`);
// atomicidade
const pC1 = prodSql(vendA.id, "Atomico um E2E", 10, 5), pC2 = prodSql(vendB.id, "Atomico dois E2E", 10, 1), pC3 = prodSql(vendA.id, "Atomico tres E2E", 10, 5);
const antesAtom = pedidosDoComprador(compradorA.id), saldoAtom = saldoDe(compradorA.email);
const rAtom = await comprar(compradorA, [it(pC1, 1, 10), it(pC2, 2, 10), it(pC3, 1, 10)]);
ok("pedidos: um item esgotado entre três dá 409 ESGOTADO apontando o produto, e nada muda", rAtom.status === 409 && rAtom.corpo.code === "ESGOTADO" &&
  rAtom.corpo.produtoId === pC2 && rAtom.corpo.estoque === 1 && pedidosDoComprador(compradorA.id) === antesAtom && saldoDe(compradorA.email) === saldoAtom &&
  estoqueDe(pC1) === 5 && estoqueDe(pC2) === 1 && estoqueDe(pC3) === 5, JSON.stringify(rAtom.corpo));
const pD1 = prodSql(vendA.id, "Saldo um E2E", 40, 3), pD2 = prodSql(vendB.id, "Saldo dois E2E", 40, 3);
const rSaldo = await comprar(comprador2, [it(pD1, 1, 40), it(pD2, 1, 40)]);
ok("pedidos: saldo para só um dos 2 pedidos dá 409 e nada é criado, reservado nem baixado", rSaldo.status === 409 && rSaldo.corpo.code === "SALDO_INSUFICIENTE" &&
  pedidosDoComprador(comprador2.id) === 0 && saldoDe(comprador2.email) === 50 && estoqueDe(pD1) === 3 && estoqueDe(pD2) === 3 && extratoBate(comprador2.email),
  JSON.stringify(rSaldo.corpo));
const pE = prodSql(vendA.id, "Preco muda E2E", 40, 3);
await chamar("PATCH", `/produtos/${pE}`, vendA.token, { preco: 45 });
const rPreco = await comprar(compradorA, [it(pE, 1, 40)]);
ok("pedidos: preço diferente do visto dá 409 PRECO_ALTERADO com o preço atual, sem cobrar", rPreco.status === 409 && rPreco.corpo.code === "PRECO_ALTERADO" &&
  rPreco.corpo.precoAtual === 45 && rPreco.corpo.produtoId === pE && estoqueDe(pE) === 3, JSON.stringify(rPreco.corpo));
const pPaus = prodSql(vendA.id, "Pausado E2E", 10, 3, { status: "PAUSADO" }), pRem = prodSql(vendA.id, "Removido E2E", 10, 3, { status: "REMOVIDO" });
const rPaus = await comprar(compradorA, [it(pPaus, 1, 10)]), rRem = await comprar(compradorA, [it(pRem, 1, 10)]);
const rNada = await comprar(compradorA, [it("00000000-0000-4000-8000-00000000dead", 1, 10)]);
ok("pedidos: produto pausado, removido ou inexistente dá 409 INDISPONIVEL", [rPaus, rRem, rNada].every((r) => r.status === 409 && r.corpo.code === "INDISPONIVEL"),
  [rPaus, rRem, rNada].map((r) => `${r.status} ${r.corpo.code}`).join(" | "));
ok("pedidos: comprar o próprio produto dá 403", (await comprar(vendA, [it(pA, 1, 40)])).status === 403);
ok("pedidos: perfil incompleto 403, sem token 401", (await chamar("POST", "/pedidos", incPedToken, { itens: [it(pA, 1, 40)] })).status === 403 &&
  (await chamar("POST", "/pedidos", null, { itens: [it(pA, 1, 40)] })).status === 401);
const invalidos = [
  { itens: [it(pA, 0, 40)] }, { itens: [it(pA, 100, 40)] }, { itens: [it(pA, 1.5, 40)] }, { itens: [it(pA, 1, 40)], observacao: "x".repeat(301) },
  { itens: [] }, { itens: Array.from({ length: 21 }, () => it(crypto.randomUUID(), 1, 10)) }, { itens: [it(pA, 1, 40), it(pA, 1, 40)] }, { itens: [{ produtoId: pA, quantidade: 1 }] },
];
const rInv = await Promise.all(invalidos.map((c) => chamar("POST", "/pedidos", compradorA.token, c)));
ok("pedidos: validação (quantidade 0, 100 e 1.5, observação de 301, 0 e 21 itens, repetido, sem precoEsperado) dá 400", rInv.every((r) => r.status === 400) &&
  estoqueDe(pA) === 3, rInv.map((r) => r.status).join(","));

// corridas (item e): cada uma 5 vezes, sempre um sucesso e um 409
conceder(comprador2.email, 1000);
let corridaEstoque = true, corridaSaldo = true, corridaConfCanc = true, corridaConf2 = true;
const infoCorrida = [];
for (let k = 0; k < 5; k++) {
  const ultima = prodSql(vendA.id, `Ultima unidade ${k} E2E`, 10, 1);
  const rs = await Promise.all([comprar(compradorA, [it(ultima, 1, 10)]), comprar(comprador2, [it(ultima, 1, 10)])]);
  const okK = status2(rs) === "201,409" && rs.find((r) => r.status === 409).corpo.code === "ESGOTADO" && estoqueDe(ultima) === 0 &&
    sql(`select count(*) from "ItemPedido" where "produtoId" = '${ultima}'`) === "1";
  corridaEstoque &&= okK; if (!okK) infoCorrida.push(`estoque ${k}: ${status2(rs)} ${estoqueDe(ultima)}`);
}
ok("pedidos (corrida): dois compradores na última unidade, 5 vezes: um 201 e um 409 ESGOTADO, estoque 0", corridaEstoque, infoCorrida.join(" | "));
for (let k = 0; k < 5; k++) {
  conceder(comprador3.email, 30);
  const x = prodSql(vendA.id, `Saldo corrida a${k} E2E`, 30, 5), y = prodSql(vendB.id, `Saldo corrida b${k} E2E`, 30, 5);
  const rs = await Promise.all([comprar(comprador3, [it(x, 1, 30)]), comprar(comprador3, [it(y, 1, 30)])]);
  const okK = status2(rs) === "201,409" && rs.find((r) => r.status === 409).corpo.code === "SALDO_INSUFICIENTE" && saldoDe(comprador3.email) === 0 &&
    estoqueDe(x) + estoqueDe(y) === 9 && extratoBate(comprador3.email);
  corridaSaldo &&= okK; if (!okK) infoCorrida.push(`saldo ${k}: ${status2(rs)} ${saldoDe(comprador3.email)}`);
}
ok("pedidos (corrida): dois checkouts com saldo para um, 5 vezes: um 201 e um 409, saldo nunca negativo, estoque baixa uma vez", corridaSaldo, infoCorrida.join(" | "));
for (let k = 0; k < 5; k++) {
  const x = prodSql(vendA.id, `Conf canc ${k} E2E`, 20, 2);
  const pid = await pedidoUnico(compradorA, x, 1, 20);
  await acaoPed(pid, "enviar", vendA);
  const [conf, canc] = await Promise.all([acaoPed(pid, "confirmar-recebimento", compradorA), acaoPed(pid, "cancelar", vendA)]);
  const ganhou = conf.status === 200 ? "confirmar" : "cancelar";
  const okK = status2([conf, canc]) === "200,409" && (ganhou === "confirmar"
    ? statusPed(pid) === "CONCLUIDO" && linhasDe(pid) === "RESERVA -20,RECEBIMENTO 20" && estoqueDe(x) === 1
    : statusPed(pid) === "CANCELADO" && linhasDe(pid) === "RESERVA -20,ESTORNO 20" && estoqueDe(x) === 2) && extratoBate(compradorA.email) && extratoBate(vendA.email);
  corridaConfCanc &&= okK; if (!okK) infoCorrida.push(`conf x canc ${k}: ${conf.status}/${canc.status} ${linhasDe(pid)}`);
}
ok("pedidos (corrida): confirmar x cancelar ao mesmo tempo, 5 vezes: um 200 e um 409, pago ou estornado, nunca os dois", corridaConfCanc, infoCorrida.join(" | "));
for (let k = 0; k < 5; k++) {
  const x = prodSql(vendA.id, `Conf dupla ${k} E2E`, 20, 2);
  const pid = await pedidoUnico(compradorA, x, 1, 20);
  await acaoPed(pid, "enviar", vendA);
  const rs = await Promise.all([acaoPed(pid, "confirmar-recebimento", compradorA), acaoPed(pid, "confirmar-recebimento", compradorA)]);
  const okK = status2(rs) === "200,409" && linhasDe(pid) === "RESERVA -20,RECEBIMENTO 20";
  corridaConf2 &&= okK; if (!okK) infoCorrida.push(`conf 2x ${k}: ${status2(rs)} ${linhasDe(pid)}`);
}
ok("pedidos (corrida): confirmar duas vezes ao mesmo tempo, 5 vezes: um 200 e um 409, um só pagamento", corridaConf2, infoCorrida.join(" | "));

// ciclo
const saldoVendA = saldoDe(vendA.email);
const env1 = await acaoPed(ped1.id, "enviar", vendA);
ok("pedidos: o vendedor marca como enviado e o enviadoEm fica gravado", env1.status === 200 && env1.corpo.pedido.status === "Enviado" &&
  sql(`select "enviadoEm" is not null from "PedidoProduto" where id = '${ped1.id}'`) === "t");
const conf1 = await acaoPed(ped1.id, "confirmar-recebimento", compradorA);
ok("pedidos: o comprador confirma; o vendedor recebe, sem linha de taxa com taxa 0, e o concluidoEm fica gravado", conf1.status === 200 &&
  conf1.corpo.pedido.status === "Concluído" && linhasDe(ped1.id) === "RESERVA -80,RECEBIMENTO 80" && saldoDe(vendA.email) === saldoVendA + 80 &&
  sql(`select "concluidoEm" is not null from "PedidoProduto" where id = '${ped1.id}'`) === "t" && extratoBate(vendA.email) && extratoBate(compradorA.email), linhasDe(ped1.id));
ok("pedidos: transições fora da tabela dão 409 (enviar concluído, confirmar antes do envio, cancelar concluído)",
  (await acaoPed(ped1.id, "enviar", vendA)).status === 409 && (await acaoPed(ped2A.id, "confirmar-recebimento", compradorA)).status === 409 &&
  (await acaoPed(ped1.id, "cancelar", compradorA)).status === 409 && (await acaoPed(ped1.id, "cancelar", vendA)).status === 409);
ok("pedidos: papel errado dá 403 (comprador enviando, vendedor confirmando)", (await acaoPed(ped2A.id, "enviar", compradorA)).status === 403 &&
  (await acaoPed(ped2A.id, "confirmar-recebimento", vendA)).status === 403);
const envDig = await acaoPed(ped2B.id, "enviar", vendB);
ok("pedidos: pedido digital é marcado como entregue pelo mesmo enviar", envDig.status === 200 && envDig.corpo.pedido.itens.every((i) => i.digital === true));

// cancelamentos
const canc1 = await acaoPed(ped2A.id, "cancelar", compradorA);
ok("pedidos: o comprador cancela antes do envio; estorno inteiro e estoque devolvido", canc1.status === 200 && canc1.corpo.pedido.canceladoPor === "Comprador" &&
  sql(`select "canceladoEm" is not null from "PedidoProduto" where id = '${ped2A.id}'`) === "t" && linhasDe(ped2A.id) === "RESERVA -45,ESTORNO 45" &&
  estoqueDe(pB1) === 4 && estoqueDe(pB3) === 4, linhasDe(ped2A.id));
ok("pedidos: enviar um pedido cancelado dá 409", (await acaoPed(ped2A.id, "enviar", vendA)).status === 409);
const pF = prodSql(vendA.id, "Cancela vendedor E2E", 25, 4);
const ped20 = await pedidoUnico(compradorA, pF, 1, 25);
const canc20 = await acaoPed(ped20, "cancelar", vendA);
ok("pedidos: o vendedor cancela antes do envio", canc20.status === 200 && canc20.corpo.pedido.canceladoPor === "Vendedor" && linhasDe(ped20) === "RESERVA -25,ESTORNO 25" && estoqueDe(pF) === 4);
const ped21 = await pedidoUnico(compradorA, pF, 2, 25);
await acaoPed(ped21, "enviar", vendA);
ok("pedidos: o vendedor cancela depois do envio", (await acaoPed(ped21, "cancelar", vendA)).status === 200 && linhasDe(ped21) === "RESERVA -50,ESTORNO 50" && estoqueDe(pF) === 4);
const ped22 = await pedidoUnico(compradorA, pF, 1, 25);
await acaoPed(ped22, "enviar", vendA);
ok("pedidos: o comprador não cancela depois do envio (409), e nada muda", (await acaoPed(ped22, "cancelar", compradorA)).status === 409 &&
  statusPed(ped22) === "ENVIADO" && linhasDe(ped22) === "RESERVA -25" && estoqueDe(pF) === 3);
const pR = prodSql(vendA.id, "Removido depois E2E", 12, 3);
const ped23 = await pedidoUnico(compradorA, pR, 1, 12);
const remR = await chamar("DELETE", `/produtos/${pR}`, vendA.token);
ok("pedidos: cancelar pedido de produto removido estorna e devolve o estoque (o produto continua fora da loja)", remR.status === 204 &&
  (await acaoPed(ped23, "cancelar", vendA)).status === 200 && estoqueDe(pR) === 3 && sql(`select status from "Produto" where id = '${pR}'`) === "REMOVIDO" &&
  linhasDe(ped23) === "RESERVA -12,ESTORNO 12");

// consultas e privacidade (item f)
const compras1 = await api("GET", "/pedidos/compras?limit=1", compradorA.token);
const compras2 = await api("GET", `/pedidos/compras?limit=1&cursor=${compras1.corpo.nextCursor}`, compradorA.token);
const todasCompras = await api("GET", "/pedidos/compras?limit=50", compradorA.token);
const vendasA = await api("GET", "/pedidos/vendas?limit=50", vendA.token);
ok("pedidos: compras e vendas só do usuário, mais recentes primeiro, com cursor", compras1.status === 200 && !!compras1.corpo.nextCursor &&
  compras1.corpo.pedidos[0].id !== compras2.corpo.pedidos[0].id && compras1.corpo.pedidos[0].createdAt >= compras2.corpo.pedidos[0].createdAt &&
  todasCompras.corpo.pedidos.every((p) => p.papel === "comprador") && vendasA.corpo.pedidos.every((p) => p.papel === "vendedor") &&
  todasCompras.corpo.nextCursor === null && (await chamar("GET", "/pedidos/compras?limit=51", compradorA.token)).status === 400);
ok("pedidos: detalhe para as duas partes, 403 para um terceiro, 404 para inexistente e id inválido", (await detalhePed(ped22, compradorA)).status === 200 &&
  (await detalhePed(ped22, vendA)).status === 200 && (await detalhePed(ped22, terceiro)).status === 403 &&
  (await detalhePed("00000000-0000-4000-8000-00000000dead", compradorA)).status === 404 && (await detalhePed("nao-e-uuid", compradorA)).status === 404);
const vistoPeloVendedor = await detalhePed(ped22, vendA);
ok("pedidos: o detalhe traz só a cidade e o bairro da outra parte", vistoPeloVendedor.corpo.pedido.outraParteLocal?.cidade === "Campinas" &&
  vistoPeloVendedor.corpo.pedido.outraParteLocal?.bairro === "Vila Teste" && vistoPeloVendedor.corpo.pedido.outraParte.id === compradorA.id &&
  ![RUA_SECRETA, NUM_SECRETO, CEP_SECRETO, COMPL_SECRETO].some((t) => JSON.stringify(vistoPeloVendedor.corpo).includes(t)));
const contatoPed = (id, conta) => chamar("GET", `/pedidos/${id}/contato`, conta?.token);
const pG = prodSql(vendA.id, "Contato E2E", 10, 5);
const pedAberto = await pedidoUnico(compradorA, pG, 1, 10);
const cComp = await contatoPed(pedAberto, compradorA), cVend = await contatoPed(pedAberto, vendA);
ok("pedidos: o contato dá o link da outra parte, com o primeiro item na mensagem", cComp.status === 200 &&
  cComp.corpo.url === `https://wa.me/5511966665544?text=${encodeURIComponent("Olá, comprei Contato E2E no SkillHub e quero combinar a entrega.")}` &&
  cVend.corpo.url === `https://wa.me/5521977771212?text=${encodeURIComponent("Olá, vendi Contato E2E para você no SkillHub e quero combinar a entrega.")}`,
  `${cComp.corpo.url} | ${cVend.corpo.url}`);
await acaoPed(pedAberto, "enviar", vendA);
const cEnviado = await contatoPed(pedAberto, compradorA);
sql(`update "User" set phone = null where id = '${vendA.id}'`);
const cSemTel = await contatoPed(pedAberto, compradorA);
const detSemTel = await detalhePed(pedAberto, compradorA);
sql(`update "User" set phone = '${TEL_VENDEDOR}' where id = '${vendA.id}'`);
ok("pedidos: contato em Enviado 200; encerrado 409; terceiro 403; sem token 401; outra parte sem telefone 404", cEnviado.status === 200 &&
  (await contatoPed(ped1.id, compradorA)).status === 409 && (await contatoPed(pedAberto, terceiro)).status === 403 && (await contatoPed(pedAberto)).status === 401 &&
  cSemTel.status === 404 && detSemTel.corpo.pedido.contatoDisponivel === false, `${cEnviado.status} ${cSemTel.status}`);

// créditos e taxa (itens a e d)
const extComp = await api("GET", "/creditos/extrato?limit=50", compradorA.token);
const extVend = await api("GET", "/creditos/extrato?limit=50", vendA.token);
const linhaExt = (ext, pedidoId, tipo) => ext.corpo.transacoes.find((t) => t.pedido?.id === pedidoId && t.tipo === tipo);
ok("pedidos: o extrato mostra Pedido: primeiro item (+N) na reserva do comprador e no recebimento do vendedor",
  linhaExt(extComp, ped2A.id, "Reserva")?.pedido.rotulo === "Pedido: Moldura E2E (+1)" && linhaExt(extVend, ped1.id, "Recebimento")?.pedido.rotulo === "Pedido: Caneca E2E",
  JSON.stringify(linhaExt(extComp, ped2A.id, "Reserva")));

// script pedidos:pendentes (item h): só listagem
sql(`update "PedidoProduto" set "enviadoEm" = now() - interval '8 days' where id = '${ped22}'`);
const contagens = () => sql(`select (select count(*) from "PedidoProduto") || '/' || (select count(*) from "TransacaoCredito") || '/' || (select count(*) from "Produto")`);
const antesScript = contagens();
const pendentes = execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "backend", "npm", "run", "-s", "pedidos:pendentes"], { encoding: "utf8" });
ok("pedidos: pedidos:pendentes lista o enviado há 8 dias e não o de hoje, sem e-mail nem telefone, e não muda nada", pendentes.includes(ped22) &&
  !pendentes.includes(pedAberto) && !pendentes.includes(compradorA.email) && !pendentes.includes("97777") && contagens() === antesScript, pendentes.slice(0, 200));

// histórico (item c)
const pH = prodSql(vendA.id, "Historico E2E", 18, 2);
const pedH = await pedidoUnico(compradorA, pH, 1, 18);
await chamar("DELETE", `/produtos/${pH}`, vendA.token);
const detH = await detalhePed(pedH, compradorA);
await acaoPed(pedH, "enviar", vendA);
ok("pedidos: remover o produto não quebra o pedido aberto, que segue até Concluído", detH.status === 200 && detH.corpo.pedido.itens[0].nome === "Historico E2E" &&
  (await acaoPed(pedH, "confirmar-recebimento", compradorA)).corpo.pedido?.status === "Concluído");
const vendSai = await contaPed("vendsai", "colaborador", "900.000.019-06", "11911112222");
const pVendSai = prodSql(vendSai.id, "Vendedor sai E2E", 22, 3);
const pedSai = await pedidoUnico(compradorA, pVendSai, 1, 22);
await acaoPed(pedSai, "enviar", vendSai); await acaoPed(pedSai, "confirmar-recebimento", compradorA);
const saiuV = await chamar("DELETE", "/user", vendSai.token, { password: "senha123" });
const detSai = await detalhePed(pedSai, compradorA);
ok("pedidos: o vendedor de um pedido concluído exclui a conta; o pedido fica, com Usuário removido e o snapshot", saiuV.status === 204 &&
  detSai.corpo.pedido.outraParte === null && detSai.corpo.pedido.itens[0].produtoId === null && detSai.corpo.pedido.total === 22 && !!detSai.corpo.pedido.concluidoEm);
const compSai = await contaPed("compsai", "cliente", "900.000.019-07", "11911113333");
conceder(compSai.email, 100);
const pSaiC = prodSql(vendA.id, "Comprador sai E2E", 33, 3);
const pedSai2 = await pedidoUnico(compSai, pSaiC, 1, 33);
await acaoPed(pedSai2, "enviar", vendA); await acaoPed(pedSai2, "confirmar-recebimento", compSai);
const rendaAntes = sql(`select sum(total) from "PedidoProduto" where "vendedorId" = '${vendA.id}' and status = 'CONCLUIDO'`);
const saiuC = await chamar("DELETE", "/user", compSai.token, { password: "senha123" });
ok("pedidos: o comprador de um pedido concluído exclui a conta; o pedido e a renda do vendedor ficam", saiuC.status === 204 &&
  (await detalhePed(pedSai2, vendA)).corpo.pedido.outraParte === null &&
  sql(`select sum(total) from "PedidoProduto" where "vendedorId" = '${vendA.id}' and status = 'CONCLUIDO'`) === rendaAntes);

// exclusão de conta hoje, com pedido em aberto (o bloqueio é da 18C)
const compY = await contaPed("compy", "cliente", "900.000.019-08", "11911114444");
conceder(compY.email, 100);
const pY = prodSql(vendA.id, "Comprador sai aberto E2E", 15, 3);
const pedY = await pedidoUnico(compY, pY, 1, 15);
await acaoPed(pedY, "enviar", vendA);
const saiuY = await chamar("DELETE", "/user", compY.token, { password: "senha123" });
const detY = await detalhePed(pedY, vendA);
const cancY = await acaoPed(pedY, "cancelar", vendA);
ok("pedidos (hoje): comprador sai com pedido enviado; o vendedor ainda vê e cancela, o estoque volta, sem 500", saiuY.status === 204 && detY.status === 200 &&
  detY.corpo.pedido.outraParte === null && cancY.status === 200 && estoqueDe(pY) === 3 && linhasDe(pedY) === "", `${cancY.status} ${linhasDe(pedY)}`);
const vendZ = await contaPed("vendz", "colaborador", "900.000.019-09", "11911115555");
const pedZ = await pedidoUnico(compradorA, prodSql(vendZ.id, "Vendedor sai aguardando E2E", 14, 3), 1, 14);
await chamar("DELETE", "/user", vendZ.token, { password: "senha123" });
const cancZ = await acaoPed(pedZ, "cancelar", compradorA);
ok("pedidos (hoje): vendedor sai com pedido aguardando envio; o comprador cancela e o estorno volta inteiro", cancZ.status === 200 && linhasDe(pedZ) === "RESERVA -14,ESTORNO 14");
const vendW = await contaPed("vendw", "colaborador", "900.000.019-10", "11911116666");
const pedW = await pedidoUnico(compradorA, prodSql(vendW.id, "Vendedor sai enviado E2E", 16, 3), 1, 16);
await acaoPed(pedW, "enviar", vendW);
await chamar("DELETE", "/user", vendW.token, { password: "senha123" });
const confW = await acaoPed(pedW, "confirmar-recebimento", compradorA);
const cancW = await acaoPed(pedW, "cancelar", compradorA);
ok("pedidos (D5): vendedor sai com pedido enviado; confirmar dá 409 e o comprador cancela, com o estorno inteiro", confW.status === 409 &&
  confW.corpo.error === "O vendedor excluiu a conta" && cancW.status === 200 && cancW.corpo.pedido.canceladoPor === "Comprador" && linhasDe(pedW) === "RESERVA -16,ESTORNO 16",
  `${confW.status} ${confW.corpo.error} | ${cancW.status}`);

// conferência da reserva (ajuste 2): sem a RESERVA certa, nenhum crédito se move
const pK = prodSql(vendA.id, "Reserva confere E2E", 21, 5);
const pedK = await pedidoUnico(compradorA, pK, 1, 21);
await acaoPed(pedK, "enviar", vendA);
const saldoVendK = saldoDe(vendA.email);
sql(`update "TransacaoCredito" set tipo = 'BONUS' where "pedidoId" = '${pedK}' and tipo = 'RESERVA'`); // a reserva "some" (o extrato continua batendo)
const confK = await acaoPed(pedK, "confirmar-recebimento", compradorA);
ok("pedidos: sem a RESERVA do pedido, confirmar dá 500 e nada muda", confK.status === 500 && statusPed(pedK) === "ENVIADO" && saldoDe(vendA.email) === saldoVendK &&
  !linhasDe(pedK).includes("RECEBIMENTO"), `${confK.status} ${linhasDe(pedK)}`);
sql(`update "TransacaoCredito" set tipo = 'RESERVA' where "pedidoId" = '${pedK}' and tipo = 'BONUS'`);
sql(`update "PedidoProduto" set total = total + 1 where id = '${pedK}'`); // a reserva deixa de valer -total
const cancK = await acaoPed(pedK, "cancelar", vendA);
ok("pedidos: com a RESERVA diferente do total, cancelar dá 500 e nada muda (sem estorno, estoque igual)", cancK.status === 500 && statusPed(pedK) === "ENVIADO" &&
  linhasDe(pedK) === "RESERVA -21" && estoqueDe(pK) === 4, `${cancK.status} ${linhasDe(pedK)}`);
sql(`update "PedidoProduto" set total = total - 1 where id = '${pedK}'`);
ok("pedidos: com a reserva certa de volta, o cancelamento funciona", (await acaoPed(pedK, "cancelar", vendA)).status === 200 && linhasDe(pedK) === "RESERVA -21,ESTORNO 21");

// estoque editado x venda (D6)
const pS = prodSql(vendA.id, "Estoque lido E2E", 10, 5);
const semLido = await chamar("PATCH", `/produtos/${pS}`, vendA.token, { estoque: 9 });
ok("produtos (D6): PATCH com estoque e sem estoqueLido dá 400; sem estoque, não pede", semLido.status === 400 &&
  semLido.corpo.details?.some((d) => d.field === "estoqueLido") && (await chamar("PATCH", `/produtos/${pS}`, vendA.token, { nome: "Estoque lido E2E" })).status === 200);
ok("produtos (D6): PATCH com o estoqueLido certo grava", (await chamar("PATCH", `/produtos/${pS}`, vendA.token, { estoque: 7, estoqueLido: 5 })).status === 200 && estoqueDe(pS) === 7);
await pedidoUnico(compradorA, pS, 1, 10);
const lidoVelho = await chamar("PATCH", `/produtos/${pS}`, vendA.token, { estoque: 10, estoqueLido: 7 });
ok("produtos (D6): uma venda entre a leitura e o PATCH dá 409 e o estoque fica o da venda", lidoVelho.status === 409 &&
  lidoVelho.corpo.error === "O estoque mudou (houve uma venda). Confira e salve de novo." && estoqueDe(pS) === 6, `${lidoVelho.status} ${estoqueDe(pS)}`);

// telas (Cliente a 440px)
const avisosPed = [];
const contextoPed = async (email, opcoes = {}) => {
  const c = await browser.newContext({ viewport: { width: 440, height: 956 }, ...opcoes });
  await c.request.post(`${API}/api/auth/login`, { data: { email, password: "senha123" } });
  await c.route("https://wa.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>wa.me</p>" }));
  const p = await c.newPage();
  p.on("pageerror", (e) => pageErrors.push(e.message));
  const ignorado = (t) => t.includes("Failed to load resource") || /Logo-Skillhub\.png.*preloaded using link preload/.test(t);
  // com a página, para o aviso dizer onde apareceu
  p.on("console", (m) => ["warning", "error"].includes(m.type()) && !ignorado(m.text()) && avisosPed.push(`[${p.url().replace(B, "")}] ${m.text()}`));
  return { c, p };
};
const pT1 = prodSql(vendA.id, "Vaso tela E2E", 25, 3), pT2 = prodSql(vendB.id, "Livro tela E2E", 35, 5), pT3 = prodSql(vendA.id, "Pano tela E2E", 9, 2);
const { c: ctxC, p: pC } = await contextoPed(compradorA.email);
const abrirProduto = async (p, nome) => {
  await p.goto(B + "/produtos"); await tituloProdutos(p);
  await p.getByRole("searchbox", { name: "Buscar produtos" }).fill(nome);
  await p.getByRole("button", { name: new RegExp(nome) }).first().click();
  const d = p.getByRole("dialog", { name: nome });
  await d.getByRole("button", { name: "Adicionar ao carrinho" }).waitFor({ timeout: 10000 }).catch(() => {});
  return d;
};
const carrinhoBtn = (p) => p.getByRole("button", { name: /^Carrinho/ });
let dT = await abrirProduto(pC, "Vaso tela E2E");
await dT.getByRole("button", { name: "Aumentar" }).click(); await dT.getByRole("button", { name: "Aumentar" }).click();
const travouNoEstoque = await dT.getByRole("button", { name: "Aumentar" }).isDisabled();
await dT.getByRole("button", { name: "Diminuir" }).click(); await dT.getByRole("button", { name: "Diminuir" }).click();
await dT.getByRole("button", { name: "Adicionar ao carrinho" }).click();
await pC.keyboard.press("Escape");
await carrinhoBtn(pC).and(pC.getByRole("button", { name: "Carrinho: 1 item" })).waitFor({ timeout: 5000 }).catch(() => {});
ok("pedidos (tela): a quantidade para no estoque, e Adicionar ao carrinho mostra a contagem", travouNoEstoque && (await carrinhoBtn(pC).getAttribute("aria-label")) === "Carrinho: 1 item",
  await carrinhoBtn(pC).getAttribute("aria-label"));
for (const nome of ["Livro tela E2E", "Pano tela E2E"]) {
  dT = await abrirProduto(pC, nome);
  await dT.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await pC.keyboard.press("Escape");
}
await chamar("PATCH", `/produtos/${pT3}`, vendA.token, { status: "Pausado" }); // depois de adicionar: fica indisponível
await pC.reload(); await tituloProdutos(pC);
await carrinhoBtn(pC).and(pC.getByRole("button", { name: "Carrinho: 3 itens" })).waitFor({ timeout: 5000 }).catch(() => {});
ok("pedidos (tela): recarregar a página mantém o carrinho", (await carrinhoBtn(pC).getAttribute("aria-label")) === "Carrinho: 3 itens");
const chipAntes = await pC.getByRole("button", { name: /^Créditos:/ }).getAttribute("aria-label"); // lido antes do diálogo (ele esconde o resto)
await carrinhoBtn(pC).click();
const dCar = pC.getByRole("dialog", { name: "Carrinho" });
await dCar.getByText("Indisponível").waitFor({ timeout: 10000 }).catch(() => {});
ok("pedidos (tela): carrinho agrupado por vendedor, com o pausado indisponível e fora do total", await dCar.getByRole("region", { name: "Itens de Pedidos vendedor E2E" }).isVisible() &&
  await dCar.getByRole("region", { name: "Itens de Pedidos empresa E2E" }).isVisible() && await dCar.getByText("Indisponível").isVisible() &&
  await dCar.getByText("60 créditos", { exact: true }).last().isVisible());
await dCar.getByRole("button", { name: "Finalizar compra" }).click();
const dChk = pC.getByRole("dialog", { name: "Finalizar compra" });
await dChk.waitFor();
ok("pedidos (tela): o checkout mostra o total, o aviso da reserva e o do WhatsApp", await dChk.getByRole("button", { name: "Reservar 60 créditos" }).isVisible() &&
  await dChk.getByText("O vendedor poderá falar com você pelo WhatsApp para combinar a entrega.").isVisible());
await dChk.getByLabel("Observação (opcional)").fill("Entregar à tarde.");
await dChk.getByRole("button", { name: "Reservar 60 créditos" }).click();
const comprasTela = pC.getByRole("region", { name: "Suas compras" });
await comprasTela.getByText(/Vaso tela E2E/).waitFor({ timeout: 15000 }).catch(() => {});
const chipDepois = await pC.getByRole("button", { name: /^Créditos:/ }).getAttribute("aria-label");
ok("pedidos (tela): depois do checkout, os itens saem do carrinho, o saldo do chip cai e Suas compras mostra os pedidos",
  await comprasTela.getByText(/Vaso tela E2E/).isVisible() && await comprasTela.getByText(/Livro tela E2E/).isVisible() &&
  (await carrinhoBtn(pC).getAttribute("aria-label")) === "Carrinho: 1 item" && chipAntes !== chipDepois && sql(`select count(*) from "PedidoProduto" where observacao = 'Entregar à tarde.'`) === "2",
  `${chipAntes} -> ${chipDepois}`);
// PRECO_ALTERADO pela tela: o preço muda entre abrir o checkout e reservar
await chamar("PATCH", `/produtos/${pT3}`, vendA.token, { status: "Ativo" });
await carrinhoBtn(pC).click();
await dCar.getByRole("button", { name: "Finalizar compra" }).click();
await dChk.waitFor();
await chamar("PATCH", `/produtos/${pT3}`, vendA.token, { preco: 11 });
await dChk.getByRole("button", { name: /^Reservar/ }).click();
await dChk.getByText("O preço de Pano tela E2E mudou para 11 créditos. Confira o carrinho.").waitFor({ timeout: 8000 }).catch(() => {});
ok("pedidos (tela): preço alterado mostra a mensagem com o produto, sem cobrar", await dChk.getByText("O preço de Pano tela E2E mudou para 11 créditos. Confira o carrinho.").isVisible() &&
  estoqueDe(pT3) === 2);
await pC.keyboard.press("Escape");
// Comprar agora: o checkout só com o item, sem mexer no carrinho
dT = await abrirProduto(pC, "Livro tela E2E");
await dT.getByRole("button", { name: "Comprar agora" }).click();
await dChk.waitFor();
const soUmItem = await dChk.getByRole("button", { name: "Reservar 35 créditos" }).isVisible();
await dChk.getByRole("button", { name: "Voltar" }).click();
const voltouAoDetalhe = await pC.getByRole("dialog", { name: "Livro tela E2E" }).waitFor({ timeout: 5000 }).then(() => true, () => false);
await pC.keyboard.press("Escape"); // o diálogo esconde o resto da página: o carrinho é lido depois de fechar
await pC.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
ok("pedidos (tela): Comprar agora abre o checkout só com o item, o Voltar volta ao produto e o carrinho não muda", soUmItem && voltouAoDetalhe &&
  (await carrinhoBtn(pC).getAttribute("aria-label")) === "Carrinho: 1 item");
// estados de Suas compras: carregando e erro com Tentar de novo
await pC.route("**/api/pedidos/compras**", async (r) => { await new Promise((x) => setTimeout(x, 3000)); await r.continue().catch(() => {}); });
await pC.goto(B + "/produtos"); await tituloProdutos(pC);
const carregandoCompras = await pC.locator("section[aria-busy]").first().isVisible();
await comprasTela.waitFor({ timeout: 10000 }).catch(() => {}); // a resposta atrasada chega antes de trocar a rota
await pC.unroute("**/api/pedidos/compras**");
await pC.route("**/api/pedidos/compras**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"x"}' }));
await pC.goto(B + "/produtos"); await tituloProdutos(pC);
await pC.getByText("Não foi possível carregar suas compras.").waitFor({ timeout: 15000 }).catch(() => {});
const erroCompras = await pC.getByText("Não foi possível carregar suas compras.").isVisible();
await pC.unroute("**/api/pedidos/compras**");
await pC.getByRole("button", { name: "Tentar de novo" }).first().click();
await comprasTela.waitFor({ timeout: 10000 }).catch(() => {});
ok("pedidos (tela): Suas compras com carregando e erro com Tentar de novo, que recarrega", carregandoCompras && erroCompras && await comprasTela.isVisible());
// o vendedor marca como enviado (com a cidade e o bairro do comprador)
const { c: ctxV, p: pV } = await contextoPed(vendA.email);
await pV.goto(B + "/produtos"); await tituloProdutos(pV);
const vendasTela = pV.getByRole("region", { name: "Suas vendas" });
await vendasTela.getByRole("button", { name: /Vaso tela E2E/ }).click();
const dVend = pV.getByRole("dialog", { name: "Pedido de Vaso tela E2E" });
await dVend.getByText("Campinas, Vila Teste").waitFor({ timeout: 8000 }).catch(() => {});
const localVisivel = await dVend.getByText("Campinas, Vila Teste").isVisible();
await dVend.getByRole("button", { name: "Marcar como enviado" }).click();
await dVend.getByText("Venda · Enviado").waitFor({ timeout: 8000 }).catch(() => {});
ok("pedidos (tela): o vendedor vê o comprador com cidade e bairro e marca como enviado", localVisivel && await dVend.getByText("Venda · Enviado").isVisible());
await ctxV.close();
// o comprador fala com o vendedor e confirma o recebimento
await pC.goto(B + "/produtos"); await tituloProdutos(pC);
await comprasTela.getByRole("button", { name: /Vaso tela E2E/ }).click();
const dComp = pC.getByRole("dialog", { name: "Pedido de Vaso tela E2E" });
await dComp.getByRole("button", { name: "Falar com o vendedor" }).waitFor({ timeout: 8000 }).catch(() => {});
const [abaPed] = await Promise.all([ctxC.waitForEvent("page", { timeout: 10000 }), dComp.getByRole("button", { name: "Falar com o vendedor" }).click()]);
await abaPed.waitForURL("https://wa.me/**", { timeout: 10000 }).catch(() => {});
ok("pedidos (tela): Falar com o vendedor no pedido abre o WhatsApp do vendedor", abaPed.url().startsWith("https://wa.me/5511966665544?text="), abaPed.url());
await abaPed.close();
const saldoVendT = saldoDe(vendA.email);
await dComp.getByRole("button", { name: "Confirmar recebimento" }).click();
await dComp.getByRole("button", { name: "Sim, confirmar" }).click();
await dComp.getByText("Compra · Concluído").waitFor({ timeout: 8000 }).catch(() => {});
ok("pedidos (tela): confirmar o recebimento, com confirmação, conclui e paga o vendedor", await dComp.getByText("Compra · Concluído").isVisible() &&
  saldoDe(vendA.email) === saldoVendT + 25);
await pC.keyboard.press("Escape");
// a Empresa cancela a venda do Livro pela tela
const { c: ctxB, p: pBt } = await contextoPed(vendB.email);
await pBt.goto(B + "/produtos"); await tituloProdutos(pBt);
await pBt.getByRole("region", { name: "Suas vendas" }).getByRole("button", { name: /Livro tela E2E/ }).click();
const dCanc = pBt.getByRole("dialog", { name: "Pedido de Livro tela E2E" });
const saldoCompT = saldoDe(compradorA.email);
await dCanc.getByRole("button", { name: "Cancelar pedido" }).click();
await dCanc.getByRole("button", { name: "Sim, cancelar" }).click();
await dCanc.getByText("Cancelado pelo vendedor").waitFor({ timeout: 8000 }).catch(() => {});
ok("pedidos (tela): o vendedor cancela, com confirmação; a linha do tempo diz quem cancelou e o comprador recebe o estorno",
  await dCanc.getByText("Cancelado pelo vendedor").isVisible() && saldoDe(compradorA.email) === saldoCompT + 35);
await ctxB.close();
// saldo insuficiente: Faltam N e o atalho para o extrato
const { c: ctx3, p: p3 } = await contextoPed(comprador3.email);
const d3 = await abrirProduto(p3, "Livro tela E2E");
await d3.getByRole("button", { name: "Comprar agora" }).click();
const dChk3 = p3.getByRole("dialog", { name: "Finalizar compra" });
await dChk3.getByText("Faltam 35 créditos para esta compra.").waitFor({ timeout: 8000 }).catch(() => {});
const faltam = await dChk3.getByText("Faltam 35 créditos para esta compra.").isVisible();
await dChk3.getByRole("button", { name: "Ver extrato" }).click();
await p3.getByRole("dialog", { name: "Extrato de créditos" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("pedidos (tela): saldo insuficiente mostra quanto falta e abre o extrato", faltam && await p3.getByRole("dialog", { name: "Extrato de créditos" }).isVisible());
await ctx3.close();
// carrinho com o localStorage bloqueado: funciona na sessão, sem quebrar
const { c: ctxBloq, p: pBloq } = await contextoPed(comprador2.email);
await ctxBloq.addInitScript(() => {
  for (const m of ["getItem", "setItem", "removeItem"]) Storage.prototype[m] = () => { throw new DOMException("bloqueado", "SecurityError"); };
});
const erros0 = pageErrors.length;
const dBloq = await abrirProduto(pBloq, "Livro tela E2E");
await dBloq.getByRole("button", { name: "Adicionar ao carrinho" }).click();
await pBloq.keyboard.press("Escape");
ok("pedidos (tela): com o localStorage bloqueado, o carrinho funciona na sessão e a página não quebra",
  (await carrinhoBtn(pBloq).getAttribute("aria-label")) === "Carrinho: 1 item" && pageErrors.length === erros0, pageErrors.slice(erros0).join(" | "));
await ctxBloq.close();
// estoque pela tela (D6): editar só o nome não manda o estoque; mudar o estoque manda o estoque e o lido
const { c: ctxE, p: pE6 } = await contextoPed(vendA.email);
const patches = []; pE6.on("request", (r) => r.method() === "PATCH" && r.url().includes("/api/produtos/") && patches.push(r.postDataJSON?.() ?? null));
const editarPelaTela = async (alterar) => {
  await pE6.goto(B + "/produtos"); await tituloProdutos(pE6);
  await pE6.getByRole("region", { name: "Seus produtos" }).getByRole("button", { name: /Estoque lido E2E/ }).click();
  await pE6.getByRole("dialog", { name: "Estoque lido E2E" }).getByRole("button", { name: "Editar" }).click();
  const dEd = pE6.getByRole("dialog", { name: "Editar produto" });
  await dEd.waitFor();
  await alterar(dEd);
  await dEd.getByRole("button", { name: "Salvar", exact: true }).click();
  await dEd.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
};
await editarPelaTela((d) => d.getByLabel("Descrição").fill("Descrição nova do produto de estoque lido"));
await editarPelaTela((d) => d.getByLabel("Estoque", { exact: true }).fill("8"));
ok("produtos (tela, D6): editar sem mexer no estoque não manda o estoque; mudar o estoque manda o estoque e o lido",
  patches.length === 2 && !("estoque" in (patches[0] ?? {})) && !("estoqueLido" in (patches[0] ?? {})) && patches[1]?.estoque === 8 && patches[1]?.estoqueLido === 6 &&
  estoqueDe(pS) === 8, JSON.stringify(patches));
await ctxE.close();
// outra conta no mesmo navegador começa com o carrinho vazio (o carrinho guardado é da conta anterior)
await ctxC.request.post(`${API}/api/auth/login`, { data: { email: terceiro.email, password: "senha123" } });
await pC.goto(B + "/produtos"); await tituloProdutos(pC);
await carrinhoBtn(pC).waitFor();
ok("pedidos (tela): outra conta no mesmo navegador começa com o carrinho vazio", (await carrinhoBtn(pC).getAttribute("aria-label")) === "Carrinho vazio");
await ctxC.close();
ok("pedidos (tela): console sem avisos nem erros", avisosPed.length === 0, avisosPed.slice(0, 3).join(" | "));

// privacidade (item f): telefone, e-mail e endereço das partes em nenhuma resposta de pedido nem do extrato
const segredos = ["97777-1212", "977771212", "966665544", "1144445555", compradorA.email, vendA.email, vendB.email, RUA_SECRETA, NUM_SECRETO, CEP_SECRETO, "04567890", COMPL_SECRETO];
const vazouPed = segredos.filter((t) => respostasPed.some((r) => r.includes(t)));
ok("pedidos: telefone, e-mail e endereço não aparecem em nenhuma resposta de pedido nem do extrato", vazouPed.length === 0 && respostasPed.length > 60,
  `${vazouPed} (${respostasPed.length} respostas)`);
// extrato x saldo para todos os usuários de teste, e os pedidos sem nenhuma parte (as contas saíram) apagados pelo id
const usuariosE2E = sql(`select email from "User" where email like 'e2e.%@example.com' and "profileComplete"`).split("\n").filter(Boolean);
ok("pedidos: extrato x saldo bate para todos os usuários de teste", usuariosE2E.every(extratoBate), usuariosE2E.filter((e) => !extratoBate(e)).join(","));
apagarDepois.push(...sql(`select id from "PedidoProduto" where "compradorId" is null and "vendedorId" is null`).split("\n").filter(Boolean)
  .filter((id) => [pedSai, pedSai2, pedY, pedZ, pedW].includes(id)));
if (apagarDepois.length) sql(`delete from "PedidoProduto" where id in (${apagarDepois.map((id) => `'${id}'`).join(",")})`);

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
ok("senha errada não exclui", (await dialog.getByRole("alert").textContent().catch(() => "")) === "Senha incorreta" && page.url().endsWith("/configuracoes"));
// com um pedido em andamento, a senha certa mostra o 409 e o diálogo continua aberto; cancelado o pedido, exclui
const tokenCliente = (await chamar("POST", "/auth/login", null, { email: "e2e.cliente@example.com", password: NOVA_SENHA })).corpo.accessToken;
const pAndCliente = (await chamar("POST", "/servicos", tokenCliente, pedido({ titulo: "Pedido em andamento do Cliente" }))).corpo.servico.id;
await chamar("POST", `/candidaturas/${(await candidatarB(pAndCliente, colabB)).corpo.candidatura.id}/aceitar`, tokenCliente);
await dialog.locator("input").fill(NOVA_SENHA); await confirmar.click();
await dialog.getByRole("alert").filter({ hasText: "em andamento" }).waitFor({ timeout: 8000 }).catch(() => {});
ok("com pedido em andamento, a senha certa mostra o aviso e não exclui", (await dialog.getByRole("alert").textContent().catch(() => "")) === MSG_ANDAMENTO &&
  await dialog.isVisible() && page.url().endsWith("/configuracoes"), await dialog.getByRole("alert").textContent().catch(() => ""));
await chamar("DELETE", `/servicos/${pAndCliente}`, tokenCliente);
await dialog.locator("input").fill(NOVA_SENHA); await confirmar.click();
await page.waitForURL("**/login?conta=excluida", { timeout: 10000 }).catch(() => {});
ok("senha certa exclui → login com aviso", page.url().endsWith("/login?conta=excluida"), page.url());

await outraAba.getByRole("button", { name: "Editar dados pessoais" }).click();
await outraAba.getByLabel("Nome completo").fill("Outro Nome"); await outraAba.getByRole("button", { name: "Salvar", exact: true }).click();
await outraAba.waitForURL("**/login", { timeout: 10000 }).catch(() => {});
ok("outra aba aberta cai no login ao editar", outraAba.url().endsWith("/login"), outraAba.url());
await outraAba.close();

await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await entrarComErro("incorretos");
ok("conta excluída não entra de novo", (await alertText()).includes("incorretos"), await alertText());

ok("sem erros de JavaScript na página", pageErrors.length === 0, pageErrors.join(" | "));
await browser.close();

console.log(`\n${results.passed} de ${results.passed + results.failed} passaram`);
if (results.failed) process.exitCode = 1;
