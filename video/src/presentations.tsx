import React from "react";
import { AbsoluteFill, Solid, useVideoConfig } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { lightLeak } from "@remotion/effects/light-leak";
import { EASE, clamp, lerp } from "./lib/motion";

/**
 * Scene-to-scene choreography. Each presentation receives the two scenes (entering / exiting) and a 0..1 progress,
 * and decides how they move. Keeping this out of the scenes means every scene stays previewable on its own.
 */

type Empty = Record<string, never>;
type PresentationComponent = React.FC<TransitionPresentationComponentProps<Empty>>;
const make = (component: PresentationComponent): (() => TransitionPresentation<Empty>) => () => ({ component, props: {} });

/** Anisotropic blur (SVG filter) — a cheap, good-looking stand-in for motion blur on a fast slide. */
const dirBlur = (id: string, bx: number, by: number) => ({
  defs: (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={`${Math.max(0, bx).toFixed(2)} ${Math.max(0, by).toFixed(2)}`} />
      </filter>
    </svg>
  ),
  filter: bx > 0.4 || by > 0.4 ? `url(#${id})` : undefined,
});

/** Speed (0..~1) of an eased curve at p — used to scale the blur. */
const speedOf = (ease: (x: number) => number, p: number) => Math.min(1, Math.abs(ease(clamp(p + 0.025)) - ease(clamp(p - 0.025))) / 0.05 / 4);

// ── hook → lock-up: punch through the hero shot with a bright flash and a light leak ────────────────────────────────
const FlashThrough: PresentationComponent = ({ children, presentationProgress: p, presentationDirection }) => {
  const { width, height, fps } = useVideoConfig();
  if (presentationDirection === "exiting") {
    const e = EASE.in(p);
    return (
      <AbsoluteFill
        style={{
          transform: `scale(${1 + 0.2 * e})`,
          filter: `blur(${14 * e}px) brightness(${1 + 1.6 * e})`,
          opacity: 1 - clamp((p - 0.6) / 0.4),
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  const flash = Math.sin(Math.PI * clamp(p * 1.15)) ** 1.6;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: clamp((p - 0.35) / 0.65),
          transform: `scale(${lerp(1.07, 1, EASE.out(p))})`,
          filter: `brightness(${1 + 0.9 * (1 - p)})`,
        }}
      >
        {children}
      </AbsoluteFill>
      <Solid
        color="#000"
        width={width}
        height={height}
        premountFor={fps}
        style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: 0.95 * flash }}
        effects={[lightLeak({ progress: p, seed: 4, hueShift: 185 })]}
      />
      <AbsoluteFill
        style={{
          opacity: 0.85 * flash,
          background: "radial-gradient(circle at 50% 46%, rgba(255,255,255,.95) 0%, rgba(150,235,255,.55) 28%, rgba(59,130,246,0) 66%)",
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
export const flashThrough = make(FlashThrough);

// ── lock-up → iPad: the lock-up lifts away on its own, the iPad rises from below with a tilt ───────────────────────────
const RiseUp: PresentationComponent = ({ children, presentationProgress: p, presentationDirection }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const e = EASE.out(p);
  const blur = dirBlur("rise-blur", 0, 26 * speedOf(EASE.out, p));
  return (
    <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "50% 62%" }}>
      {blur.defs}
      <AbsoluteFill
        style={{
          transform: `translateY(${(1 - e) * 760}px) rotateX(${(1 - e) * 20}deg) scale(${lerp(0.92, 1, e)})`,
          opacity: clamp(p * 3),
          filter: blur.filter,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
export const riseUp = make(RiseUp);

// ── iPad → iPhone: whip-pan swap, iPad leaves left (tilting away), phone arrives from the right ───────────────────────
const SwapSlide: PresentationComponent = ({ children, presentationProgress: p, presentationDirection }) => {
  if (presentationDirection === "exiting") {
    const e = EASE.inOut(p);
    const blur = dirBlur("swap-out", 46 * speedOf(EASE.inOut, p), 0);
    return (
      <AbsoluteFill style={{ perspective: 2000 }}>
        {blur.defs}
        <AbsoluteFill
          style={{
            transform: `translateX(${-e * 1300}px) rotateY(${e * 28}deg) rotate(${-e * 6}deg) scale(${1 - 0.12 * e})`,
            opacity: 1 - clamp((p - 0.55) / 0.45),
            filter: blur.filter,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const e = EASE.out(p);
  const blur = dirBlur("swap-in", 46 * speedOf(EASE.out, p), 0);
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      {blur.defs}
      <AbsoluteFill
        style={{
          transform: `translateX(${(1 - e) * 1300}px) rotateY(${-(1 - e) * 24}deg) rotate(${(1 - e) * 9}deg) scale(${lerp(0.9, 1, e)})`,
          opacity: clamp(p * 3),
          filter: blur.filter,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
export const swapSlide = make(SwapSlide);

// ── iPhone → system diagram: the phone drops away, the diagram is revealed behind it ─────────────────────────────────
const DropOut: PresentationComponent = ({ children, presentationProgress: p, presentationDirection }) => {
  if (presentationDirection === "exiting") {
    const e = EASE.in(p);
    const blur = dirBlur("drop-out", 0, 30 * speedOf(EASE.in, p));
    return (
      <AbsoluteFill>
        {blur.defs}
        <AbsoluteFill style={{ transform: `translateY(${e * 640}px) rotate(${e * 7}deg) scale(${1 - 0.1 * e})`, opacity: 1 - clamp((p - 0.5) / 0.5), filter: blur.filter }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{ opacity: clamp(p * 2.2) }}>{children}</AbsoluteFill>;
};
export const dropOut = make(DropOut);

// ── system diagram → end card: everything gets pulled into the centre ───────────────────────────────────────────────
const Collapse: PresentationComponent = ({ children, presentationProgress: p, presentationDirection }) => {
  if (presentationDirection === "exiting") {
    const e = EASE.in(p);
    return (
      <AbsoluteFill style={{ transform: `scale(${1 - 0.2 * e})`, filter: `blur(${16 * e}px)`, opacity: 1 - clamp((p - 0.35) / 0.65) }}>
        {children}
      </AbsoluteFill>
    );
  }
  const e = EASE.out(p);
  return <AbsoluteFill style={{ transform: `scale(${lerp(1.1, 1, e)})`, filter: `blur(${(1 - e) * 10}px)`, opacity: clamp(p * 1.8) }}>{children}</AbsoluteFill>;
};
export const collapse = make(Collapse);

