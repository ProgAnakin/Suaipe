import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { PHOTO } from "../people";
import { LogoMark } from "../components/LogoMark";
import { IconBook, IconChart, IconSliders, IconTablet } from "../components/Icons";
import { COLORS, FONT, GRADIENT_SOFT, MONO, TYPE } from "../theme";
import { CHAPTER, END } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, rng, useSceneTime } from "../lib/motion";

// the four areas of the product (no store, city or count: those stay out of the film)
const AREAS = [
  { label: "iPad kiosk", icon: <IconTablet size={28} stroke={2.2} /> },
  { label: "Manager", icon: <IconSliders size={28} stroke={2.2} /> },
  { label: "Stats", icon: <IconChart size={28} stroke={2.2} /> },
  { label: "Consultants", icon: <IconBook size={28} stroke={2.2} /> },
];
const LETTERS = ["S", "U", "A", "I", "P", "E"];
const mix = (a: [number, number, number], b: [number, number, number], t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
const BLUE: [number, number, number] = [59, 130, 246];
const CYAN: [number, number, number] = [34, 211, 238];

const GLITTER = (() => {
  const r = rng(909);
  return Array.from({ length: 22 }, () => ({ x: 120 + r() * 840, y: 150 + r() * 1050, s: 14 + r() * 30, at: END.sparkle + r() * 1.4, rot: r() * 45 }));
})();

export const EndScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.end.from);
  const H = END.hit;
  const logoP = pop(t, H, fps, { damping: 11, stiffness: 150 });
  const spread = EASE.out(prog(t, H + 0.1, H + 1.0));
  const tagP = EASE.out(prog(t, END.tagline, END.tagline + 0.55));
  const techP = EASE.out(prog(t, END.tech, END.tech + 0.6));
  const sheen = prog(t, END.shimmer, END.shimmer + 0.9);
  const ring = prog(t, H, H + 1.0);
  const breathe = 1 + 0.012 * Math.sin(t * 1.4);

  // the handshake stays behind the lock-up, defocused and darkened: the brand sits on a human moment
  const bg = EASE.out(prog(t, END.hit - 0.6, END.hit + 0.4));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.5 * bg, transform: `scale(${1.06 + 0.012 * (t - CHAPTER.end.from)})` }}>
        <Img src={PHOTO.handshake.src} style={{ position: "absolute", left: -70, top: -120, width: 1220, height: 1627, objectFit: "cover", filter: "blur(16px) brightness(0.55) saturate(1.25)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(7,10,26,.15), rgba(7,10,26,.82) 78%)" }} />
      </AbsoluteFill>
    <AbsoluteFill style={{ transform: `scale(${breathe})`, transformOrigin: "540px 600px" }}>
      {/* light behind the lock-up */}
      <div
        style={{
          position: "absolute",
          left: 540 - 700,
          top: 520 - 700,
          width: 1400,
          height: 1400,
          opacity: 0.55 + 0.45 * hit(t, H, 3),
          background: "radial-gradient(circle, rgba(59,130,246,.5) 0%, rgba(34,211,238,.18) 36%, rgba(34,211,238,0) 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 540 - 760,
          top: 520 - 760,
          width: 1520,
          height: 1520,
          opacity: 0.38 * clamp(logoP),
          background: `repeating-conic-gradient(from ${t * 10}deg, rgba(94,234,212,0) 0deg, rgba(94,234,212,.22) 5deg, rgba(94,234,212,0) 12deg, rgba(94,234,212,0) 24deg)`,
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 60%)",
          maskImage: "radial-gradient(circle, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 60%)",
          mixBlendMode: "screen",
        }}
      />
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: 540 - 280,
            top: 400 - 280,
            width: 560,
            height: 560,
            borderRadius: "50%",
            border: `${6 * (1 - ring)}px solid rgba(94,234,212,${0.85 * (1 - ring)})`,
            transform: `scale(${0.4 + 2.4 * EASE.out(ring)})`,
          }}
        />
      )}

      <div style={{ position: "absolute", left: 540 - 130, top: 400 - 130, opacity: clamp(logoP * 3), transform: `scale(${lerp(0.4, 1, logoP)}) rotate(${(1 - logoP) * 20}deg)` }}>
        <LogoMark size={260} glow={0.6} sheen={sheen > 0 && sheen < 1 ? sheen : -1} aberration={12 * hit(t, H, 12)} />
      </div>

      <div style={{ position: "absolute", left: 0, top: 560, width: "100%", display: "flex", justifyContent: "center", gap: lerp(80, 22, spread), fontFamily: FONT, fontWeight: 700, fontSize: 150, lineHeight: 1 }}>
        {LETTERS.map((c, i) => {
          const p = pop(t, H + 0.08 + 0.05 * i, fps, { damping: 12, stiffness: 170 });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: mix(BLUE, CYAN, i / (LETTERS.length - 1)),
                opacity: clamp(p * 2.5),
                transform: `translateY(${(1 - p) * 70}px) scale(${lerp(0.7, 1, p)})`,
                filter: p < 0.98 ? `blur(${(1 - clamp(p)) * 9}px)` : undefined,
                textShadow: "0 0 60px rgba(59,130,246,.5)",
              }}
            >
              {c}
            </span>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 540 - 140, top: 742, width: 280 * EASE.out(prog(t, H + 0.7, H + 1.3)), marginLeft: 140 * (1 - EASE.out(prog(t, H + 0.7, H + 1.3))), height: 3, borderRadius: 3, background: GRADIENT_SOFT, boxShadow: "0 0 18px rgba(34,211,238,.6)" }} />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 780,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 60,
          letterSpacing: "-0.015em",
          color: COLORS.text,
          opacity: tagP,
          transform: `translateY(${(1 - tagP) * 26}px)`,
          filter: tagP < 1 ? `blur(${(1 - tagP) * 6}px)` : undefined,
        }}
      >
        Built for <span style={{ background: GRADIENT_SOFT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>the whole store.</span>
      </div>

      <div style={{ position: "absolute", left: 0, top: 900, width: "100%", display: "flex", justifyContent: "center", gap: 12, flexWrap: "nowrap", padding: "0 30px", boxSizing: "border-box" }}>
        {AREAS.map((a, i) => {
          const p = pop(t, END.chips[i], fps, { damping: 11, stiffness: 210 });
          const flash = hit(t, END.chips[i] + 0.02, 6);
          return (
            <div
              key={a.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 22px 14px 16px",
                borderRadius: 999,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 34,
                color: COLORS.text,
                background: "linear-gradient(160deg, rgba(33,48,108,.8), rgba(16,24,64,.88))",
                border: `1.5px solid rgba(94,234,212,${0.35 + 0.5 * flash})`,
                boxShadow: `0 20px 50px rgba(0,0,0,.45), 0 0 ${40 * flash}px rgba(34,211,238,.7), inset 0 1.5px 0 rgba(255,255,255,.13)`,
                opacity: clamp(p * 2),
                transform: `translateY(${(1 - p) * 40}px) scale(${lerp(0.7, 1, clamp(p))})`,
              }}
            >
              <span style={{ color: COLORS.teal, display: "inline-flex" }}>{a.icon}</span>
              {a.label}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1070,
          width: "100%",
          textAlign: "center",
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: "0.34em",
          color: COLORS.textDim,
          opacity: techP,
          transform: `translateY(${(1 - techP) * 16}px)`,
        }}
      >
        REACT · SUPABASE · PWA
      </div>

      {/* disclosure: the in-store stills are AI-generated. Deliberately tiny and quiet (the author's choice), inside the safe area */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1196,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: TYPE.micro,
          letterSpacing: "0.02em",
          color: "rgba(226,232,240,.4)",
          opacity: EASE.out(prog(t, END.note, END.note + 0.5)),
        }}
      >
        In-store scenes are AI-generated illustrations.
      </div>

      {GLITTER.map((g, i) => {
        const p = prog(t, g.at, g.at + 0.5);
        if (p <= 0 || p >= 1) return null;
        const a = Math.sin(Math.PI * p);
        return (
          <svg key={i} style={{ position: "absolute", left: g.x - g.s / 2, top: g.y - g.s / 2, width: g.s, height: g.s, opacity: a * 0.9, transform: `rotate(${g.rot + p * 40}deg) scale(${0.4 + 0.8 * a})`, overflow: "visible" }} viewBox="-50 -50 100 100">
            <path d="M0 -48 C3 -14 14 -3 48 0 C14 3 3 14 0 48 C-3 14 -14 3 -48 0 C-14 -3 -3 -14 0 -48Z" fill="#fff" style={{ filter: "drop-shadow(0 0 8px #5eead4) drop-shadow(0 0 18px #22d3ee)" }} />
          </svg>
        );
      })}
    </AbsoluteFill>
    </AbsoluteFill>
  );
};
