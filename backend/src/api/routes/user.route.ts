import { Router } from "express";
import userController from "../../modules/user/user.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { avatarUpload, curriculoUpload } from "../../configs/multer.js";

const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/", userController.getMe);
userRouter.patch("/", userController.updateProfile);
userRouter.delete("/", userController.deleteAccount);
userRouter.patch("/complete-profile", userController.completeProfile);
userRouter.post("/avatar", avatarUpload, userController.uploadAvatar);
userRouter.post("/curriculo", curriculoUpload, userController.uploadCurriculo);

export default userRouter;
