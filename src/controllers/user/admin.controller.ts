import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { auth } from "../../auth/auth";
import { catchAsync } from "../../utils/catchAsync";
import { ApiError } from "../../utils/ApiError";
import { getParam } from "../../utils/getParam";

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
  });
  res.status(200).json({ success: true, users });
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: getParam(req, "id") },
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

  // El body trae NOMBRES de roles → buscamos sus IDs en la BD.
  const roleRecords = await prisma.role.findMany({
    where: { name: { in: roles as string[] } },
  });
  const roleIdByName = new Map(roleRecords.map((r) => [r.name, r.id]));

  await prisma.userRole.createMany({
    data: (roles as string[]).map((roleName: string) => {
      const roleId = roleIdByName.get(roleName);
      if (!roleId) throw new ApiError(400, `Rol inválido: ${roleName}`);
      return { userId: user.id, roleId };
    }),
    skipDuplicates: true,
  });

  res.status(201).json({ success: true, user });
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: getParam(req, "id") },
    data: req.body,
  });
  res.status(200).json({ success: true, user });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: getParam(req, "id") } });
  res.status(204).send();
});
