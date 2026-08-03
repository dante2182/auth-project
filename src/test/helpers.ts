import request from "supertest";
import app from "../app";
import { prisma } from "../config/database";

export { prisma };

export const api = () => request(app);

let emailCounter = 0;
export const uniqueEmail = () =>
  `user${++emailCounter}_${Date.now()}@test.com`;

export const defaultPassword = "password123";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function registerUser(
  overrides: Partial<RegisterInput> = {},
): Promise<{
  res: request.Response;
  user: { id: string; email: string; name: string } | undefined;
  cookie: string | undefined;
  email: string;
  password: string;
}> {
  const data: RegisterInput = {
    name: "Test User",
    email: uniqueEmail(),
    password: defaultPassword,
    ...overrides,
  };
  const res = await api().post("/api/auth/register").send(data);
  const cookie = res.headers["set-cookie"]?.[0] as string | undefined;
  return { res, user: res.body?.user, cookie, email: data.email, password: data.password };
}

export async function loginUser(email: string, password: string) {
  const res = await api().post("/api/auth/login").send({ email, password });
  const cookie = res.headers["set-cookie"]?.[0] as string | undefined;
  return { res, user: res.body?.user, cookie };
}

// Registra un usuario y le asigna el rol 'admin' (requiere roles sembrados).
export async function registerAdmin(
  overrides: Partial<RegisterInput> = {},
): Promise<{
  res: request.Response;
  user: { id: string; email: string; name: string } | undefined;
  cookie: string | undefined;
  email: string;
  password: string;
}> {
  const { res, user, cookie, email, password } = await registerUser({
    name: "Admin User",
    ...overrides,
  });
  if (!user) throw new Error("registerAdmin falló al registrar el usuario");

  const role = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!role) throw new Error("Rol 'admin' no encontrado (¿corrió el seed?)");

  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return { res, user, cookie, email, password };
}

// Crea un post vía HTTP con una sesión dada.
export async function createPost(
  cookie: string | undefined,
  body: { title: string; content?: string; published?: boolean },
) {
  return api().post("/api/posts").set("Cookie", cookie ?? "").send(body);
}
