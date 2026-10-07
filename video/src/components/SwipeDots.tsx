import React from "react";
import { COLORS } from "../theme";
import { EASE, clamp, hit, prog } from "../lib/motion";

/**
 * "1 … 8" progress dots that light up as each swipe lands — it makes the "Eight swipes." caption literal.
 * `landed[i]` is the film time at which swipe i registers.
 */
export const SwipeDots: React.FC<{ t: number; landed: ReadonlyArray<number>; from: number; to: number; y: number; yesIdx: ReadonlySet<number> }> = ({ t, landed, from, to, y, yesIdx }) => {
  const vis = EASE.out(prog(t, from, from + 0.35)) * (1 - EASE.in(prog(t, to - 0.3, to)));
  if (vis <= 0.01) return null;
  const d = 22;
  const gap = 16;
  const total = landed.length * d + (landed.length - 1) * gap;
  return (
    <div style={{ position: "absolute", left: 540 - total / 2, top: y, width: total, height: d, opacity: vis, transform: `translateY(${(1 - vis) * -14}px)` }}>
      {landed.map((tt, i) => {
        const done = t >= tt;
        const pulse = hit(t, tt, 8);
        const col = yesIdx.has(i) ? COLORS.teal : COLORS.blue;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * (d + gap),
              top: 0,
              width: d,
              height: d,
              borderRadius: "50%",
              boxSizing: "border-box",
              border: done ? "none" : "2px solid rgba(143,162,207,.45)",
              background: done ? col : "rgba(143,162,207,.08)",
              boxShadow: done ? `0 0 ${14 + 26 * pulse}px ${col}` : "none",
              transform: `scale(${done ? 1 + 0.55 * pulse : 1})`,
              opacity: clamp(1),
            }}
          />
        );
      })}
    </div>
  );
};
