import type { CSSProperties } from "react";

// Styling MapLibre needs inline: a map renders into an explicitly sized,
// positioned box (here: filling its parent), the placement marker is laid
// over that box's centre, and user-typed notes keep their line breaks.
export const MAP_FILL: CSSProperties = { position: "absolute", inset: 0 };
export const CENTER_MARKER: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -100%)",
  pointerEvents: "none",
};
export const MARKER_BUTTON: CSSProperties = { background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", lineHeight: 0 };
export const PRE_WRAP: CSSProperties = { whiteSpace: "pre-wrap" };
