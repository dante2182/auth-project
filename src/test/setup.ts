import { beforeEach } from "vitest";
import { prisma } from "../config/database";
import { redis } from "../config/redis";

// Limpia los datos entre tests para que cada test parta de un estado conocido.
// NOTA: los roles (tabla Role) NO se limpian; el global-setup los siembra.
beforeEach(async () => {
  // Desde que Better Auth usa Redis como secondary storage, las sesiones y los
  // códigos de verificación viven en Redis, no en Postgres. flushdb limpia solo
  // el índice de tests (REDIS_URL apunta a /1), dejando intacto /0 de dev.
  await redis.flushdb();

  await prisma.post.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.account.deleteMany();
  // Las tablas session/verification de Postgres quedan vacías; los deleteMany
  // se conservan por si algún flujo las usa de respaldo en el futuro.
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
});
