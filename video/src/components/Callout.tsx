import React from "react";
import { COLORS, FONT, TYPE } from "../theme";
import { EASE, clamp, prog } from "../lib/motion";
import { WIDTH } from "../timeline";

export type CalloutProps = {
  /** Target rectangle on the canvas (centre x/y, size). */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  icon?: React.ReactNode;
  /** 0..1 visibility envelope (0 → hidden, 1 → fully shown). */
  p: number;
  side?: "below" | "above";
  /** Fix the label's top (canvas px) instead of placing it next to the ring. */
  labelTop?: number;
  radius?: number;
};

/**
 * "Look here" annotation: a rounded ring that draws itself around a UI element, a soft glow, a short stem and a
 * glass label pill with an icon. All geometry is passed in canvas pixels so it can follow a zooming camera.
 */
export const Callout: React.FC<CalloutProps> = ({ x, y, w, h, label, icon, p, side = "below", labelTop, radius = 26 }) => {
  if (p <= 0.001) return null;
  const draw = EASE.out(prog(p, 0, 0.7));
  const pad = 12;
  const rw = w + pad * 2;
  const rh = h + pad * 2;
  const labelH = 78;
  const labelW = 120 + label.length * 19.5;
  const lx = clamp(x - labelW / 2, 28, WIDTH - 28 - labelW);
  const ly = labelTop ?? (side === "below" ? y + rh / 2 + 44 : y - rh / 2 - 44 - labelH);
  const hasLabel = label.length > 0;
  const stemFrom = side === "below" ? y + rh / 2 : y - rh / 2;
  const stemTo = side === "below" ? ly : ly + labelH;
  const labelP = EASE.out(prog(p, 0.12, 0.62));
  return (
    <>
      <svg
        style={{ position: "absolute", left: 0, top: 0, width: WIDTH, height: 1350, overflow: "visible", pointerEvents: "none", opacity: clamp(p * 1.6) }}
        viewBox={`0 0 ${WIDTH} 1350`}
      >
        <defs>
          <linearGradient id="callout-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={COLORS.cyan} />
            <stop offset="1" stopColor={COLORS.teal} />
          </linearGradient>
          <filter id="callout-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect
          x={x - rw / 2}
          y={y - rh / 2}
          width={rw}
          height={rh}
          rx={radius}
          fill="none"
          stroke="url(#callout-grad)"
          strokeWidth={4}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          filter="url(#callout-glow)"
        />
        <rect x={x - rw / 2} y={y - rh / 2} width={rw} height={rh} rx={radius} fill={`rgba(34,211,238,${0.07 * draw})`} />
        {hasLabel && <line
          x1={clamp(x, lx + 40, lx + labelW - 40)}
          y1={stemFrom}
          x2={clamp(x, lx + 40, lx + labelW - 40)}
          y2={stemTo}
          stroke="url(#callout-grad)"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={labelP}
          strokeDasharray="1 9"
        />}
      </svg>
      {hasLabel && <div
        style={{
          position: "absolute",
          left: lx,
          top: ly,
          height: labelH,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 30px 0 14px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: TYPE.label,
          letterSpacing: "-0.01em",
          color: COLORS.text,
          background: "linear-gradient(160deg, rgba(14,24,58,.88), rgba(8,14,36,.9))",
          border: "1.5px solid rgba(94,234,212,.5)",
          boxShadow: "0 22px 60px rgba(0,0,0,.55), 0 0 44px rgba(34,211,238,.28), inset 0 1px 0 rgba(255,255,255,.12)",
          opacity: labelP,
          transform: `translateY(${(1 - labelP) * 16}px) scale(${0.92 + 0.08 * labelP})`,
          transformOrigin: "50% 50%",
        }}
      >
        <span
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #5eead4, #22d3ee)",
            color: "#06101f",
            boxShadow: "0 0 24px rgba(34,211,238,.55)",
          }}
        >
          {icon}
        </span>
        {label}
      </div>}
    </>
  );
};
