// env (que carga dotenv) DEBE evaluarse antes que better-auth: el core de
// Better Auth cachea process.env.NODE_ENV al importarse, y sin dotenv previo
// NODE_ENV quedaría "" (ni development ni test) y el rate limiting no podría
// resolver la IP del cliente (sin fallback a localhost) → bucket compartido.
import { env } from "../config/env";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../config/database";
import { redis } from "../config/redis";
import { redisSecondaryStorage } from "./redis-secondary-storage";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // Postgres (Prisma) sigue siendo la fuente de verdad para User y Account.
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Redis como secondary storage: las sesiones activas y los códigos de
  // verificación se guardan aquí con TTL = expiración, así Redis las elimina
  // automáticamente al vencer. Las tablas `session`/`verification` de Postgres
  // quedan vacías e inactivas (por eso el schema no cambia).
  secondaryStorage: redisSecondaryStorage(redis),

  emailAndPassword: {
    enabled: true,
  },

  // Inicio de sesión con proveedores (GitHub y Google).
  // Las credenciales se leen de variables de entorno; nunca se hardcodean.
  // En tests se pasan valores dummy y el proveedor real se simula mockeando fetch.
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Permite el flujo OAuth desde el frontend (origen distinto al backend).
  // Sin esto, el origin-check de Better Auth podría rechazar el sign-in social
  // y el callbackURL enviado desde el navegador.
  trustedOrigins: [env.CORS_ORIGIN],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // duración real de la sesión: 7 días
    updateAge: 60 * 60 * 24, // renueva cada 1 día de uso
    cookieCache: {
      enabled: true, // 👈 faltaba
      strategy: "compact",
      maxAge: 60 * 5, // 👈 caché corto, no 7 días
    },
  },

  rateLimit: {
    // Desactivado en tests para que las suites de integración no fallen
    // al superar el máximo de peticiones por ventana.
    enabled: env.NODE_ENV !== "test",
    window: 60, // 👈 typo corregido
    max: 10,
    // Contadores en Redis (secondary-storage) en vez de en memoria: persistente
    // y compartido entre instancias. "secondary-storage" ya usa el adapter de
    // arriba vía su método `increment` (incr + expire atómico).
    storage: "secondary-storage",
    // Reglas por ruta (tienen prioridad sobre las reglas especiales de Better
    // Auth: /sign-in* es 3 por 10s y puede cortar el login social en pruebas).
    // "/sign-in/*" y "/callback/*" cubren el flujo OAuth (sign-in/social y
    // callback/:provider) con más margen para desarrollo y pruebas manuales.
    customRules: {
      "/sign-in/*": { window: 60, max: 30 },
      "/callback/*": { window: 60, max: 30 },
    },
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    // Resolución de la IP del cliente para el rate limiting. Better Auth lee
    // el header x-forwarded-for y recorta la cadena hasta el primer hop que no
    // esté en trustedProxies. TRUSTED_PROXIES viene por env (CSV) para que en
    // producción solo se cambien variables de entorno, sin tocar el código.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: env.TRUSTED_PROXIES.split(",")
        .map((ip) => ip.trim())
        .filter(Boolean),
    },
    // Solo si frontend y backend están en dominios distintos:
    // defaultCookieAttributes: {
    //   sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    //   secure: env.NODE_ENV === "production",
    // },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = (typeof auth.$Infer.Session)["user"];
