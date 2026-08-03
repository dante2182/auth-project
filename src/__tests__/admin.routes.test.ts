import { describe, it, expect } from "vitest";
import {
  api,
  prisma,
  registerUser,
  registerAdmin,
  uniqueEmail,
} from "../test/helpers";

describe("protección por rol en /api/admin", () => {
  it("devuelve 401 sin autenticación", async () => {
    const res = await api().get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("devuelve 403 para un usuario sin rol admin", async () => {
    const { cookie } = await registerUser();
    const res = await api().get("/api/admin/users").set("Cookie", cookie!);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/users", () => {
  it("lista todos los usuarios como admin", async () => {
    const { cookie } = await registerAdmin();
    await registerUser();
    const res = await api().get("/api/admin/users").set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /api/admin/users/:id", () => {
  it("obtiene un usuario por id", async () => {
    const { cookie } = await registerAdmin();
    const { user: other } = await registerUser();
    const res = await api()
      .get(`/api/admin/users/${other!.id}`)
      .set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(other!.id);
  });

  it("devuelve 404 si el usuario no existe", async () => {
    const { cookie } = await registerAdmin();
    const res = await api()
      .get(`/api/admin/users/${uniqueEmail()}`)
      .set("Cookie", cookie!);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/users", () => {
  it("crea un usuario y le asigna el rol indicado", async () => {
    const { cookie } = await registerAdmin();
    const email = uniqueEmail();
    const res = await api()
      .post("/api/admin/users")
      .set("Cookie", cookie!)
      .send({ name: "Nuevo User", email, password: "password123", roles: ["user"] });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);

    const userRoles = await prisma.userRole.findMany({
      where: { userId: res.body.user.id },
      include: { role: true },
    });
    expect(userRoles.map((r) => r.role.name)).toContain("user");
  });

  it("devuelve 400 si el rol no existe", async () => {
    const { cookie } = await registerAdmin();
    const res = await api()
      .post("/api/admin/users")
      .set("Cookie", cookie!)
      .send({
        name: "Nuevo User",
        email: uniqueEmail(),
        password: "password123",
        roles: ["rol-inexistente"],
      });
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si el email ya está registrado", async () => {
    const { cookie } = await registerAdmin();
    const email = uniqueEmail();
    await registerUser({ email });
    const res = await api()
      .post("/api/admin/users")
      .set("Cookie", cookie!)
      .send({ name: "Dup", email, password: "password123", roles: ["user"] });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("actualiza los datos de un usuario", async () => {
    const { cookie } = await registerAdmin();
    const { user: other } = await registerUser();
    const res = await api()
      .patch(`/api/admin/users/${other!.id}`)
      .set("Cookie", cookie!)
      .send({ name: "Actualizado" });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Actualizado");
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("elimina un usuario", async () => {
    const { cookie } = await registerAdmin();
    const { user: other } = await registerUser();
    const res = await api()
      .delete(`/api/admin/users/${other!.id}`)
      .set("Cookie", cookie!);
    expect(res.status).toBe(204);

    const deleted = await prisma.user.findUnique({ where: { id: other!.id } });
    expect(deleted).toBeNull();
  });
});
