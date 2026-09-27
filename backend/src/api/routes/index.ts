import { Router } from "express";
import authRouter from "./auth.route.js";
import userRouter from "./user.route.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);

export default apiRouter;
