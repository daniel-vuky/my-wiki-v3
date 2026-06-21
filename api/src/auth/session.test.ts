import { describe, it, expect } from "vitest";
import { newSessionToken, sessionRedisKey } from "./session";

describe("session helpers", () => {
  it("generates 64-hex-char tokens", () => {
    const t = newSessionToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(newSessionToken()).not.toBe(t);
  });
  it("namespaces redis keys", () => {
    expect(sessionRedisKey("abc")).toBe("session:abc");
  });
});
