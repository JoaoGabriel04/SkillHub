import { Router } from "express";
import authRouter from "./auth.route.js";
import userRouter from "./user.route.js";
import servicoRouter from "./servico.route.js";
import candidaturaRouter from "./candidatura.route.js";
import creditoRouter from "./credito.route.js";
import usuarioRouter from "./usuario.route.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/servicos", servicoRouter);
apiRouter.use("/candidaturas", candidaturaRouter);
apiRouter.use("/creditos", creditoRouter);
apiRouter.use("/usuarios", usuarioRouter);

export default apiRouter;
