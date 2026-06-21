import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "./blocknote-folio.css";
import { useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(s: string): any[] | undefined {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) && v.length ? v : undefined;
  } catch {
    return undefined;
  }
}

export function FolioEditor({
  initialContent,
  theme,
  onChange,
}: {
  initialContent: string;
  theme: "dark" | "light";
  onChange: (json: string) => void;
}) {
  // useCreateBlockNote options: initialContent accepts PartialBlock[] | undefined
  // Deviation from spec template: safeParse already returns PartialBlock[] | undefined
  // which matches the type exactly.
  const editor = useCreateBlockNote({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: safeParse(initialContent) as any,
  });

  const timer = useRef<number | undefined>(undefined);

  // Deviation from spec template:
  // BlockNoteView's onChange prop signature is:
  //   Parameters<BlockNoteEditor["onChange"]>[0]
  // i.e. (editor: BlockNoteEditor, context: { getChanges() }) => void
  // The spec template uses () => void which would be a type error.
  // We use the correct signature here: editor arg is used to access editor.document.
  // editor.document (getter) returns Block[] — the canonical way to get all blocks.
  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      onChange={(updatedEditor) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(
          () => onChange(JSON.stringify(updatedEditor.document)),
          600
        );
      }}
    />
  );
}
