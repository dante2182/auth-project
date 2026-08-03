import type { Request } from "express";
import { ApiError } from "./ApiError";

// Helper para leer un :param de Express con validación explícita.
export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new ApiError(400, `Parámetro ':${name}' requerido`);
  }
  return value;
}
