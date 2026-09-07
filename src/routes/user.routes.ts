import { Router } from "express";
import * as userController from "../controllers/user/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rateLimit } from "../middlewares/rateLimit.middleware";
import { updateUserSchema } from "../schemas/user.schema";

const router = Router();

// Límite moderado para el API de usuarios (60 req/60s por IP).
router.use(rateLimit({ keyPrefix: "rl-users", window: 60, max: 60 }));
router.use(requireAuth);

router.get("/me", userController.getMe);
router.patch("/me", validate(updateUserSchema), userController.updateMe);
router.delete("/me", userController.deleteMe);

export default router;
