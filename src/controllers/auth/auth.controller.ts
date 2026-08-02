import { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { catchAsync } from "../../utils/catchAsync";
import { forwardSetCookie } from "../../utils/cookies";
import { auth } from "../../auth/auth";

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const response = await auth.api.signUpEmail({
    body: { name, email, password },
    asResponse: true, // pedimos un Response nativo para poder leer/reenviar las cookies
  });
  forwardSetCookie(response, res);
  const data = await response.json();
  res.status(201).json({ success: true, user: data.user });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  forwardSetCookie(response, res);
  const data = await response.json();
  res.status(200).json({ success: true, user: data.user });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const response = await auth.api.signOut({
    headers: fromNodeHeaders(req.headers), // necesita la cookie entrante para saber qué sesión cerrar
    asResponse: true,
  });
  forwardSetCookie(response, res);
  res
    .status(200)
    .json({ success: true, message: "Sesión cerrada correctamente" });
});

export const profile = catchAsync(async (req: Request, res: Response) => {
  // req.user ya viene poblado por el middleware requireAuth
  res.status(200).json({ success: true, user: req.user });
});
