import {Router} from "express"
import authenticateToken from "../../utils/authentication.js";
import userController from "../../modules/user/user.controller.js";

const userRouter = Router();

userRouter.get("/", authenticateToken, userController.userData)

export default userRouter