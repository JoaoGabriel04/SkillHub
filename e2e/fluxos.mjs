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
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForTimeout(1000);
ok("senha antiga não entra mais", (await alertText()).includes("incorretos"), await alertText());
await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});
ok("entra com a senha nova", page.url().endsWith("/inicio"), page.url());

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
await page.setViewportSize({ width: 440, height: 956 });
await page.getByPlaceholder("Email").fill("e2e.cliente@example.com"); await page.getByPlaceholder("Senha").fill(NOVA_SENHA);
await page.getByRole("button", { name: "Entrar", exact: true }).click(); await page.waitForURL("**/inicio", { timeout: 8000 }).catch(() => {});

// 15e. Serviços (Fase 17A): API com os casos de erro, privacidade do autor, exclusão em cascata e a tela
const sql = (q) => execFileSync("docker", ["compose", "-f", COMPOSE_FILE, "exec", "-T", "postgres", "psql", "-U", "skillhub", "-d", "skillhub", "-tAc", q], { encoding: "utf8" }).trim();
const chamar = async (metodo, rota, token, corpo) => {
  const r = await fetch(`${API}/api${rota}`, {
    method: metodo,
    headers: { ...(corpo && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: corpo && JSON.stringify(corpo),
  });
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
await page.getByRole("button", { name: "Publicar" }).click();
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
await dialog.locator("input").fill(NOVA_SENHA); await confirmar.click();
await page.waitForURL("**/login?conta=excluida", { timeout: 10000 }).catch(() => {});
ok("senha certa exclui → login com aviso", page.url().endsWith("/login?conta=excluida"), page.url());

await outraAba.getByRole("button", { name: "Editar dados pessoais" }).click();
await outraAba.getByLabel("Nome completo").fill("Outro Nome"); await outraAba.getByRole("button", { name: "Salvar", exact: true }).click();
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
