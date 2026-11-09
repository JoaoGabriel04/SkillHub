import { Router } from "express";
import pedidoController from "../../modules/pedido/pedido.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

// Fase 18B: checkout, consultas e o ciclo do pedido de produtos (créditos reservados até a confirmação).
const pedidoRouter = Router();

pedidoRouter.use(authenticate);

pedidoRouter.post("/", pedidoController.checkout);
pedidoRouter.get("/compras", pedidoController.compras); // antes de /:id
pedidoRouter.get("/vendas", pedidoController.vendas); // antes de /:id
pedidoRouter.get("/:id", pedidoController.detalhe);
pedidoRouter.post("/:id/enviar", pedidoController.enviar);
pedidoRouter.post("/:id/confirmar-recebimento", pedidoController.confirmarRecebimento);
pedidoRouter.post("/:id/cancelar", pedidoController.cancelar);
pedidoRouter.get("/:id/contato", pedidoController.contato);

export default pedidoRouter;
