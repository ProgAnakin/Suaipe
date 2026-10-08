// Single source of truth for timing. Everything is expressed in SECONDS on a 120 BPM grid
// (beat = 0.5 s, bar = 2.0 s) so picture, music and sound effects line up.
// Scenes convert with `Math.round(seconds * fps)`; the audio generator reads the same numbers
// through `npm run cues` (see scripts/export-cues.mjs).
//
// Keep this file free of imports: it is executed by plain Node as well as bundled by Remotion.

export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2.0 s
export const DURATION_S = 44.5;
export const WIDTH = 1080;
export const HEIGHT = 1350;

// ── chapters ────────────────────────────────────────────────────────────────────────────────
export const CHAPTER = {
  hook: { from: 0, to: 4.0 },
  lockup: { from: 3.6, to: 6.2 },
  ipad: { from: 5.4, to: 26.6 },
  phone: { from: 25.6, to: 34.2 },
  system: { from: 33.6, to: 37.9 },
  human: { from: 37.5, to: 41.5 }, // bag hand-off → handshake, real hands, in store
  end: { from: 41.0, to: DURATION_S },
} as const;

// ── hook (bars 1–2) ─────────────────────────────────────────────────────────────────────────
export const HOOK = {
  tilePop: Array.from({ length: 10 }, (_, i) => +(0.1 + 0.075 * i).toFixed(3)),
  words1: [0.12, 0.3, 0.48], // "Too" "many" "gadgets."
  lockOn: 2.0, // beat 5: the chosen product lights up, the others fly away
  words2: [2.05, 2.25, 2.45], // "One" "perfect" "match."
  heroDone: 3.2,
  flashPeak: 4.0,
} as const;

// ── lock-up (bar 3) ─────────────────────────────────────────────────────────────────────────
export const LOCKUP = {
  hit: 4.0,
  shimmer: 4.2,
  tagline: 4.55,
  exit: 5.4,
} as const;

// ── iPad flow ───────────────────────────────────────────────────────────────────────────────
export const IPAD = {
  rise: 5.4, // the hand-off photo opens (soft whoosh as the lock-up leaves)
  settle: 6.4, // the tablet changes hands (soft thud)
  // the opening is a photo of the consultant handing the tablet over; the kiosk screen wakes up on it, then we fly into it
  // `zoomTo` = iPad zoom at which the photographed glass fills the canvas width (the CSS iPad waits there, hidden)
  handoff: { in: 5.4, wake: 5.9, zoom: [6.85, 7.4], out: 7.55, zoomTo: 1.35 },
  tap1: 8.0, // TAP TO START
  welcomeIn: 8.05,
  chipTicks: [8.8, 9.0, 9.2, 9.4, 9.6], // language highlight sweep IT → FR
  callLang: [8.7, 10.0],
  typeFirst: { start: 10.1, step: 0.075, count: 5 }, // "Marco"
  typeLast: { start: 10.6, step: 0.075, count: 5 }, // "Rossi"
  typeEmail: { start: 11.05, step: 0.04, count: 22 }, // "marco.rossi@example.com" (23 chars, 22 steps + final)
  consent: 12.0,
  lockClick: 12.25,
  callGdpr: [12.0, 13.2],
  tap2: 13.3, // START THE GAME!
  tutorialIn: 13.6,
  tap3: 14.5, // I'm ready!
  // quiz: `start` = first moment the card moves, `dur` = length of the real drag, accent = start + 0.35 * dur
  swipes: [
    { enter: 14.7, start: 15.22, dur: 0.8, dir: -1 }, // sport      NO
    { enter: 15.95, start: 16.29, dur: 0.6, dir: -1 }, // audio      NO
    { enter: 16.8, start: 17.36, dur: 0.4, dir: 1 }, // productivity YES
    { enter: 17.5, start: 17.86, dur: 0.4, dir: 1 }, // wellness   YES
    { enter: 18.0, start: 18.36, dur: 0.4, dir: 1 }, // travel     YES
    { enter: 18.5, start: 18.86, dur: 0.4, dir: -1 }, // tech       NO
    { enter: 19.0, start: 19.36, dur: 0.4, dir: -1 }, // style      NO
    { enter: 19.5, start: 19.86, dur: 0.4, dir: -1 }, // recovery   NO
  ],
  counterStart: 20.0,
  counterFillFrom: 20.3,
  counterHit: 22.0, // 98 % reached, confetti, big hit (bar 12 downbeat)
  pullBack: 22.1,
  tap4: 24.0, // I want it!
  successIn: 24.2,
  successChime: 24.35,
  exit: 25.6,
} as const;

// ── phone / e-mail ──────────────────────────────────────────────────────────────────────────
export const PHONE = {
  enter: 25.6,
  settle: 26.7,
  notif: 26.9,
  notifPing: 27.0,
  open: 27.6,
  scroll: [29.6, 31.0],
  zoomCode: [31.4, 32.2],
  codeDing: 32.2,
  exit: 33.4,
} as const;

// ── system diagram ──────────────────────────────────────────────────────────────────────────
export const SYSTEM = {
  nodes: [34.0, 34.4, 34.8, 35.2, 35.4], // kiosk, supabase, edge fn, e-mail, CRM relay
  packets: [34.35, 34.75, 35.15, 35.35],
  tiles: [35.8, 36.0, 36.2], // Manager, Stats, Consultants
  locks: [36.55, 36.95], // 2FA, RLS
  out: 37.5,
} as const;

// ── human close: the sale happens in person ─────────────────────────────────────────────────
export const HUMAN = {
  bagIn: 37.6, // cut to the bag hand-off photo
  rustle: 38.0, // the bag changes hands
  redeemed: 38.45, // "Code redeemed" chip pops (the real mark_code_redeemed flow)
  handshakeIn: 39.5, // cross to the handshake
  clasp: 40.0, // the hands meet — bar 21 downbeat, the big resolving chord
  out: 41.3,
} as const;

// ── end card ────────────────────────────────────────────────────────────────────────────────
export const END = {
  hit: 41.0,
  shimmer: 41.2,
  tagline: 41.8,
  chips: [42.2, 42.45, 42.7, 42.95],
  tech: 43.3,
  sparkle: 43.4,
  fadeOut: [43.9, DURATION_S],
} as const;

// ── captions (burned in: most LinkedIn viewers watch muted) ──────────────────────────────────
export const CAPTIONS = [
  { from: 6.2, to: 8.0, text: "Turns idle in-store iPads into a <em>touchpoint.</em>" },
  { from: 14.6, to: 20.4, text: "Eight swipes. <em>One match.</em>" },
  { from: 22.3, to: 25.4, text: "A match in <em>under two minutes.</em>" },
  { from: 27.8, to: 31.4, text: "A personalised email with a <em>unique code.</em>" },
  {
    from: 34.0,
    to: 37.6,
    text: "Multi-store. <em>2FA on staff dashboards.</em><br/>Row-level security on every table.",
    small: true,
  },
  { from: 37.8, to: 41.0, text: "Technology that keeps<br/>the in-store moment <em>human.</em>" },
] as const;

// ── helpers ─────────────────────────────────────────────────────────────────────────────────
export const sec = (s: number, fps: number = FPS) => Math.round(s * fps);

/** Eased 0..1 progress of the match counter between `counterFillFrom` and `counterHit` (ease-in-out cubic). */
export const counterProgress = (u: number) => {
  const x = Math.min(1, Math.max(0, u));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** The moment a swipe "registers" (badge pops, whoosh peaks). */
export const swipeAccent = (s: { start: number; dur: number }) => +(s.start + 0.35 * s.dur).toFixed(3);

export const secToTimecode = (s: number) => {
  const ms = Math.round((s % 1) * 1000);
  const whole = Math.floor(s);
  const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const ss = String(whole % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss},${String(ms).padStart(3, "0")}`;
};
