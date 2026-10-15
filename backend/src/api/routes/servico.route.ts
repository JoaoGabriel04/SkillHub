import { Router } from "express";
import servicoController from "../../modules/servico/servico.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const servicoRouter = Router();

servicoRouter.use(authenticate);

servicoRouter.get("/", servicoController.listar);
servicoRouter.get("/meus", servicoController.meus); // antes de /:id
servicoRouter.get("/:id", servicoController.detalhe);
servicoRouter.post("/", servicoController.criar);
servicoRouter.patch("/:id", servicoController.atualizar);
servicoRouter.delete("/:id", servicoController.cancelar);

export default servicoRouter;
