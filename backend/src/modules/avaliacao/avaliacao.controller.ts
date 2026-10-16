import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import avaliacaoService from "./avaliacao.service.js";
import { avaliarSchema, listarAvaliacoesSchema } from "./avaliacao.schema.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[avaliacao]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const avaliacaoController = {
  avaliar: async (req: Request, res: Response) => {
    try {
      const dados = avaliarSchema.parse(req.body ?? {});
      res.status(201).json({ avaliacao: await avaliacaoService.avaliar(String(req.params.id), req.userId!, dados) });
    } catch (err) { handleError(res, err); }
  },

  doServico: async (req: Request, res: Response) => {
    try {
      res.json({ avaliacoes: await avaliacaoService.doServico(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  doUsuario: async (req: Request, res: Response) => {
    try {
      res.json(await avaliacaoService.doUsuario(String(req.params.id), listarAvaliacoesSchema.parse(req.query)));
    } catch (err) { handleError(res, err); }
  },
};

export default avaliacaoController;
