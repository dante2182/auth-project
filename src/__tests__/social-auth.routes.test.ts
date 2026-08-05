import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type request from "supertest";
import { api, prisma } from "../test/helpers";

// =============================================================
// Tests de inicio de sesión con proveedores (GitHub y Google).
//
// Better Auth intercambia el código OAuth y obtiene el perfil del
// usuario llamando a los endpoints del proveedor a través de
// `globalThis.fetch` (vía @better-fetch/fetch). Aquí mockeamos ese
// fetch para simular al proveedor sin credenciales reales.
//
// Flujo que se prueba (igual que en el navegador):
//   1. POST /api/auth/sign-in/social  -> devuelve URL del proveedor + state
//   2. GET  /api/auth/callback/:provider?code=..&state=.. -> cookie de sesión
// =============================================================

// --- URLs reales de los proveedores (hardcodeadas en Better Auth) ---
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// --- Perfiles simulados de GitHub ---
const githubProfile = {
  id: 987654,
  login: "octocat",
  name: "Octo Cat",
  email: null, // GitHub no devuelve email en /user; se obtiene en /user/emails
  avatar_url: "https://avatars.githubusercontent.com/u/987654",
};

const githubEmails = [
  { email: "octo@github.com", primary: true, verified: true },
];

const githubProfileNoEmail = { ...githubProfile, email: null };

// --- Google: getUserInfo decodifica el id_token (no lo verifica en el code flow) ---
const base64Url = (obj: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");

const buildGoogleIdToken = (claims: Record<string, unknown>) => {
  const header = base64Url({ alg: "none", typ: "JWT" });
  const payload = base64Url(claims);
  const signature = base64Url({});
  return `${header}.${payload}.${signature}`;
};

const googleClaims = {
  iss: "https://accounts.google.com",
  sub: "google-user-123",
  email: "google.user@example.com",
  email_verified: true,
  name: "Google User",
  picture: "https://example.com/avatar.png",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

// Mock de fetch que responde a los endpoints del proveedor según la URL.
const mockOAuthFetch = (profile = githubProfile, emails = githubEmails) =>
  vi.fn(async (url: string | URL | Request) => {
    const u = typeof url === "string" ? url : url.toString();
    switch (u) {
      case GITHUB_TOKEN_URL:
        return json({
          access_token: "gho_test_token",
          token_type: "bearer",
          scope: "read:user,user:email",
        });
      case GITHUB_USER_URL:
        return json(profile);
      case GITHUB_EMAILS_URL:
        return json(emails);
      case GOOGLE_TOKEN_URL:
        return json({
          access_token: "ya29_test_token",
          id_token: buildGoogleIdToken(googleClaims),
          token_type: "Bearer",
          expires_in: 3600,
        });
      default:
        throw new Error(`fetch inesperado en tests: ${u}`);
    }
  });

// Extrae name=value de cada Set-Cookie para reenviarlos como Cookie header.
const cookieHeader = (setCookies: string | string[] | undefined): string => {
  if (!setCookies) return "";
  const list = Array.isArray(setCookies) ? setCookies : [setCookies];
  return list.map((c) => c.split(";")[0]).join("; ");
};

// Extrae la cookie de sesión (better-auth.session_token) de una respuesta.
const extractSessionCookie = (res: request.Response): string | undefined => {
  const setCookies = res.headers["set-cookie"];
  const list = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  return list.find((c) => c.startsWith("better-auth.session_token="));
};

// Paso 1: inicia el flujo OAuth y devuelve la respuesta con la URL y las cookies.
const startSocialSignIn = (provider: "github" | "google") =>
  api()
    .post("/api/auth/sign-in/social")
    .send({ provider, callbackURL: "/", disableRedirect: true });

// Flujo completo: sign-in social + callback, devolviendo la cookie de sesión.
const completeSocialSignIn = async (
  provider: "github" | "google",
  code = "mock_code",
) => {
  const start = await startSocialSignIn(provider);
  const state = new URL(start.body.url).searchParams.get("state");
  expect(state).toBeDefined();

  const callback = await api()
    .get(`/api/auth/callback/${provider}`)
    .query({ code, state })
    .set("Cookie", cookieHeader(start.headers["set-cookie"]))
    .redirects(0);

  return {
    start,
    callback,
    sessionCookie: extractSessionCookie(callback),
  };
};

beforeEach(() => {
  vi.stubGlobal("fetch", mockOAuthFetch());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/sign-in/social", () => {
  it("GitHub: devuelve la URL de autorización con state y la cookie de estado", async () => {
    const res = await startSocialSignIn("github");
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe(false);

    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(url.searchParams.get("state")).toBeTruthy();

    // La cookie de estado (better-auth.state) viaja al callback en el navegador.
    expect(cookieHeader(res.headers["set-cookie"])).toContain(
      "better-auth.state=",
    );
  });

  it("Google: devuelve la URL de autorización de Google con state", async () => {
    const res = await startSocialSignIn("google");
    expect(res.status).toBe(200);

    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("devuelve 404 para un proveedor no configurado", async () => {
    const res = await api()
      .post("/api/auth/sign-in/social")
      .send({ provider: "discord", callbackURL: "/" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/auth/callback/:provider (GitHub)", () => {
  it("crea el usuario, la cuenta OAuth y una sesión que funciona en /profile", async () => {
    const { callback, sessionCookie } = await completeSocialSignIn("github");

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe("/");
    expect(sessionCookie).toBeDefined();

    // El usuario existe en la BD con su cuenta vinculada a GitHub.
    const user = await prisma.user.findUnique({
      where: { email: githubEmails[0].email },
      include: { accounts: true },
    });
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Octo Cat");
    expect(user?.emailVerified).toBe(true);
    expect(user?.accounts).toHaveLength(1);
    expect(user?.accounts[0].providerId).toBe("github");
    expect(user?.accounts[0].accountId).toBe(String(githubProfile.id));

    // La cookie de sesión generada por OAuth sirve en las rutas protegidas.
    const profile = await api()
      .get("/api/auth/profile")
      .set("Cookie", sessionCookie!);
    expect(profile.status).toBe(200);
    expect(profile.body.user.email).toBe(githubEmails[0].email);
  });

  it("no duplica el usuario si inicia sesión dos veces con el mismo GitHub", async () => {
    const first = await completeSocialSignIn("github");
    const second = await completeSocialSignIn("github");

    const users = await prisma.user.findMany({
      where: { email: githubEmails[0].email },
    });
    expect(users).toHaveLength(1);
    expect(second.sessionCookie).toBeDefined();
    expect(first.sessionCookie?.split(";")[0]).not.toBe(
      second.sessionCookie?.split(";")[0],
    );
  });

  it("redirige a /error si el proveedor no devuelve email", async () => {
    vi.stubGlobal("fetch", mockOAuthFetch(githubProfileNoEmail, []));

    const start = await startSocialSignIn("github");
    const state = new URL(start.body.url).searchParams.get("state");
    const res = await api()
      .get("/api/auth/callback/github")
      .query({ code: "mock_code", state })
      .set("Cookie", cookieHeader(start.headers["set-cookie"]))
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=email_not_found");
    expect(extractSessionCookie(res)).toBeUndefined();
  });
});

describe("GET /api/auth/callback/:provider (Google)", () => {
  it("crea el usuario a partir del id_token y la sesión funciona", async () => {
    const { callback, sessionCookie } = await completeSocialSignIn("google");

    expect(callback.status).toBe(302);
    expect(sessionCookie).toBeDefined();

    const user = await prisma.user.findUnique({
      where: { email: googleClaims.email },
      include: { accounts: true },
    });
    expect(user).not.toBeNull();
    expect(user?.accounts[0].providerId).toBe("google");
    expect(user?.accounts[0].accountId).toBe(googleClaims.sub);

    const profile = await api()
      .get("/api/auth/profile")
      .set("Cookie", sessionCookie!);
    expect(profile.status).toBe(200);
    expect(profile.body.user.name).toBe("Google User");
  });
});

describe("validación del estado en el callback", () => {
  it("redirige a /error si el state no coincide con el guardado", async () => {
    const start = await startSocialSignIn("github");
    const res = await api()
      .get("/api/auth/callback/github")
      .query({ code: "mock_code", state: "state-invalido" })
      .set("Cookie", cookieHeader(start.headers["set-cookie"]))
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=state_mismatch");
    expect(extractSessionCookie(res)).toBeUndefined();
  });

  it("redirige a /error si falta el state", async () => {
    const res = await api()
      .get("/api/auth/callback/github")
      .query({ code: "mock_code" })
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=state_not_found");
  });
});
