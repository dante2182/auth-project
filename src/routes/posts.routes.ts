import { Router } from "express";
import * as postsController from "../controllers/posts/posts.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createPostSchema,
  updatePostSchema,
  postIdParamSchema,
} from "../schemas/post.schema";

const router = Router();

router.get("/", postsController.getAllPosts);
// /mine debe ir ANTES de /:id para que "mine" no pase por la validación de CUID.
router.get("/mine", requireAuth, postsController.getMyPosts);
// Validamos que :id sea un CUID antes de tocar la BD (evita 404 falsos, previene gasto de recursos)
router.get("/:id", validate(postIdParamSchema), postsController.getPost);
router.post(
  "/",
  requireAuth,
  validate(createPostSchema),
  postsController.createPost,
);
// updatePostSchema ya incluye params.id obligatorio (CUID) → no necesitamos postIdParamSchema aquí
router.patch(
  "/:id",
  requireAuth,
  validate(updatePostSchema),
  postsController.updatePost,
);
router.delete(
  "/:id",
  requireAuth,
  validate(postIdParamSchema),
  postsController.deletePost,
);

export default router;
