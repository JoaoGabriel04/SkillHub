import { Router } from "express";
import candidaturaController from "../../modules/candidatura/candidatura.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const candidaturaRouter = Router();

candidaturaRouter.use(authenticate);

candidaturaRouter.get("/minhas", candidaturaController.minhas);
candidaturaRouter.patch("/:id/retirar", candidaturaController.retirar);
candidaturaRouter.post("/:id/aceitar", candidaturaController.aceitar);

export default candidaturaRouter;
