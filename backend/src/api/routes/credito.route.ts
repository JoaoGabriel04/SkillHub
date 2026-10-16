import { Router } from "express";
import creditoController from "../../modules/credito/credito.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const creditoRouter = Router();

creditoRouter.use(authenticate);

creditoRouter.get("/extrato", creditoController.extrato);

export default creditoRouter;
