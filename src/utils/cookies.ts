import type { Response as ExpressResponse } from "express";

export function forwardSetCookie(
  source: globalThis.Response,
  res: ExpressResponse,
) {
  const cookies = source.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    res.setHeader("Set-Cookie", cookies);
  }
}
