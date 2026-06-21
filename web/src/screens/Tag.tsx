import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { api } from "../api/client";
import { relativeTime } from "../lib/time";
import { extractSnippet } from "../lib/snippet";
import type { Note } from "../types";

export default function Tag() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["notes", "tag", name],
    queryFn: () => api.notes({ tag: name! }),
    enabled: !!name,
  });

  return (
    <AppShell>
      {/* Header */}
      <div style={{ padding: "26px 34px 0", flexShrink: 0 }}>
        <div
          style={{
            font: "500 12px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            marginBottom: "12px",
          }}
        >
          Tags /
        </div>

        <h1
          style={{
            font: "600 31px/1.2 'JetBrains Mono', monospace",
            color: "var(--accent-text)",
            margin: 0,
          }}
        >
          #{name}
        </h1>
        <div
          style={{
            font: "400 13.5px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            marginTop: "6px",
            paddingBottom: "18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </div>
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 34px 32px" }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {notes.map((note, idx) => (
            <NoteRow
              key={note.id}
              note={note}
              snippet={extractSnippet(note.content)}
              isLast={idx === notes.length - 1}
              onClick={() => navigate(`/note/${note.id}`)}
            />
          ))}
          {notes.length === 0 && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: "var(--text-3)",
                font: "400 13px/1 'Schibsted Grotesk', sans-serif",
              }}
            >
              No notes tagged #{name}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

interface NoteRowProps {
  note: Note;
  snippet: string;
  isLast: boolean;
  onClick: () => void;
}

function NoteRow({ note, snippet, isLast, onClick }: NoteRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "18px",
        padding: "15px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--border-soft)",
        cursor: "pointer",
        background: hovered ? "var(--surface-2)" : "transparent",
        transition: "background .12s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: "600 15.5px/1.3 'Newsreader', serif",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.title || "Untitled"}
        </div>
        {snippet && (
          <div
            style={{
              font: "400 13px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: "4px",
            }}
          >
            {snippet}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
        {note.tags.slice(0, 2).map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>

      <div
        style={{
          width: "78px",
          textAlign: "right",
          font: "500 12px/1 'Schibsted Grotesk', sans-serif",
          color: "var(--text-3)",
          flexShrink: 0,
        }}
      >
        {relativeTime(note.updatedAt)}
      </div>
    </div>
  );
}
