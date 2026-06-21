import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { usePrefs } from "../state/PrefsContext";
import { api } from "../api/client";
import type { Accent } from "../types";

const ACCENTS: { value: Accent; hex: string; label: string }[] = [
  { value: "amber", hex: "#e0a548", label: "Amber" },
  { value: "teal",  hex: "#3fa896", label: "Teal"  },
  { value: "blue",  hex: "#5b9bd5", label: "Blue"  },
  { value: "rose",  hex: "#d97a86", label: "Rose"  },
];

export function SettingsPopover({ onClose }: { onClose: () => void }) {
  const { prefs, setTheme, setAccent, setEditorFont } = usePrefs();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleLogout() {
    await api.logout();
    qc.clear();
    window.location.href = "/signin";
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "0",
        right: "0",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        boxShadow: "0 18px 48px rgba(0,0,0,.36)",
        padding: "16px",
        zIndex: 100,
        minWidth: "220px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            font: "600 13px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text)",
          }}
        >
          Settings
        </span>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--text-3)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Theme */}
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            font: "500 11px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Theme
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: "7px",
                border: prefs.theme === t ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                background: prefs.theme === t ? "var(--accent-soft)" : "transparent",
                color: prefs.theme === t ? "var(--accent-text)" : "var(--text-2)",
                font: "500 12px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            font: "500 11px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Accent
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {ACCENTS.map(({ value, hex, label }) => (
            <button
              key={value}
              onClick={() => setAccent(value)}
              title={label}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: hex,
                border: prefs.accent === value
                  ? "2.5px solid var(--text)"
                  : "2px solid transparent",
                cursor: "pointer",
                flexShrink: 0,
                outline: prefs.accent === value ? "2px solid " + hex : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Editor font */}
      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            font: "500 11px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Editor Font
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["Serif", "Sans"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setEditorFont(f)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: "7px",
                border: prefs.editorFont === f ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                background: prefs.editorFont === f ? "var(--accent-soft)" : "transparent",
                color: prefs.editorFont === f ? "var(--accent-text)" : "var(--text-2)",
                font: f === "Serif"
                  ? "500 12px/1 'Newsreader', serif"
                  : "500 12px/1 'Schibsted Grotesk', sans-serif",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => void handleLogout()}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-2)",
          font: "500 12.5px/1 'Schibsted Grotesk', sans-serif",
          cursor: "pointer",
        }}
      >
        Log out
      </button>
    </div>
  );
}
