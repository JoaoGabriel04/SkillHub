import nodemailer from "nodemailer";

// SMTP genérico: em dev o docker-compose aponta para o Mailpit (caixa de entrada em http://localhost:8025);
// em produção basta trocar as variáveis por um provedor real (Gmail com senha de app, Brevo, Resend...).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === "true", // true só na porta 465
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

const MAIL_FROM = process.env.MAIL_FROM ?? "SkillHub <nao-responda@skillhub.local>";

export async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  await transporter.sendMail({ from: MAIL_FROM, ...message });
}
