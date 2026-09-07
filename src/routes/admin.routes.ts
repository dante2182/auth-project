import { Router } from "express";
import * as adminController from "../controllers/user/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rateLimit } from "../middlewares/rateLimit.middleware";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema";

const router = Router();

// Límite moderado para el API de administración (60 req/60s por IP). El max de
// admin es alto porque los paneles hacen barridos; la autorización real la da
// requireAuth + requireRole(admin).
router.use(rateLimit({ keyPrefix: "rl-admin", window: 60, max: 60 }));
router.use(requireAuth, requireRole("admin")); // protege TODAS las rutas de este archivo

router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUser);
router.post("/users", validate(createUserSchema), adminController.createUser);
router.patch(
  "/users/:id",
  validate(updateUserSchema),
  adminController.updateUser,
);
router.delete("/users/:id", adminController.deleteUser);

export default router;
