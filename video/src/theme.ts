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
