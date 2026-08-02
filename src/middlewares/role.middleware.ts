import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/database";

export const requireRole =
  (...allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError(401, "No autenticado");

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });
      const roleNames = userRoles.map((ur) => ur.role.name);

      if (!allowedRoles.some((r) => roleNames.includes(r))) {
        throw new ApiError(403, "No tienes permisos para realizar esta acción");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
