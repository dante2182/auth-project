import { describe, it, expect } from "vitest";
import {
  createPostSchema,
  updatePostSchema,
  postIdParamSchema,
} from "../post.schema";

const VALID_CUID = "cjld2cjxh0000qzrmn831i7rn";

describe("createPostSchema", () => {
  it("acepta un post válido", () => {
    const result = createPostSchema.parse({
      body: { title: "Hola mundo", content: "Contenido", published: true },
    });
    expect(result.body.title).toBe("Hola mundo");
  });

  it("rechaza un título demasiado corto", () => {
    expect(() =>
      createPostSchema.parse({ body: { title: "ab" } }),
    ).toThrow();
  });
});

describe("updatePostSchema", () => {
  it("acepta un :id CUID y body parcial", () => {
    const result = updatePostSchema.parse({
      body: { title: "Editado" },
      params: { id: VALID_CUID },
    });
    expect(result.body.title).toBe("Editado");
    expect(result.params.id).toBe(VALID_CUID);
  });

  it("rechaza un :id que no es CUID", () => {
    expect(() =>
      updatePostSchema.parse({ body: { title: "Editado" }, params: { id: "x" } }),
    ).toThrow();
  });
});

describe("postIdParamSchema", () => {
  it("acepta un CUID válido", () => {
    const result = postIdParamSchema.parse({ params: { id: VALID_CUID } });
    expect(result.params.id).toBe(VALID_CUID);
  });

  it("rechaza un id que no es CUID", () => {
    expect(() => postIdParamSchema.parse({ params: { id: "not-valid" } })).toThrow();
  });
});
