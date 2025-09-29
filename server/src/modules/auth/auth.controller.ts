import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { loginValidate, registerValidate } from "../../utils/validate.js";
import { User } from "../user/user.model.js";

// IMPORTANT: for refresh token rotation & blacklist support this controller
// assumes your User model has an optional `refreshTokens: string[]` field
// where you store valid refresh token JTIs (jti). If you don't have it yet,
// add it to the schema, e.g.:
// refreshTokens: [{ type: String }]

/* ----------------------------- Types / Config ---------------------------- */
interface AccessTokenPayload {
  sub: string; // user id
  id: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  sub: string;
  userId: string;
  tokenType: "refresh";
  iat: number;
  exp: number;
  jti: string;
}

const ACCESS_TOKEN_EXPIRES = 60 * 15; // 15 minutes (seconds)
const REFRESH_TOKEN_EXPIRES = 60 * 60 * 24 * 7; // 7 days (seconds)

if (!process.env.JWT_ACCESS_TOKEN || !process.env.JWT_REFRESH_TOKEN) {
  console.warn(
    "JWT secret env vars not found: make sure JWT_ACCESS_TOKEN and JWT_REFRESH_TOKEN are set."
  );
}

function generateAccessToken(user: any) {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    id: user._id.toString(),
    name: user.fullName || user.name || "",
    email: user.email || "",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES,
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN!);
}

function generateRefreshToken(user: any) {
  const jti = uuidv4();
  const payload: Omit<RefreshTokenPayload, "jti"> & { jti: string } = {
    sub: user._id.toString(),
    userId: user._id.toString(),
    tokenType: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES,
    jti,
  };
  return {
    token: jwt.sign(payload as any, process.env.JWT_REFRESH_TOKEN!),
    jti,
  };
}

const authController = {
  test: async (req: Request, res: Response) => {
    console.log("Rota Teste Acessada!");
    res.send("Hello World!");
  },

  login: async (req: Request, res: Response) => {
    const { error } = loginValidate(req.body);
    if (error?.details?.[0]?.message) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const email = (req.body.email || "").toLowerCase();
    const selectedUser = await User.findOne({ email });
    if (!selectedUser)
      return res.status(400).json({ message: "E-mail ou senha incorretos" });

    const passwordAndUserMatch = bcrypt.compareSync(
      req.body.password,
      selectedUser.password
    );
    if (!passwordAndUserMatch)
      return res.status(400).json({ message: "E-mail ou senha incorretos" });

    try {
      const accessToken = generateAccessToken(selectedUser);
      const { token: refreshToken, jti } = generateRefreshToken(selectedUser);

      // Persist refresh token JTI in user document for rotation / revocation support
      try {
        // initialize array if not present
        if (!Array.isArray(selectedUser.refreshTokens)) {
          selectedUser.refreshTokens = [] as string[];
        }
        selectedUser.refreshTokens.push(jti);
        await selectedUser.save();
      } catch (err) {
        console.warn("Could not persist refresh token jti to user:", err);
      }

      // Definir cookie do refresh token
      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_EXPIRES * 1000,
        path: "/",
      });

      // Remover senha da resposta
      const userResponse = {
        _id: selectedUser._id,
        fullName: selectedUser.fullName,
        phone: selectedUser.phone,
        cpf: selectedUser.cpf,
        dataNascimento: selectedUser.dataNascimento,
        genero: selectedUser.genero,
        cidade: selectedUser.cidade,
        estado: selectedUser.estado,
        cep: selectedUser.cep,
        email: selectedUser.email,
        perfil: selectedUser.perfil,
        createdAt: selectedUser.createdAt,
        updatedAt: selectedUser.updatedAt,
      };

      res.status(200).json({
        message: "Login realizado com sucesso",
        user: userResponse,
        accessToken,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao realizar login", error });
    }
  },

  registerCliente: async (req: Request, res: Response) => {
    const { error } = registerValidate(req.body);

    if (error?.details?.[0]?.message) {
      return res.status(400).json({ message: error.details[0].message });
    }

    if (req.body.email !== req.body.confirmEmail) {
      return res.status(400).json({ message: "Os emails não coincidem." });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "As senhas não coincidem." });
    }

    const email = req.body.email.toLowerCase();
    const selectedUser = await User.findOne({ email });
    if (selectedUser) {
      return res.status(409).json({ message: "Email já cadastrado!" });
    }
    if (!selectedUser) {
      const matchCPF = await User.findOne({ cpf: req.body.cpf });
      if (matchCPF)
        return res.status(409).json({ message: "CPF já cadastrado!" });
    }

    try {
      const hashed = await bcrypt.hash(req.body.password, 10);
      req.body.password = hashed;

      const userData = { ...req.body, perfil: "Cliente" };
      const user = await User.create(userData);

      const accessToken = generateAccessToken(user);
      const { token: refreshToken, jti } = generateRefreshToken(user);

      // Persist refresh token JTI
      try {
        if (!Array.isArray(user.refreshTokens))
          user.refreshTokens = [] as string[];
        user.refreshTokens.push(jti);
        await user.save();
      } catch (err) {
        console.warn("Could not persist refresh token jti to user:", err);
      }

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_EXPIRES * 1000,
        path: "/",
      });

      const userResponse = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(201).json({
        message: "Usuário criado com sucesso!",
        user: userResponse,
        accessToken,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao registrar usuário", error });
    }
  },

  registerColaborador: async (req: Request, res: Response) => {
    const { error } = registerValidate(req.body);

    if (error?.details?.[0]?.message) {
      return res.status(400).json({ message: error.details[0].message });
    }

    if (req.body.email !== req.body.confirmEmail) {
      return res.status(400).json({ message: "Os emails não coincidem." });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "As senhas não coincidem." });
    }

    const email = req.body.email.toLowerCase();
    const selectedUser = await User.findOne({ email });
    if (selectedUser) {
      return res.status(409).json({ message: "Email já cadastrado!" });
    }
    if (!selectedUser) {
      const matchCPF = await User.findOne({ cpf: req.body.cpf });
      if (matchCPF)
        return res.status(409).json({ message: "CPF já cadastrado!" });
    }

    try {
      const hashed = await bcrypt.hash(req.body.password, 10);

      const userData = {
        ...req.body,
        email: req.body.email.toLowerCase(),
        password: hashed,
        perfil: "Colaborador",
      };
      const user = await User.create(userData);

      const accessToken = generateAccessToken(user);
      const { token: refreshToken, jti } = generateRefreshToken(user);

      try {
        if (!Array.isArray(user.refreshTokens))
          user.refreshTokens = [] as string[];
        user.refreshTokens.push(jti);
        await user.save();
      } catch (err) {
        console.warn("Could not persist refresh token jti to user:", err);
      }

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_EXPIRES * 1000,
        path: "/",
      });

      const userResponse = {
        _id: user._id,
        name: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(201).json({
        message: "Usuário criado com sucesso!",
        user: userResponse,
        accessToken,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao registrar usuário", error });
    }
  },

  registerEmpresa: async (req: Request, res: Response) => {},

  // Refresh with rotation + jti validation
  refreshToken: async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        return res
          .status(401)
          .json({ message: "Refresh token não encontrado" });
      }

      // Verify signature first
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_TOKEN!
      ) as RefreshTokenPayload;

      if (decoded.tokenType !== "refresh") {
        return res.status(401).json({ message: "Token inválido" });
      }

      // Ensure the jti exists in user's stored tokens (rotation / revocation protection)
      const user = await User.findById(decoded.userId);
      if (!user)
        return res.status(401).json({ message: "Usuário não encontrado" });

      const storedTokens = Array.isArray(user.refreshTokens)
        ? user.refreshTokens
        : [];
      if (!decoded.jti || !storedTokens.includes(decoded.jti)) {
        // Possible reuse or token not issued by us
        // Clear cookie and reject
        res.clearCookie("refresh_token", { path: "/" });
        return res
          .status(401)
          .json({ message: "Refresh token inválido ou reutilizado" });
      }

      // Rotation: remove used jti and issue a new refresh token with new jti
      // Remove old jti
      user.refreshTokens = storedTokens.filter(
        (t: string) => t !== decoded.jti
      );

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const { token: newRefreshToken, jti: newJti } =
        generateRefreshToken(user);

      // Persist new jti
      user.refreshTokens.push(newJti);
      await user.save();

      // Set cookie with new refresh token
      res.cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: 'none',
        maxAge: REFRESH_TOKEN_EXPIRES * 1000,
        path: "/",
      });

      return res.json({
        accessToken: newAccessToken,
        message: "Token renovado com sucesso",
      });
    } catch (error: any) {
      console.warn("Refresh error:", error?.message || error);
      // remove cookie to be safe
      res.clearCookie("refresh_token", { path: "/" });
      return res.status(401).json({ message: "Refresh token inválido" });
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (refreshToken) {
        try {
          const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_TOKEN!
          ) as RefreshTokenPayload;
          // Remove jti from user stored tokens so it can't be reused
          const user = await User.findById(decoded.userId);
          if (user && Array.isArray(user.refreshTokens)) {
            user.refreshTokens = user.refreshTokens.filter(
              (t: string) => t !== decoded.jti
            );
            await user.save();
          }
        } catch (err) {
          // ignore invalid token during logout
        }
      }

      res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: 'none',
        path: "/",
      });
      return res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Erro ao realizar logout" });
    }
  },
};

export default authController;
