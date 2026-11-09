import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import produtoService from "./produto.service.js";
import { atualizarProdutoSchema, criarProdutoSchema, listarProdutosSchema } from "./produto.schema.js";

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[produto]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

// fotos enviadas pelo produtoFotosUpload (multipart); vazio quando o corpo é JSON
const fotos = (req: Request) => (req.files as Express.Multer.File[] | undefined) ?? [];

const produtoController = {
  listar: async (req: Request, res: Response) => {
    try {
      const filtros = listarProdutosSchema.parse(req.query);
      res.json(await produtoService.listar(req.userId!, filtros));
    } catch (err) { handleError(res, err); }
  },

  meus: async (req: Request, res: Response) => {
    try {
      res.json({ produtos: await produtoService.meus(req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  detalhe: async (req: Request, res: Response) => {
    try {
      res.json({ produto: await produtoService.detalhe(String(req.params.id), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  criar: async (req: Request, res: Response) => {
    try {
      const dados = criarProdutoSchema.parse(req.body ?? {});
      res.status(201).json({ produto: await produtoService.criar(req.userId!, dados, fotos(req)) });
    } catch (err) { handleError(res, err); }
  },

  atualizar: async (req: Request, res: Response) => {
    try {
      const dados = atualizarProdutoSchema.parse(req.body ?? {});
      res.json({ produto: await produtoService.atualizar(String(req.params.id), req.userId!, dados, fotos(req)) });
    } catch (err) { handleError(res, err); }
  },

  remover: async (req: Request, res: Response) => {
    try {
      await produtoService.remover(String(req.params.id), req.userId!);
      res.status(204).end();
    } catch (err) { handleError(res, err); }
  },

  contato: async (req: Request, res: Response) => {
    try {
      res.json(await produtoService.contato(String(req.params.id), req.userId!));
    } catch (err) { handleError(res, err); }
  },
};

export default produtoController;
