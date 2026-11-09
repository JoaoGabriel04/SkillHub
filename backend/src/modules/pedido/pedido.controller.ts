import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import pedidoService from "./pedido.service.js";
import { checkoutSchema, listarPedidosSchema } from "./pedido.schema.js";

// Erros de pedido: os 409 do checkout levam o code e o produto (PRECO_ALTERADO, ESGOTADO, INDISPONIVEL,
// SALDO_INSUFICIENTE), para a tela apontar o que mudou.
function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message, ...err.extra });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  // conflito de escrita ou deadlock no banco: não deve acontecer com a ordem das travas (PLANO_18B, 3.4), mas se
  // acontecer é um 409 para tentar de novo, não um 500
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
    console.warn("[pedido] conflito de transação", err.message);
    return res.status(409).json({ error: "Outra operação mexeu neste pedido ao mesmo tempo. Tente de novo.", code: "CONFLITO" });
  }
  console.error("[pedido]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const id = (req: Request) => String(req.params.id);

const pedidoController = {
  checkout: async (req: Request, res: Response) => {
    try {
      const dados = checkoutSchema.parse(req.body ?? {});
      res.status(201).json({ pedidos: await pedidoService.checkout(req.userId!, dados) });
    } catch (err) { handleError(res, err); }
  },

  compras: async (req: Request, res: Response) => {
    try {
      res.json(await pedidoService.listar(req.userId!, "compradorId", listarPedidosSchema.parse(req.query)));
    } catch (err) { handleError(res, err); }
  },

  vendas: async (req: Request, res: Response) => {
    try {
      res.json(await pedidoService.listar(req.userId!, "vendedorId", listarPedidosSchema.parse(req.query)));
    } catch (err) { handleError(res, err); }
  },

  detalhe: async (req: Request, res: Response) => {
    try {
      res.json({ pedido: await pedidoService.detalhe(id(req), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  enviar: async (req: Request, res: Response) => {
    try {
      res.json({ pedido: await pedidoService.enviar(id(req), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  confirmarRecebimento: async (req: Request, res: Response) => {
    try {
      res.json({ pedido: await pedidoService.confirmarRecebimento(id(req), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  cancelar: async (req: Request, res: Response) => {
    try {
      res.json({ pedido: await pedidoService.cancelar(id(req), req.userId!) });
    } catch (err) { handleError(res, err); }
  },

  contato: async (req: Request, res: Response) => {
    try {
      res.json(await pedidoService.contato(id(req), req.userId!));
    } catch (err) { handleError(res, err); }
  },
};

export default pedidoController;
