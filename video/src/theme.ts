// Brand tokens, taken from the app itself (src/index.css / tailwind) so the film matches the product.
export const COLORS = {
  bg: "#0d1228",
  bgDeep: "#070a1a",
  panel: "#141c44",
  panelHi: "#1c2756",
  border: "#2a3a68",
  text: "#f0f4ff",
  textSoft: "#c9d6f5",
  textDim: "#8fa2cf",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  teal: "#5eead4",
  violet: "#8b7bff",
  green: "#34d399",
  red: "#f87171",
  amber: "#fbbf24",
} as const;

export const GRADIENT = `linear-gradient(95deg, ${COLORS.blue}, ${COLORS.cyan} 60%, ${COLORS.teal})`;
export const GRADIENT_SOFT = `linear-gradient(95deg, ${COLORS.blue}, ${COLORS.cyan})`;

export const FONT = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

// iPad screen box in CSS px (3:4, same ratio as the captured 2048x2732 stills)
export const SCREEN = { w: 800, h: 1067 } as const;

// ── layout grid and type scale (BRIEF v2, phase 3) ──────────────────────────────────────────
/** Canvas 1080 x 1350. LinkedIn's player covers the bottom ~8 % and the corners with its own controls: nothing essential goes there. */
export const GRID = {
  marginX: 60, // side margin for copy
  captionTop: 62, // top of the burned-in captions
  safeBottom: 1242, // nothing the viewer must read below this line (bottom 8 %)
  safeCorner: 110, // nor inside the four 110 px corners
} as const;

/**
 * The film's own type: four sizes (px on the 1080 canvas) plus `micro`, which exists for one line only — the deliberately
 * near-invisible "AI-generated illustrations" note. The captured app screens keep the app's own type.
 */
export const TYPE = {
  display: 150, // wordmark
  headline: 100, // hook lines, the name on the signature
  caption: 60, // captions, the thesis
  label: 34, // chips, call-outs, node titles, the call to action
  micro: 15,
} as const;
