// The 15 s cut-down is the master re-used: four excerpts of it, laid end to end and joined with short cross-fades. Every excerpt is
// shifted by a whole number of beats (0.5 s), so the master's own beat grid — and with it the cue sheet — still lines up in the cut.
//
//   hook + logo     master  0.0 –  4.5   "Too many gadgets. One perfect match." and the logo hit (the flash-through included)
//   the tablet      master  7.0 –  8.0   the photographed hand-off, the fly-into the screen, the first tap
//   swipes + match  master 17.0 – 23.0   the last six swipes, the scan, the 98 % hit and the product card
//   the end card    master 61.0 – 64.5   the logo, the name of the product, "Built for the whole store.", the four areas, the fade
//
// `join` is the instant (cut time) at which the picture changes over; the cross-fade is `FADE` seconds wide and centred on it.
// Copy: only lines of the master's copy appear (the hook, the lock-up, "Eight swipes. One match.", the end card).
export const CUT_DURATION_S = 15.0;
export const FADE = 0.25;

export type Excerpt = { master: number; join: number; to: number };
/** `master` = master time that plays at cut time `join` (the start of the excerpt); `to` = cut time at which the excerpt ends. */
export const EXCERPTS: ReadonlyArray<Excerpt> = [
  { master: 0.0, join: 0.0, to: 4.5 },
  { master: 7.0, join: 4.5, to: 5.5 },
  { master: 17.0, join: 5.5, to: 11.5 },
  { master: 61.0, join: 11.5, to: CUT_DURATION_S },
];

/** Burned-in captions of the master that the cut keeps (indices into CAPTIONS): "Eight swipes. One match." */
export const CUT_CAPTIONS: ReadonlyArray<number> = [1];

/** Master time → cut time for an excerpt (a whole number of beats apart). */
export const toCut = (e: Excerpt, masterTime: number) => masterTime - e.master + e.join;
