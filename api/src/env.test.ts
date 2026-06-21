import { describe, it, expect } from "vitest";
import { parseEnv } from "./env.js";

describe("parseEnv", () => {
  it("parses required vars", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://x", REDIS_URL: "redis://x",
      SESSION_SECRET: "s".repeat(32), PUBLIC_BASE_URL: "https://h",
      GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(env.PUBLIC_BASE_URL).toBe("https://h");
    expect(env.ALLOWED_EMAILS).toEqual([]);
  });
  it("throws when a required var is missing", () => {
    expect(() => parseEnv({})).toThrow();
  });
  it("splits ALLOWED_EMAILS", () => {
    const env = parseEnv({
      DATABASE_URL: "x", REDIS_URL: "x", SESSION_SECRET: "s".repeat(32),
      PUBLIC_BASE_URL: "h", GOOGLE_CLIENT_ID: "i", GOOGLE_CLIENT_SECRET: "s",
      ALLOWED_EMAILS: "a@x.com, b@x.com",
    });
    expect(env.ALLOWED_EMAILS).toEqual(["a@x.com", "b@x.com"]);
  });
});
