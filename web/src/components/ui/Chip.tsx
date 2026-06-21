import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  mono?: boolean;
}

export function Chip({ children, active = false, mono = false }: ChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "6px",
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
        color: active ? "var(--accent-text)" : "var(--text-2)",
        font: mono
          ? `500 11.5px/1 'JetBrains Mono', monospace`
          : `500 12px/1 'Schibsted Grotesk', sans-serif`,
        fontSize: mono ? "11.5px" : "12px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
