import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./client";

describe("api request headers", () => {
  beforeEach(() => {
    (globalThis.fetch as unknown) = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
  });

  it("omits Content-Type on a no-body DELETE (so Fastify doesn't 400)", async () => {
    await api.deleteNote("abc");
    const init = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.method).toBe("DELETE");
  });

  it("omits Content-Type on a no-body POST (favorite)", async () => {
    await api.favorite("abc");
    const init = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type when a body is present", async () => {
    await api.createNote({ title: "t" });
    const init = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});
