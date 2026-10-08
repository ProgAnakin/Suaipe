import { IPHONE_BODY } from "./components/Devices";
import { CHAPTER, CONSULT } from "./timeline";
import { EASE, seg } from "./lib/motion";
import { followValues } from "./lib/camera";

/**
 * Camera of the Consultants scene. The phone stays top-aligned under the captions at zoom ~1.9 from the moment the camera leans in
 * until the diagram arrives; the CONTENT moves under it (the page push, the scrolling guide), and the camera steps back at the end.
 *
 * World transform about the phone's centre C:  translate(tx, ty) · scale(z)
 * The captured page is 430 css px wide; the phone's screen is 440 px wide, so one css px is K screen px at zoom 1.
 */
const C = { x: IPHONE_BODY.cx, y: IPHONE_BODY.cy };
export const SCREEN_W = IPHONE_BODY.screenW; // 440
export const SCREEN_H = IPHONE_BODY.screenH; // 953
export const K = SCREEN_W / 430;
export const STATUS_H = 56; // the status strip above the app (the dynamic island sits over it)
export const HEADER_CSS = 61.5; // the app's sticky header, in css px of the capture
const SCREEN_TOP_AT = 215; // canvas y of the top of the screen while zoomed: clear of the captions

export type ConsultPose = { z: number; tx: number; ty: number };
type Key = { t: number; omega?: number; lz: number; tx: number; ty: number };
const key = (t: number, z: number, topAt: number | null, omega?: number): Key => ({
  t,
  omega,
  lz: Math.log(z),
  tx: 0,
  // top-aligned: the top of the screen (ry = -SCREEN_H / 2) lands on canvas y = topAt
  ty: topAt === null ? 0 : topAt - C.y + z * (SCREEN_H / 2),
});

const KEYS: Key[] = [
  key(CHAPTER.consult.from, 1.0, null),
  key(CONSULT.lean[0], 1.9, SCREEN_TOP_AT, 7.5), // lean in
  key(CONSULT.lean[1], 1.96, SCREEN_TOP_AT, 1.4), // ... and creep slowly while the content is read
  key(CONSULT.pull[0], 1.0, null, 6.0), // step back
];

export const poseAt = (t: number): ConsultPose => {
  const v = followValues(KEYS, t, ["lz", "tx", "ty"]);
  return { z: Math.exp(v.lz), tx: v.tx, ty: v.ty };
};

export const poseTransform = (p: ConsultPose) => `translate(${p.tx}px, ${p.ty}px) scale(${p.z})`;

/** Canvas position of a point of the captured page (css px; `scroll` = how far the guide is scrolled), for a pose. */
export const pageToCanvas = (p: ConsultPose, cssX: number, cssY: number, scroll = 0) => {
  const rx = cssX * K - SCREEN_W / 2;
  const ry = STATUS_H + (cssY - scroll) * K - SCREEN_H / 2;
  return { x: C.x + p.tx + p.z * rx, y: C.y + p.ty + p.z * ry };
};
export const pageScale = (p: ConsultPose) => K * p.z;

// ── content motion ──────────────────────────────────────────────────────────────────────────
/** css px the guide is scrolled: first to the manager's video (its top 90 px below the header), then to the insights and the advice. */
const SCROLL_VIDEO = 286;
const SCROLL_ADVICE = 746; // Insight 1 at 75 css px below the page top, the advice ends at 454: inside the player-safe area
export const scrollAt = (t: number) =>
  SCROLL_VIDEO * seg(t, CONSULT.scroll1[0], CONSULT.scroll1[1], EASE.inOut) + (SCROLL_ADVICE - SCROLL_VIDEO) * seg(t, CONSULT.scroll2[0], CONSULT.scroll2[1], EASE.inOut);

/** Progress of the page push from the list to the guide. */
export const navAt = (t: number) => seg(t, CONSULT.push[0], CONSULT.push[1], EASE.inOut);
