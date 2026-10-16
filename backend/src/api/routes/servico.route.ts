import { Router } from "express";
import servicoController from "../../modules/servico/servico.controller.js";
import candidaturaController from "../../modules/candidatura/candidatura.controller.js";
import avaliacaoController from "../../modules/avaliacao/avaliacao.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const servicoRouter = Router();

servicoRouter.use(authenticate);

servicoRouter.get("/", servicoController.listar);
servicoRouter.get("/meus", servicoController.meus); // antes de /:id
servicoRouter.get("/:id", servicoController.detalhe);
servicoRouter.post("/", servicoController.criar);
servicoRouter.patch("/:id", servicoController.atualizar);
servicoRouter.delete("/:id", servicoController.cancelar);
// Fase 17B: candidaturas a um pedido e conclusão
servicoRouter.post("/:id/candidaturas", candidaturaController.candidatar);
servicoRouter.get("/:id/candidaturas", candidaturaController.listarDoServico);
servicoRouter.post("/:id/concluir", servicoController.concluir);
// Fase 17D: avaliações entre as partes de um pedido concluído
servicoRouter.post("/:id/avaliacoes", avaliacaoController.avaliar);
servicoRouter.get("/:id/avaliacoes", avaliacaoController.doServico);

export default servicoRouter;
