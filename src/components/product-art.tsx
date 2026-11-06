/**
 * Elegant SVG art used when a product/theme has no uploaded thumbnail yet.
 * (Admin uploads real imagery via the Media Library.)
 */
import React from "react";
import type { ProductKind } from "@/lib/types";

const PALETTES: Record<string, { bg: string; fg: string; ring: string }> = {
  video: { bg: "#F3EAD9", fg: "#6E1E2C", ring: "#B08D57" },
  website: { bg: "#FAF7F1", fg: "#571622", ring: "#B08D57" },
  card: { bg: "#FFFDF8", fg: "#8F6F42", ring: "#6E1E2C" },
  service: { bg: "#F3EAD9", fg: "#2B2622", ring: "#6E1E2C" },
  quote: { bg: "#FFFDF8", fg: "#7A7066", ring: "#B08D57" },
  other: { bg: "#F3EAD9", fg: "#2B2622", ring: "#B08D57" },
  theme: { bg: "#FAF7F1", fg: "#571622", ring: "#B08D57" },
};

export function ProductArt(props: { name: string; kind: ProductKind | "theme"; className?: string }) {
  const palette = PALETTES[props.kind] ?? PALETTES.other;
  const initials =
    props.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "✦";
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      className={props.className}
      viewBox="0 0 400 300"
      role="img"
      aria-label={props.name}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.bg} />
          <stop offset="100%" stopColor="#EFE7D6" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#fade-${id})`} />
      {/* ornamental rings */}
      <circle cx="200" cy="130" r="86" fill="none" stroke={palette.ring} strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="200" cy="130" r="70" fill="none" stroke={palette.ring} strokeOpacity="0.9" strokeWidth="1.5" />
      {/* corner flourishes */}
      <path d="M24 24 C 48 24, 48 48, 24 48" fill="none" stroke={palette.ring} strokeOpacity="0.6" />
      <path d="M376 24 C 352 24, 352 48, 376 48" fill="none" stroke={palette.ring} strokeOpacity="0.6" />
      <path d="M24 276 C 48 276, 48 252, 24 252" fill="none" stroke={palette.ring} strokeOpacity="0.6" />
      <path d="M376 276 C 352 276, 352 252, 376 252" fill="none" stroke={palette.ring} strokeOpacity="0.6" />
      <text
        x="200"
        y="140"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="52"
        fill={palette.fg}
        letterSpacing="4"
      >
        {initials}
      </text>
      <text
        x="200"
        y="232"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="13"
        fill={palette.ring}
        letterSpacing="3"
        style={{ textTransform: "uppercase" }}
      >
        {props.kind.toUpperCase()}
      </text>
    </svg>
  );
}
