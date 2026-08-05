// dotenv debe cargar ANTES que cualquier import de better-auth: el core de
// Better Auth lee y cachea process.env.NODE_ENV al evaluar su módulo, así que
// si .env se carga después, NODE_ENV queda "" → el rate limit no puede resolver
// la IP (sin fallback a localhost) y cae en un bucket compartido (warning + 429).
import "dotenv/config";
import app from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";

const startServer = async () => {
  try {
    await prisma.$connect();

    app.listen(env.PORT, () => {
      console.log("Servidor corriendo");
      console.log(`http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server");
    console.error(error);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Closing server...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void startServer();
