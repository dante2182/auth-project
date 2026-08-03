import { describe, it, expect } from "vitest";
import { api, registerUser, createPost } from "../test/helpers";

const MISSING_CUID = "cjld2cjxh0000qzrmn831i7rn";

describe("GET /api/posts", () => {
  it("devuelve una lista vacía al inicio", async () => {
    const res = await api().get("/api/posts");
    expect(res.status).toBe(200);
    expect(res.body.posts).toEqual([]);
  });

  it("lista solo posts publicados", async () => {
    const { cookie } = await registerUser();
    await createPost(cookie, { title: "Borrador", published: false });
    await createPost(cookie, { title: "Público", published: true });

    const res = await api().get("/api/posts");
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].title).toBe("Público");
  });

  it("no expone datos sensibles del autor", async () => {
    const { cookie } = await registerUser();
    await createPost(cookie, { title: "Con autor", published: true });
    const res = await api().get("/api/posts");
    expect(res.body.posts[0].author).not.toHaveProperty("emailVerified");
  });
});

describe("POST /api/posts", () => {
  it("crea un post autenticado", async () => {
    const { cookie, user } = await registerUser();
    const res = await createPost(cookie, {
      title: "Mi primer post",
      content: "Contenido de prueba",
      published: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.post.title).toBe("Mi primer post");
    expect(res.body.post.authorId).toBe(user!.id);
  });

  it("devuelve 401 sin autenticación", async () => {
    const res = await api().post("/api/posts").send({ title: "Sin auth" });
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si el título es demasiado corto", async () => {
    const { cookie } = await registerUser();
    const res = await createPost(cookie, { title: "ab" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/posts/:id", () => {
  it("obtiene un post por id", async () => {
    const { cookie } = await registerUser();
    const created = await createPost(cookie, { title: "Detalle", published: true });
    const res = await api().get(`/api/posts/${created.body.post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.post.title).toBe("Detalle");
  });

  it("devuelve 404 si el post no existe", async () => {
    const res = await api().get(`/api/posts/${MISSING_CUID}`);
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el id no es un CUID válido", async () => {
    const res = await api().get("/api/posts/not-a-cuid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/posts/:id", () => {
  it("edita el post propio", async () => {
    const { cookie } = await registerUser();
    const created = await createPost(cookie, { title: "Original" });
    const res = await api()
      .patch(`/api/posts/${created.body.post.id}`)
      .set("Cookie", cookie!)
      .send({ title: "Editado" });
    expect(res.status).toBe(200);
    expect(res.body.post.title).toBe("Editado");
  });

  it("devuelve 403 al editar el post de otro usuario", async () => {
    const { cookie } = await registerUser();
    const { cookie: otherCookie } = await registerUser();
    const created = await createPost(cookie, { title: "Ajeno" });
    const res = await api()
      .patch(`/api/posts/${created.body.post.id}`)
      .set("Cookie", otherCookie!)
      .send({ title: "Robado" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/posts/:id", () => {
  it("elimina el post propio", async () => {
    const { cookie } = await registerUser();
    const created = await createPost(cookie, { title: "A eliminar" });
    const res = await api()
      .delete(`/api/posts/${created.body.post.id}`)
      .set("Cookie", cookie!);
    expect(res.status).toBe(204);
  });

  it("devuelve 403 al eliminar el post de otro usuario", async () => {
    const { cookie } = await registerUser();
    const { cookie: otherCookie } = await registerUser();
    const created = await createPost(cookie, { title: "Ajeno" });
    const res = await api()
      .delete(`/api/posts/${created.body.post.id}`)
      .set("Cookie", otherCookie!);
    expect(res.status).toBe(403);
  });
});
