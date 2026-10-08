import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { COLORS, FONT, GRADIENT_SOFT, TYPE } from "../theme";
import { CHAPTER, LOCKUP } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, rng, seg, useSceneTime } from "../lib/motion";

const LETTERS = ["S", "U", "A", "I", "P", "E"];
const mix = (a: [number, number, number], b: [number, number, number], t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
const BLUE: [number, number, number] = [59, 130, 246];
const CYAN: [number, number, number] = [34, 211, 238];

const BURST = (() => {
  const r = rng(404);
  return Array.from({ length: 34 }, () => ({ a: r() * Math.PI * 2, v: 260 + r() * 520, s: 3 + r() * 7, life: 0.7 + r() * 0.7 }));
})();

export const LockupScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.lockup.from);
  const H = LOCKUP.hit;

  const logoP = pop(t, H, fps, { damping: 9, stiffness: 150, mass: 0.9 });
  const spread = EASE.out(prog(t, H + 0.05, H + 1.1));
  const gap = lerp(86, 20, spread);
  const lineP = EASE.out(prog(t, H + 0.75, H + 1.35));
  const tagP = EASE.out(prog(t, LOCKUP.tagline, LOCKUP.tagline + 0.6));
  const exitP = seg(t, LOCKUP.exit, CHAPTER.lockup.to, EASE.inOut);
  const ring = prog(t, H, H + 0.9);
  const sheen = prog(t, LOCKUP.shimmer, LOCKUP.shimmer + 0.85);

  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${-250 * exitP}px) scale(${lerp(1, 0.58, exitP)})`,
        transformOrigin: "540px 600px",
        opacity: 1 - clamp((exitP - 0.45) / 0.55),
      }}
    >
      {/* hit flash + shockwave */}
      <div
        style={{
          position: "absolute",
          left: 540 - 520,
          top: 470 - 520,
          width: 1040,
          height: 1040,
          borderRadius: "50%",
          opacity: hit(t, H, 7) * 0.8,
          background: "radial-gradient(circle, rgba(150,235,255,.9) 0%, rgba(34,211,238,.35) 32%, rgba(34,211,238,0) 64%)",
        }}
      />
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: 540 - 260,
            top: 470 - 260,
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: `${7 * (1 - ring)}px solid rgba(94,234,212,${0.9 * (1 - ring)})`,
            transform: `scale(${0.4 + 2.2 * EASE.out(ring)})`,
            boxShadow: `0 0 70px rgba(34,211,238,${0.55 * (1 - ring)})`,
          }}
        />
      )}
      {BURST.map((b, i) => {
        const tt = t - H;
        if (tt < 0 || tt > b.life) return null;
        const d = b.v * (1 - Math.exp(-3.2 * tt)) / 3.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + Math.cos(b.a) * d,
              top: 470 + Math.sin(b.a) * d,
              width: b.s,
              height: b.s,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#fff" : i % 3 === 1 ? COLORS.cyan : COLORS.teal,
              opacity: 1 - tt / b.life,
              boxShadow: "0 0 14px rgba(34,211,238,.9)",
            }}
          />
        );
      })}

      <div style={{ position: "absolute", left: 540 - 125, top: 470 - 125, transform: `scale(${lerp(0.3, 1, logoP)}) rotate(${(1 - logoP) * -28}deg)`, opacity: clamp(logoP * 3) }}>
        <LogoMark size={250} glow={0.55 + 0.3 * hit(t, H, 4)} sheen={sheen > 0 && sheen < 1 ? sheen : -1} aberration={16 * hit(t, H, 14)} />
      </div>

      <div style={{ position: "absolute", left: 0, top: 640, width: "100%", display: "flex", justifyContent: "center", gap, fontFamily: FONT, fontWeight: 700, fontSize: TYPE.display, lineHeight: 1 }}>
        {LETTERS.map((c, i) => {
          const p = pop(t, H + 0.1 + 0.05 * i, fps, { damping: 12, stiffness: 170 });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: mix(BLUE, CYAN, i / (LETTERS.length - 1)),
                opacity: clamp(p * 2.5),
                transform: `translateY(${(1 - p) * 70}px) scale(${lerp(0.7, 1, p)})`,
                filter: p < 0.98 ? `blur(${(1 - clamp(p)) * 9}px)` : undefined,
                textShadow: "0 0 50px rgba(59,130,246,.45)",
              }}
            >
              {c}
            </span>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 540 - 300, top: 818, width: 600 * lineP, height: 3, marginLeft: 300 * (1 - lineP), borderRadius: 3, background: GRADIENT_SOFT, opacity: 0.75, boxShadow: "0 0 18px rgba(34,211,238,.6)" }} />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 850,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: TYPE.caption,
          letterSpacing: "-0.02em",
          color: COLORS.text,
          opacity: tagP,
          transform: `translateY(${(1 - tagP) * 22}px)`,
          clipPath: `inset(0 ${(1 - tagP) * 50}% 0 ${(1 - tagP) * 50}%)`,
        }}
      >
        One question changes that.
      </div>
    </AbsoluteFill>
  );
};
