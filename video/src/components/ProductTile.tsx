import React from "react";
import { Img } from "remotion";

/** Frosted-glass product card used in the hook. */
export const ProductTile: React.FC<{ src: string; w?: number; h?: number; glow?: number; shine?: number; style?: React.CSSProperties }> = ({
  src,
  w = 310,
  h = 215,
  glow = 0,
  shine = 0,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: -w / 2,
      top: -h / 2,
      width: w,
      height: h,
      borderRadius: 32,
      background: "linear-gradient(155deg, rgba(48,70,142,.62) 0%, rgba(20,30,74,.82) 60%, rgba(14,21,56,.9) 100%)",
      border: `1.5px solid rgba(${120 + 100 * glow},${150 + 80 * glow},255,${0.22 + 0.5 * glow})`,
      boxShadow: `0 34px 70px rgba(0,0,0,.5), inset 0 1.5px 0 rgba(255,255,255,.16), 0 0 ${60 * glow}px rgba(34,211,238,${0.65 * glow})`,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 38%, rgba(255,255,255,.1), rgba(255,255,255,0) 62%)",
      }}
    />
    <Img
      src={src}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        padding: 18,
        boxSizing: "border-box",
        filter: "drop-shadow(0 16px 20px rgba(0,0,0,.5))",
      }}
    />
    {shine > 0 && shine < 1 && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 170 - 50}%, rgba(255,255,255,.34) ${shine * 170 - 28}%, rgba(255,255,255,0) ${shine * 170 - 6}%)`,
          mixBlendMode: "screen",
        }}
      />
    )}
  </div>
);
