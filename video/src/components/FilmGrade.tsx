import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { rng } from "../lib/motion";

const GRAIN = staticFile("fx/grain.png");
const TILE = 384;

/**
 * Final "grade": a soft vignette plus a very fine animated grain. The grain is not decoration only — dark navy
 * gradients band badly in 8-bit H.264, and a ±1-2 level dither hides that completely. It is a seamless 384 px noise tile
 * (public/fx/grain.png) blended with `overlay` and re-positioned every frame: ~100x cheaper to render than a WebGL
 * noise pass at full resolution, and just as film-like.
 */
export const FilmGrade: React.FC<{ grain?: number }> = ({ grain = 0.18 }) => {
  const frame = useCurrentFrame();
  const r = rng(frame * 7919 + 13);
  const ox = Math.floor(r() * TILE);
  const oy = Math.floor(r() * TILE);
  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 54%, rgba(3,5,16,0.5) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          backgroundImage: `url(${GRAIN})`,
          backgroundSize: `${TILE}px ${TILE}px`,
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: "overlay",
          opacity: grain,
        }}
      />
    </>
  );
};
