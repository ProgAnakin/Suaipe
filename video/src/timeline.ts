// Single source of truth for timing. Everything is expressed in SECONDS on a 120 BPM grid
// (beat = 0.5 s, bar = 2.0 s) so picture, music and sound effects line up.
// Scenes convert with `Math.round(seconds * fps)`; the audio generator reads the same numbers
// through `npm run cues` (see scripts/export-cues.mjs).
//
// The structure follows qa/SCRIPT.md (BRIEF v2): 8 blocks, 50 s = 25 bars.
//   hook 0-4 · idea 4-6 · experience 6-23 · customer value 23-30 · store value 30-38 · system 38-42 · human 42-46 · signature 46-50
//
// Keep this file free of imports: it is executed by plain Node as well as bundled by Remotion.

export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2.0 s
export const DURATION_S = 50.0; // 25 bars
export const WIDTH = 1080;
export const HEIGHT = 1350;

// ── chapters (scene sequences; neighbouring ones overlap by the length of their transition) ──────
export const CHAPTER = {
  hook: { from: 0, to: 4.0 },
  lockup: { from: 3.6, to: 6.4 },
  ipad: { from: 5.7, to: 24.0 },
  phone: { from: 23.0, to: 30.0 },
  store: { from: 29.4, to: 38.2 },
  system: { from: 37.6, to: 41.9 },
  human: { from: 41.5, to: 45.5 },
  signature: { from: 45.0, to: DURATION_S },
} as const;

// ── hook (bars 1–2): "A customer walks in. The store rarely learns who." ─────────────────────
export const HOOK = {
  line1: 0.0, // "A customer walks in." (on screen from the very first frame)
  line1Out: 3.0,
  line2: 1.0, // "The store rarely learns who." arrives word by word
  walk: [0.0, 1.0], // the light crosses the shop floor to the counter
  pulse: 2.0, // it pulses once ...
  fade: [2.0, 2.7], // ... and is gone: the unknown
  gather: 3.5, // light gathers at the centre
  gap: [3.75, 4.0], // 0.25 s air gap: the picture holds, the sound cuts
  flashPeak: 4.0,
} as const;

// ── lock-up (bar 3) ─────────────────────────────────────────────────────────────────────────
export const LOCKUP = {
  hit: 4.0,
  shimmer: 4.2,
  tagline: 4.35, // "One question changes that."
  exit: 5.7,
} as const;

// ── iPad flow (hand-off → form → 8 swipes → 98 % → "I want it") ─────────────────────────────
export const IPAD = {
  rise: 5.7, // the hand-off photo opens (soft whoosh as the lock-up leaves)
  settle: 6.4, // the tablet changes hands (soft thud)
  // the opening is a photo of the consultant handing the tablet over; the kiosk screen wakes up on it, then we fly into it
  // `zoomTo` = iPad zoom at which the photographed glass fills the canvas width (the CSS iPad waits there, hidden)
  handoff: { in: 5.75, wake: 6.5, zoom: [7.0, 7.6], out: 7.9, zoomTo: 1.35 },
  tap1: 8.0, // TAP TO START
  welcomeIn: 8.05,
  typeFirst: { start: 8.5, step: 0.06, count: 5 }, // "Marco"
  typeLast: { start: 8.85, step: 0.06, count: 5 }, // "Rossi"
  typeEmail: { start: 9.2, step: 0.03, count: 22 }, // "marco.rossi@example.com" (23 chars, 22 steps + final)
  consent: 10.0,
  lockClick: 10.2,
  callGdpr: [10.0, 12.4],
  tap2: 12.0, // START THE GAME!
  tutorialIn: 12.3,
  tap3: 13.5, // I'm ready!
  // quiz: `start` = first moment the card moves, `dur` = length of the real drag, accent = start + 0.35 * dur
  swipes: [
    { enter: 13.75, start: 14.2, dur: 0.7, dir: -1 }, // sport      NO
    { enter: 14.65, start: 14.95, dur: 0.55, dir: -1 }, // audio      NO
    { enter: 15.25, start: 15.55, dur: 0.4, dir: 1 }, // productivity YES
    { enter: 15.75, start: 16.05, dur: 0.4, dir: 1 }, // wellness   YES
    { enter: 16.25, start: 16.55, dur: 0.4, dir: 1 }, // travel     YES
    { enter: 16.75, start: 17.05, dur: 0.4, dir: -1 }, // tech       NO
    { enter: 17.25, start: 17.55, dur: 0.4, dir: -1 }, // style      NO
    { enter: 17.75, start: 18.05, dur: 0.4, dir: -1 }, // recovery   NO
  ],
  counterStart: 18.5,
  counterFillFrom: 18.7,
  counterHit: 20.0, // 98 % reached, confetti, big hit (bar 11 downbeat)
  pullBack: 20.1,
  tap4: 22.0, // I want it!
  successIn: 22.2,
  successChime: 22.35,
  exit: 23.0,
} as const;

// ── phone / e-mail (customer value) ─────────────────────────────────────────────────────────
export const PHONE = {
  enter: 23.0,
  settle: 23.7,
  notif: 24.0,
  notifPing: 24.1,
  open: 25.0,
  scroll: [25.9, 27.0],
  zoomCode: [27.2, 28.0],
  codeDing: 28.0,
  exit: 29.2,
} as const;

// ── store value (new): what the manager gets ────────────────────────────────────────────────
// The two staff screens are the real ones (captured with labelled sample data). One close-up stays on screen for the whole beat and the
// content moves under it: the lead list → a page push to the per-store dashboard → the tablet steps back and the leads land in a CRM.
export const STORE = {
  rows: 30.0, // the lead list is in place, the camera leans in on the first rows
  consent: [30.6, 30.85, 31.1], // consent ticks pop in on the first three leads
  label: 31.3, // "Consent on record" (leaves at labelOut)
  labelOut: 32.3,
  swap: [32.5, 32.95], // the screen pushes from the list to the dashboard
  scroll: [32.85, 33.55], // the dashboard scrolls up to the product ranking
  storeA: 33.55, // chip "Store A"
  storeB: 34.2, // the same ranking for the other store
  shift: [34.85, 35.4], // the tablet steps back, the CRM card rises
  fly: [35.25, 35.85], // a lead flies from the tablet into the CRM ...
  land: 35.85, // ... and lands as a row
  fly2: [36.55, 37.0], // the next one, quicker: every lead lands
  land2: 37.0,
  out: 37.75, // pushed back as the system diagram arrives
} as const;

// ── system diagram (kept): how it is built ──────────────────────────────────────────────────
export const SYSTEM = {
  nodes: [38.0, 38.4, 38.8, 39.2, 39.4], // kiosk, supabase, edge fn, e-mail, CRM relay
  packets: [38.35, 38.75, 39.15, 39.35],
  tiles: [39.8, 40.0, 40.2], // Manager, Stats, Consultants
  locks: [40.55, 40.95], // RLS (on the database node), MFA (on the Manager and Stats tiles)
  out: 41.5,
} as const;

// ── human close: the sale happens in person ─────────────────────────────────────────────────
export const HUMAN = {
  bagIn: 41.6, // cut to the bag hand-off photo
  rustle: 42.0, // the bag changes hands
  redeemed: 42.25, // "Redeemed in store" chip pops (the real mark_code_redeemed flow); stays until the photos cross at 43.5-43.9
  handshakeIn: 43.5, // cross to the handshake
  clasp: 44.0, // the hands meet — bar 23 downbeat, the big resolving chord
  out: 45.3,
} as const;

// ── signature (the old end card): name, thesis, soft call to action ─────────────────────────
export const SIGNATURE = {
  glow: 45.2, // the defocused handshake darkens, a glow gathers
  name: 46.0, // bar 24 downbeat: the sonic motif completes
  thesis: 46.75, // after the last letter of the name has landed: one main element enters at a time
  tiny: 47.2, // the near-invisible "AI-generated illustrations" line
  cta: 47.8,
  still: 48.5, // from here nothing moves
} as const;

// ── copy ────────────────────────────────────────────────────────────────────────────────────
// CAPTIONS are burned in by components/Caption.tsx (most LinkedIn viewers watch muted). SCENE_TEXT is copy that a scene draws itself
// (hook, lock-up, call-outs, chips, signature); it lives here so the subtitle file and the reading-time audit see all of it.
export const CAPTIONS = [
  { from: 6.6, to: 9.4, text: "A game, <em>not a form.</em>" },
  { from: 14.2, to: 17.4, text: "Eight swipes. <em>One match.</em>" },
  { from: 25.2, to: 28.8, text: "A personal email. <em>A reason to return.</em>" },
  { from: 30.2, to: 32.8, text: "Every claimed match <em>becomes a lead.</em>" },
  { from: 32.8, to: 35.4, text: "See what sells, <em>store by store.</em>" },
  { from: 35.4, to: 37.8, text: "Leads land <em>in the CRM.</em>" },
  { from: 38.0, to: 41.6, text: "Multi-store. <em>Row-level security</em> on every table." },
  { from: 42.2, to: 45.8, text: "Technology opens the conversation.<br/><em>People close the sale.</em>" },
] as const;

export const SCENE_TEXT = [
  { from: 0.0, to: 3.0, text: "A customer walks in." },
  { from: 1.0, to: 3.7, text: "The store rarely learns who." },
  { from: 4.4, to: 6.3, text: "One question changes that." },
  { from: 10.0, to: 12.4, text: "GDPR consent, captured at the source" },
  { from: 42.25, to: 43.8, text: "Redeemed in store" },
  { from: 46.0, to: 50.0, text: "Costanzo Annichini" },
  { from: 46.75, to: 50.0, text: "Simple ideas create contact.<br/>Contact creates data." },
  { from: 47.8, to: 49.9, text: "Let's talk retail." },
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
