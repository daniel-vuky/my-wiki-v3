import { describe, it, expect } from "vitest";
import { cacheKey } from "./redis";

describe("cacheKey", () => {
  it("builds stable namespaced keys", () => {
    expect(cacheKey("folders", "user1")).toBe("folders:user1");
    expect(cacheKey("search", "user1", "q=hi&f=eng")).toBe("search:user1:q=hi&f=eng");
  });
});
