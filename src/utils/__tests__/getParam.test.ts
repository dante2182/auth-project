import { describe, it, expect } from "vitest";
import { getParam } from "../getParam";
import { ApiError } from "../ApiError";

const req = (params: Record<string, string>) =>
  ({ params }) as Parameters<typeof getParam>[0];

describe("getParam", () => {
  it("devuelve el valor del parámetro", () => {
    expect(getParam(req({ id: "abc123" }), "id")).toBe("abc123");
  });

  it("lanza ApiError(400) si el parámetro falta", () => {
    let thrown: unknown;
    try {
      getParam(req({}), "id");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).statusCode).toBe(400);
  });
});
