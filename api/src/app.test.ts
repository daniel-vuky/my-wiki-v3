import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

describe("app", () => {
  it("responds on /api/health", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
