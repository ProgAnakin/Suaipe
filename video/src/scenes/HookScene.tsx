import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { product } from "../assets";
import { ProductTile } from "../components/ProductTile";
import { GradientText } from "../components/GradientText";
import { COLORS, FONT } from "../theme";
import { CHAPTER, HOOK } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, rng, seg, settle, useSceneTime } from "../lib/motion";

type TileDef = { id: string; x: number; y: number; rot: number; depth: number; popAt: number; hero?: boolean; ghost?: boolean };

const CENTER = { x: 540, y: 850 };
const HERO = { w: 560, h: 640 };

// (x, y) are tile centres on the 1080x1350 canvas; `depth` 0 = far (small, blurred, slow) … 1 = near.
// Pop order is scattered on purpose so the 10 pops read as "stuff everywhere" rather than a sweep.
const ORDER: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["lunaring-halo", 190, 480, -4, 0.7],
  ["vibewave-open", 890, 500, 4, 0.55],
  ["pulsar-recover-x", 330, 705, -3, 0.85],
  ["echobox-riff", 925, 925, 5, 0.75],
  ["aurae-pulse-pro", 545, 462, 1.5, 0.95],
  ["aeris-glow", 160, 935, -5, 0.6],
  ["voltik-snapcell", 760, 705, 3.5, 0.9],
  ["nimbus-sip", 330, 1170, -2.5, 0.65],
  ["brevia-gopress", 545, 935, 0, 1.0],
  ["lumio-air", 770, 1175, 3, 0.8],
];
const TILES: TileDef[] = [
  ...ORDER.map(([id, x, y, rot, depth], i) => ({ id, x, y, rot, depth, popAt: HOOK.tilePop[i], hero: id === "brevia-gopress" })),
  // out-of-focus extras: "too many" reads better when the wall keeps going past the frame
  { id: "aeris-glow", x: 40, y: 650, rot: 8, depth: 0.2, popAt: 0.05, ghost: true },
  { id: "echobox-riff", x: 1050, y: 700, rot: -7, depth: 0.15, popAt: 0.1, ghost: true },
  { id: "lunaring-halo", x: 70, y: 1260, rot: -9, depth: 0.18, popAt: 0.15, ghost: true },
  { id: "vibewave-open", x: 1030, y: 1270, rot: 7, depth: 0.22, popAt: 0.2, ghost: true },
];

const Tiles: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.hook.from);
  const L = HOOK.lockOn;
  return (
    <AbsoluteFill>
      {TILES.map((d, i) => {
        const p = pop(t, d.popAt, fps, { damping: 12, stiffness: 170, mass: 0.9 });
        const driftY = -t * (8 + 24 * d.depth);
        const fx = Math.sin(t * 1.1 + i * 1.7) * 9 * (0.4 + d.depth) + Math.sin(t * 3.1 + i * 2.3) * 2.5;
        const fy = Math.cos(t * 0.95 + i * 1.3) * 9 * (0.4 + d.depth) + Math.cos(t * 2.7 + i) * 2.5;
        const baseScale = 0.8 + 0.26 * d.depth;
        let x = d.x + fx;
        let y = d.y + fy + driftY + (1 - p) * 150;
        let rot = d.rot + Math.sin(t * 0.8 + i) * 1.4 + (1 - p) * -6;
        let s = baseScale * lerp(0.7, 1, p);
        let o = clamp(p * 2.2) * (d.ghost ? 0.5 : 1);
        let blur = d.depth < 0.35 ? (0.35 - d.depth) * 26 : 0;
        let glow = 0;

        if (!d.hero) {
          const out = seg(t, L + 0.015 * i, L + 0.75 + 0.015 * i, EASE.inExpo);
          x += (d.x - CENTER.x) * 0.9 * out;
          y += (d.y - CENTER.y) * 0.75 * out;
          s *= 1 - 0.4 * out;
          o *= 1 - clamp(out * 1.15);
          blur += 12 * out;
          rot += (d.x < CENTER.x ? -1 : 1) * 14 * out;
        } else {
          const mv = settle(t, L, fps, 0.95);
          x = lerp(x, CENTER.x, mv);
          y = lerp(y, CENTER.y, mv);
          rot = lerp(rot, 0, mv);
          s = lerp(s, 1, mv) * (1 + 0.012 * Math.sin(t * 2.2));
          glow = mv;
        }
        return (
          <div
            key={`${d.id}-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              opacity: o,
              transform: `rotate(${rot}deg) scale(${s})`,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              zIndex: d.hero ? 5 : d.ghost ? 0 : 2,
            }}
          >
            {d.hero ? (
              <ProductTile src={product(d.id)} glow={glow} shine={prog(t, L + 0.7, L + 1.6)} w={lerp(310, HERO.w, settle(t, L, fps, 0.95))} h={lerp(215, HERO.h, settle(t, L, fps, 0.95))} />
            ) : (
              <ProductTile src={product(d.id)} glow={glow} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Sparkle: React.FC<{ x: number; y: number; s: number; o: number; rot?: number }> = ({ x, y, s, o, rot = 0 }) => (
  <svg style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, opacity: o, transform: `rotate(${rot}deg)`, overflow: "visible" }} viewBox="-50 -50 100 100">
    <path d="M0 -48 C3 -14 14 -3 48 0 C14 3 3 14 0 48 C-3 14 -14 3 -48 0 C-14 -3 -3 -14 0 -48Z" fill="#fff" style={{ filter: "drop-shadow(0 0 8px #5eead4) drop-shadow(0 0 18px #22d3ee)" }} />
  </svg>
);

const SPARKS = (() => {
  const r = rng(77);
  return Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + r() * 0.5;
    const d = 1;
    return { x: CENTER.x + Math.cos(a) * (HERO.w / 2 + 70 + r() * 150) * d, y: CENTER.y + Math.sin(a) * (HERO.h / 2 + 40 + r() * 120) * d, s: 26 + r() * 40, at: HOOK.lockOn + 0.45 + r() * 0.7, rot: r() * 40 };
  });
})();

const Headline: React.FC<{ words: string[]; times: ReadonlyArray<number>; size: number; y: number; t: number; gradient?: boolean; slam?: boolean; dim?: number }> = ({
  words,
  times,
  size,
  y,
  t,
  gradient,
  slam,
  dim = 0,
}) => {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y - size * 0.6,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "-0.035em",
        color: COLORS.text,
        whiteSpace: "nowrap",
        opacity: 1 - 0.68 * dim,
        filter: dim > 0.01 ? `blur(${dim * 2.6}px)` : undefined,
        transform: `translateY(${-14 * dim}px) scale(${1 - 0.05 * dim})`,
      }}
    >
      {words.map((w, i) => {
        const p = slam
          ? pop(t, times[i], fps, { damping: 11, stiffness: 190, mass: 0.85 })
          : pop(t, times[i], fps, { damping: 14, stiffness: 170, mass: 0.9 });
        const inner = gradient ? <GradientText>{w}</GradientText> : w;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i === words.length - 1 ? 0 : "0.24em",
              opacity: clamp(p * 2.4),
              transform: slam ? `translateY(${(1 - p) * -40}px) scale(${lerp(1.5, 1, p)})` : `translateY(${(1 - p) * 56}px) scale(${lerp(0.9, 1, p)})`,
              filter: p < 0.98 ? `blur(${(1 - clamp(p)) * (slam ? 10 : 6)}px)` : undefined,
            }}
          >
            {inner}
          </span>
        );
      })}
    </div>
  );
};

export const HookScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.hook.from);
  const L = HOOK.lockOn;
  const mv = settle(t, L, fps, 0.95);

  // impact shake at lock-on
  const shake = hit(t, L, 13) * 9;
  const sx = Math.sin(t * 95) * shake;
  const sy = Math.cos(t * 83) * shake * 0.7;

  const dim = seg(t, L - 0.05, L + 0.35, EASE.out);
  const blurTiles = t > L - 0.06 && t < L + 1.05;

  const ringP = prog(t, L, L + 0.9);
  const rays = mv * (1 - seg(t, 3.45, 3.95, EASE.in));

  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      {/* hero halo + rotating light rays, behind the tiles */}
      <div
        style={{
          position: "absolute",
          left: CENTER.x - 560,
          top: CENTER.y - 560,
          width: 1120,
          height: 1120,
          opacity: mv * 0.95 * (1 - seg(t, 3.5, 3.95, EASE.in)),
          background: "radial-gradient(circle, rgba(34,211,238,.5) 0%, rgba(59,130,246,.22) 34%, rgba(59,130,246,0) 64%)",
          transform: `scale(${lerp(0.6, 1.08, mv)})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: CENTER.x - 640,
          top: CENTER.y - 640,
          width: 1280,
          height: 1280,
          opacity: rays * 0.55,
          background: `repeating-conic-gradient(from ${t * 18}deg, rgba(94,234,212,0) 0deg, rgba(94,234,212,.34) 6deg, rgba(94,234,212,0) 14deg, rgba(94,234,212,0) 30deg)`,
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,.95) 0%, rgba(0,0,0,0) 62%)",
          maskImage: "radial-gradient(circle, rgba(0,0,0,.95) 0%, rgba(0,0,0,0) 62%)",
          mixBlendMode: "screen",
        }}
      />
      {/* shockwave ring */}
      {ringP > 0 && ringP < 1 && (
        <div
          style={{
            position: "absolute",
            left: CENTER.x - 300,
            top: CENTER.y - 300,
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `${6 * (1 - ringP)}px solid rgba(94,234,212,${0.85 * (1 - ringP)})`,
            transform: `scale(${0.5 + 2.3 * EASE.out(ringP)})`,
            boxShadow: `0 0 60px rgba(34,211,238,${0.5 * (1 - ringP)})`,
          }}
        />
      )}

      {blurTiles ? (
        <CameraMotionBlur samples={9} shutterAngle={260}>
          <Tiles />
        </CameraMotionBlur>
      ) : (
        <Tiles />
      )}

      {/* "98% match" badge on the hero tile, same pill as in the app */}
      {(() => {
        const bp = pop(t, L + 0.55, fps, { damping: 10, stiffness: 220 });
        if (bp <= 0) return null;
        return (
          <div
            style={{
              position: "absolute",
              left: CENTER.x + HERO.w / 2 - 210,
              top: CENTER.y - HERO.h / 2 - 26,
              transform: `scale(${bp}) rotate(${(1 - bp) * 14}deg)`,
              transformOrigin: "0% 100%",
              padding: "12px 26px",
              borderRadius: 999,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 34,
              color: "#04131f",
              background: "linear-gradient(95deg,#5eead4,#22d3ee)",
              boxShadow: "0 12px 40px rgba(0,0,0,.45), 0 0 36px rgba(34,211,238,.6)",
              zIndex: 9,
              opacity: 1 - seg(t, 3.5, 3.9, EASE.in),
            }}
          >
            98% match
          </div>
        );
      })()}

      {SPARKS.map((s, i) => {
        const p = prog(t, s.at, s.at + 0.35);
        const tw = 0.55 + 0.45 * Math.sin((t - s.at) * 9 + i);
        return <Sparkle key={i} x={s.x} y={s.y} s={s.s * (0.4 + 0.6 * EASE.out(p))} o={p * tw * (1 - seg(t, 3.5, 3.9))} rot={s.rot} />;
      })}

      <Headline words={["Too", "many", "gadgets."]} times={HOOK.words1} size={100} y={128} t={t} dim={dim} />
      <Headline words={["One", "perfect", "match."]} times={HOOK.words2} size={112} y={262} t={t} gradient slam />
    </AbsoluteFill>
  );
};
