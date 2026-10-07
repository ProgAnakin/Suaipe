import React from "react";

/** A fingertip on glass: translucent disc that dips when pressed (the way "show touches" renders in UI demos). */
export const TouchPoint: React.FC<{ x: number; y: number; press?: number; opacity?: number; size?: number }> = ({
  x,
  y,
  press = 0,
  opacity = 1,
  size = 96,
}) => {
  if (opacity <= 0.01) return null;
  const s = 1 - 0.18 * press;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        opacity,
        transform: `scale(${s})`,
        background: "radial-gradient(circle at 42% 38%, rgba(255,255,255,.62), rgba(255,255,255,.3) 55%, rgba(255,255,255,.18) 100%)",
        border: "2px solid rgba(255,255,255,.75)",
        boxShadow: `0 ${16 - 10 * press}px ${38 - 22 * press}px rgba(0,0,0,.5), 0 0 0 ${6 + 10 * press}px rgba(255,255,255,${0.08 + 0.1 * press})`,
        pointerEvents: "none",
      }}
    />
  );
};

/** Expanding ring where a tap lands. p: 0..1 */
export const TapRipple: React.FC<{ x: number; y: number; p: number; size?: number }> = ({ x, y, p, size = 180 }) => {
  if (p <= 0 || p >= 1) return null;
  const e = 1 - Math.pow(1 - p, 3);
  const d = size * (0.2 + 1.0 * e);
  return (
    <div
      style={{
        position: "absolute",
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: "50%",
        border: `${5 * (1 - 0.6 * p)}px solid rgba(255,255,255,${0.9 * (1 - p)})`,
        background: `radial-gradient(circle, rgba(255,255,255,${0.28 * (1 - p)}), rgba(255,255,255,0) 70%)`,
        pointerEvents: "none",
      }}
    />
  );
};
