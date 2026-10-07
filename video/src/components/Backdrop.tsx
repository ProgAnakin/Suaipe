import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { COLORS } from "../theme";
import { HEIGHT, WIDTH } from "../timeline";
import { beatPulse, EASE, keyframes, rng } from "../lib/motion";

// How "alive" the background is over the film (glow size + brightness). Peaks on the big hits.
const ENERGY: ReadonlyArray<readonly [number, number]> = [
  [0, 0.4], [3.6, 0.55], [4.0, 1.0], [4.8, 0.7], [8, 0.78], [14, 0.88], [20, 1.0], [22, 1.0], [23.5, 0.8],
  [26, 0.55], [28, 0.5], [34, 0.75], [40, 1.0], [41.8, 0.7], [44.5, 0.35],
];
// Spans where the kick drum plays (the glow breathes on every beat there)
const GROOVE: ReadonlyArray<readonly [number, number]> = [[4.0, 21.0], [22.0, 26.0], [34.0, 41.0]];

type Particle = { x: number; y: number; r: number; speed: number; depth: number; phase: number; color: string };

const makeParticles = (): Particle[] => {
  const rand = rng(20260);
  const palette = ["#ffffff", COLORS.cyan, COLORS.blue, COLORS.teal, "#a5b4fc"];
  return Array.from({ length: 46 }, () => {
    const depth = rand();
    return {
      x: rand() * WIDTH,
      y: rand() * HEIGHT,
      r: 1.2 + depth * 3.4,
      speed: 6 + depth * 26,
      depth,
      phase: rand() * Math.PI * 2,
      color: palette[Math.floor(rand() * palette.length)],
    };
  });
};
const PARTICLES = makeParticles();

export const Backdrop: React.FC<{ tint?: number; time?: number }> = ({ tint = 0, time }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = time ?? frame / fps;

  const energy = keyframes(t, ENERGY, EASE.inOut);
  const pulse = GROOVE.reduce((m, [a, b]) => Math.max(m, beatPulse(t, a, b, 6)), 0);

  const n = (seed: number, speed: number) => noise2D(String(seed), t * speed, seed * 3.1);
  const b1 = { x: 140 + n(1, 0.07) * 150, y: 120 + n(2, 0.06) * 120, s: 1100 + 160 * energy + 40 * pulse };
  const b2 = { x: 960 + n(3, 0.06) * 160, y: 1200 + n(4, 0.07) * 130, s: 1050 + 140 * energy + 40 * pulse };
  const b3 = { x: 600 + n(5, 0.05) * 220, y: 640 + n(6, 0.05) * 200, s: 900 + 120 * energy };

  const blob = (x: number, y: number, s: number, rgb: string, a: number) => (
    <div
      style={{
        position: "absolute",
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${rgb},${a}) 0%, rgba(${rgb},${a * 0.45}) 28%, rgba(${rgb},0) 62%)`,
      }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, #111a3a 0%, ${COLORS.bg} 55%, #080c1f 100%)` }} />
      {blob(b1.x, b1.y, b1.s, "59,130,246", 0.3 + 0.12 * energy + 0.05 * pulse)}
      {blob(b2.x, b2.y, b2.s, "34,211,238", 0.2 + 0.1 * energy + 0.05 * pulse + 0.06 * tint)}
      {blob(b3.x, b3.y, b3.s, "139,123,255", 0.07 + 0.05 * energy)}

      {/* faint blueprint grid, fading out towards the edges */}
      <AbsoluteFill
        style={{
          opacity: 0.55 + 0.25 * energy,
          backgroundImage:
            "linear-gradient(rgba(120,160,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,255,0.05) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `${(t * 6) % 54}px ${(t * 3) % 54}px`,
          WebkitMaskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
          maskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
        }}
      />

      {/* bokeh / dust with parallax */}
      {PARTICLES.map((p, i) => {
        const y = (((p.y - t * p.speed) % (HEIGHT + 40)) + HEIGHT + 40) % (HEIGHT + 40) - 20;
        const x = p.x + Math.sin(t * 0.35 + p.phase) * (10 + 22 * p.depth);
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (0.8 + p.depth * 1.6) + p.phase));
        const blur = p.depth > 0.72 ? 1.6 : p.depth < 0.25 ? 2.2 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.r * 2,
              height: p.r * 2,
              borderRadius: "50%",
              background: p.color,
              opacity: (0.1 + 0.34 * p.depth) * tw * (0.7 + 0.5 * energy),
              filter: blur ? `blur(${blur}px)` : undefined,
              boxShadow: p.depth > 0.6 ? `0 0 ${10 + p.depth * 10}px ${p.color}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
