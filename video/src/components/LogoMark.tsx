import React from "react";
import { CanvasImage, Img, useVideoConfig } from "remotion";
import { chromaticAberration } from "@remotion/effects/chromatic-aberration";
import { LOGO } from "../assets";

/** The glass "S" with an optional halo and a shine band that is masked to the logo's own silhouette. */
export const LogoMark: React.FC<{ size: number; glow?: number; sheen?: number; aberration?: number; style?: React.CSSProperties }> = ({ size, glow = 0.5, sheen = -1, aberration = 0, style }) => {
  const { fps } = useVideoConfig();
  return (
  <div style={{ position: "relative", width: size, height: size, ...style }}>
    <div
      style={{
        position: "absolute",
        left: -size * 0.9,
        top: -size * 0.9,
        width: size * 2.8,
        height: size * 2.8,
        borderRadius: "50%",
        opacity: glow,
        background: "radial-gradient(circle, rgba(59,130,246,.62) 0%, rgba(34,211,238,.22) 34%, rgba(34,211,238,0) 62%)",
      }}
    />
    {aberration > 0.3 ? (
      // RGB split on impact (WebGL effect, only rendered while it is visible)
      <CanvasImage
        src={LOGO}
        premountFor={fps}
        effects={[chromaticAberration({ amount: aberration, angle: 0 })]}
        style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 ${size * 0.16}px rgba(59,130,246,.65))` }}
      />
    ) : (
      <Img src={LOGO} style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 ${size * 0.16}px rgba(59,130,246,.65))` }} />
    )}
    {sheen >= 0 && sheen <= 1 && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: `url(${LOGO})`,
          maskImage: `url(${LOGO})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          background: `linear-gradient(105deg, rgba(255,255,255,0) ${sheen * 140 - 40}%, rgba(255,255,255,.95) ${sheen * 140 - 18}%, rgba(255,255,255,0) ${sheen * 140}%)`,
          mixBlendMode: "screen",
        }}
      />
    )}
  </div>
);
};
