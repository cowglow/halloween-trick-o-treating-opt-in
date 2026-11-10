// The app's few icons, as inline SVG so they take the text color and need
// no request. All decorative: the button or link around them carries the name.

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  back: <path d="M15 6l-6 6 6 6" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  check: <path d="M5 12l5 5 9-10" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  house: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  share: <path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />,
  mail: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
  signOut: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      {PATHS[name]}
    </svg>
  );
}

// The logo: a pumpkin. `face` adds a friendly jack-o'-lantern face (the invite page).
export function Pumpkin({ size = 30, face = false }: { size?: number; face?: boolean }) {
  return (
    <svg width={size} height={(size * 140) / 148} viewBox="0 0 148 140" aria-hidden="true">
      <ellipse cx="44" cy="80" rx="34" ry="46" fill="#ea580c" />
      <ellipse cx="104" cy="80" rx="34" ry="46" fill="#ea580c" />
      <ellipse cx="74" cy="80" rx="34" ry="50" fill="#f97316" />
      <path d="M74 32c0-10 4-20 14-26" stroke="#3f6212" strokeWidth="8" fill="none" strokeLinecap="round" />
      {face ? (
        <>
          <path d="M86 18c10-6 20-4 26 2" stroke="#65a30d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M50 68l10-14 10 14z" fill="#431407" />
          <path d="M80 68l10-14 10 14z" fill="#431407" />
          <path d="M48 90c10 18 42 18 52 0-8 6-18 6-26 6s-18 0-26-6z" fill="#431407" />
        </>
      ) : null}
    </svg>
  );
}
