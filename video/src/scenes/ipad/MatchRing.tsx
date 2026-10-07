import React from "react";
import { useVideoConfig } from "remotion";
import { FONT, SCREEN } from "../../theme";
import { IPAD, counterProgress } from "../../timeline";
import { LAYOUT } from "../../layout";
import { clamp, hit, lerp, pop, prog, settle } from "../../lib/motion";
import { screenToCanvas, type Cam } from "../../lib/camera";
import { IPAD_BODY } from "../../components/Devices";

// Geometry measured from the real component (tools/capture → public/app/layout.json → result.ring):
// authored in a 120-unit viewBox, 160 css px on a 1024 px wide viewport; solid mint stroke for matches >= 90 %.
const VB = 120;
const R = 56;
const STROKE = 7;
const BOX_CSS = 160;
const VIEWPORT_W = 1024;
const MINT = "#5eead4";
const TRACK = "#273249";

/**
 * The app's match ring, redrawn as vector so it can be big and crisp. It starts as a hero element in the middle of the
 * canvas (the iPad screen behind it is defocused), counts 0 → 98 % with the same easing the sound design is tuned to,
 * and on the hit it "docks" into the exact place of the real ring on the screen (shared-element transition).
 */
export const MatchRing: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const { fps } = useVideoConfig();
  const start = IPAD.counterStart;
  if (t < start - 0.02 || t > IPAD.tap4 + 0.45) return null;

  const appear = pop(t, start, fps, { damping: 12, stiffness: 190 });
  const k = counterProgress(prog(t, IPAD.counterFillFrom, IPAD.counterHit));
  const value = Math.round(98 * k);
  const done = t >= IPAD.counterHit;

  const hero = { x: 540, y: 650, d: 660 };
  const dock = screenToCanvas(cam, SCREEN.w, SCREEN.h, { x: IPAD_BODY.cx, y: IPAD_BODY.cy }, LAYOUT.result.ring.u, LAYOUT.result.ring.v);
  const dockD = (BOX_CSS / VIEWPORT_W) * SCREEN.w * cam.z;
  const w = settle(t, IPAD.pullBack - 0.05, fps, 0.85);
  const x = lerp(hero.x, dock.x, w);
  const y = lerp(hero.y, dock.y, w);
  const D = lerp(hero.d, dockD, w);
  const bump = 1 + 0.07 * hit(t, IPAD.counterHit, 9);
  const exitFade = 1 - clamp((t - (IPAD.tap4 + 0.1)) / 0.35);

  const C = 2 * Math.PI * R;
  const frac = 0.98 * k;
  const glow = 0.35 + 0.65 * k + 0.5 * hit(t, IPAD.counterHit, 6);
  const toGradient = clamp((t - IPAD.counterHit) / 0.25); // number turns grey → brand gradient when the scan finishes
  const labelFlip = done ? 1 : 0;
  const pulse = done ? 0.2 * Math.abs(Math.cos(((t - IPAD.counterHit) / 2.5) * Math.PI)) : 0; // the app's idle pulse ring

  return (
    <div style={{ position: "absolute", left: x - D / 2, top: y - D / 2, width: D, height: D, opacity: clamp(appear * 2) * exitFade, transform: `scale(${lerp(0.6, 1, clamp(appear)) * bump})`, pointerEvents: "none" }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} width={D} height={D} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="num-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3c83f6" />
            <stop offset="1" stopColor="#20d3ee" />
          </linearGradient>
          <filter id="ring-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.2" />
          </filter>
        </defs>
        {/* gauge ticks, only while scanning (not in the app; helps the hero moment read as "measuring") */}
        {!done && <circle cx="60" cy="60" r="64.5" fill="none" stroke="rgba(94,234,212,.4)" strokeWidth="0.7" strokeDasharray="0.6 4.2" transform={`rotate(${t * 40} 60 60)`} opacity={0.9 * (1 - w)} />}
        <circle cx="60" cy="60" r={R - STROKE / 2} fill="rgba(10,16,44,.38)" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={TRACK} strokeOpacity={0.5} strokeWidth={STROKE} />
        <circle cx="60" cy="60" r={R} fill="none" stroke={MINT} strokeWidth={STROKE + 2} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" filter="url(#ring-blur)" opacity={0.6 * glow} />
        <circle cx="60" cy="60" r={R} fill="none" stroke={MINT} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" />
        {pulse > 0.005 && <circle cx="60" cy="60" r={R + 3 * (pulse / 0.2)} fill="none" stroke={MINT} strokeWidth={2} opacity={pulse} />}
        <text x="60" y="52.85" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={700} fontSize={36} style={{ fontVariantNumeric: "tabular-nums" }} fill="#c9d1e6" opacity={1 - toGradient}>
          {value}%
        </text>
        <text x="60" y="52.85" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={700} fontSize={36} style={{ fontVariantNumeric: "tabular-nums" }} fill="url(#num-grad)" opacity={toGradient}>
          {value}%
        </text>
        <text x="60" y="79.6" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={600} fontSize={7.5} fill="#98a1b3" style={{ letterSpacing: "0.75px" }}>
          {labelFlip ? "MATCH" : "SCANNING..."}
        </text>
      </svg>
    </div>
  );
};
