import { describe, it, expect } from "vitest";
import { api, registerUser, loginUser, uniqueEmail } from "../test/helpers";

describe("rutas no definidas", () => {
  it("devuelve 404 JSON para rutas inexistentes", async () => {
    const res = await api().get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/register", () => {
  it("registra un usuario y devuelve 201 con cookie de sesión", async () => {
    const { res, user, cookie } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(user?.email).toBeDefined();
    expect(cookie).toBeDefined();
  });

  it("rechaza un email duplicado", async () => {
    const email = uniqueEmail();
    await registerUser({ email });
    const { res } = await registerUser({ email });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rechaza una contraseña corta (validación del schema)", async () => {
    const { res } = await registerUser({ password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rechaza un email inválido", async () => {
    const { res } = await registerUser({ email: "no-es-un-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("inicia sesión con credenciales válidas", async () => {
    const { email, password } = await registerUser();
    const { res, cookie } = await loginUser(email, password);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(cookie).toBeDefined();
  });

  it("rechaza credenciales inválidas", async () => {
    const { res } = await loginUser(uniqueEmail(), "password-incorrecta");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rechaza el login sin password", async () => {
    const { email } = await registerUser();
    const res = await api().post("/api/auth/login").send({ email });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/logout", () => {
  it("cierra la sesión autenticada", async () => {
    const { cookie } = await registerUser();
    const res = await api().post("/api/auth/logout").set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("devuelve 401 sin sesión", async () => {
    const res = await api().post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/profile", () => {
  it("devuelve el perfil del usuario autenticado", async () => {
    const { cookie, user } = await registerUser();
    const res = await api().get("/api/auth/profile").set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user?.id);
  });

  it("devuelve 401 sin autenticación", async () => {
    const res = await api().get("/api/auth/profile");
    expect(res.status).toBe(401);
  });
});
