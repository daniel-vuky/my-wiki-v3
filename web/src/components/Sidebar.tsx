import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ChevronDown, ChevronRight, Star, SlidersHorizontal } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../state/AuthContext";
import { Kbd } from "./ui/Kbd";
import { Avatar } from "./ui/Avatar";
import { SettingsPopover } from "./SettingsPopover";
import { FolderModal } from "./FolderModal";
import type { Folder, Note, TagCount } from "../types";

const NAV_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "7px 10px",
  borderRadius: "8px",
  font: "500 13.5px/1.15 'Schibsted Grotesk', sans-serif",
  cursor: "pointer",
  textDecoration: "none",
  border: "none",
  width: "100%",
  background: "transparent",
  boxSizing: "border-box",
};

function NavRow({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...NAV_BASE,
        color: active ? "var(--accent-text)" : "var(--text-2)",
        background: active
          ? "var(--accent-soft)"
          : hovered
          ? "var(--surface-2)"
          : "transparent",
        transition: "background .15s",
      }}
    >
      {children}
    </button>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const { data: tags = [] } = useQuery<TagCount[]>({
    queryKey: ["tags"],
    queryFn: api.tags,
  });

  const { data: favorites = [] } = useQuery<Note[]>({
    queryKey: ["notes", "favorites"],
    queryFn: () => api.notes({ favorite: true }),
  });

  const createNote = useMutation({
    mutationFn: () => api.createNote({}),
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ["folders"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate(`/note/${note.id}`);
    },
  });

  const workspaceName = user ? `${user.name.split(" ")[0]}'s workspace` : "Workspace";

  function toggleFolder(fid: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  }

  return (
    <aside
      style={{
        width: "260px",
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Workspace header */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 8px 14px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1c1408",
            font: "700 16px/1 'Newsreader', serif",
            flexShrink: 0,
          }}
        >
          F
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              font: "700 15px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text)",
            }}
          >
            Folio
          </span>
          <span
            style={{
              font: "500 11px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
            }}
          >
            {workspaceName}
          </span>
        </div>
        <span style={{ color: "var(--text-3)", display: "flex" }}>
          <ChevronDown size={14} />
        </span>
      </div>

      {/* Search button */}
      <button
        onClick={() => navigate("/search")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "8px 10px",
          borderRadius: "9px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
          font: "500 13px/1 'Schibsted Grotesk', sans-serif",
          cursor: "pointer",
          marginBottom: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Search size={15} />
        <span style={{ flex: 1, textAlign: "left" }}>Search</span>
        <Kbd>⌘K</Kbd>
      </button>

      {/* New note button */}
      <button
        onClick={() => createNote.mutate()}
        disabled={createNote.isPending}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "9px 10px",
          borderRadius: "9px",
          background: "var(--accent)",
          border: "none",
          color: "#1c1408",
          font: "600 13px/1 'Schibsted Grotesk', sans-serif",
          cursor: createNote.isPending ? "not-allowed" : "pointer",
          marginBottom: "18px",
          width: "100%",
          boxSizing: "border-box",
          opacity: createNote.isPending ? 0.7 : 1,
        }}
      >
        <Plus size={15} strokeWidth={2.4} />
        New note
      </button>

      {/* Overflow scrollable area */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {/* Favorites section */}
        <div
          style={{
            font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            padding: "4px 10px 6px",
          }}
        >
          Favorites
        </div>
        {favorites.map((note) => (
          <NavRow key={note.id} onClick={() => navigate(`/note/${note.id}`)}>
            <span style={{ color: "var(--accent-text)", display: "flex", flexShrink: 0 }}>
              <Star size={13} fill="currentColor" />
            </span>
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {note.title || "Untitled"}
            </span>
          </NavRow>
        ))}

        {/* Folders section */}
        <div
          style={{
            font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            padding: "16px 10px 6px",
            display: "flex",
            alignItems: "center",
          }}
        >
          Folders
          <button
            onClick={() => setFolderModalOpen(true)}
            title="New folder"
            style={{
              marginLeft: "auto",
              color: "var(--text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              padding: "2px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            <Plus size={13} strokeWidth={2.2} />
          </button>
        </div>
        {folders
          .filter((f) => f.parentId == null)
          .map((root) => (
            <FolderTreeNode
              key={root.id}
              folder={root}
              folders={folders}
              depth={0}
              activeId={params.id}
              openFolders={openFolders}
              onToggle={toggleFolder}
              onNavigate={(fid) => navigate(`/folder/${fid}`)}
            />
          ))}

        {/* Tags section */}
        <div
          style={{
            font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            padding: "16px 10px 8px",
          }}
        >
          Tags
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            padding: "0 8px",
          }}
        >
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "var(--surface-2)",
                color: "var(--text-2)",
                font: "500 11.5px/1 'JetBrains Mono', monospace",
                border: "none",
                cursor: "pointer",
              }}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Account row — pinned to bottom */}
      {user && (
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 8px 4px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
          <Avatar name={user.name} src={user.avatarUrl} size={32} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1px",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                font: "600 13px/1.2 'Schibsted Grotesk', sans-serif",
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </span>
            <span
              style={{
                font: "500 11px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--text-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {folderModalOpen && (
        <FolderModal onClose={() => setFolderModalOpen(false)} />
      )}
    </aside>
  );
}

function FolderTreeNode({
  folder,
  folders,
  depth,
  activeId,
  openFolders,
  onToggle,
  onNavigate,
}: {
  folder: Folder;
  folders: Folder[];
  depth: number;
  activeId?: string;
  openFolders: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const children = folders.filter((f) => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isOpen = openFolders.has(folder.id);
  const isActive = activeId === folder.id;

  return (
    <>
      <NavRow active={isActive} onClick={() => onNavigate(folder.id)}>
        {depth > 0 && <span style={{ paddingLeft: `${depth * 14}px`, display: "flex", flexShrink: 0 }} />}
        <span
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(folder.id);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "14px",
            flexShrink: 0,
            color: "var(--text-3)",
            cursor: hasChildren ? "pointer" : "default",
          }}
        >
          {hasChildren &&
            (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
        </span>
        <span
          style={{
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            flexShrink: 0,
            background: folder.color,
          }}
        />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {folder.name}
        </span>
        <span
          style={{
            font: "500 11.5px/1 'JetBrains Mono', monospace",
            color: isActive ? "var(--accent-text)" : "var(--text-3)",
          }}
        >
          {folder.count}
        </span>
      </NavRow>
      {hasChildren &&
        isOpen &&
        children.map((child) => (
          <FolderTreeNode
            key={child.id}
            folder={child}
            folders={folders}
            depth={depth + 1}
            activeId={activeId}
            openFolders={openFolders}
            onToggle={onToggle}
            onNavigate={onNavigate}
          />
        ))}
    </>
  );
}
