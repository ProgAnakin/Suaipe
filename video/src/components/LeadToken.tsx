import React from "react";
import { COLORS, FONT, TYPE } from "../theme";
import { EASE, clamp, lerp, prog } from "../lib/motion";
import { IconBubble } from "./Chips";
import { IconCheck, IconUser } from "./Icons";

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, s: number): Pt => {
  const u = 1 - s;
  return {
    x: u * u * u * p0.x + 3 * u * u * s * p1.x + 3 * u * s * s * p2.x + s * s * s * p3.x,
    y: u * u * u * p0.y + 3 * u * u * s * p1.y + 3 * u * s * s * p2.y + s * s * s * p3.y,
  };
};

export const TOKEN = { w: 372, h: 66 } as const;

/**
 * One lead, as a chip, flying from the tablet to its row in the CRM along a gentle S-curve with a short light trail.
 * At the end it widens to the width of the row (`rowW`) while its content fades out under the row's own cells.
 */
export const LeadToken: React.FC<{
  t: number;
  from: Pt;
  to: Pt; // centre of the row it lands in
  fly: readonly [number, number];
  name: string;
  rowW: number;
  /** Bend of the path: >0 swings out to the right first, <0 to the left. */
  bend?: number;
  strength?: number; // 0..1: how loud the token is (the second lead is quieter)
}> = ({ t, from, to, fly, name, rowW, bend = 1, strength = 1 }) => {
  const [a, b] = fly;
  if (t < a - 0.18 || t > b + 0.4) return null;

  const s = EASE.inOut(prog(t, a, b));
  const c1 = { x: from.x + 230 * bend, y: from.y + 70 };
  const c2 = { x: to.x - 150 * bend, y: to.y - 190 };
  const pos = bez(from, c1, c2, to, s);

  const born = EASE.out(prog(t, a - 0.18, a + 0.1)); // the chip is lifted out of the tablet
  const grow = lerp(0.5, 1, EASE.out(prog(s, 0, 0.4)));
  const morph = EASE.out(prog(t, b, b + 0.22));
  const w = lerp(TOKEN.w, rowW, morph);
  const contentA = 1 - clamp(prog(t, b, b + 0.16));
  const out = 1 - clamp(prog(t, b + 0.12, b + 0.34));
  const flying = t < b;

  const trail = Array.from({ length: 11 }, (_, k) => {
    const sk = Math.max(0, s - (k + 1) * 0.026);
    const q = bez(from, c1, c2, to, sk);
    const f = 1 - (k + 1) / 12;
    return { q, f };
  });

  return (
    <>
      {flying &&
        trail.map(({ q, f }, k) => (
          <span
            key={k}
            style={{
              position: "absolute",
              left: q.x - 12 * f,
              top: q.y - 12 * f,
              width: 24 * f,
              height: 24 * f,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,.9), rgba(94,234,212,.7) 45%, rgba(34,211,238,0) 72%)",
              opacity: 0.7 * f * born * strength,
              mixBlendMode: "screen",
            }}
          />
        ))}
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: w,
          height: TOKEN.h,
          marginLeft: -w / 2,
          marginTop: -TOKEN.h / 2,
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 16px",
          boxSizing: "border-box",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: TYPE.label,
          color: COLORS.text,
          whiteSpace: "nowrap",
          background: "linear-gradient(160deg, rgba(24,40,92,.96), rgba(10,18,46,.96))",
          border: "1.5px solid rgba(94,234,212,.75)",
          boxShadow: `0 18px 50px rgba(0,0,0,.5), 0 0 ${48 * strength}px rgba(34,211,238,${0.55 * (1 - morph)})`,
          opacity: born * out,
          transform: `scale(${grow * (flying ? 1 : 1)})`,
          transformOrigin: "50% 50%",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 14, opacity: contentA }}>
          <IconBubble size={46}>
            <IconUser size={26} stroke={2.2} />
          </IconBubble>
          {name}
          <span style={{ marginLeft: 6, color: COLORS.teal, display: "inline-flex" }}>
            <IconCheck size={30} stroke={3} />
          </span>
        </span>
      </div>
    </>
  );
};
