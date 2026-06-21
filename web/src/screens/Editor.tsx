import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Star, MoreHorizontal, Upload, ArrowLeft } from "../components/icons";
import { api } from "../api/client";
import { usePrefs } from "../state/PrefsContext";
import { relativeTime } from "../lib/time";
import { FolioEditor } from "../editor/FolioEditor";
import type { Folder, Note } from "../types";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prefs } = usePrefs();
  const qc = useQueryClient();

  const noteQuery = useQuery<Note>({
    queryKey: ["note", id],
    queryFn: () => api.note(id!),
    enabled: !!id,
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const save = useMutation({
    mutationFn: (patch: Partial<{ title: string; content: string }>) =>
      api.updateNote(id!, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["note", id] });
      qc.setQueryData(["note", id], (o: Note | undefined) =>
        o ? { ...o, ...patch } : o
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  const favMutation = useMutation({
    mutationFn: () => api.favorite(id!),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["note", id] });
      qc.setQueryData(["note", id], (o: Note | undefined) =>
        o ? { ...o, favorite: !o.favorite } : o
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["note", id] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  // Debounced title save
  const titleTimer = useRef<number | undefined>(undefined);

  const note = noteQuery.data;

  if (!note) {
    return (
      <AppShell>
        <div />
      </AppShell>
    );
  }

  const folder = folders.find((f) => f.id === note.folderId);

  function handleTitleChange(value: string) {
    // Optimistically update the cache immediately for responsive UI
    qc.setQueryData(["note", id], (o: Note | undefined) =>
      o ? { ...o, title: value } : o
    );
    window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => {
      save.mutate({ title: value });
    }, 600);
  }

  return (
    <AppShell>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 26px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          gap: "16px",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          title="Back"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: "none",
            background: "transparent",
            color: "var(--text-3)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background .12s",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
        </button>

        {/* Left: breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            minWidth: 0,
            overflow: "hidden",
            flex: 1,
          }}
        >
          {folder && (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: folder.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "var(--text-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "160px",
                }}
              >
                {folder.name}
              </span>
              <span style={{ color: "var(--text-3)", flexShrink: 0 }}>›</span>
            </>
          )}
          <span
            style={{
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {note.title || "Untitled"}
          </span>
        </div>

        {/* Right: timestamp + icon buttons + Share */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              font: "400 12px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
              marginRight: "4px",
            }}
          >
            Edited {relativeTime(note.updatedAt)}
          </span>

          {/* Star / favorite */}
          <button
            onClick={() => favMutation.mutate()}
            title={note.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              border: "none",
              background: "transparent",
              color: note.favorite ? "var(--accent)" : "var(--text-3)",
              cursor: "pointer",
              transition: "color .12s, background .12s",
            }}
          >
            <Star
              size={16}
              strokeWidth={1.8}
              fill={note.favorite ? "currentColor" : "none"}
            />
          </button>

          {/* More options (placeholder) */}
          <button
            title="More options"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              border: "none",
              background: "transparent",
              color: "var(--text-3)",
              cursor: "pointer",
              transition: "background .12s",
            }}
          >
            <MoreHorizontal size={16} strokeWidth={1.8} />
          </button>

          {/* Share (placeholder per spec §9) */}
          <button
            onClick={() => console.log("Share note:", id)}
            title="Share"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 14px",
              height: "32px",
              borderRadius: "7px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              font: "600 12.5px/1 'Schibsted Grotesk', sans-serif",
              cursor: "pointer",
              transition: "opacity .12s",
            }}
          >
            <Upload size={13} strokeWidth={2} />
            Share
          </button>
        </div>
      </div>

      {/* ── Document column ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "760px",
            padding: "46px 40px 60px",
            margin: "0 auto",
          }}
        >
          {/* Title */}
          <input
            type="text"
            defaultValue={note.title}
            key={note.id + "-title"}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            style={{
              display: "block",
              width: "100%",
              font: "600 39px/1.2 'Newsreader', serif",
              letterSpacing: "-0.018em",
              color: "var(--text)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "0",
              marginBottom: "12px",
            }}
          />

          {/* Tag meta row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "28px",
              font: "400 12.5px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
            }}
          >
            {note.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'Fira Mono', 'Cascadia Code', monospace",
                  fontSize: "12px",
                  color: "var(--text-2)",
                }}
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 0 && (
              <span style={{ color: "var(--border)" }}>·</span>
            )}
            <span>Updated {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>

          {/* BlockNote editor — key={id} forces remount on note navigation */}
          <FolioEditor
            key={id}
            initialContent={note.content}
            theme={prefs.theme}
            onChange={(content) => save.mutate({ content })}
          />
        </div>
      </div>
    </AppShell>
  );
}
