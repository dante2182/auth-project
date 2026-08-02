import { Router } from "express";
import {
  register,
  login,
  logout,
  profile,
} from "../controllers/auth/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/profile", requireAuth, profile);

export default router;
