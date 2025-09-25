import {Router} from "express"
import authRouter from "./auth.route.js";
import userRouter from "./user.route.js";
const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter)

export default apiRouter