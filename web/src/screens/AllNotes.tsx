import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { NoteCard } from "../components/NoteCard";
import { api } from "../api/client";
import type { Note } from "../types";

export default function AllNotes() {
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

      {/* Note grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 34px 32px" }}>
        {sorted.length === 0 && !isLoading ? (
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
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {sorted.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
