import { z } from "zod";

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
  }),
  // Los IDs de better-auth NO son CUIDs → solo exigimos que el :id venga
  // presente cuando la ruta lo incluya (PATCH /admin/users/:id).
  params: z.object({ id: z.string().min(1).optional() }).optional(),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    roles: z.array(z.string()).default(["user"]),
  }),
});
