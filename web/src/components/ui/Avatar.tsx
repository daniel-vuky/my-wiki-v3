interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, src, size = 32 }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#e0a548,#d98a8a)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        font: `700 ${Math.round(size * 0.4)}px/1 'Schibsted Grotesk', sans-serif`,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
