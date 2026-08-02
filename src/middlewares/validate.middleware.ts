import { NextFunction, Request, Response } from "express";
import { ZodSchema, ZodError, input, output } from "zod";

export const validate =
  <T extends ZodSchema>(schema: T) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. parseAsync soporta validaciones asíncronas (refine, transform, etc.)
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as {
        body?: input<T> extends { body?: infer B } ? B : unknown;
        query?: input<T> extends { query?: infer Q } ? Q : unknown;
        params?: input<T> extends { params?: infer P } ? P : unknown;
      } & output<T>;

      // 2. Reasignamos SOLO si la propiedad existe y no es undefined.
      //    Esto evita romper Express cuando el esquema no define
      //    query/params y Zod los "strippea" a undefined.
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        req.query = parsed.query as Request["query"];
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params as Request["params"];
      }

      next();
    } catch (error) {
      // 3. Manejo explícito de errores de Zod
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Error de validación",
          errors: error,
        });
        return;
      }

      next(error);
    }
  };
