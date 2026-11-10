// docs/SPEC.md section 4: the center marker and the pins are SVG built with
// DOM APIs, never string-concatenated markup. As JSX, React builds this
// through `document.createElementNS` and text nodes, which is the same
// guarantee. Never pass label/note through here as anything but a plain
// string child.
interface SpacePinIconProps {
  variant: "center" | "own" | "participant";
  size?: number;
  title?: string;
  /** Overrides the variant's fill - the placement marker turns grey while
   * it's outside the village. */
  color?: string;
}

const FILL: Record<SpacePinIconProps["variant"], string> = {
  center: "#c2410c",
  own: "#5b3a8c",
  participant: "#c2410c",
};

// A map pin with a pumpkin in its head.
export default function SpacePinIcon({ variant, size = 36, title, color }: SpacePinIconProps) {
  const fill = color ?? FILL[variant];
  return (
    <svg
      width={size}
      height={(size * 42) / 36}
      viewBox="0 0 36 42"
      role="img"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M18 41c-1-5-15-13-15-24a15 15 0 0 1 30 0c0 11-14 19-15 24z"
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2.5}
      />
      <ellipse cx={18} cy={17} rx={8.5} ry={7} fill="#fdba74" />
      <path d="M18 10.5V7.5" stroke="#3f6212" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}
