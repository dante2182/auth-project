import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { catchAsync } from "../../utils/catchAsync";
import { ApiError } from "../../utils/ApiError";

export const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    include: { author: true },
  });
  res.status(200).json({ success: true, posts });
});

export const getPost = catchAsync(async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { author: true },
  });
  if (!post) throw new ApiError(404, "Post no encontrado");
  res.status(200).json({ success: true, post });
});

export const createPost = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  const post = await prisma.post.create({
    data: { ...req.body, authorId: req.user.id },
  });
  res.status(201).json({ success: true, post });
});

export const updatePost = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new ApiError(404, "Post no encontrado");
  if (post.authorId !== req.user.id)
    throw new ApiError(403, "No puedes editar este post"); // el admin lo pisa en la ruta con requireRole
  const updated = await prisma.post.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.status(200).json({ success: true, post: updated });
});

export const deletePost = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new ApiError(404, "Post no encontrado");
  if (post.authorId !== req.user.id)
    throw new ApiError(403, "No puedes eliminar este post");
  await prisma.post.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
