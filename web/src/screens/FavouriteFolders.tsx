import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { api } from "../api/client";
import type { Folder } from "../types";

export default function FavouriteFolders() {
  const navigate = useNavigate();

  const { data: folders = [], isLoading } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const favFolders = folders.filter((f) => f.favorite);

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
          Favourite folders
        </h1>
        {!isLoading && (
          <div
            style={{
              font: "400 13.5px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
              marginTop: "6px",
            }}
          >
            {favFolders.length} {favFolders.length === 1 ? "folder" : "folders"}
          </div>
        )}
      </div>

      {/* Folders grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 34px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "18px",
          }}
        >
          {favFolders.map((folder) => {
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
              </Card>
            );
          })}
          {favFolders.length === 0 && !isLoading && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "40px 32px",
                textAlign: "center",
                color: "var(--text-3)",
                font: "400 13px/1 'Schibsted Grotesk', sans-serif",
              }}
            >
              No favourite folders yet
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
