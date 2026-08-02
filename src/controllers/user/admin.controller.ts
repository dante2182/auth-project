import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { auth } from "../../auth/auth";
import { catchAsync } from "../../utils/catchAsync";
import { ApiError } from "../../utils/ApiError";

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
  });
  res.status(200).json({ success: true, users });
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new ApiError(404, "Usuario no encontrado");
  res.status(200).json({ success: true, user });
});

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, roles } = req.body;

  // Delegamos la creación real (y el hasheo del password) a better-auth,
  // así nunca manejamos contraseñas en texto plano nosotros mismos.
  const response = await auth.api.signUpEmail({
    body: { name, email, password },
    asResponse: true,
  });
  if (!response.ok) throw new ApiError(400, "No se pudo crear el usuario");
  const { user } = await response.json();

  await prisma.userRole.createMany({
    data: (roles as string[]).map((roleName: string) => ({
      userId: user.id,
      roleId: roleName,
    })),
    skipDuplicates: true,
  });

  res.status(201).json({ success: true, user });
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.status(200).json({ success: true, user });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
