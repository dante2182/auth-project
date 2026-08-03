import { config as loadEnv } from "dotenv";
import { execSync } from "node:child_process";
import { Client } from "pg";

// Se ejecuta UNA VEZ antes de toda la suite de tests.
// 1. Carga .env.test (BD aislada).
// 2. Crea la base de datos si no existe.
// 3. Aplica migraciones y siembra roles + admin.
export default async function globalSetup() {
  loadEnv({ path: ".env.test", override: true });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL requerida en .env.test");

  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);
  url.pathname = "/postgres";

  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Base de datos de tests creada: ${dbName}`);
  }
  await client.end();

  execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
  execSync("pnpm tsx prisma/seed.ts", { stdio: "inherit" });
}
