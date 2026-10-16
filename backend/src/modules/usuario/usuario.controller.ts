import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import usuarioService from "./usuario.service.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  console.error("[usuario]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const usuarioController = {
  resumo: async (req: Request, res: Response) => {
    try {
      res.json(await usuarioService.resumo(String(req.params.id)));
    } catch (err) { handleError(res, err); }
  },
};

export default usuarioController;
