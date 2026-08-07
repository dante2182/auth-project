import { env } from "./env";
import { Redis } from "ioredis";

// Cliente Redis singleton, con el mismo patrón que database.ts: en desarrollo
// se reutiliza entre hot-reloads de tsx watch para no abrir cientos de sockets.
// Redis es el "secondary storage" de Better Auth: aquí viven las sesiones activas
// y los códigos de verificación, con TTL por expiración (Redis las borra solo).
const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    // Máximo de reintentos por comando: si Redis está caído, fallamos rápido
    // en vez de dejar peticiones colgadas esperando el límite de 20 reintentos.
    maxRetriesPerRequest: 2,
    // Backoff de reconexión: 100ms, 200ms, 400ms... hasta 2s de tope.
    retryStrategy: (times) => Math.min(times * 100, 2000),
  });

// ioredis emite "error" en cada fallo de conexión/reconexión. Sin un listener,
// Node lo trata como un evento no manejado y escupe montones de stack traces
// (los "Unhandled error event" que vimos). Aquí los capturamos en una línea.
redis.on("error", (error) => {
  console.error(`[redis] ${error.message}`);
});

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
