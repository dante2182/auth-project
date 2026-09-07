import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import adminRoutes from "./admin.routes";
import postsRoutes from "./posts.routes";
import { rateLimit } from "../middlewares/rateLimit.middleware";

const router = Router();

// Baseline distribuido anti-DoS para todo /api (lo demás aplica límites más
// estrictos por router: auth 10/min, posts/users/admin 60/min).
router.use(rateLimit({ keyPrefix: "rl-global", window: 60, max: 100 }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/posts", postsRoutes);

export default router;
