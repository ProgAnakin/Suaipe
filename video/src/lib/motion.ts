import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT } from "../timeline";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of `t` between a and b (clamped). */
export const prog = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));

export const EASE = {
  lin: (t: number) => t,
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-like settle
  outCubic: Easing.bezier(0.215, 0.61, 0.355, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  inOutSoft: Easing.bezier(0.45, 0, 0.15, 1),
  in: Easing.bezier(0.55, 0.055, 0.675, 0.19),
  inExpo: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1), // overshoots once
} as const;

/** Eased 0..1 progress of t between a and b. */
export const seg = (t: number, a: number, b: number, ease: (x: number) => number = EASE.inOut) => ease(prog(t, a, b));

/** Spring pop-in: 0 before `at`, then 0 -> 1 with a small overshoot. `t` in seconds. */
export const pop = (
  t: number,
  at: number,
  fps: number,
  config: { damping?: number; stiffness?: number; mass?: number } = { damping: 13, stiffness: 160, mass: 0.9 },
) => {
  const frame = (t - at) * fps;
  if (frame <= 0) return 0;
  return spring({ frame, fps, config });
};

/** Smooth, overshoot-free spring step (damping 200) — good for layout moves. */
export const settle = (t: number, at: number, fps: number, durationS = 0.8) => {
  const frame = (t - at) * fps;
  if (frame <= 0) return 0;
  return spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.round(durationS * fps) });
};

/** Exponential decay pulse that jumps to 1 at `at`. */
export const hit = (t: number, at: number, decay = 6) => (t < at ? 0 : Math.exp(-(t - at) * decay));

/** Beat-synced pulse (1 on the beat, decaying) active between from..to; amplitude fades at the edges. */
export const beatPulse = (t: number, from: number, to: number, decay = 5) => {
  if (t < from || t > to) return 0;
  const phase = ((t - from) / BEAT) % 1;
  const edge = Math.min(prog(t, from, from + 0.4), 1 - prog(t, to - 0.4, to));
  return Math.exp(-phase * decay) * edge;
};

/** Absolute film time (seconds) inside a scene whose sequence starts at `chapterFrom`. */
export const useSceneTime = (chapterFrom: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps + chapterFrom;
};

/** Piecewise-linear keyframes (seconds -> value) with an easing applied per segment. */
export const keyframes = (t: number, keys: ReadonlyArray<readonly [number, number]>, ease: (x: number) => number = EASE.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb] = keys[i + 1];
    if (t <= b) return lerp(va, vb, ease(prog(t, a, b)));
  }
  return keys[keys.length - 1][1];
};

/** Deterministic PRNG (mulberry32) so particle fields are identical in every render worker. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
