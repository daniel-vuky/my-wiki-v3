import { describe, it, expect } from "vitest";
import { buildAuthUrl } from "./google";

describe("buildAuthUrl", () => {
  it("includes client id, redirect, scope, state", () => {
    const url = new URL(buildAuthUrl({
      clientId: "cid", redirectUri: "https://h/api/auth/google/callback", state: "xyz",
    }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("scope")).toContain("email");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});
