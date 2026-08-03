import { describe, it, expect } from "vitest";
import { api, prisma, registerUser } from "../test/helpers";

describe("GET /api/users/me", () => {
  it("devuelve el usuario autenticado con sus roles", async () => {
    const { cookie, user } = await registerUser();
    const res = await api().get("/api/users/me").set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user?.email);
    expect(Array.isArray(res.body.user.roles)).toBe(true);
  });

  it("devuelve 401 sin autenticación", async () => {
    const res = await api().get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/users/me", () => {
  it("actualiza el propio nombre", async () => {
    const { cookie } = await registerUser();
    const res = await api()
      .patch("/api/users/me")
      .set("Cookie", cookie!)
      .send({ name: "Nombre Actualizado" });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Nombre Actualizado");
  });

  it("rechaza un nombre inválido", async () => {
    const { cookie } = await registerUser();
    const res = await api()
      .patch("/api/users/me")
      .set("Cookie", cookie!)
      .send({ name: "A" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/me", () => {
  it("elimina la propia cuenta", async () => {
    const { cookie, user } = await registerUser();
    const res = await api().delete("/api/users/me").set("Cookie", cookie!);
    expect(res.status).toBe(204);

    const deleted = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(deleted).toBeNull();
  });

  it("devuelve 401 sin autenticación", async () => {
    const res = await api().delete("/api/users/me");
    expect(res.status).toBe(401);
  });
});
