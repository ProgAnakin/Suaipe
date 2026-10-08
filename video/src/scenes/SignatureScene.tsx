import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { PHOTO } from "../people";
import { COLORS, FONT, GRADIENT_SOFT, TYPE } from "../theme";
import { CHAPTER, SIGNATURE } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, rng, useSceneTime } from "../lib/motion";

const NAME = ["COSTANZO", "ANNICHINI"];
const mix = (a: [number, number, number], b: [number, number, number], t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
const BLUE: [number, number, number] = [59, 130, 246];
const CYAN: [number, number, number] = [34, 211, 238];

const GLITTER = (() => {
  const r = rng(909);
  return Array.from({ length: 16 }, () => ({ x: 120 + r() * 840, y: 150 + r() * 1000, s: 14 + r() * 26, at: SIGNATURE.tiny + r() * 1.2, rot: r() * 45 }));
})();

// the quiet moment before the name: points of light converge on the centre and arrive with the downbeat (the hook's "light gathers", closing the loop)
const GATHER = (() => {
  const r = rng(77);
  return Array.from({ length: 24 }, () => ({ a: r() * Math.PI * 2, d: 520 + r() * 420, s: 5 + r() * 7, delay: r() * 0.3 }));
})();

const gradientText: React.CSSProperties = { background: GRADIENT_SOFT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };

/**
 * The closing card: the person behind the film. The defocused handshake stays behind, the name arrives on the downbeat
 * (the sonic motif completes there), then the thesis, a soft call to action and — barely visible, by choice — the line that
 * says the in-store scenes are AI-generated illustrations. From SIGNATURE.still nothing moves.
 */
export const SignatureScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.signature.from);
  const H = SIGNATURE.name;

  const bg = EASE.out(prog(t, CHAPTER.signature.from, SIGNATURE.glow + 0.4));
  const settle = EASE.out(prog(t, H, H + 1.2));
  const breathe = 1 + 0.01 * Math.sin(Math.min(t, SIGNATURE.still + 1.5) * 1.4) * (1 - prog(t, SIGNATURE.still, SIGNATURE.still + 1.2));
  const thesisP = EASE.out(prog(t, SIGNATURE.thesis, SIGNATURE.thesis + 0.6));
  const ctaP = EASE.out(prog(t, SIGNATURE.cta, SIGNATURE.cta + 0.6));
  const tinyP = EASE.out(prog(t, SIGNATURE.tiny, SIGNATURE.tiny + 0.8));
  const ring = prog(t, H, H + 1.1);

  let letter = 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.5 * bg, transform: `scale(${1.06 + 0.006 * Math.min(t - CHAPTER.signature.from, 3.5)})` }}>
        <Img src={PHOTO.handshake.src} style={{ position: "absolute", left: -70, top: -120, width: 1220, height: 1627, objectFit: "cover", filter: "blur(16px) brightness(0.55) saturate(1.25)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(7,10,26,.15), rgba(7,10,26,.82) 78%)" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${breathe})`, transformOrigin: "540px 600px" }}>
        <div style={{ position: "absolute", left: 540 - 700, top: 520 - 700, width: 1400, height: 1400, opacity: 0.45 * bg + 0.5 * hit(t, H, 3), background: "radial-gradient(circle, rgba(59,130,246,.5) 0%, rgba(34,211,238,.18) 36%, rgba(34,211,238,0) 62%)" }} />
        {ring > 0 && ring < 1 && (
          <div style={{ position: "absolute", left: 540 - 280, top: 470 - 280, width: 560, height: 560, borderRadius: "50%", border: `${6 * (1 - ring)}px solid rgba(94,234,212,${0.85 * (1 - ring)})`, transform: `scale(${0.4 + 2.4 * EASE.out(ring)})` }} />
        )}

        {/* the name: two lines of the wordmark's own letter treatment */}
        <div style={{ position: "absolute", left: 0, top: 360, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: FONT, fontWeight: 700, fontSize: TYPE.headline, lineHeight: 1.04 }}>
          {NAME.map((word, wi) => (
            <div key={wi} style={{ display: "flex", gap: lerp(46, 14, settle) }}>
              {word.split("").map((c, i) => {
                const k = letter++;
                const p = pop(t, H + 0.04 * k, fps, { damping: 12, stiffness: 170 });
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      color: mix(BLUE, CYAN, k / 16),
                      opacity: clamp(p * 2.5),
                      transform: `translateY(${(1 - p) * 60}px) scale(${lerp(0.7, 1, p)})`,
                      filter: p < 0.98 ? `blur(${(1 - clamp(p)) * 9}px)` : undefined,
                      textShadow: "0 0 50px rgba(59,130,246,.5)",
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 540 - 150, top: 612, width: 300 * EASE.out(prog(t, H + 0.6, H + 1.2)), marginLeft: 150 * (1 - EASE.out(prog(t, H + 0.6, H + 1.2))), height: 3, borderRadius: 3, background: GRADIENT_SOFT, boxShadow: "0 0 18px rgba(34,211,238,.6)" }} />

        {/* the thesis */}
        <div style={{ position: "absolute", left: 0, top: 664, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: TYPE.caption, lineHeight: 1.16, letterSpacing: "-0.015em", color: COLORS.text, opacity: thesisP, transform: `translateY(${(1 - thesisP) * 26}px)`, filter: thesisP < 1 ? `blur(${(1 - thesisP) * 6}px)` : undefined }}>
          Simple ideas create <span style={gradientText}>contact.</span>
          <br />
          Contact creates <span style={gradientText}>data.</span>
        </div>

        {/* soft call to action */}
        <div style={{ position: "absolute", left: 0, top: 920, width: "100%", display: "flex", justifyContent: "center", opacity: ctaP, transform: `translateY(${(1 - ctaP) * 18}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 30px", borderRadius: 999, fontFamily: FONT, fontWeight: 600, fontSize: TYPE.label, letterSpacing: "0.01em", color: COLORS.textSoft, border: "1.5px solid rgba(94,234,212,.5)", background: "rgba(14,24,58,.55)", boxShadow: "0 0 34px rgba(34,211,238,.18)" }}>
            Let's talk retail
            <span style={{ ...gradientText, fontWeight: 700 }}>→</span>
          </div>
        </div>

        {/* the near-invisible disclosure (a deliberate choice; the post carries the readable version) */}
        <div style={{ position: "absolute", left: 0, top: 1196, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: TYPE.micro, letterSpacing: "0.03em", color: COLORS.textSoft, opacity: 0.4 * tinyP }}>
          In-store scenes are AI-generated illustrations.
        </div>

        {GATHER.map((g, i) => {
          const p = prog(t, SIGNATURE.glow + g.delay, H);
          if (p <= 0 || p >= 1) return null;
          const e = EASE.in(p);
          const d = g.d * (1 - e);
          const tail = g.d * (1 - EASE.in(Math.max(0, p - 0.06)));
          const x = 540 + Math.cos(g.a) * d;
          const y = 470 + Math.sin(g.a) * d * 0.9;
          const x2 = 540 + Math.cos(g.a) * tail;
          const y2 = 470 + Math.sin(g.a) * tail * 0.9;
          const a = clamp(p * 5) * (1 - prog(p, 0.88, 1));
          return (
            <React.Fragment key={`g${i}`}>
              <div style={{ position: "absolute", left: x2 - g.s * 0.35, top: y2 - g.s * 0.35, width: g.s * 0.7, height: g.s * 0.7, borderRadius: "50%", background: COLORS.cyan, opacity: 0.35 * a, filter: "blur(2px)" }} />
              <div style={{ position: "absolute", left: x - g.s / 2, top: y - g.s / 2, width: g.s, height: g.s, borderRadius: "50%", background: "#e8fbff", opacity: 0.85 * a, boxShadow: "0 0 16px rgba(94,234,212,.9), 0 0 36px rgba(34,211,238,.6)" }} />
            </React.Fragment>
          );
        })}

        {GLITTER.map((g, i) => {
          const p = prog(t, g.at, g.at + 0.5);
          if (p <= 0 || p >= 1) return null;
          const a = Math.sin(Math.PI * p);
          return (
            <svg key={i} style={{ position: "absolute", left: g.x - g.s / 2, top: g.y - g.s / 2, width: g.s, height: g.s, opacity: a * 0.7, transform: `rotate(${g.rot + p * 40}deg) scale(${0.4 + 0.8 * a})`, overflow: "visible" }} viewBox="-50 -50 100 100">
              <path d="M0 -48 C3 -14 14 -3 48 0 C14 3 3 14 0 48 C-3 14 -14 3 -48 0 C-14 -3 -3 -14 0 -48Z" fill="#fff" style={{ filter: "drop-shadow(0 0 8px #5eead4) drop-shadow(0 0 18px #22d3ee)" }} />
            </svg>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
