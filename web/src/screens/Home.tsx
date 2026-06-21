import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { useAuth } from "../state/AuthContext";
import { api } from "../api/client";
import { relativeTime } from "../lib/time";
import { extractSnippet } from "../lib/snippet";
import type { Folder, Note } from "../types";

function formatDate(d: Date): string {
  const day = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const date = d.getDate();
  return `${day} · ${month} ${date}`;
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const { data: allNotes = [] } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => api.notes(),
  });

  const createNote = useMutation({
    mutationFn: () => api.createNote({}),
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ["folders"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate(`/note/${note.id}`);
    },
  });

  const firstName = user ? user.name.split(" ")[0] : "there";
  const dateStr = formatDate(new Date());
  const greetingText = greeting(firstName);

  // Sort notes by updatedAt desc, take first 3
  const recentNotes = [...allNotes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));
  const totalNotes = folders.reduce((sum, f) => sum + f.count, 0);

  return (
    <AppShell>
      {/* Top bar */}
      <div
        style={{
          padding: "18px 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              font: "500 11px/1 'JetBrains Mono', monospace",
              color: "var(--text-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {dateStr}
          </span>
          <span
            style={{
              font: "600 23px/1.2 'Schibsted Grotesk', sans-serif",
              color: "var(--text)",
            }}
          >
            {greetingText}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              font: "500 13px/1 'Schibsted Grotesk', sans-serif",
              cursor: "pointer",
            }}
          >
            <Filter size={14} strokeWidth={1.8} />
            Filter
          </button>
          <button
            onClick={() => createNote.mutate()}
            disabled={createNote.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--accent)",
              border: "none",
              color: "#1c1408",
              font: "600 13px/1 'Schibsted Grotesk', sans-serif",
              cursor: createNote.isPending ? "not-allowed" : "pointer",
              opacity: createNote.isPending ? 0.7 : 1,
            }}
          >
            New note
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "30px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {/* Recent notes section */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                font: "600 13px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Continue where you left off
            </span>
            <Link
              to="/"
              style={{
                font: "500 13px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--accent-text)",
                textDecoration: "none",
              }}
            >
              View all
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "18px",
            }}
          >
            {recentNotes.map((note) => {
              const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
              const snippet = extractSnippet(note.content);
              return (
                <Card
                  key={note.id}
                  onClick={() => navigate(`/note/${note.id}`)}
                  style={{ minHeight: "158px", padding: "18px", display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  {/* Folder dot + name */}
                  {folder && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: folder.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          font: "500 11.5px/1 'Schibsted Grotesk', sans-serif",
                          color: "var(--text-3)",
                        }}
                      >
                        {folder.name}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <div
                    style={{
                      font: "600 16px/1.35 'Newsreader', serif",
                      color: "var(--text)",
                      flex: 1,
                    }}
                  >
                    {note.title || "Untitled"}
                  </div>

                  {/* Snippet */}
                  {snippet && (
                    <div
                      style={{
                        font: "400 13px/1.5 'Schibsted Grotesk', sans-serif",
                        color: "var(--text-2)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {snippet}
                    </div>
                  )}

                  {/* Time */}
                  <div
                    style={{
                      font: "500 11.5px/1 'Schibsted Grotesk', sans-serif",
                      color: "var(--text-3)",
                      marginTop: "auto",
                    }}
                  >
                    {relativeTime(note.updatedAt)}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Folders section */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                font: "600 13px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Folders
            </span>
            <span
              style={{
                font: "500 12px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--text-3)",
              }}
            >
              {folders.length} folders · {totalNotes} notes
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "18px",
            }}
          >
            {folders.map((folder) => {
              const softBg = folder.color + "29";
              return (
                <Card
                  key={folder.id}
                  onClick={() => navigate(`/folder/${folder.id}`)}
                  style={{
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Folder icon row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: softBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: folder.color,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                      </svg>
                    </div>
                    <span
                      style={{
                        font: "500 12px/1 'JetBrains Mono', monospace",
                        color: "var(--text-3)",
                      }}
                    >
                      {folder.count}
                    </span>
                  </div>

                  {/* Folder name */}
                  <div
                    style={{
                      font: "600 16px/1.3 'Schibsted Grotesk', sans-serif",
                      color: "var(--text)",
                    }}
                  >
                    {folder.name}
                  </div>

                  {/* Description */}
                  {folder.description && (
                    <div
                      style={{
                        font: "400 12.5px/1.4 'Schibsted Grotesk', sans-serif",
                        color: "var(--text-3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {folder.description}
                    </div>
                  )}

                  {/* Tags from folder's notes — collect distinct */}
                  <FolderTagChips folderId={folder.id} notes={allNotes} />
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FolderTagChips({ folderId, notes }: { folderId: string; notes: Note[] }) {
  const folderNotes = notes.filter((n) => n.folderId === folderId);
  const tagSet = new Set<string>();
  for (const note of folderNotes) {
    for (const tag of note.tags) {
      tagSet.add(tag);
    }
  }
  const tags = Array.from(tagSet).slice(0, 2);
  if (tags.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {tags.map((tag) => (
        <Chip key={tag}>{tag}</Chip>
      ))}
    </div>
  );
}
