import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Kbd } from "../components/ui/Kbd";
import { Search as SearchIcon, ChevronDown } from "../components/icons";
import { api } from "../api/client";
import { relativeTime } from "../lib/time";
import type { Folder, SearchResult } from "../types";
import "./search-highlight.css";

// Debounce hook — returns a value that only updates after `delay` ms of quiet.
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Search() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string | undefined>(undefined);

  // Debounced query used as actual search term (300 ms).
  const debouncedQuery = useDebounce(query, 300);

  // Autofocus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch all folders for name/color lookup.
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: api.folders,
  });

  const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));

  // Main search query — only fires when there is a non-empty debounced term.
  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery, folder],
    queryFn: () => api.search(debouncedQuery, folder),
    enabled: debouncedQuery.trim().length > 0,
  });

  const results: SearchResult[] = data?.results ?? [];
  const folderFacets = data?.folderFacets ?? [];

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <AppShell>
      {/* ── Search header ── */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--surface)",
            border: "1px solid var(--accent)",
            borderRadius: "10px",
            boxShadow: "0 0 0 3px var(--accent-soft)",
            padding: "0 14px",
            height: "44px",
          }}
        >
          {/* Search icon */}
          <SearchIcon
            size={16}
            strokeWidth={2}
            style={{ color: "var(--accent)", flexShrink: 0 }}
          />

          {/* Controlled input */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") navigate(-1);
            }}
            placeholder="Search notes…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              font: "400 15px/1 'Schibsted Grotesk', sans-serif",
              color: "var(--text)",
              caretColor: "var(--accent)",
            }}
          />

          {/* Esc chip */}
          <Kbd>esc</Kbd>
        </div>
      </div>

      {/* ── Content area ── */}
      {!hasQuery ? (
        /* Empty / prompt state */
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-3)",
            font: "400 14px/1.5 'Schibsted Grotesk', sans-serif",
          }}
        >
          Type to search your notes
        </div>
      ) : (
        <>
          {/* ── Sub-header: count + filter chips + sort control ── */}
          <div
            style={{
              padding: "10px 32px",
              borderBottom: "1px solid var(--border-soft)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {/* Result count */}
            <span
              style={{
                font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                color: "var(--text-3)",
                marginRight: "4px",
              }}
            >
              {isFetching ? "…" : `${results.length} result${results.length !== 1 ? "s" : ""}`}
            </span>

            {/* "All folders" chip */}
            <button
              onClick={() => setFolder(undefined)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: folder === undefined ? "var(--accent-soft)" : "var(--surface-2)",
                color: folder === undefined ? "var(--accent-text)" : "var(--text-2)",
                font: "500 12px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
              }}
            >
              All folders
            </button>

            {/* Per-folder facet chips */}
            {folderFacets.map((facet) => {
              const fName = facet.folderId ? (folderMap.get(facet.folderId)?.name ?? "Unknown") : "Unfiled";
              const isActive = folder === (facet.folderId ?? undefined);
              return (
                <button
                  key={facet.folderId ?? "null"}
                  onClick={() =>
                    setFolder(
                      isActive ? undefined : facet.folderId ?? undefined
                    )
                  }
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: isActive ? "var(--accent-soft)" : "var(--surface-2)",
                    color: isActive ? "var(--accent-text)" : "var(--text-2)",
                    font: "500 12px/1 'Schibsted Grotesk', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  {fName} {facet.c}
                </button>
              );
            })}

            {/* Sort control — visual only; server returns relevance order by default */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
                  font: "500 12px/1 'Schibsted Grotesk', sans-serif",
                  cursor: "pointer",
                }}
              >
                Relevance
                <ChevronDown size={12} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* LEFT facet rail */}
            <aside
              style={{
                width: "210px",
                flexShrink: 0,
                borderRight: "1px solid var(--border)",
                padding: "22px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "22px",
              }}
            >
              {/* Type group */}
              <div>
                <div
                  style={{
                    font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "10px",
                  }}
                >
                  Type
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 0",
                  }}
                >
                  <span
                    style={{
                      font: "500 13px/1 'Schibsted Grotesk', sans-serif",
                      color: "var(--text)",
                    }}
                  >
                    Notes
                  </span>
                  <span
                    style={{
                      font: "500 11.5px/1 'JetBrains Mono', monospace",
                      color: "var(--text-3)",
                    }}
                  >
                    {results.length}
                  </span>
                </div>
              </div>

              {/* Folder group */}
              {folderFacets.length > 0 && (
                <div>
                  <div
                    style={{
                      font: "600 10.5px/1 'Schibsted Grotesk', sans-serif",
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: "10px",
                    }}
                  >
                    Folder
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {folderFacets.map((facet) => {
                      const f = facet.folderId ? folderMap.get(facet.folderId) : undefined;
                      const fName = f ? f.name : facet.folderId ? "Unknown" : "Unfiled";
                      const dotColor = f?.color ?? "var(--text-3)";
                      const isActive = folder === (facet.folderId ?? undefined);
                      return (
                        <button
                          key={facet.folderId ?? "null"}
                          onClick={() =>
                            setFolder(
                              isActive ? undefined : facet.folderId ?? undefined
                            )
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "none",
                            background: isActive ? "var(--accent-soft)" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          {/* Colored dot */}
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: dotColor,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
                              color: isActive ? "var(--accent-text)" : "var(--text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fName}
                          </span>
                          <span
                            style={{
                              font: "500 11px/1 'JetBrains Mono', monospace",
                              color: "var(--text-3)",
                              flexShrink: 0,
                            }}
                          >
                            {facet.c}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

            {/* RESULTS list */}
            <div
              className="folio-search"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 28px",
              }}
            >
              {results.length === 0 && !isFetching ? (
                <div
                  style={{
                    padding: "48px 0",
                    textAlign: "center",
                    color: "var(--text-3)",
                    font: "400 14px/1.5 'Schibsted Grotesk', sans-serif",
                  }}
                >
                  No results for "{debouncedQuery}"
                </div>
              ) : (
                results.map((result, idx) => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    folder={result.folderId ? folderMap.get(result.folderId) : undefined}
                    isLast={idx === results.length - 1}
                    onClick={() => navigate(`/note/${result.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

interface ResultRowProps {
  result: SearchResult;
  folder: Folder | undefined;
  isLast: boolean;
  onClick: () => void;
}

function ResultRow({ result, folder, isLast, onClick }: ResultRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: hovered ? "16px 12px" : "16px 0",
        borderBottom: isLast ? "none" : "1px solid var(--border-soft)",
        cursor: "pointer",
        background: hovered ? "var(--surface-2)" : "transparent",
        borderRadius: hovered ? "8px" : "0",
        transition: "background .1s",
      }}
    >
      {/* Meta line: folder dot + folder name + · + relativeTime */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "5px",
        }}
      >
        {folder && (
          <>
            <span
              style={{
                width: "6px",
                height: "6px",
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
            <span style={{ color: "var(--text-3)", font: "400 11.5px/1 sans-serif" }}>·</span>
          </>
        )}
        <span
          style={{
            font: "500 11.5px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
          }}
        >
          {relativeTime(result.updatedAt)}
        </span>
      </div>

      {/* Title — rendered from titleHl (contains <mark> tags from ts_headline).
          Content comes from the user's own notes (single-user app, self-XSS only). */}
      <div
        dangerouslySetInnerHTML={{ __html: result.titleHl }}
        style={{
          font: "600 17px/1.35 'Newsreader', serif",
          color: "var(--text)",
          marginBottom: "5px",
        }}
      />

      {/* Snippet — same trust model as titleHl above. */}
      {result.snippetHl && (
        <div
          dangerouslySetInnerHTML={{ __html: result.snippetHl }}
          style={{
            font: "400 13.5px/1.55 'Schibsted Grotesk', sans-serif",
            color: "var(--text-2)",
            maxWidth: "680px",
          }}
        />
      )}
    </div>
  );
}
