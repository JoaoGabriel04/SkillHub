import jwt from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";

// Interface para o payload do token
interface TokenPayload {
  sub: string;
  id: string;
  name: string;
  email: string;
  age: number;
  iat: number;
  exp: number;
}

// Estender o Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso não encontrado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN!) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    // Tratamento mais específico de erros
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(401).json({ message: 'Erro de autenticação' });
  }
};

export default authenticateToken;