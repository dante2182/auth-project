import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true })); // credentials:true = necesario para que la cookie viaje

app.use(express.json());

app.get("/", (req: Request, res: Response) => res.send("Hello World!"));

app.use("/api", routes);

// Endpoints HTTP propios de Better Auth (flujo OAuth de navegador):
//   POST /api/auth/sign-in/social, GET/POST /api/auth/callback/:provider,
//   GET /api/auth/get-session, GET /api/auth/ok, etc.
// toNodeHandler convierte req/res de Express al formato Web Request/Response
// que espera Better Auth (lee req.body si express.json() ya consumió el stream).
// Va DESPUÉS de las rutas propias para que /register, /login, /logout y /profile
// conserven prioridad y sus controladores personalizados.
// NOTA: se usa app.use en lugar de app.all("/api/auth/*", ...) porque Express 5
// (path-to-regexp v8) ya no acepta el wildcard "*" sin nombre.
app.use("/api/auth", toNodeHandler(auth));

// 404 para rutas no definidas (debe ir antes del errorHandler)
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});

app.use(errorHandler); // siempre al final

export default app;
