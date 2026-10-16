import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import candidaturaService from "./candidatura.service.js";
import { candidatarSchema } from "./candidatura.schema.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[candidatura]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const candidaturaController = {
  candidatar: async (req: Request, res: Response) => {
    try {
      const dados = candidatarSchema.parse(req.body ?? {});
      res.status(201).json({ candidatura: await candidaturaService.candidatar(String(req.params.id), req.userId!, dados) });
    } catch (err) { handleError(res, err); }
  },

  listarDoServico: async (req: Request, res: Response) => {
    try {
      res.json({ candidaturas: await candidaturaService.listarDoServico(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  minhas: async (req: Request, res: Response) => {
    try {
      res.json({ candidaturas: await candidaturaService.minhas(req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  retirar: async (req: Request, res: Response) => {
    try {
      res.json({ candidatura: await candidaturaService.retirar(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  aceitar: async (req: Request, res: Response) => {
    try {
      res.json({ candidatura: await candidaturaService.aceitar(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },
};

export default candidaturaController;
