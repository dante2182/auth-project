import { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, AuthSession, AuthUser } from "../auth/auth";
import { ApiError } from "../utils/ApiError";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: AuthSession["session"];
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) throw new ApiError(401, "No autenticado");
    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    next(error);
  }
};
