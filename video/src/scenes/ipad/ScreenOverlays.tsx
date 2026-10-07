import React from "react";
import { SCREEN } from "../../theme";
import { IPAD } from "../../timeline";
import { LAYOUT, type Box } from "../../layout";
import { EASE, clamp, hit, lerp, prog } from "../../lib/motion";
import { TapRipple, TouchPoint } from "../../components/Touch";
import { SWIPES } from "./screens";

/** Everything here lives in SCREEN space (800x1067 css px) so it scales and moves with the iPad. */
const px = (u: number, v: number) => ({ x: u * SCREEN.w, y: v * SCREEN.h });
const boxPx = (b: Box) => ({ x: (b.u - b.w / 2) * SCREEN.w, y: (b.v - b.h / 2) * SCREEN.h, w: b.w * SCREEN.w, h: b.h * SCREEN.h });

type Tap = { at: number; box: Box; from: { u: number; v: number } };
const TAPS: Tap[] = [
  { at: IPAD.tap1, box: LAYOUT.attract.startBtn, from: { u: 0.92, v: 1.02 } },
  { at: IPAD.tap2, box: LAYOUT.welcome.startBtn, from: { u: 0.9, v: 1.0 } },
  { at: IPAD.tap3, box: LAYOUT.tutorial.ready, from: { u: 0.85, v: 1.0 } },
  { at: IPAD.tap4, box: LAYOUT.result.wantIt, from: { u: 0.9, v: 1.04 } },
];

type Finger = { x: number; y: number; press: number; opacity: number };

const tapFinger = (t: number, tap: Tap): Finger | null => {
  const a0 = tap.at - 0.62;
  const a1 = tap.at - 0.06;
  const l0 = tap.at + 0.1;
  const l1 = tap.at + 0.62;
  if (t < a0 || t > l1) return null;
  const target = { u: tap.box.u + 0.01, v: tap.box.v + 0.004 };
  let u: number;
  let v: number;
  let opacity = 1;
  if (t < a1) {
    const e = EASE.out(prog(t, a0, a1));
    u = lerp(tap.from.u, target.u, e);
    v = lerp(tap.from.v, target.v, e) - 0.012 * Math.sin(Math.PI * e); // gentle arc
    opacity = clamp((t - a0) / 0.2);
  } else if (t <= l0) {
    u = target.u;
    v = target.v;
  } else {
    const e = EASE.in(prog(t, l0, l1));
    u = lerp(target.u, tap.from.u, e * 0.6);
    v = lerp(target.v, tap.from.v, e * 0.6);
    opacity = 1 - clamp((t - l0) / 0.45);
  }
  const press = Math.min(clamp((t - (tap.at - 0.07)) / 0.06), 1 - clamp((t - (tap.at + 0.06)) / 0.14));
  const p = px(u, v);
  return { x: p.x, y: p.y, press: Math.max(0, press), opacity };
};

const swipeFinger = (t: number): Finger | null => {
  for (const s of SWIPES) {
    const a = s.from - 0.15;
    if (t < a || t > s.to + 0.03) continue;
    const p = clamp((t - s.from) / (s.to - s.from));
    // pointer path used by the capture (tools/capture, MAX_OFF = 1500): offset in css px of the 1024 px wide viewport
    const off = p <= 0 ? 0 : 8 + 1492 * Math.pow(p, 1.6);
    const u = 0.5 + (s.dir * off) / 1024;
    const pos = px(u, LAYOUT.quiz.card.v + 0.02);
    const opacity = clamp((t - a) / 0.09) * (1 - clamp((t - (s.to - 0.1)) / 0.12));
    return { x: pos.x, y: pos.y, press: t >= s.from - 0.04 ? 1 : clamp((t - a) / 0.15) * 0.6, opacity };
  }
  return null;
};

export const ScreenOverlays: React.FC<{ t: number }> = ({ t }) => {
  const fingers = [...TAPS.map((tp) => tapFinger(t, tp)), swipeFinger(t)].filter((f): f is Finger => !!f);

  // language chips: a highlight hops IT → EN → PT → ES → FR on the beat
  const chipIdx = IPAD.chipTicks.reduce((acc, tt, i) => (t >= tt ? i : acc), -1);
  const chipsOn = chipIdx >= 0 && t < IPAD.callLang[1] + 0.1;
  const chipBox = chipsOn ? boxPx(LAYOUT.welcome.chips[chipIdx]) : null;
  const chipPop = chipsOn ? hit(t, IPAD.chipTicks[chipIdx], 9) : 0;
  const chipFade = 1 - clamp((t - (IPAD.callLang[1] - 0.2)) / 0.3);

  // flash on the pressed button
  const flashes = TAPS.map((tp) => ({ b: boxPx(tp.box), a: hit(t, tp.at, 10) * (t >= tp.at ? 1 : 0) }));

  // product-card shine while the camera visits it
  const shine = prog(t, 23.0, 23.75);
  const pc = boxPx(LAYOUT.result.productCard);

  // success pulse around the envelope
  const env = px(LAYOUT.success.envelope.u, LAYOUT.success.envelope.v);
  const pulse = (k: number) => prog(t, IPAD.successChime + k * 0.18, IPAD.successChime + k * 0.18 + 0.9);

  // attract screen: the "TAP TO START" button glows invitingly until it is pressed
  const ab = boxPx(LAYOUT.attract.startBtn);
  const inviting = t > 6.0 && t < IPAD.tap1 + 0.2 ? (0.4 + 0.6 * (0.5 + 0.5 * Math.sin((t - 6.0) * 6.5))) * clamp((t - 6.0) / 0.4) * (1 - clamp((t - IPAD.tap1) / 0.2)) : 0;

  return (
    <>
      {inviting > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: ab.x - 50,
            top: ab.y - 36,
            width: ab.w + 100,
            height: ab.h + 72,
            borderRadius: 60,
            background: "radial-gradient(ellipse at 50% 50%, rgba(34,211,238,.55), rgba(59,130,246,.2) 50%, rgba(59,130,246,0) 72%)",
            opacity: 0.55 * inviting,
            mixBlendMode: "screen",
          }}
        />
      )}
      {chipBox && (
        <div
          style={{
            position: "absolute",
            left: chipBox.x - 4,
            top: chipBox.y - 3,
            width: chipBox.w + 8,
            height: chipBox.h + 6,
            borderRadius: 12,
            border: "1.5px solid rgba(94,234,212,.95)",
            boxShadow: `0 0 ${12 + 16 * chipPop}px rgba(34,211,238,${0.6 + 0.35 * chipPop}), inset 0 0 12px rgba(94,234,212,.35)`,
            background: `rgba(94,234,212,${0.1 + 0.18 * chipPop})`,
            opacity: chipFade,
            transform: `scale(${1 + 0.12 * chipPop})`,
          }}
        />
      )}

      {flashes.map((f, i) =>
        f.a > 0.01 ? (
          <div key={i} style={{ position: "absolute", left: f.b.x, top: f.b.y, width: f.b.w, height: f.b.h, borderRadius: 14, background: `rgba(255,255,255,${0.38 * f.a})`, mixBlendMode: "screen" }} />
        ) : null,
      )}

      {shine > 0 && shine < 1 && (
        <div style={{ position: "absolute", left: pc.x, top: pc.y, width: pc.w, height: pc.h, borderRadius: 22, overflow: "hidden", pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 160 - 50}%, rgba(255,255,255,.34) ${shine * 160 - 28}%, rgba(255,255,255,0) ${shine * 160 - 6}%)`,
              mixBlendMode: "screen",
            }}
          />
        </div>
      )}

      {[0, 1, 2].map((k) => {
        const p = pulse(k);
        if (p <= 0 || p >= 1) return null;
        const d = 150 + 330 * EASE.out(p);
        return <div key={k} style={{ position: "absolute", left: env.x - d / 2, top: env.y - d / 2, width: d, height: d, borderRadius: "50%", border: `${4 * (1 - p)}px solid rgba(94,234,212,${0.7 * (1 - p)})`, boxShadow: `0 0 40px rgba(34,211,238,${0.4 * (1 - p)})` }} />;
      })}

      {TAPS.map((tp, i) => {
        const p = prog(t, tp.at, tp.at + 0.6);
        const pos = px(tp.box.u + 0.01, tp.box.v + 0.004);
        return <TapRipple key={i} x={pos.x} y={pos.y} p={p} size={210} />;
      })}

      {fingers.map((f, i) => (
        <TouchPoint key={i} x={f.x} y={f.y} press={f.press} opacity={f.opacity} size={72} />
      ))}
    </>
  );
};
