import React from "react";
import { COLORS, FONT, TYPE } from "../theme";
import { EASE, clamp, prog } from "../lib/motion";
import { IconCheck } from "./Icons";

const GLASS = "linear-gradient(160deg, rgba(14,24,58,.9), rgba(8,14,36,.92))";
const TEAL_EDGE = "1.5px solid rgba(94,234,212,.5)";

/** The round gradient icon bubble used by every label of the film (call-outs, chips, ticks). */
export const IconBubble: React.FC<{ size?: number; children?: React.ReactNode }> = ({ size = 50, children }) => (
  <span
    style={{
      width: size,
      height: size,
      flex: "none",
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #5eead4, #22d3ee)",
      color: "#06101f",
      boxShadow: "0 0 24px rgba(34,211,238,.55)",
    }}
  >
    {children}
  </span>
);

/**
 * Glass label pill with an icon bubble — the film's call-out label, positioned by its horizontal centre (`cx`) and top edge.
 * `p` is the 0..1 visibility envelope; `pointer` adds a small arrow under the pill pointing at what it labels.
 */
export const LabelChip: React.FC<{
  cx: number;
  top: number;
  label: string;
  icon?: React.ReactNode;
  p: number;
  pointer?: boolean;
  height?: number;
  /** "right": `cx` is the pill's right edge instead of its centre. */
  align?: "center" | "right";
}> = ({ cx, top, label, icon, p, pointer = false, height = 78, align = "center" }) => {
  if (p <= 0.001) return null;
  const e = EASE.out(clamp(p));
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top,
        height,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: icon ? "0 30px 0 14px" : "0 30px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: TYPE.label,
        letterSpacing: "-0.01em",
        color: COLORS.text,
        background: GLASS,
        border: TEAL_EDGE,
        boxShadow: "0 22px 60px rgba(0,0,0,.55), 0 0 44px rgba(34,211,238,.28), inset 0 1px 0 rgba(255,255,255,.12)",
        opacity: e,
        transform: `translateX(${align === "right" ? -100 : -50}%) translateY(${(1 - e) * 16}px) scale(${0.92 + 0.08 * e})`,
        transformOrigin: align === "right" ? "100% 100%" : "50% 100%",
      }}
    >
      {icon && <IconBubble>{icon}</IconBubble>}
      {label}
      {pointer && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            bottom: -10,
            width: 18,
            height: 18,
            marginLeft: -9,
            transform: "rotate(45deg)",
            background: "rgb(8,14,36)",
            borderRight: TEAL_EDGE,
            borderBottom: TEAL_EDGE,
          }}
        />
      )}
    </div>
  );
};

/** A round check that pops in (one small overshoot) with a ring that spreads and fades: "consent on record". */
export const TickBadge: React.FC<{ cx: number; cy: number; t: number; at: number; size?: number }> = ({ cx, cy, t, at, size = 48 }) => {
  if (t < at) return null;
  const e = EASE.back(prog(t, at, at + 0.38));
  const ring = prog(t, at, at + 0.7);
  return (
    <>
      {ring < 1 && (
        <span
          style={{
            position: "absolute",
            left: cx - size / 2,
            top: cy - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            border: `${3 * (1 - ring)}px solid rgba(94,234,212,${0.8 * (1 - ring)})`,
            transform: `scale(${1 + 1.1 * EASE.out(ring)})`,
          }}
        />
      )}
      <span style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, transform: `scale(${e})` }}>
        <IconBubble size={size}>
          <IconCheck size={Math.round(size * 0.56)} stroke={3} />
        </IconBubble>
      </span>
    </>
  );
};

/** "Sample data" — the quiet, always-legible disclosure that the staff screens carry invented names and numbers. */
export const SampleChip: React.FC<{ p: number; cx?: number; top?: number }> = ({ p, cx = 540, top = 1186 }) => {
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top,
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 26px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: TYPE.label,
        letterSpacing: "-0.005em",
        color: COLORS.textSoft,
        background: "rgba(8,12,30,.84)",
        border: "1.5px solid rgba(251,191,36,.42)",
        boxShadow: "0 14px 40px rgba(0,0,0,.45)",
        opacity: clamp(p),
        transform: "translateX(-50%)",
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS.amber, boxShadow: "0 0 14px rgba(251,191,36,.7)" }} />
      Sample data
    </div>
  );
};
