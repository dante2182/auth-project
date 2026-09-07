import { describe, it, expect } from "vitest";
import { api, uniqueEmail } from "../test/helpers";

// El beforeEach de setup.ts hace redis.flushdb() entre tests, así cada bloque
// parte con contadores a cero. Los límites se verifican martillando endpoints
// con umbrales bajos (login/register = 10 por ventana de 60s por IP).

describe("rate limit en POST /api/auth/login", () => {
  it("devuelve 429 en la petición 11 (máx 10 por ventana)", async () => {
    const { email } = { email: uniqueEmail() };
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(
        await api().post("/api/auth/login").send({ email, password: "incorrecta" }),
      );
    }
    const eleventh = await api()
      .post("/api/auth/login")
      .send({ email, password: "incorrecta" });

    for (const res of attempts) expect(res.status).toBe(401);
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.success).toBe(false);
    expect(eleventh.body.message).toBeDefined();
  });

  it("expone las cabeceras RateLimit-Limit y RateLimit-Remaining", async () => {
    const res = await api()
      .post("/api/auth/login")
      .send({ email: uniqueEmail(), password: "incorrecta" });
    expect(res.headers["ratelimit-limit"]).toBe("10");
    expect(Number(res.headers["ratelimit-remaining"])).toBe(9);
  });

  it("el contador se aísla por IP (x-forwarded-for)", async () => {
    // NOTA: se crea una petición nueva por intento; reutilizar el mismo objeto
    // supertest con .send() repetido no relanza las peticiones reales.
    const loginFrom = (ip: string) =>
      api().post("/api/auth/login").set("X-Forwarded-For", ip);

    for (let i = 0; i < 10; i++) {
      const res = await loginFrom("198.51.100.10").send({
        email: uniqueEmail(),
        password: "incorrecta",
      });
      expect(res.status).toBe(401);
    }
    const blocked = await loginFrom("198.51.100.10").send({
      email: uniqueEmail(),
      password: "incorrecta",
    });
    expect(blocked.status).toBe(429);

    // El mismo ataque desde OTRA IP no debe verse afectado (bucket independiente).
    const other = await api()
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.20")
      .send({ email: uniqueEmail(), password: "incorrecta" });
    expect(other.status).toBe(401);
  });
});

describe("rate limit en POST /api/auth/register", () => {
  it("devuelve 429 en la petición 11 (máx 10 por ventana)", async () => {
    const requests = [];
    for (let i = 0; i < 11; i++) {
      requests.push(
        await api()
          .post("/api/auth/register")
          .send({
            name: "Test User",
            email: uniqueEmail(),
            password: "password123",
          }),
      );
    }
    expect(requests.slice(0, 10).some((r) => r.status !== 201)).toBe(false);
    expect(requests[10].status).toBe(429);
    expect(requests[10].body.success).toBe(false);
  });
});