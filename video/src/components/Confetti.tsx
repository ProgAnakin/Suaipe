import React from "react";
import { rng } from "../lib/motion";
import { COLORS } from "../theme";

type Piece = {
  dx: number; dy: number; vx: number; vy: number; k: number; w: number; h: number; r0: number; spin: number; flutter: number; phase: number;
  life: number; color: string; shape: "rect" | "dot" | "streamer";
};

const COLORS_POOL = [COLORS.blue, COLORS.cyan, COLORS.teal, COLORS.violet, "#ffffff", "#7dd3fc"];

const makePieces = (count: number, seed: number, power: number, aim?: { angle: number; spread: number }): Piece[] => {
  const rand = rng(seed);
  return Array.from({ length: count }, () => {
    const upward = rand() < 0.82;
    const theta = aim
      ? ((aim.angle + (rand() - 0.5) * aim.spread) * Math.PI) / 180
      : upward
        ? -Math.PI * (0.08 + 0.84 * rand())
        : Math.PI * (rand() * 2);
    const speed = (360 + 980 * Math.pow(rand(), 0.8)) * power;
    const shapeRoll = rand();
    const shape: Piece["shape"] = shapeRoll < 0.68 ? "rect" : shapeRoll < 0.88 ? "dot" : "streamer";
    return {
      dx: Math.cos(theta),
      dy: Math.sin(theta),
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      k: 1.5 + rand() * 1.6,
      w: shape === "dot" ? 9 + rand() * 9 : shape === "streamer" ? 7 + rand() * 4 : 14 + rand() * 14,
      h: shape === "dot" ? 0 : shape === "streamer" ? 38 + rand() * 30 : 7 + rand() * 6,
      r0: rand() * 360,
      spin: (rand() < 0.5 ? -1 : 1) * (200 + rand() * 640),
      flutter: 5 + rand() * 9,
      phase: rand() * Math.PI * 2,
      life: 2.3 + rand() * 1.3,
      color: COLORS_POOL[Math.floor(rand() * COLORS_POOL.length)],
      shape,
    };
  });
};

const CACHE = new Map<string, Piece[]>();

/** Deterministic confetti burst. `t` = seconds since the burst; positions are closed-form so any frame renders alone. */
export const ConfettiBurst: React.FC<{ t: number; x: number; y: number; count?: number; seed?: number; power?: number; gravity?: number; angle?: number; spread?: number; radius?: number }> = ({
  t,
  x,
  y,
  count = 150,
  seed = 11,
  power = 1,
  gravity = 1500,
  angle,
  spread = 50,
  radius = 0,
}) => {
  if (t <= 0 || t > 4) return null;
  const key = `${count}-${seed}-${power}-${angle ?? "r"}-${spread}`;
  let pieces = CACHE.get(key);
  if (!pieces) {
    pieces = makePieces(count, seed, power, angle === undefined ? undefined : { angle, spread });
    CACHE.set(key, pieces);
  }
  return (
    <>
      {pieces.map((p, i) => {
        if (t > p.life) return null;
        const e = 1 - Math.exp(-p.k * t);
        const px = x + p.dx * radius + (p.vx * e) / p.k;
        const py = y + p.dy * radius + ((p.vy + gravity / p.k) * e) / p.k - (gravity / p.k) * t;
        const fade = Math.min(1, (p.life - t) / 0.7) * Math.min(1, t / 0.04);
        const flip = 0.18 + 0.82 * Math.abs(Math.cos(p.flutter * t + p.phase));
        const rot = p.r0 + p.spin * t;
        const common: React.CSSProperties = {
          position: "absolute",
          left: px,
          top: py,
          opacity: fade,
          background: p.color,
          boxShadow: p.color === "#ffffff" ? "0 0 10px rgba(255,255,255,.7)" : `0 0 10px ${p.color}66`,
          willChange: "transform",
        };
        if (p.shape === "dot")
          return <div key={i} style={{ ...common, width: p.w, height: p.w, borderRadius: "50%", transform: `translate(-50%,-50%) scale(${flip})` }} />;
        return (
          <div
            key={i}
            style={{
              ...common,
              width: p.w,
              height: p.h,
              borderRadius: p.shape === "streamer" ? 4 : 2,
              transform: `translate(-50%,-50%) rotate(${rot}deg) scaleY(${flip})`,
            }}
          />
        );
      })}
    </>
  );
};
