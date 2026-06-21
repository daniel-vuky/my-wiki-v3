import { useState } from "react";
import type { ReactNode, CSSProperties, MouseEventHandler } from "react";

interface CardProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}

export function Card({ children, onClick, style }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        cursor: onClick ? "pointer" : undefined,
        transition: "background .15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
