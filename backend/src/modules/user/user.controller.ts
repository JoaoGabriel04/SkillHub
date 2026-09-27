import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../../utils/AppError.js";
import userService, { userNotFound } from "./user.service.js";
import { deleteAccountSchema, updateProfileSchema } from "./user.schema.js";
import { completeProfileSchema } from "../auth/auth.schema.js";

function handleError(res: Response, err: unknown) {
  // P2025: o update/delete não achou o registro — a conta do token não existe mais
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") err = userNotFound();
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(corpo da requisição)",
      message: issue.message,
    }));
    return res.status(400).json({ error: "Dados inválidos", details });
  }
  console.error("[user]", err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

const userController = {
  getMe: async (req: Request, res: Response) => {
    try {
      const user = await userService.getMe(req.userId!);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const body = updateProfileSchema.parse(req.body ?? {});
      const user = await userService.updateProfile(req.userId!, body);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  completeProfile: async (req: Request, res: Response) => {
    try {
      const body = completeProfileSchema.parse(req.body ?? {});
      const user = await userService.completeProfile(req.userId!, body);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  uploadAvatar: async (req: Request, res: Response) => {
    try {
      if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
      const user = await userService.uploadAvatar(req.userId!, req.file);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  uploadCurriculo: async (req: Request, res: Response) => {
    try {
      if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
      const user = await userService.uploadCurriculo(req.userId!, req.file);
      res.json({ user });
    } catch (err) { handleError(res, err); }
  },

  deleteAccount: async (req: Request, res: Response) => {
    try {
      const { password } = deleteAccountSchema.parse(req.body ?? {});
      await userService.deleteAccount(req.userId!, password);
      res.clearCookie("refresh_token", { path: "/" });
      res.status(204).end();
    } catch (err) { handleError(res, err); }
  },
};

export default userController;
