import { describe, it, expect } from "vitest";
import { ApiError } from "../ApiError";

describe("ApiError", () => {
  it("crea un error con statusCode y message", () => {
    const err = new ApiError(404, "No encontrado");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("No encontrado");
    expect(err.name).toBe("ApiError");
  });

  it("mantiene el stack de Error", () => {
    const err = new ApiError(500, "error interno");
    expect(err.stack).toBeDefined();
  });
});
