import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../auth.schema";

describe("registerSchema", () => {
  it("acepta datos válidos", () => {
    const result = registerSchema.parse({
      body: { name: "Ana", email: "ana@test.com", password: "password123" },
    });
    expect(result.body.email).toBe("ana@test.com");
  });

  it("rechaza una contraseña corta", () => {
    expect(() =>
      registerSchema.parse({
        body: { name: "Ana", email: "ana@test.com", password: "123" },
      }),
    ).toThrow();
  });

  it("rechaza un email inválido", () => {
    expect(() =>
      registerSchema.parse({
        body: { name: "Ana", email: "no-es-email", password: "password123" },
      }),
    ).toThrow();
  });
});

describe("loginSchema", () => {
  it("acepta datos válidos", () => {
    const result = loginSchema.parse({
      body: { email: "ana@test.com", password: "password123" },
    });
    expect(result.body.email).toBe("ana@test.com");
  });

  it("rechaza una contraseña vacía", () => {
    expect(() =>
      loginSchema.parse({ body: { email: "ana@test.com", password: "" } }),
    ).toThrow();
  });
});
