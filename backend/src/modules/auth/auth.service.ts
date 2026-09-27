import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../../configs/mailer.js";
import { AppError } from "../../utils/AppError.js";
import { toSafeUser } from "../../utils/safeUser.js";
import userRepository from "../user/user.repository.js";
import passwordResetRepository from "./password-reset.repository.js";
import { passwordResetEmail } from "./password-reset.email.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import {
  registerEmpresaSchema,
  registerSchema,
  type RegisterEmpresaInput,
  type RegisterInput,
} from "./auth.schema.js";

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3000";
const RESET_TTL_MINUTES = 30;
const RESET_RESEND_INTERVAL_MS = 60_000; // no máximo um e-mail por minuto para a mesma conta
const INVALID_RESET_LINK = "Link inválido ou expirado. Peça um novo em \"Esqueceu a senha?\".";

// o banco guarda só o hash: quem ler a tabela não consegue usar os links
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// remember = false → cookie de sessão (some ao fechar o navegador)
function issueTokens(userId: string, remember = true) {
  return {
    accessToken: generateAccessToken({ sub: userId }),
    refreshToken: generateRefreshToken({ sub: userId, remember }),
    remember,
  };
}

async function registerPessoaFisica(data: RegisterInput, perfil: "Cliente" | "Colaborador") {
  registerSchema.parse(data);
  if (data.email !== data.confirmEmail) throw new AppError("Os emails não coincidem", 400);
  if (data.password !== data.confirmPassword) throw new AppError("As senhas não coincidem", 400);

  if (await userRepository.findByEmail(data.email.toLowerCase()))
    throw new AppError("Email já cadastrado", 409);
  if (await userRepository.findByCpf(data.cpf)) throw new AppError("CPF já cadastrado", 409);

  const { confirmEmail: _ce, confirmPassword: _cp, ...rest } = data;
  const user = await userRepository.create({
    ...rest,
    email: data.email.toLowerCase(),
    password: await bcrypt.hash(data.password, 10),
    perfil,
    profileComplete: true,
  });

  const userSafe = toSafeUser(user);
  return { user: userSafe, ...issueTokens(user.id) };
}

const authService = {
  registerCliente: (data: RegisterInput) => registerPessoaFisica(data, "Cliente"),

  registerColaborador: (data: RegisterInput) => registerPessoaFisica(data, "Colaborador"),

  registerEmpresa: async (data: RegisterEmpresaInput) => {
    registerEmpresaSchema.parse(data);
    if (data.email !== data.confirmEmail) throw new AppError("Os emails não coincidem", 400);
    if (data.password !== data.confirmPassword) throw new AppError("As senhas não coincidem", 400);

    if (await userRepository.findByEmail(data.email.toLowerCase()))
      throw new AppError("Email já cadastrado", 409);
    if (await userRepository.findByCnpj(data.cnpj)) throw new AppError("CNPJ já cadastrado", 409);

    const { confirmEmail: _ce, confirmPassword: _cp, ...rest } = data;
    const user = await userRepository.create({
      ...rest,
      email: data.email.toLowerCase(),
      password: await bcrypt.hash(data.password, 10),
      perfil: "Empresa",
      profileComplete: true,
    });

    const userSafe = toSafeUser(user);
    return { user: userSafe, ...issueTokens(user.id) };
  },

  login: async (email: string, password: string, remember = true) => {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user || !user.password) throw new AppError("E-mail ou senha incorretos", 400);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError("E-mail ou senha incorretos", 400);

    const userSafe = toSafeUser(user);
    return { user: userSafe, ...issueTokens(user.id, remember) };
  },

  refreshToken: async (cookieToken: string) => {
    let decoded: ReturnType<typeof verifyRefreshToken>;
    try {
      decoded = verifyRefreshToken(cookieToken);
    } catch {
      throw new AppError("Refresh token inválido", 401);
    }
    const user = await userRepository.findById(decoded.sub);
    if (!user) throw new AppError("Usuário não encontrado", 401);
    // sessão aberta antes da última troca de senha (comparação em segundos, a precisão do iat)
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
      throw new AppError("Sessão encerrada porque a senha foi alterada", 401);
    return issueTokens(user.id, decoded.remember);
  },

  // Sempre "dá certo" para quem chama: a resposta não revela se o e-mail tem conta.
  // O envio não é aguardado, para o tempo de resposta também não denunciar isso.
  forgotPassword: async (email: string) => {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) return;

    const latest = await passwordResetRepository.findLatestByUser(user.id);
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_RESEND_INTERVAL_MS) return;

    const token = randomBytes(32).toString("base64url");
    await passwordResetRepository.replaceForUser(
      user.id,
      hashToken(token),
      new Date(Date.now() + RESET_TTL_MINUTES * 60_000)
    );
    const link = `${CLIENT_URL}/redefinir-senha?token=${token}`;
    sendMail({ to: user.email, ...passwordResetEmail(user.fullName, link, RESET_TTL_MINUTES) }).catch((err) =>
      console.error(`[mail] falha ao enviar recuperação de senha para ${user.email}:`, err)
    );
  },

  // Para a tela de redefinição avisar logo ao abrir se o link não serve mais
  checkResetToken: async (token: string) => {
    const record = await passwordResetRepository.findByHash(hashToken(token));
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new AppError(INVALID_RESET_LINK, 400);
  },

  // Também serve para contas só com Google/Discord: provar o e-mail basta para criar uma senha.
  resetPassword: async (token: string, password: string) => {
    const record = await passwordResetRepository.findByHash(hashToken(token));
    if (!record) throw new AppError(INVALID_RESET_LINK, 400);
    const ok = await passwordResetRepository.consume(record.id, record.userId, await bcrypt.hash(password, 10));
    if (!ok) throw new AppError(INVALID_RESET_LINK, 400);
  },

  me: async (userId: string) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("Usuário não encontrado", 401);
    const userSafe = toSafeUser(user);
    return userSafe;
  },

  // --- OAuth ---

  async googleCallback(code: string) {
    const profile = await exchangeGoogleCode(code);
    const user = await findOrLinkGoogleUser(profile);
    const userSafe = toSafeUser(user);
    return { user: userSafe, ...issueTokens(user.id) };
  },

  async discordCallback(code: string) {
    const profile = await exchangeDiscordCode(code);
    const user = await findOrLinkDiscordUser(profile);
    const userSafe = toSafeUser(user);
    return { user: userSafe, ...issueTokens(user.id) };
  },
};

async function exchangeGoogleCode(code: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.API_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens: any = await tokenRes.json();
  if (!tokens.access_token) throw new AppError("Falha na autenticação com Google", 401);

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile: any = await profileRes.json();
  if (!profile.email) throw new AppError("Google não forneceu email", 400);
  return { providerId: profile.id as string, email: profile.email.toLowerCase(), name: profile.name as string };
}

async function findOrLinkGoogleUser(profile: { providerId: string; email: string; name: string }) {
  const byGoogleId = await userRepository.findByGoogleId(profile.providerId);
  if (byGoogleId) return byGoogleId;

  const byEmail = await userRepository.findByEmail(profile.email);
  if (byEmail) return userRepository.linkGoogleId(byEmail.id, profile.providerId);

  return userRepository.create({
    email: profile.email,
    fullName: profile.name,
    perfil: null,
    profileComplete: false,
    googleId: profile.providerId,
  });
}

async function exchangeDiscordCode(code: string) {
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      redirect_uri: `${process.env.API_URL}/api/auth/discord/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens: any = await tokenRes.json();
  if (!tokens.access_token) throw new AppError("Falha na autenticação com Discord", 401);

  const profileRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile: any = await profileRes.json();
  if (!profile.email) throw new AppError("Discord não forneceu email", 400);
  return { providerId: profile.id as string, email: profile.email.toLowerCase(), name: profile.username as string };
}

async function findOrLinkDiscordUser(profile: { providerId: string; email: string; name: string }) {
  const byDiscordId = await userRepository.findByDiscordId(profile.providerId);
  if (byDiscordId) return byDiscordId;

  const byEmail = await userRepository.findByEmail(profile.email);
  if (byEmail) return userRepository.linkDiscordId(byEmail.id, profile.providerId);

  return userRepository.create({
    email: profile.email,
    fullName: profile.name,
    perfil: null,
    profileComplete: false,
    discordId: profile.providerId,
  });
}

export default authService;
