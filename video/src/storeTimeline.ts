import { IPAD_BODY } from "./components/Devices";
import { SCREEN } from "./theme";
import { ADMIN } from "./layout";
import { CHAPTER, STORE } from "./timeline";
import { EASE, seg } from "./lib/motion";
import { followValues } from "./lib/camera";

/**
 * Camera and layout of the Store-value scene. One close-up (zoom `Z_CLOSE`) stays on the screen from 30.0 s to 34.85 s while the
 * CONTENT moves under it — the page push, the scroll — and the tablet finally steps back (smaller, lifted) to make room for the CRM.
 *
 * World transform (about the tablet's centre C):  translate(0, sy) · scale(ls) · translate(tx, ty) · scale(z)
 *   z       zoom of the camera on the screen        tx, ty  its translation (canvas px, before `ls`)
 *   ls, sy  scale and lift of the whole tablet (the step back)
 */
const C = { x: IPAD_BODY.cx, y: IPAD_BODY.cy };
/** Canvas px per css px of the captured pages at zoom 1. */
export const K = SCREEN.w / ADMIN.page.w;

export const Z_CLOSE = 1.8;
/** The page point that sits in the middle of the close-up (between the first leads on the list, the top of the ranking on the dashboard) ... */
const FOCUS_CSS = { x: 512, y: 845 };
/** ... and where it lands on the canvas: clear of the captions (top) and of the player controls (bottom). */
const FOCUS_AT = { x: 540, y: 700 };

/** The tablet's resting pose while the CRM is on screen. */
export const TABLET = { ls: 0.58, centreY: 538 } as const;

export type StorePose = { z: number; tx: number; ty: number; ls: number; sy: number };
type Key = { t: number; omega?: number; lz: number; tx: number; ty: number; lls: number; sy: number };

const key = (t: number, z: number, u: number, v: number, at: { x: number; y: number }, ls = 1, sy = 0, omega?: number): Key => ({
  t,
  omega,
  lz: Math.log(z),
  tx: at.x - C.x - z * (u - 0.5) * SCREEN.w,
  ty: at.y - C.y - z * (v - 0.5) * SCREEN.h,
  lls: Math.log(ls),
  sy,
});

const FU = FOCUS_CSS.x / ADMIN.page.w;
const FV = FOCUS_CSS.y / ADMIN.page.h;

const KEYS: Key[] = [
  key(CHAPTER.store.from, 1.0, 0.5, 0.5, C, 0.94, 240), // arriving from below, a little small
  key(CHAPTER.store.from + 0.05, 1.0, 0.5, 0.5, C, 1, 0, 6), // the tablet rises into place
  key(STORE.rows - 0.05, Z_CLOSE, FU, FV, FOCUS_AT, 1, 0, 7.5), // lean in on the first leads
  key(STORE.rows + 1.0, Z_CLOSE * 1.04, FU, FV, FOCUS_AT, 1, 0, 1.5), // ... and creep slowly while they are read
  key(STORE.shift[0], 1.0, 0.5, 0.5, C, TABLET.ls, TABLET.centreY - C.y, 6.5), // step back: the whole tablet, small, up
];

export const poseAt = (t: number): StorePose => {
  const v = followValues(KEYS, t, ["lz", "tx", "ty", "lls", "sy"]);
  return { z: Math.exp(v.lz), tx: v.tx, ty: v.ty, ls: Math.exp(v.lls), sy: v.sy };
};

/** CSS transform of the tablet for a pose. */
export const poseTransform = (p: StorePose) => `translate(0px, ${p.sy}px) scale(${p.ls}) translate(${p.tx}px, ${p.ty}px) scale(${p.z})`;

/** Canvas position of a point of a captured page (css px; `scroll` = how far the page is scrolled), for a pose. */
export const pageToCanvas = (p: StorePose, cssX: number, cssY: number, scroll = 0) => {
  const rx = (cssX / ADMIN.page.w - 0.5) * SCREEN.w;
  const ry = ((cssY - scroll) / ADMIN.page.h - 0.5) * SCREEN.h;
  return { x: C.x + p.ls * (p.tx + p.z * rx), y: C.y + p.sy + p.ls * (p.ty + p.z * ry) };
};

/** Canvas px per css px of the captured pages for a pose. */
export const pageScale = (p: StorePose) => K * p.z * p.ls;

/**
 * How far (css px) the dashboard has scrolled: a short, deliberate scroll that brings the product ranking to the middle of the
 * close-up, and a little more while the tablet steps back, so the small tablet shows the ranking card (bars) rather than a cropped tile.
 */
const SCROLL_TO = 214;
const SCROLL_REST = 376;
export const scrollAt = (t: number) => SCROLL_TO * seg(t, STORE.scroll[0], STORE.scroll[1], EASE.inOut) + (SCROLL_REST - SCROLL_TO) * seg(t, STORE.shift[0], STORE.shift[1], EASE.inOut);

/** Progress of the page push from the lead list to the dashboard. */
export const navAt = (t: number) => seg(t, STORE.swap[0], STORE.swap[1], EASE.inOut);

/** Where the CRM sits once the tablet has stepped back. */
export const CRM_AT = { x: 60, y: 862, w: 960 } as const;
