import { z } from "zod";

// Schema reutilizable para validar el param :id de cualquier ruta que involucre un Post
// Coincide con el modelo Prisma: Post.id  @id @default(cuid())
export const postIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid("El ID del post no es un CUID válido"),
  }),
});

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
    content: z.string().optional(),
    published: z.boolean().optional(),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    content: z.string().optional(),
    published: z.boolean().optional(),
  }),
  // OBLIGATORIO: la ruta es PATCH /posts/:id, Express garantiza que siempre exista
  params: z.object({
    id: z.string().cuid("El ID del post no es un CUID válido"),
  }),
});
