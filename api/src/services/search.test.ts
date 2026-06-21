import { describe, it, expect } from "vitest";
import { buildPrefixQuery } from "./search";

describe("buildPrefixQuery", () => {
  it("makes a single term a prefix match", () => {
    expect(buildPrefixQuery("hel")).toBe("hel:*");
  });
  it("ANDs multiple terms, each a prefix", () => {
    expect(buildPrefixQuery("distributed sys")).toBe("distributed:* & sys:*");
  });
  it("lowercases and strips tsquery-special characters", () => {
    expect(buildPrefixQuery("Foo, Bar!")).toBe("foo:* & bar:*");
  });
  it("returns empty string when there is no usable term", () => {
    expect(buildPrefixQuery("   ")).toBe("");
    expect(buildPrefixQuery("!@#")).toBe("");
  });
});
