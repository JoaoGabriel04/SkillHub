import { Router } from "express";
import avaliacaoController from "../../modules/avaliacao/avaliacao.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

// Fase 17D: dados públicos de outros usuários. "usuario", e não "user", para não se confundir
// com o módulo user (a conta do próprio usuário, /user), que não é tocado.
const usuarioRouter = Router();

usuarioRouter.use(authenticate);

usuarioRouter.get("/:id/avaliacoes", avaliacaoController.doUsuario);

export default usuarioRouter;
