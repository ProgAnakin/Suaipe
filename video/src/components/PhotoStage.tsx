import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { PhotoSpec } from "../people";
import { HEIGHT, WIDTH } from "../timeline";
import { rectToQuad, type Pt, type Quad } from "../lib/homography";
import { SCREEN } from "../theme";
import { lerp } from "../lib/motion";

/**
 * A "pose" says where a photograph sits on the canvas: the photo point `focus` lands on the canvas point `at`,
 * scaled by `s` and rotated by `rot` (radians, clockwise) around it. Interpolating two poses is a camera move.
 */
export type Pose = { s: number; rot: number; focus: Pt; at: Pt };

/** Cover-fit pose (photo fills the canvas), optionally pushed in by `push` (1 = none) toward `focus`. */
export const coverPose = (photo: PhotoSpec, push = 1, focus: Pt = [photo.w / 2, photo.h / 2], at: Pt = [WIDTH / 2, HEIGHT / 2]): Pose => ({
  s: Math.max(WIDTH / photo.w, HEIGHT / photo.h) * push,
  rot: 0,
  focus,
  at,
});

export const mixPose = (a: Pose, b: Pose, e: number): Pose => ({
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), e)),
  rot: lerp(a.rot, b.rot, e),
  focus: [lerp(a.focus[0], b.focus[0], e), lerp(a.focus[1], b.focus[1], e)],
  at: [lerp(a.at[0], b.at[0], e), lerp(a.at[1], b.at[1], e)],
});

/** Where a photo point lands on the canvas under `p` (so overlays can stay glued to the hands while the picture moves). */
export const photoToCanvas = (p: Pose, pt: Pt): Pt => {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const dx = (pt[0] - p.focus[0]) * p.s;
  const dy = (pt[1] - p.focus[1]) * p.s;
  return [p.at[0] + c * dx - s * dy, p.at[1] + s * dx + c * dy];
};

export const poseTransform = (p: Pose) =>
  `translate(${p.at[0]}px, ${p.at[1]}px) rotate(${p.rot}rad) scale(${p.s}) translate(${-p.focus[0]}px, ${-p.focus[1]}px)`;

/** The photograph on the canvas. Children live in PHOTO space (they move and scale with the picture). */
export const PhotoStage: React.FC<{ photo: PhotoSpec; pose: Pose; children?: React.ReactNode; style?: React.CSSProperties }> = ({ photo, pose, children, style }) => (
  <AbsoluteFill style={{ overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: photo.w, height: photo.h, transformOrigin: "0 0", transform: poseTransform(pose) }}>
      <Img src={photo.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {children}
    </div>
  </AbsoluteFill>
);

const polygon = (q: Quad, inset = 0) => {
  const cx = q.reduce((a, p) => a + p[0], 0) / 4;
  const cy = q.reduce((a, p) => a + p[1], 0) / 4;
  return `polygon(${q
    .map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      return `${x - (dx / d) * inset}px ${y - (dy / d) * inset}px`;
    })
    .join(", ")})`;
};

/**
 * Puts live UI inside the glass of a photographed tablet: the content (800x1067 css px) is warped onto the quad with a
 * homography, the photo's own reflections are screen-blended back on top, and a soft glow spills onto the fingers.
 * `on` 0..1 is the screen waking up; `glass` 0..1 is how much of the photographed glass (reflections, spill) is left;
 * `fg` puts the fingers back in front of the screen.
 */
export const PhotoScreen: React.FC<{
  photo: PhotoSpec;
  quad: Quad;
  on: number;
  children: React.ReactNode;
  radius?: number;
  glass?: number;
  /** RGBA cut-out of the fingers that cover the glass (same size as the photo): drawn above the UI, faded with `fgOpacity`. */
  fg?: string;
  fgOpacity?: number;
}> = ({ photo, quad, on, children, radius = 24, glass = 1, fg, fgOpacity = 1 }) => {
  const m = rectToQuad(SCREEN.w, SCREEN.h, quad);
  const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: SCREEN.w, height: SCREEN.h, transformOrigin: "0 0", transform: m };
  return (
    <>
      {/* light the screen throws on the hands and the room */}
      <div style={{ ...layer, background: "#3d6bff", filter: "blur(46px)", opacity: 0.42 * on * glass, mixBlendMode: "screen", borderRadius: radius }} />
      <div style={{ ...layer, overflow: "hidden", borderRadius: radius, background: "#05070f" }}>
        <div style={{ position: "absolute", inset: 0, opacity: on, filter: `brightness(${0.55 + 0.45 * on})` }}>{children}</div>
      </div>
      {/* the glass: reflections from the photograph itself, added on top of the lit screen */}
      <Img
        src={photo.src}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "screen", clipPath: polygon(quad, 3), opacity: 0.9 * glass }}
      />
      {fg && fgOpacity > 0.001 && <Img src={fg} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: fgOpacity }} />}
    </>
  );
};

/** Brand grade over a photograph (canvas space): navy cast, vignette, and a gradient where captions sit. */
export const PhotoGrade: React.FC<{ strength?: number; topScrim?: number; bottomFade?: number }> = ({ strength = 1, topScrim = 0.9, bottomFade = 0 }) => (
  <>
    <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(14,24,72,.45), rgba(8,14,40,.18) 55%, rgba(8,70,90,.3))", mixBlendMode: "soft-light", opacity: strength }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(4,7,20,.62) 100%)" }} />
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 380, background: `linear-gradient(rgba(10,15,36,${topScrim}) 0%, rgba(10,15,36,${topScrim * 0.55}) 45%, rgba(10,15,36,0) 100%)` }} />
    {bottomFade > 0 && <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 420, background: `linear-gradient(rgba(7,10,26,0), rgba(7,10,26,${bottomFade}))` }} />}
  </>
);
