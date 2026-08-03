import { describe, it, expect, vi } from "vitest";
import { forwardSetCookie } from "../cookies";

const sourceResponse = (cookies: string[]) =>
  ({ headers: { getSetCookie: () => cookies } }) as unknown as Response;

const mockExpressResponse = () => {
  const res = { setHeader: vi.fn() };
  return res as unknown as Parameters<typeof forwardSetCookie>[1];
};

describe("forwardSetCookie", () => {
  it("reenvía las cookies de la respuesta de better-auth", () => {
    const res = mockExpressResponse();
    const cookies = ["better-auth.session_token=abc; Path=/; HttpOnly"];
    forwardSetCookie(sourceResponse(cookies), res);
    expect(res.setHeader).toHaveBeenCalledWith("Set-Cookie", cookies);
  });

  it("no hace nada si no hay cookies", () => {
    const res = mockExpressResponse();
    forwardSetCookie(sourceResponse([]), res);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
