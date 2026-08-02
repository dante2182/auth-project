import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Datos inválidos",
      errors: err.flatten(),
    });
  }
  console.error(err);
  return res
    .status(500)
    .json({ success: false, message: "Error interno del servidor" });
};
