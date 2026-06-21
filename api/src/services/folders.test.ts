import { describe, it, expect } from "vitest";
import { slugify } from "./folders";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Home Server Setup")).toBe("home-server-setup");
    expect(slugify("  R&D Ideas!! ")).toBe("r-d-ideas");
  });
});
