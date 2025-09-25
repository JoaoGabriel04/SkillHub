import {Router} from "express"
import authController from "../../modules/auth/auth.controller.js";
const authRouter = Router();

authRouter.get("/test", authController.test)

authRouter.post("/login", authController.login)
authRouter.post("/register/cliente", authController.registerCliente)
authRouter.post("/register/colaborador", authController.registerColaborador)
authRouter.post("/refresh", authController.refreshToken)
authRouter.post("/logout", authController.logout)

export default authRouter     