import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import servicoService from "./servico.service.js";
import { atualizarServicoSchema, criarServicoSchema, listarServicosSchema } from "./servico.schema.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[servico]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const servicoController = {
  listar: async (req: Request, res: Response) => {
    try {
      const filtros = listarServicosSchema.parse(req.query);
      res.json(await servicoService.listar(req.userId!, filtros));
    } catch (err) { handleError(res, err); }
  },

  meus: async (req: Request, res: Response) => {
    try {
      res.json({ servicos: await servicoService.meus(req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  detalhe: async (req: Request, res: Response) => {
    try {
      res.json({ servico: await servicoService.detalhe(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  criar: async (req: Request, res: Response) => {
    try {
      const dados = criarServicoSchema.parse(req.body ?? {});
      res.status(201).json({ servico: await servicoService.criar(req.userId!, dados) });
    } catch (err) { handleError(res, err); }
  },

  atualizar: async (req: Request, res: Response) => {
    try {
      const dados = atualizarServicoSchema.parse(req.body ?? {});
      res.json({ servico: await servicoService.atualizar(String(req.params.id), req.userId!, dados) });
    } catch (err) { handleError(res, err); }
  },

  concluir: async (req: Request, res: Response) => {
    try {
      res.json({ servico: await servicoService.concluir(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  cancelar: async (req: Request, res: Response) => {
    try {
      res.json({ servico: await servicoService.cancelar(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },
};

export default servicoController;
