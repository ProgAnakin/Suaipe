// Single source of truth for timing. Everything is expressed in SECONDS on a 120 BPM grid
// (beat = 0.5 s, bar = 2.0 s) so picture, music and sound effects line up.
// Scenes convert with `Math.round(seconds * fps)`; the audio generator reads the same numbers
// through `npm run cues` (see scripts/export-cues.mjs).
//
// The film: the calm product story of v2 (hook, lock-up, the hand-off, the whole kiosk flow, the e-mail), then what the store team gets
// from it — the manager's leads and per-store dashboard (Store value) and the consultants' product knowledge base (Consultants) — then
// how it is built, the human close and the end card. Bars: hook 1-2 · lock-up 3 · kiosk flow 3-13 · e-mail 13-17 · store 17-22 ·
// consultants 22-27 · system 27-29 · human 29-31 · end 31-32.
//
// Keep this file free of imports: it is executed by plain Node as well as bundled by Remotion.

export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2.0 s
export const DURATION_S = 64.5;
export const WIDTH = 1080;
export const HEIGHT = 1350;

// ── chapters (scene sequences; neighbouring ones overlap by the length of their transition) ──────
export const CHAPTER = {
  hook: { from: 0, to: 4.0 },
  lockup: { from: 3.6, to: 6.2 },
  ipad: { from: 5.4, to: 26.6 },
  phone: { from: 25.6, to: 34.2 },
  store: { from: 33.6, to: 44.2 }, // the manager's leads, the per-store dashboard, the CRM
  consult: { from: 43.6, to: 54.2 }, // the consultants' product knowledge base
  system: { from: 53.6, to: 57.9 },
  human: { from: 57.5, to: 61.5 }, // bag hand-off → handshake, real hands, in store
  end: { from: 61.0, to: DURATION_S },
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
  tagline: 4.3,
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
  callGdpr: [10.75, 13.2], // the call-out arrives while the e-mail is typed, so it can be read before the checkbox is ticked
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

// ── store value: what the manager gets ──────────────────────────────────────────────────────
// The two staff screens are the real ones (captured with labelled sample data). One close-up stays on screen for the whole beat and the
// content moves under it: the lead list → a page push to the per-store dashboard → the tablet steps back and the leads land in a CRM.
export const STORE = {
  rows: 34.0, // the lead list is in place, the camera leans in on the first rows (bar 18)
  consent: [34.8, 35.1, 35.4], // consent ticks pop in on the first three leads
  label: 35.7, // "Consent on record" (leaves at labelOut)
  labelOut: 37.2,
  swap: [37.4, 37.9], // the screen pushes from the list to the dashboard
  scroll: [37.8, 38.6], // the dashboard scrolls up to the product ranking
  storeA: 38.6, // chip "Store A"
  storeB: 39.6, // the same ranking for the other store
  shift: [40.2, 40.9], // the tablet steps back, the CRM card rises
  fly: [40.6, 41.3], // a lead flies from the tablet into the CRM ...
  land: 41.3, // ... and lands as a row
  fly2: [42.0, 42.5], // the next one, quicker: every lead lands
  land2: 42.5,
  out: 43.4, // pushed back as the consultants' phone arrives
} as const;

// ── consultants: the product knowledge base on the phone ────────────────────────────────────
// /consulente "Consultant Training": a searchable list of product guides, then one guide (what the customer sees, the manager's video,
// two insights, the manager's advice). The camera stays on the phone; the content scrolls.
export const CONSULT = {
  enter: 43.6, // the phone arrives (whip from the tablet)
  settle: 44.4, // in place, showing the product list
  lean: [44.7, 45.4], // the camera leans in on the header, the search and the first products
  search: [45.4, 46.9], // call-out on the search box
  tap: 47.0, // a finger taps the third product
  push: [47.1, 47.6], // list → guide
  top: 47.6, // the guide: name, "Updated", what the customer sees
  scroll1: [49.0, 49.7], // down to the manager's video
  video: [49.7, 51.2], // the video block holds (a call-out names it)
  scroll2: [51.2, 52.0], // down to the insights and the manager's advice
  advice: [52.0, 53.3], // the manager's advice holds (a call-out names it)
  pull: [53.2, 53.8], // the camera steps back as the diagram arrives
} as const;

// ── system diagram: how it is built ─────────────────────────────────────────────────────────
export const SYSTEM = {
  nodes: [54.0, 54.4, 54.8, 55.2, 55.4], // kiosk, supabase, edge fn, e-mail, CRM relay
  packets: [54.35, 54.75, 55.15, 55.35],
  tiles: [55.8, 56.0, 56.2], // Manager, Stats, Consultants
  locks: [56.55, 56.95], // RLS (on the database node), MFA (on the Manager and Stats tiles)
  out: 57.5,
} as const;

// ── human close: the sale happens in person ─────────────────────────────────────────────────
export const HUMAN = {
  bagIn: 57.6, // cut to the bag hand-off photo
  rustle: 58.0, // the bag changes hands
  redeemed: 58.25, // "Redeemed in store" chip pops (the real mark_code_redeemed flow); stays until the photos cross
  handshakeIn: 59.5, // cross to the handshake
  clasp: 60.0, // the hands meet — bar 31 downbeat, the big resolving chord
  out: 61.3,
} as const;

// ── end card ────────────────────────────────────────────────────────────────────────────────
export const END = {
  hit: 61.0,
  shimmer: 61.2,
  tagline: 61.8,
  chips: [62.2, 62.45, 62.7, 62.95], // the four areas of the product: iPad kiosk, Manager, Stats, Consultants
  tech: 63.3,
  sparkle: 63.4,
  note: 62.2, // the near-invisible disclosure line (the in-store stills are AI-generated); it stays to the end
  fadeOut: [63.9, DURATION_S],
} as const;

// ── copy ────────────────────────────────────────────────────────────────────────────────────
// CAPTIONS are burned in by components/Caption.tsx (most LinkedIn viewers watch muted). SCENE_TEXT is copy that a scene draws itself
// (hook, lock-up, call-outs, chips, end card); it lives here so the subtitle file and the reading-time audit see all of it.
export const CAPTIONS = [
  { from: 6.1, to: 8.9, text: "Turns idle in-store iPads into a <em>touchpoint.</em>" },
  { from: 14.6, to: 20.4, text: "Eight swipes. <em>One match.</em>" },
  { from: 22.3, to: 25.4, text: "One tap to <em>claim the match.</em>" },
  { from: 27.8, to: 31.4, text: "A personalised email with a <em>unique code.</em>" },
  { from: 34.4, to: 37.3, text: "Every claimed match <em>becomes a lead.</em>" },
  { from: 37.3, to: 40.4, text: "See what sells, <em>store by store.</em>" },
  { from: 40.4, to: 43.4, text: "Leads land <em>in the CRM.</em>" },
  { from: 44.6, to: 47.5, text: "Train new consultants, <em>product by product.</em>" },
  { from: 47.5, to: 50.4, text: "Video, tips and <em>the manager's advice.</em>" },
  { from: 50.4, to: 53.4, text: "A quick refresher <em>before the customer arrives.</em>" },
  { from: 54.0, to: 57.6, text: "Multi-store. <em>Row-level security</em> on every table." },
  { from: 57.8, to: 61.0, text: "Technology that keeps<br/>the in-store moment <em>human.</em>" },
] as const;

export const SCENE_TEXT = [
  { from: 0.12, to: 2.0, text: "Too many gadgets." },
  { from: 2.05, to: 4.0, text: "One perfect match." },
  { from: LOCKUP.tagline, to: 6.4, text: "Product discovery for physical retail" },
  { from: 8.7, to: 10.0, text: "5 languages" },
  { from: IPAD.callGdpr[0], to: IPAD.callGdpr[1], text: "GDPR consent, captured at the source" },
  { from: 58.25, to: 59.8, text: "Redeemed in store" },
  { from: 61.8, to: 64.0, text: "Built for the whole store." },
  { from: END.note, to: 64.0, text: "In-store scenes are AI-generated illustrations." },
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
