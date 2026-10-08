// Positions of UI elements on the captured iPad screens, as fractions (u = x / width, v = y / height) of the 3:4 screen.
// Values were measured from the real DOM by tools/capture (see public/app/layout.json); kept here as typed constants so
// the scenes stay readable. `c` = centre, `w`/`h` = size.
export type Box = { u: number; v: number; w: number; h: number };

export const LAYOUT = {
  attract: {
    startBtn: { u: 0.5, v: 0.6453, w: 0.2762, h: 0.0439 } as Box,
  },
  welcome: {
    chipsRow: { u: 0.8408, v: 0.0212, w: 0.2872, h: 0.019 } as Box,
    chips: [
      { u: 0.7222, v: 0.0212, w: 0.05, h: 0.019 },
      { u: 0.7792, v: 0.0212, w: 0.0551, h: 0.0185 },
      { u: 0.8383, v: 0.0212, w: 0.054, h: 0.019 },
      { u: 0.898, v: 0.0212, w: 0.0537, h: 0.019 },
      { u: 0.9575, v: 0.0212, w: 0.0537, h: 0.019 },
    ] as Box[],
    form: { u: 0.5, v: 0.5472, w: 0.4375, h: 0.1 } as Box,
    consentRow: { u: 0.408, v: 0.6125, w: 0.245, h: 0.022 } as Box, // checkbox + label + "Read" link
    startBtn: { u: 0.5, v: 0.6535, w: 0.4375, h: 0.0498 } as Box,
  },
  tutorial: {
    ready: { u: 0.5, v: 0.6159, w: 0.1522, h: 0.0381 } as Box,
  },
  quiz: {
    card: { u: 0.5, v: 0.5, w: 0.3516, h: 0.4392 } as Box,
  },
  result: {
    ring: { u: 0.5, v: 0.23655, r: 0.0775 }, // centre + outer radius (fraction of the screen width), measured
    productCard: { u: 0.5, v: 0.4816, w: 0.4375, h: 0.2676 } as Box,
    wantIt: { u: 0.5, v: 0.803, w: 0.4375, h: 0.0498 } as Box,
  },
  success: {
    envelope: { u: 0.5, v: 0.2666, w: 0.1445, h: 0.082 } as Box,
  },
} as const;

/** Region of the welcome screen covered by the cropped typing frames (fractions of the screen) — from
 *  public/app/typing/manifest.json (crops.fields: css 280,675 464x145 on the 1024x1366 viewport). */
export const TYPING = { u0: 280 / 1024, v0: 675 / 1366, u1: (280 + 464) / 1024, v1: (675 + 145) / 1366, frames: { first: 5, last: 5, email: 23 } } as const;

/** Set to false to render without the cropped typing frames (e.g. while the capture assets are missing). */
export const TYPING_ENABLED = true;

/**
 * Rectangles on the captured staff screens (tools/capture/admin.mjs → public/app/admin-layout.json), in css px of the 1024-wide page.
 * The manager still is one viewport (1024 x 1366); the dashboards are one tall page each (1024 x 5114).
 */
export const ADMIN = {
  page: { w: 1024, h: 1366 },
  /** The bordered card of each lead in "Sessions & Codes": the first one and the distance to the next. */
  card: { x: 176, w: 672, h: 137, y0: 610.5, pitch: 145 },
  dashboard: {
    h: 5114,
    ranking: { x: 176, y: 794, w: 672, h: 530.5 }, // "Most claimed products"
    firstSession: { x: 201, y: 2637, w: 622, h: 104 },
  },
} as const;
