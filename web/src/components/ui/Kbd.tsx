import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <span
      style={{
        font: "500 10.5px/1 'JetBrains Mono', monospace",
        padding: "2px 5px",
        borderRadius: "4px",
        background: "var(--surface-2)",
        color: "var(--text-3)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
