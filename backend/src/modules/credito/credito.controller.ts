import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import creditoService from "./credito.service.js";
import { extratoSchema } from "./credito.schema.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[credito]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const creditoController = {
  extrato: async (req: Request, res: Response) => {
    try {
      res.json(await creditoService.extrato(req.userId!, extratoSchema.parse(req.query)));
    } catch (err) { handleError(res, err); }
  },
};

export default creditoController;
