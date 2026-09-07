import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";
import { env } from "../config/env";

// Proxies de confianza (CSV del env) para resolver la IP real del cliente desde
// x-forwarded-for, con el mismo criterio que Better Auth (auth.ts advanced.ipAddress).
const trustedProxies = env.TRUSTED_PROXIES.split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

// La IP se calcula una sola vez por request y se reutiliza.
// Solo si quien nos envía la petición es un proxy confiable (nuestro nginx,
// load balancer...) leemos x-forwarded-for; si es un cliente directo, cualquier
// header XFF es falsificable y no lo tenemos en cuenta.
const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const peer = req.ip ?? "";
  if (typeof forwarded === "string" && trustedProxies.includes(peer)) {
    // x-forwarded-for es "cliente, proxy1, proxy2..." de izquierda a derecha.
    // Recorremos los hops y devolvemos el primero que no sea un proxy confiable.
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    for (const hop of hops) {
      if (!trustedProxies.includes(hop)) return hop;
    }
  }
  return peer || "unknown";
};

interface RateLimitOptions {
  keyPrefix: string;
  window: number; // ventana en segundos (ventana FIJA desde el primer request)
  max: number; // máximo de requests permitidos por ventana
}

// Rate limiting distribuido en Redis con el patrón INCR + EXPIRE:
// si la clave no existe se crea con valor 1 y TTL (ventana fija desde el primer
// intento); si existe solo se incrementa y el TTL no se renueva. Es el mismo
// mecanismo que Better Auth usa vía secondary-storage, así varias instancias
// comparten los contadores sin estado en memoria.
export const rateLimit = (options: RateLimitOptions) => {
  const { keyPrefix, window, max } = options;
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.baseUrl + req.path = ruta completa SIN query string: así un atacante
      // no puede bypasear el límite variando parámetros (?page=1, ?page=2...).
      const key = `${keyPrefix}:${getClientIp(req)}:${req.baseUrl}${req.path}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, window);

      res.setHeader("RateLimit-Limit", max);
      res.setHeader("RateLimit-Remaining", Math.max(0, max - count));

      if (count > max) {
        res.setHeader("Retry-After", String(window));
        res.status(429).json({
          success: false,
          message: "Demasiadas peticiones, inténtalo de nuevo más tarde",
        });
        return;
      }

      next();
    } catch (error) {
      // Fail-open: si Redis cae, dejamos pasar la petición y lo logueamos en vez
      // de bloquear todo el API con 500s (Redis ya es crítico si se cae: sesiones).
      console.error("[rateLimit]", error);
      next();
    }
  };
};