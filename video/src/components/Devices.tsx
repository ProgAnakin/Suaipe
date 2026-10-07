import React from "react";
import { COLORS, SCREEN } from "../theme";

/** iPad (portrait). 844x1111 body, 800x1067 screen — same ratio (3:4) as the captured 2048x2732 stills. */
export const IPAD_BODY = { w: 844, h: 1111, bezel: 22, radius: 60, cx: 540, cy: 758 } as const;

type FrameProps = {
  children?: React.ReactNode;
  /** 0..1 — brightness of the rim light / halo behind the device (pulses with the music). */
  glow?: number;
  /** -0.3..1.3 — position of the diagonal glass reflection sweeping over the screen. */
  sheen?: number;
  style?: React.CSSProperties;
};

export const IpadFrame: React.FC<FrameProps> = ({ children, glow = 0.3, sheen = 0.4, style }) => {
  const { w, h, bezel, radius } = IPAD_BODY;
  return (
    <div
      style={{
        position: "absolute",
        left: IPAD_BODY.cx - w / 2,
        top: IPAD_BODY.cy - h / 2,
        width: w,
        height: h,
        borderRadius: radius,
        background: "linear-gradient(145deg,#4a5275 0%,#232a4b 28%,#10152d 55%,#0a0e20 100%)",
        boxShadow: `0 80px 160px rgba(0,0,0,.72), 0 30px 60px rgba(0,0,0,.45), 0 0 ${110 + 90 * glow}px rgba(59,130,246,${0.16 + 0.22 * glow})`,
        ...style,
      }}
    >
      {/* aluminium rim: bright top-left edge, soft bottom-right falloff */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          boxShadow:
            "inset 0 0 0 1.5px rgba(255,255,255,.16), inset 1.5px 2px 0 rgba(255,255,255,.28), inset -1px -2px 0 rgba(0,0,0,.55)",
          pointerEvents: "none",
        }}
      />
      {/* black glass bezel */}
      <div style={{ position: "absolute", inset: 6, borderRadius: radius - 6, background: "#03050b" }} />
      {/* side buttons */}
      <div style={{ position: "absolute", right: -3.5, top: 168, width: 4, height: 74, borderRadius: 3, background: "linear-gradient(90deg,#3a4366,#202741)" }} />
      <div style={{ position: "absolute", right: -3.5, top: 262, width: 4, height: 74, borderRadius: 3, background: "linear-gradient(90deg,#3a4366,#202741)" }} />
      <div style={{ position: "absolute", left: 120, top: -3.5, width: 64, height: 4, borderRadius: 3, background: "linear-gradient(180deg,#3a4366,#202741)" }} />
      {/* front camera */}
      <div style={{ position: "absolute", left: "50%", top: 9, width: 8, height: 8, marginLeft: -4, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%,#2a3563,#0b0f22)", boxShadow: "0 0 0 1.5px #0b0f22" }} />
      {/* screen */}
      <div
        style={{
          position: "absolute",
          left: bezel,
          top: bezel,
          width: SCREEN.w,
          height: SCREEN.h,
          borderRadius: 26,
          overflow: "hidden",
          background: "#0a0f24",
        }}
      >
        {children}
        {/* glass reflection */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(115deg, rgba(255,255,255,0) ${sheen * 100 - 24}%, rgba(255,255,255,.07) ${sheen * 100}%, rgba(255,255,255,0) ${sheen * 100 + 24}%), linear-gradient(115deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,0) 30%,rgba(255,255,255,0) 72%,rgba(255,255,255,.03) 100%)`,
          }}
        />
      </div>
    </div>
  );
};

/** iPhone (portrait) — screen 440x953. */
export const IPHONE_BODY = { w: 468, h: 981, bezel: 14, radius: 72, cx: 540, cy: 760, screenW: 440, screenH: 953 } as const;

export const IphoneFrame: React.FC<FrameProps> = ({ children, glow = 0.3, sheen = 0.35, style }) => {
  const { w, h, bezel, radius } = IPHONE_BODY;
  return (
    <div
      style={{
        position: "absolute",
        left: IPHONE_BODY.cx - w / 2,
        top: IPHONE_BODY.cy - h / 2,
        width: w,
        height: h,
        borderRadius: radius,
        background: "linear-gradient(145deg,#4a5275 0%,#232a4b 30%,#10152d 58%,#0a0e20 100%)",
        boxShadow: `0 80px 160px rgba(0,0,0,.72), 0 30px 60px rgba(0,0,0,.45), 0 0 ${100 + 80 * glow}px rgba(34,211,238,${0.12 + 0.2 * glow})`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.18), inset 1.5px 2px 0 rgba(255,255,255,.3), inset -1px -2px 0 rgba(0,0,0,.55)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", inset: 5, borderRadius: radius - 5, background: "#03050b" }} />
      {/* action + volume buttons, power */}
      <div style={{ position: "absolute", left: -3.5, top: 150, width: 4, height: 34, borderRadius: 3, background: "linear-gradient(270deg,#3a4366,#202741)" }} />
      <div style={{ position: "absolute", left: -3.5, top: 210, width: 4, height: 66, borderRadius: 3, background: "linear-gradient(270deg,#3a4366,#202741)" }} />
      <div style={{ position: "absolute", left: -3.5, top: 292, width: 4, height: 66, borderRadius: 3, background: "linear-gradient(270deg,#3a4366,#202741)" }} />
      <div style={{ position: "absolute", right: -3.5, top: 238, width: 4, height: 104, borderRadius: 3, background: "linear-gradient(90deg,#3a4366,#202741)" }} />
      <div
        style={{
          position: "absolute",
          left: bezel,
          top: bezel,
          width: IPHONE_BODY.screenW,
          height: IPHONE_BODY.screenH,
          borderRadius: radius - bezel,
          overflow: "hidden",
          background: COLORS.bg,
        }}
      >
        {children}
        {/* dynamic island */}
        <div style={{ position: "absolute", left: "50%", top: 12, width: 112, height: 32, marginLeft: -56, borderRadius: 20, background: "#000", zIndex: 30 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 31,
            background: `linear-gradient(115deg, rgba(255,255,255,0) ${sheen * 100 - 22}%, rgba(255,255,255,.07) ${sheen * 100}%, rgba(255,255,255,0) ${sheen * 100 + 22}%)`,
          }}
        />
      </div>
    </div>
  );
};
