import type { CamKey } from "./lib/camera";
import { CHAPTER, IPAD, swipeAccent } from "./timeline";
import { LAYOUT } from "./layout";

const L = LAYOUT;

/**
 * Camera script for the iPad chapter. Each key sets a new TARGET at time `t`; the camera glides there like a
 * critically damped spring (see lib/camera.ts), so moves overlap smoothly instead of stopping at every key.
 * `omega` ≈ speed (3 = slow drift, 9 = snappy). `fy` pushes the focus point up/down on the canvas (px).
 */
export const CAM_KEYS: CamKey[] = [
  // while the hand-off photo is up the iPad sits at the zoom the photo flies into (screen fills the canvas width)
  { t: CHAPTER.ipad.from, z: IPAD.handoff.zoomTo, u: 0.5, v: 0.5 },
  { t: 7.45, z: 1.5, u: 0.5, v: L.attract.startBtn.v - 0.02, omega: 6 }, // lean in on the button
  { t: 8.35, z: 1.9, u: 0.855, v: 0.045, fy: -250, omega: 6.5 }, // language chips
  { t: 10.0, z: 1.62, u: 0.5, v: 0.565, omega: 6 }, // the form
  { t: 11.95, z: 1.82, u: 0.46, v: 0.6, fy: -70, omega: 7 }, // GDPR checkbox
  { t: 13.1, z: 1.3, u: 0.5, v: 0.6, omega: 6 }, // START
  { t: 14.35, z: 1.5, u: 0.5, v: 0.5, omega: 5.5 }, // quiz cards
  { t: 17.5, z: 1.62, u: 0.5, v: 0.5, omega: 2.4 }, // slowly tightening through the swipes
  { t: IPAD.counterStart - 0.02, z: 4.4, u: 0.5, v: L.result.ring.v, omega: 8 }, // dive into the ring
  { t: IPAD.pullBack, z: 1.34, u: 0.5, v: 0.3, omega: 5 }, // pull back after the hit
  { t: 23.0, z: 1.8, u: 0.5, v: 0.5, omega: 6 }, // product card
  { t: 23.55, z: 1.68, u: 0.5, v: 0.74, fy: -30, omega: 7 }, // "I want it!"
  { t: 24.3, z: 1.22, u: 0.5, v: 0.4, omega: 4.5 }, // success
  { t: 25.2, z: 1.0, u: 0.5, v: 0.5, omega: 4 },
];

/** Moments that get a tiny zoom "thump": the swipe decisions and the big hit. */
export const PUNCH_TIMES: number[] = [...IPAD.swipes.map(swipeAccent), IPAD.counterHit];
