import { Router } from "express";
import produtoController from "../../modules/produto/produto.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { produtoFotosUpload } from "../../configs/multer.js";

// Fase 18A: catálogo de produtos (loja). Publicar e editar aceitam multipart com as fotos.
const produtoRouter = Router();

produtoRouter.use(authenticate);

produtoRouter.get("/", produtoController.listar);
produtoRouter.get("/meus", produtoController.meus); // antes de /:id
produtoRouter.get("/:id", produtoController.detalhe);
produtoRouter.post("/", produtoFotosUpload, produtoController.criar);
produtoRouter.patch("/:id", produtoFotosUpload, produtoController.atualizar);
produtoRouter.delete("/:id", produtoController.remover);
produtoRouter.get("/:id/contato", produtoController.contato);

export default produtoRouter;
