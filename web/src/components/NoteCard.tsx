import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chip } from "./ui/Chip";
import { extractSnippet } from "../lib/snippet";
import { relativeTime } from "../lib/time";
import type { Note } from "../types";

interface NoteCardProps {
  note: Note;
  folderName?: string;
  folderColor?: string;
}

export function NoteCard({ note, folderName, folderColor }: NoteCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const snippet = extractSnippet(note.content);

  return (
    <div
      onClick={() => navigate(`/note/${note.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "18px",
        minHeight: "150px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: "pointer",
        transition: "background .15s",
      }}
    >
      {/* Folder dot + name */}
      {folderName && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: folderColor ?? "var(--text-3)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              font: "500 11.5px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
            }}
          >
            {folderName}
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

      {/* Footer: time + tags */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          gap: "8px",
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
    </div>
  );
}
