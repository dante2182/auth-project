import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true })); // credentials:true = necesario para que la cookie viaje

app.use(express.json());

app.get("/", (req: Request, res: Response) => res.send("Hello World!"));

app.use("/api", routes);

app.use(errorHandler); // siempre al final

export default app;
