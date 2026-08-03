import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../config/database";
import { env } from "../config/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

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
    storage: "memory",
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    // Solo si frontend y backend están en dominios distintos:
    // defaultCookieAttributes: {
    //   sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    //   secure: env.NODE_ENV === "production",
    // },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = (typeof auth.$Infer.Session)["user"];
