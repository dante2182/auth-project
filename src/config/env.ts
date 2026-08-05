import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  // Credenciales OAuth para el inicio de sesión con proveedores (GitHub y Google).
  // Son obligatorias: si faltan, la app no arranca (fail-fast con mensaje claro).
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z
    .string()
    .min(1, "GITHUB_CLIENT_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1, "GOOGLE_CLIENT_SECRET is required"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  // Proxies de confianza para resolver la IP real del cliente (rate limiting).
  // CSV de IPs/CIDRs (mejor-auth usa el header x-forwarded-for). Por defecto
  // los proxies locales; en producción pones los rangos de tu host (Vercel,
  // Railway, nginx, Cloudflare...) sin cambiar el código.
  TRUSTED_PROXIES: z.string().default("::1,::ffff:127.0.0.1,127.0.0.1"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters"),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables");
    if (error instanceof z.ZodError) {
      console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
    }
    process.exit(1);
  }
};

export const env = parseEnv();
