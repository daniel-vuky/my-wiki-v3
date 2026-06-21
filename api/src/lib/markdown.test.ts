import { describe, it, expect } from "vitest";
import { blocksToPlaintext } from "./markdown";

describe("blocksToPlaintext", () => {
  it("flattens inline text across blocks", () => {
    const blocks = [
      { type: "heading", content: [{ type: "text", text: "Consensus" }] },
      { type: "paragraph", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] },
    ];
    expect(blocksToPlaintext(JSON.stringify(blocks))).toBe("Consensus\nHello world");
  });
  it("handles empty/invalid input", () => {
    expect(blocksToPlaintext("")).toBe("");
    expect(blocksToPlaintext("not json")).toBe("");
  });
  it("recurses into nested children", () => {
    const blocks = [{ type: "checkListItem", content: [{ type: "text", text: "Define failure model" }] }];
    expect(blocksToPlaintext(JSON.stringify(blocks))).toBe("Define failure model");
  });
});
