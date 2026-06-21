/**
 * Extract a plain-text snippet from a BlockNote JSON content string.
 * Walks all blocks' inline content text, joins them, and trims to ~140 chars.
 * Returns "" on any parse failure or empty content.
 */
export function extractSnippet(contentJson: string, maxLen = 140): string {
  try {
    const blocks: unknown[] = JSON.parse(contentJson);
    if (!Array.isArray(blocks)) return "";
    const parts: string[] = [];
    for (const block of blocks) {
      collectText(block as Record<string, unknown>, parts);
    }
    const text = parts.join(" ").trim().replace(/\s+/g, " ");
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  } catch {
    return "";
  }
}

function collectText(block: Record<string, unknown>, parts: string[]): void {
  // Collect from inline content array (each item may have a `.text` field)
  const content = block["content"];
  if (Array.isArray(content)) {
    for (const inline of content as Record<string, unknown>[]) {
      if (typeof inline["text"] === "string" && inline["text"]) {
        parts.push(inline["text"]);
      }
      // Some inline types nest further
      const inlineContent = inline["content"];
      if (Array.isArray(inlineContent)) {
        for (const nested of inlineContent as Record<string, unknown>[]) {
          if (typeof nested["text"] === "string" && nested["text"]) {
            parts.push(nested["text"]);
          }
        }
      }
    }
  }
  // Recurse into children blocks
  const children = block["children"];
  if (Array.isArray(children)) {
    for (const child of children as Record<string, unknown>[]) {
      collectText(child, parts);
    }
  }
}
