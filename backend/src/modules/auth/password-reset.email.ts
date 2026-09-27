// E-mail de "esqueci a senha". HTML com estilos inline (clientes de e-mail ignoram <style>) + versão texto.
export function passwordResetEmail(name: string, link: string, validMinutes: number) {
  const firstName = name.split(" ")[0];
  const text = [
    `Olá, ${firstName}!`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta SkillHub.",
    `Abra o link abaixo para criar uma nova senha (válido por ${validMinutes} minutos):`,
    "",
    link,
    "",
    "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#101010;font-family:Arial,Helvetica,sans-serif;color:#d8d8d8">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#1c1c1c;border:1px solid #2e2e2e;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#ffffff">SkillHub</p>
        <p style="margin:24px 0 0;font-size:16px;color:#ffffff">Olá, ${escapeHtml(firstName)}!</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.5">
          Recebemos um pedido para redefinir a senha da sua conta. Clique no botão para criar uma nova senha.
        </p>
        <p style="margin:28px 0">
          <a href="${link}" style="display:inline-block;padding:12px 28px;border:1px solid #f4f4f5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">
            Redefinir senha
          </a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#9f9f9f">
          O link vale por ${validMinutes} minutos e só pode ser usado uma vez.<br>
          Se não foi você, ignore este e-mail: sua senha continua a mesma.
        </p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6f6f6f;word-break:break-all">
          Se o botão não funcionar, copie este endereço no navegador:<br>${link}
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject: "Redefinição de senha — SkillHub", text, html };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
