import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { catchAsync } from "../../utils/catchAsync";
import { ApiError } from "../../utils/ApiError";

export const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { roles: { include: { role: true } } },
  });
  res.status(200).json({ success: true, user });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body,
  });
  res.status(200).json({ success: true, user });
});

export const deleteMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "No autenticado");
  await prisma.user.delete({ where: { id: req.user.id } });
  res.status(204).send();
});
