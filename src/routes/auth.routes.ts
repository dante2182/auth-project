import { Router } from "express";
import {
  register,
  login,
  logout,
  profile,
} from "../controllers/auth/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { rateLimit } from "../middlewares/rateLimit.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

// Límite estricto anti brute-force en registro y login (10 req/60s por IP).
// Los controladores llaman a auth.api.signInEmail()/signUpEmail() internamente,
// lo que bypasea el rate limiter interno de Better Auth (solo cubre sus rutas).
const authLimiter = rateLimit({ keyPrefix: "rl-auth", window: 60, max: 10 });

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/profile", requireAuth, profile);

export default router;
