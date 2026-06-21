import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { api } from "../api/client";
import { relativeTime } from "../lib/time";
import { extractSnippet } from "../lib/snippet";
import type { Note } from "../types";

export default function AllNotes() {
  const navigate = useNavigate();

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["notes", "all"],
    queryFn: () => api.notes(),
  });

  const sorted = [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <AppShell>
      {/* Header */}
      <div
        style={{
          padding: "24px 34px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            font: "600 28px/1.2 'Newsreader', serif",
            color: "var(--text)",
            margin: 0,
          }}
        >
          All notes
        </h1>
        {!isLoading && (
          <div
            style={{
              font: "400 13.5px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
              marginTop: "6px",
            }}
          >
            {sorted.length} {sorted.length === 1 ? "note" : "notes"}
          </div>
        )}
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 34px 32px" }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {sorted.map((note, idx) => {
            const snippet = extractSnippet(note.content);
            const isLast = idx === sorted.length - 1;
            return (
              <NoteRow
                key={note.id}
                note={note}
                snippet={snippet}
                isLast={isLast}
                onClick={() => navigate(`/note/${note.id}`)}
              />
            );
          })}
          {sorted.length === 0 && !isLoading && (
            <div
              style={{
                padding: "40px 32px",
                textAlign: "center",
                color: "var(--text-3)",
                font: "400 13px/1 'Schibsted Grotesk', sans-serif",
              }}
            >
              No notes yet
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
      {/* Title + snippet */}
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

      {/* Tags */}
      <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
        {note.tags.slice(0, 2).map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>

      {/* Time */}
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
