type Inline = { type: string; text?: string };
type Block = { type: string; content?: Inline[] | string; children?: Block[] };

function inlineText(content: Block["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((c) => c.text ?? "").join("");
}

export function blocksToPlaintext(json: string): string {
  let blocks: Block[];
  try { blocks = JSON.parse(json); } catch { return ""; }
  if (!Array.isArray(blocks)) return "";
  const lines: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      const t = inlineText(b.content);
      if (t) lines.push(t);
      if (Array.isArray(b.children)) walk(b.children);
    }
  };
  walk(blocks);
  return lines.join("\n");
}
