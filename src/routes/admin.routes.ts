import { Router } from "express";
import * as adminController from "../controllers/user/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema";

const router = Router();

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
