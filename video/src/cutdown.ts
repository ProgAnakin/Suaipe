// The 15 s cut-down is the master re-used: four excerpts of it, laid end to end and joined with short cross-fades. Every excerpt is
// shifted by a whole number of beats (0.5 s), so the master's own beat grid — and with it the cue sheet — still lines up in the cut.
//
//   hook + logo   master  0.0 –  4.5   the problem, then the logo hit (flash-through included)
//   tablet        master  7.0 –  8.0   the photographed hand-off, the fly-in into the screen, the first tap
//   swipes + match master 15.5 – 21.0   five of the eight swipes, the scan, the 98 % hit, the product card
//   signature     master 45.5 – 49.5   the breath, the name, the thesis, the soft call to action, the still
//
// `join` is the instant (cut time) at which the picture changes over; the cross-fade is `FADE` seconds wide and centred on it.
// Copy: only lines of the approved copy appear (T1/T2 hook, T3 is cut off before it forms, T5 captions, S1/S2/S4 signature).
export const CUT_DURATION_S = 15.0;
export const FADE = 0.25;

export type Excerpt = { master: number; join: number; to: number };
/** `master` = master time that plays at cut time `join` (the start of the excerpt); `to` = cut time at which the excerpt ends. */
export const EXCERPTS: ReadonlyArray<Excerpt> = [
  { master: 0.0, join: 0.0, to: 4.5 },
  { master: 7.0, join: 4.5, to: 5.5 },
  { master: 15.5, join: 5.5, to: 11.0 },
  { master: 45.5, join: 11.0, to: CUT_DURATION_S },
];

/** Burned-in captions of the master that the cut keeps (indices into CAPTIONS): "Eight swipes. One match." */
export const CUT_CAPTIONS: ReadonlyArray<number> = [1];

/** Master time → cut time for an excerpt (a whole number of beats apart). */
export const toCut = (e: Excerpt, masterTime: number) => masterTime - e.master + e.join;
