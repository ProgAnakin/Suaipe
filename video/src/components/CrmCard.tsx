import React from "react";
import { useVideoConfig } from "remotion";
import { COLORS, FONT, MONO, TYPE } from "../theme";
import { EASE, clamp, hit, prog, settle } from "../lib/motion";
import { IconBubble } from "./Chips";
import { IconCheck, IconSheet, IconUser } from "./Icons";

export type CrmRow = {
  name: string;
  product: string;
  /** Seconds: when the row's slot opens (existing rows shift down) and when the lead lands in it. -Infinity = already there. */
  launch: number;
  land: number;
};

export const CRM = { rowH: 74, headH: 66, pad: 16, slots: 3 } as const;
/** Total height of a card with all its slots. */
export const CRM_H = CRM.headH + CRM.rowH * CRM.slots + 10;

/** y of the middle of slot `i` (canvas px), for a card whose top edge is at `cardY`. */
export const slotCenterY = (cardY: number, i: number) => cardY + CRM.headH + CRM.rowH * (i + 0.5);

/**
 * The CRM the leads end up in, drawn in the film's own style (no product UI, no logo): a header, and rows with
 * name · product · consent. New leads open a slot at the top, then land in it; older rows slide down and finally leave.
 */
export const CrmCard: React.FC<{ x: number; y: number; w: number; t: number; p: number; rows: CrmRow[] }> = ({ x, y, w, t, p, rows }) => {
  const { fps } = useVideoConfig();
  if (p <= 0.001) return null;
  const e = EASE.out(clamp(p));
  const base = rows.filter((r) => r.launch === -Infinity).sort((a, b) => b.land - a.land);
  const incoming = rows.filter((r) => r.launch > -Infinity);

  const slotOf = (r: CrmRow, baseIndex: number) => baseIndex + incoming.reduce((n, o) => (o.launch > r.launch ? n + settle(t, o.launch, fps, 0.55) : n), 0);

  const renderRow = (r: CrmRow, slot: number, key: string, fresh: number) => {
    const top = CRM.headH + slot * CRM.rowH;
    // the oldest row leaves through the bottom edge of the card
    const leaving = clamp(slot - (CRM.slots - 1));
    const cells = fresh;
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          left: CRM.pad,
          right: CRM.pad,
          top,
          height: CRM.rowH - 8,
          opacity: (1 - leaving) * cells,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 16px",
          borderRadius: 18,
          background: `linear-gradient(95deg, rgba(34,211,238,${0.18 * hit(t, r.land, 1.8)}), rgba(34,211,238,0))`,
          borderBottom: "1px solid rgba(143,162,207,.14)",
          transform: `translateX(${(1 - cells) * 24}px)`,
        }}
      >
        <IconBubble size={46}>
          <IconUser size={26} stroke={2.2} />
        </IconBubble>
        <span style={{ width: 252, fontWeight: 700, color: COLORS.text, whiteSpace: "nowrap" }}>{r.name}</span>
        <span style={{ flex: 1, fontWeight: 500, color: COLORS.textSoft, whiteSpace: "nowrap" }}>{r.product}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 46,
            padding: "0 18px 0 12px",
            borderRadius: 999,
            fontWeight: 600,
            color: COLORS.teal,
            background: "rgba(94,234,212,.1)",
            border: "1.5px solid rgba(94,234,212,.4)",
            whiteSpace: "nowrap",
          }}
        >
          <IconCheck size={26} stroke={3} />
          Consent
        </span>
      </div>
    );
  };

  // the slot that is open and waiting for the next lead (dashed outline), if any
  const open = incoming.find((r) => t >= r.launch && t < r.land + 0.15);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: CRM_H,
        borderRadius: 34,
        overflow: "hidden",
        fontFamily: FONT,
        fontSize: TYPE.label,
        background: "linear-gradient(165deg, rgba(24,34,78,.94), rgba(12,18,46,.96))",
        border: "1.5px solid rgba(94,234,212,.28)",
        boxShadow: "0 40px 100px rgba(0,0,0,.6), 0 0 90px rgba(34,211,238,.16), inset 0 1px 0 rgba(255,255,255,.1)",
        opacity: e,
        transform: `translateY(${(1 - e) * 120}px)`,
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: CRM.headH, display: "flex", alignItems: "center", gap: 14, padding: "0 28px", borderBottom: "1px solid rgba(143,162,207,.2)" }}>
        <span style={{ color: COLORS.cyan, display: "inline-flex" }}>
          <IconSheet size={36} stroke={2} />
        </span>
        <span style={{ fontWeight: 700, color: COLORS.text, letterSpacing: "0.02em" }}>CRM</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            left: CRM.pad,
            right: CRM.pad,
            top: CRM.headH,
            height: CRM.rowH - 8,
            borderRadius: 18,
            border: "2px dashed rgba(94,234,212,.55)",
            background: "rgba(34,211,238,.06)",
            opacity: clamp(settle(t, open.launch, fps, 0.4)) * (1 - prog(t, open.land, open.land + 0.15)),
          }}
        />
      )}

      {base.map((r, i) => renderRow(r, slotOf(r, i), `b${i}`, 1))}
      {incoming.map((r, i) => renderRow(r, slotOf(r, 0), `n${i}`, EASE.out(prog(t, r.land + 0.06, r.land + 0.34))))}

      {/* monospace trace line under the last row: nothing to read, just the sense of a table going on */}
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 8, height: 2, background: "linear-gradient(90deg, rgba(143,162,207,0), rgba(143,162,207,.25), rgba(143,162,207,0))", fontFamily: MONO }} />
    </div>
  );
};
