import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Cargamos .env.test para inyectar DATABASE_URL (BD aislada) en los workers.
const testEnv = loadEnv({ path: ".env.test" }).parsed ?? {};

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,
    env: { ...process.env, ...testEnv },
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/test/**",
        "src/**/__tests__/**",
        "src/index.ts",
      ],
      thresholds: {
        lines: 85,
        statements: 80,
        functions: 80,
        branches: 55,
      },
    },
  },
});
