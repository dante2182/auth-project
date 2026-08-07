import type { Redis } from "ioredis";

// Interfaz mínima que Better Auth espera de su "secondary storage".
// (El tipo oficial vive en @better-auth/core; lo replicamos aquí para no
// importar una dependencia transitiva no declarada en package.json.)
// Cualquier store con get/set/delete + TTL vale: Redis, Memcached, KV...
type SecondaryStorage = {
  get: (key: string) => Promise<unknown>;
  getAndDelete: (key: string) => Promise<unknown>;
  increment: (key: string, ttl: number) => Promise<number>;
  set: (key: string, value: string, ttl?: number) => Promise<unknown>;
  delete: (key: string) => Promise<void | string | null>;
};

// Convierte un cliente ioredis en el secondary storage de Better Auth.
// Better Auth escribe aquí las sesiones activas y los códigos de verificación;
// cada clave lleva TTL = tiempo restante de vida → Redis las elimina al expirar,
// sin necesidad de jobs de limpieza ni de la tabla `session` en Postgres.
export const redisSecondaryStorage = (
  redis: Redis,
): SecondaryStorage => ({
  get: async (key) => redis.get(key),

  // getdel: lee y borra en un solo comando atómico. Better Auth lo usa al
  // consumir códigos de un solo uso sin riesgo de carrera read-then-delete.
  getAndDelete: async (key) => redis.getdel(key),

  // incr + expire atómico para el rate limiting: si la clave no existe, se crea
  // con valor 1 y TTL; si existe, solo se incrementa (el TTL NO se renueva,
  // así la ventana es fija desde el primer intento).
  increment: async (key, ttl) => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttl);
    return count;
  },

  // "EX ttl" → expiración en segundos gestionada por Redis automáticamente.
  set: async (key, value, ttl) => {
    if (ttl !== undefined) return redis.set(key, value, "EX", ttl);
    return redis.set(key, value);
  },

  // del devuelve Promise<number>; lo mapeamos a void (el conteo no interesa).
  delete: async (key) => {
    await redis.del(key);
  },
});
