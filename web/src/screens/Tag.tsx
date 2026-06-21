import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { NoteCard } from "../components/NoteCard";
import { api } from "../api/client";
import type { Note } from "../types";

export default function Tag() {
  const { name } = useParams<{ name: string }>();

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

      {/* Note grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 34px 32px" }}>
        {notes.length === 0 ? (
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
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
