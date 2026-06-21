import { describe, it, expect } from "vitest";
import { relativeTime } from "./time";

describe("relativeTime", () => {
  const now = new Date("2026-06-21T12:00:00Z").getTime();
  it("formats recent times", () => {
    expect(relativeTime(new Date(now - 2 * 3600_000).toISOString(), now)).toBe("2h");
    expect(relativeTime(new Date(now - 30 * 60_000).toISOString(), now)).toBe("30m");
    expect(relativeTime(new Date(now - 26 * 3600_000).toISOString(), now)).toBe("Yesterday");
    expect(relativeTime(new Date(now - 3 * 86400_000).toISOString(), now)).toBe("3d");
    expect(relativeTime(new Date(now - 14 * 86400_000).toISOString(), now)).toBe("2w");
    expect(relativeTime(new Date(now - 30_000).toISOString(), now)).toBe("now");
  });
});
