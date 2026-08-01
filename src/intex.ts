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
