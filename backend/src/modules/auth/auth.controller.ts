import type { CookieOptions, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import authService from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerEmpresaSchema,
  registerSchema,
  resetPasswordSchema,
  resetTokenSchema,
} from "./auth.schema.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3000";
const API_URL = process.env.API_URL ?? "http://localhost:7000";

const cookieConfig: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// sem maxAge o navegador trata como cookie de sessão ("lembre de mim" desmarcado)
function setRefreshCookie(res: Response, refreshToken: string, remember = true) {
  const { maxAge: _m, ...sessionConfig } = cookieConfig;
  res.cookie("refresh_token", refreshToken, remember ? cookieConfig : sessionConfig);
}

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[auth]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

function parseBody(req: Request) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new AppError(
      "Corpo da requisição ausente ou mal formatado. Envie JSON com o header Content-Type: application/json.",
      400
    );
  }
  return req.body;
}

// login social redireciona pro front com o accessToken na query string —
// o front lê uma vez em /auth/callback e joga pra memória (nunca fica na URL depois disso)
function redirectWithToken(res: Response, accessToken: string, refreshToken: string, profileComplete: boolean) {
  setRefreshCookie(res, refreshToken);
  const setup = profileComplete ? "" : "&setup=1";
  res.redirect(`${CLIENT_URL}/auth/callback?token=${accessToken}${setup}`);
}

const authController = {
  registerCliente: async (req: Request, res: Response) => {
    try {
      const body = registerSchema.parse(parseBody(req));
      const { user, accessToken, refreshToken } = await authService.registerCliente(body);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, accessToken });
    } catch (err) { handleError(res, err); }
  },

  registerColaborador: async (req: Request, res: Response) => {
    try {
      const body = registerSchema.parse(parseBody(req));
      const { user, accessToken, refreshToken } = await authService.registerColaborador(body);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, accessToken });
    } catch (err) { handleError(res, err); }
  },

  registerEmpresa: async (req: Request, res: Response) => {
    try {
      const body = registerEmpresaSchema.parse(parseBody(req));
      const { user, accessToken, refreshToken } = await authService.registerEmpresa(body);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, accessToken });
    } catch (err) { handleError(res, err); }
  },

  login: async (req: Request, res: Response) => {
    try {
      const body = loginSchema.parse(parseBody(req));
      const { user, accessToken, refreshToken, remember } = await authService.login(
        body.email,
        body.password,
        body.remember
      );
      setRefreshCookie(res, refreshToken, remember);
      res.json({ user, accessToken });
    } catch (err) { handleError(res, err); }
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const cookieToken = req.cookies.refresh_token;
      if (!cookieToken) return res.status(401).json({ error: "Refresh token não encontrado" });
      const { accessToken, refreshToken, remember } = await authService.refreshToken(cookieToken);
      setRefreshCookie(res, refreshToken, remember);
      res.json({ accessToken });
    } catch (err) {
      res.clearCookie("refresh_token", { path: "/" });
      handleError(res, err);
    }
  },

  logout: async (_req: Request, res: Response) => {
    res.clearCookie("refresh_token", { path: "/" });
    res.json({ message: "Logout realizado com sucesso" });
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(parseBody(req));
      await authService.forgotPassword(email);
      res.json({ message: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha." });
    } catch (err) { handleError(res, err); }
  },

  checkResetToken: async (req: Request, res: Response) => {
    try {
      const { token } = resetTokenSchema.parse(parseBody(req));
      await authService.checkResetToken(token);
      res.json({ valid: true });
    } catch (err) { handleError(res, err); }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const { token, password } = resetPasswordSchema.parse(parseBody(req));
      await authService.resetPassword(token, password);
      // quem pediu a troca entra de novo com a senha nova; sessões antigas já não renovam
      res.clearCookie("refresh_token", { path: "/" });
      res.json({ message: "Senha redefinida. Entre com a nova senha." });
    } catch (err) { handleError(res, err); }
  },

  me: async (req: Request, res: Response) => {
    try {
      const user = await authService.me(req.userId!);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  googleRedirect: (_req: Request, res: Response) => {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", `${API_URL}/api/auth/google/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "email profile");
    res.redirect(url.toString());
  },

  googleCallback: async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      if (!code) throw new AppError("Código inválido", 400);
      const { user, accessToken, refreshToken } = await authService.googleCallback(code);
      redirectWithToken(res, accessToken, refreshToken, user.profileComplete);
    } catch (err) {
      console.error("[auth] google callback", err);
      res.redirect(`${CLIENT_URL}/auth/callback?error=google_falhou`);
    }
  },

  discordRedirect: (_req: Request, res: Response) => {
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID!);
    url.searchParams.set("redirect_uri", `${API_URL}/api/auth/discord/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");
    res.redirect(url.toString());
  },

  discordCallback: async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      if (!code) throw new AppError("Código inválido", 400);
      const { user, accessToken, refreshToken } = await authService.discordCallback(code);
      redirectWithToken(res, accessToken, refreshToken, user.profileComplete);
    } catch (err) {
      console.error("[auth] discord callback", err);
      res.redirect(`${CLIENT_URL}/auth/callback?error=discord_falhou`);
    }
  },
};

export default authController;
