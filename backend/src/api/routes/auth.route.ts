import { Router } from "express";
import authController from "../../modules/auth/auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const authRouter = Router();

authRouter.post("/register/cliente", authController.registerCliente);
authRouter.post("/register/colaborador", authController.registerColaborador);
authRouter.post("/register/empresa", authController.registerEmpresa);
authRouter.post("/login", authController.login);
authRouter.post("/refresh", authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.post("/forgot-password", authController.forgotPassword);
authRouter.post("/reset-password/check", authController.checkResetToken);
authRouter.post("/reset-password", authController.resetPassword);
authRouter.get("/me", authenticate, authController.me);

authRouter.get("/google", authController.googleRedirect);
authRouter.get("/google/callback", authController.googleCallback);
authRouter.get("/discord", authController.discordRedirect);
authRouter.get("/discord/callback", authController.discordCallback);

export default authRouter;
