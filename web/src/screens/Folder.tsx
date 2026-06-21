import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { List, LayoutGrid, Plus } from "lucide-react";
import { Trash2 } from "../components/icons";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { FolderModal } from "../components/FolderModal";
import { api } from "../api/client";
import { relativeTime } from "../lib/time";
import { extractSnippet } from "../lib/snippet";
import type { Folder as FolderType, Note } from "../types";

export default function Folder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "grid">("grid");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [subfolderModalOpen, setSubfolderModalOpen] = useState(false);

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: () => api.deleteFolder(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["folders"] });
      void qc.invalidateQueries({ queryKey: ["notes"] });
      navigate("/");
    },
  });

  function handleDeleteFolder() {
    if (window.confirm("Delete this folder? Its subfolders are also deleted; notes inside become unfiled.")) {
      deleteFolderMutation.mutate();
    }
  }

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["notes", "folder", id],
    queryFn: () => api.notes({ folder: id }),
    enabled: !!id,
  });

  const folder = folders.find((f) => f.id === id);
  const subfolders = folders.filter((f) => f.parentId === id);

  // Collect distinct tags from all notes in this folder
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags))
  );

  // Filter notes by active tag
  const filteredNotes = activeTag
    ? notes.filter((n) => n.tags.includes(activeTag))
    : notes;

  if (!folder) {
    return (
      <AppShell>
        <div style={{ padding: "40px 32px", color: "var(--text-3)" }}>Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div style={{ padding: "26px 34px 0", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div
          style={{
            font: "500 12px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            marginBottom: "12px",
          }}
        >
          Folders / {folder.name}
        </div>

        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "4px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Color square + folder name on the same row */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "3px",
                  background: folder.color,
                  flexShrink: 0,
                }}
              />
              <h1
                style={{
                  font: "600 31px/1.2 'Newsreader', serif",
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {folder.name}
              </h1>
            </div>
            {/* Description line below the title row */}
            {(folder.description || folder.count > 0) && (
              <div
                style={{
                  font: "400 13.5px/1 'Schibsted Grotesk', sans-serif",
                  color: "var(--text-3)",
                  marginTop: "6px",
                }}
              >
                {folder.description}
                {folder.description && " · "}
                {folder.count} {folder.count === 1 ? "note" : "notes"}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {/* Delete folder button */}
            <button
              onClick={handleDeleteFolder}
              disabled={deleteFolderMutation.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "7px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
                font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                cursor: deleteFolderMutation.isPending ? "not-allowed" : "pointer",
                opacity: deleteFolderMutation.isPending ? 0.6 : 1,
                transition: "color .12s, border-color .12s",
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "#e53e3e";
                btn.style.borderColor = "#e53e3e";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "var(--text-3)";
                btn.style.borderColor = "var(--border)";
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              Delete folder
            </button>

            {/* Add subfolder button */}
            <button
              onClick={() => setSubfolderModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "7px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Add subfolder
            </button>

            {/* Sort button */}
            <button
              style={{
                padding: "7px 12px",
                borderRadius: "7px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
              }}
            >
              Edited
            </button>

            {/* View toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-2)",
                borderRadius: "8px",
                padding: "3px",
                gap: "2px",
              }}
            >
              <button
                onClick={() => setView("list")}
                title="List view"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "26px",
                  borderRadius: "6px",
                  border: "none",
                  background: view === "list" ? "var(--surface)" : "transparent",
                  color: view === "list" ? "var(--text)" : "var(--text-3)",
                  cursor: "pointer",
                  transition: "background .12s",
                }}
              >
                <List size={14} strokeWidth={1.8} />
              </button>
              <button
                onClick={() => setView("grid")}
                title="Grid view"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "26px",
                  borderRadius: "6px",
                  border: "none",
                  background: view === "grid" ? "var(--surface)" : "transparent",
                  color: view === "grid" ? "var(--text)" : "var(--text-3)",
                  cursor: "pointer",
                  transition: "background .12s",
                }}
              >
                <LayoutGrid size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter chips row */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            padding: "16px 0 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setActiveTag(null)}
            style={{
              padding: "5px 12px",
              borderRadius: "7px",
              border: "none",
              background: activeTag === null ? "var(--accent-soft)" : "var(--surface-2)",
              color: activeTag === null ? "var(--accent-text)" : "var(--text-2)",
              font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
              cursor: "pointer",
            }}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                border: "none",
                background: activeTag === tag ? "var(--accent-soft)" : "var(--surface-2)",
                color: activeTag === tag ? "var(--accent-text)" : "var(--text-2)",
                font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Note list / grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 34px 32px" }}>
        {subfolders.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                marginBottom: "12px",
              }}
            >
              Subfolders
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              {subfolders.map((sub) => (
                <Card
                  key={sub.id}
                  onClick={() => navigate(`/folder/${sub.id}`)}
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "3px",
                      background: sub.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      font: "600 13.5px/1.2 'Schibsted Grotesk', sans-serif",
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sub.name}
                  </span>
                  <span
                    style={{
                      font: "500 11.5px/1 'JetBrains Mono', monospace",
                      color: "var(--text-3)",
                    }}
                  >
                    {sub.count}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
        {view === "list" ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {filteredNotes.map((note, idx) => {
              const snippet = extractSnippet(note.content);
              const isLast = idx === filteredNotes.length - 1;
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
            {filteredNotes.length === 0 && (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--text-3)",
                  font: "400 13px/1 'Schibsted Grotesk', sans-serif",
                }}
              >
                No notes {activeTag ? `tagged "${activeTag}"` : "in this folder"}
              </div>
            )}
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {filteredNotes.map((note) => {
              const snippet = extractSnippet(note.content);
              return (
                <Card
                  key={note.id}
                  onClick={() => navigate(`/note/${note.id}`)}
                  style={{
                    padding: "16px",
                    minHeight: "140px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      font: "600 15.5px/1.3 'Newsreader', serif",
                      color: "var(--text)",
                    }}
                  >
                    {note.title || "Untitled"}
                  </div>
                  {snippet && (
                    <div
                      style={{
                        font: "400 12.5px/1.5 'Schibsted Grotesk', sans-serif",
                        color: "var(--text-2)",
                        flex: 1,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {snippet}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "auto",
                    }}
                  >
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                      {note.tags.slice(0, 2).map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                    <span
                      style={{
                        font: "500 11.5px/1 'Schibsted Grotesk', sans-serif",
                        color: "var(--text-3)",
                        flexShrink: 0,
                      }}
                    >
                      {relativeTime(note.updatedAt)}
                    </span>
                  </div>
                </Card>
              );
            })}
            {filteredNotes.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--text-3)",
                  font: "400 13px/1 'Schibsted Grotesk', sans-serif",
                }}
              >
                No notes {activeTag ? `tagged "${activeTag}"` : "in this folder"}
              </div>
            )}
          </div>
        )}
      </div>

      {subfolderModalOpen && (
        <FolderModal
          parentId={id}
          onClose={() => setSubfolderModalOpen(false)}
          onCreated={(f) => navigate(`/folder/${f.id}`)}
        />
      )}
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
