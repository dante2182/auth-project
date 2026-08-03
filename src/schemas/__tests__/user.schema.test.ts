import { describe, it, expect } from "vitest";
import { updateUserSchema, createUserSchema } from "../user.schema";

describe("updateUserSchema", () => {
  it("acepta un :id de better-auth (que no es CUID)", () => {
    const result = updateUserSchema.parse({
      body: { name: "Ana" },
      params: { id: "better-auth-id-no-cuid" },
    });
    expect(result.params?.id).toBe("better-auth-id-no-cuid");
  });

  it("funciona sin :id (ruta /users/me)", () => {
    const result = updateUserSchema.parse({
      body: { name: "Ana" },
      params: {},
    });
    expect(result.params).toEqual({});
  });

  it("rechaza un body con email inválido", () => {
    expect(() =>
      updateUserSchema.parse({ body: { email: "no-email" }, params: {} }),
    ).toThrow();
  });
});

describe("createUserSchema", () => {
  it("usa 'user' como rol por defecto", () => {
    const result = createUserSchema.parse({
      body: { name: "Ana", email: "ana@test.com", password: "password123" },
    });
    expect(result.body.roles).toEqual(["user"]);
  });

  it("rechaza datos inválidos", () => {
    expect(() =>
      createUserSchema.parse({
        body: { name: "Ana", email: "no-email", password: "password123" },
      }),
    ).toThrow();
  });
});
