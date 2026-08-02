import { Router } from "express";
import * as userController from "../controllers/user/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateUserSchema } from "../schemas/user.schema";

const router = Router();

router.use(requireAuth);

router.get("/me", userController.getMe);
router.patch("/me", validate(updateUserSchema), userController.updateMe);
router.delete("/me", userController.deleteMe);

export default router;
