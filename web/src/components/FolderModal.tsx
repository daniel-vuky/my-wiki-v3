import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Folder } from "../types";

const PALETTE = ["#e0a548", "#4fb3a3", "#a89adf", "#d98a8a", "#7cba6a", "#6fa8dc"];

export function FolderModal({
  parentId,
  onClose,
  onCreated,
}: {
  parentId?: string | null;
  onClose: () => void;
  onCreated?: (folder: Folder) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = useMutation({
    mutationFn: () =>
      api.createFolder({ name: name.trim(), color, parentId: parentId ?? null }),
    onSuccess: (folder) => {
      void queryClient.invalidateQueries({ queryKey: ["folders"] });
      onCreated?.(folder);
      onClose();
    },
  });

  const disabled = name.trim().length === 0 || create.isPending;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "380px",
          maxWidth: "92vw",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          padding: "22px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            font: "600 17px/1.2 'Newsreader', serif",
            color: "var(--text)",
            marginBottom: "16px",
          }}
        >
          {parentId ? "New subfolder" : "New folder"}
        </div>

        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) create.mutate();
          }}
          placeholder="Folder name"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 11px",
            borderRadius: "8px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            font: "500 13.5px/1 'Schibsted Grotesk', sans-serif",
            outline: "none",
            marginBottom: "16px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: c,
                cursor: "pointer",
                border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                boxShadow: color === c ? "0 0 0 2px var(--surface)" : "none",
                outline: color === c ? "2px solid var(--text)" : "none",
                outlineOffset: "1px",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              font: "500 13px/1 'Schibsted Grotesk', sans-serif",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={disabled}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--accent)",
              border: "none",
              color: "#1c1408",
              font: "600 13px/1 'Schibsted Grotesk', sans-serif",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
