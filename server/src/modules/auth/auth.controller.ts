import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { loginValidate, registerValidate } from "../../utils/validate.js";
import { User } from "../user/user.model.js";

function generateAccessToken(user: any) {
  const payload = {
    sub: user._id.toString(),
    id: user._id.toString(),
    name: user.fullName,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 15,
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN!);
}
function generateRefreshToken(user: any) {
  const payload = {
    sub: user._id.toString(),
    userId: user._id.toString(),
    tokenType: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    jti: uuidv4(),
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_TOKEN!);
}

const authController = {
  test: async (req: Request, res: Response) => {
    console.log("Rota Teste Acessada!")
    res.send("Hello World!");
  },
  login: async (req: Request, res: Response) => {
    const { error } = loginValidate(req.body);
    if (error?.details?.[0]?.message) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const email = req.body.email.toLowerCase();
    const selectedUser = await User.findOne({ email })
    if (!selectedUser) return res.status(400).json({ message: "E-mail ou senha incorretos" })

    const passwordAndUserMatch = bcrypt.compareSync(req.body.password, selectedUser.password)
    if (!passwordAndUserMatch) return res.status(400).json({ message: "E-mail ou senha incorretos" })
    
    try {

      const accessToken = generateAccessToken(selectedUser)
      const refreshToken = generateRefreshToken(selectedUser)

      // Definir cookie do refresh token
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true em produção
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        path: '/'
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
        updatedAt: selectedUser.updatedAt
      };

      res.status(200).json({
        message: "Login realizado com sucesso",
        user: userResponse,
        accessToken
      })
      
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao registrar usuário", error: error });
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
      const matchCPF = await User.findOne({cpf: req.body.cpf})
      if(matchCPF) return res.status(409).json({message: "CPF já cadastrado!"})
    }

    try {
      const hashed = await bcrypt.hash(req.body.password, 10);
      req.body.password = hashed;

      const userData = { ...req.body, perfil: "Cliente" };
      const user = await User.create(userData);

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
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
      res
        .status(500)
        .json({ message: "Erro ao registrar usuário", error: error });
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
      const matchCPF = await User.findOne({cpf: req.body.cpf})
      if(matchCPF) return res.status(409).json({message: "CPF já cadastrado!"})
    }

    try {
      const hashed = await bcrypt.hash(req.body.password, 10);

      const userData = {
        ...req.body,
        email: req.body.email.toLowerCase(),
        password: hashed,
        perfil: "Colaborador",
      };
      console.log(userData);
      const user = await User.create(userData);

      console.log(user);

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
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
      res.status(500).json({ message: "Erro ao registrar usuário", error: error });
    }
  },
  registerEmpresa: async (req: Request, res: Response) => {},
  refreshToken: async (req: Request, res: Response) => {
    res.send("Refresh");
  },
  logout: async (req: Request, res: Response) => {
    res.send("Logout");
  },
};

export default authController;
