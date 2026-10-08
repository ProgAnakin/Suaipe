import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PhotoStage, coverPose } from "../components/PhotoStage";
import { PHOTO } from "../people";
import { COLORS, FONT, GRADIENT_SOFT, TYPE } from "../theme";
import { CHAPTER, HOOK } from "../timeline";
import { EASE, clamp, lerp, pop, prog, seg, useSceneTime } from "../lib/motion";

/**
 * Hook (H2): "A customer walks in. The store rarely learns who." — the store's problem, readable muted from the very first frame.
 * A soft light (the customer, no faces needed) walks the shop floor to the counter, pulses once and fades out: the unknown.
 */

// the light's route over the shop floor, in canvas px (the store photo is cover-fitted to the 1080 x 1350 canvas)
const ROUTE: ReadonlyArray<readonly [number, number]> = [
  [30, 1150],
  [170, 975],
  [320, 790],
  [440, 690],
  [590, 655],
];

/** Catmull-Rom through ROUTE, u in 0..1. */
const along = (u: number): readonly [number, number] => {
  const n = ROUTE.length - 1;
  const x = clamp(u) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const p0 = ROUTE[Math.max(0, i - 1)], p1 = ROUTE[i], p2 = ROUTE[i + 1], p3 = ROUTE[Math.min(n, i + 2)];
  const c = (a: number, b: number, c_: number, d: number) =>
    0.5 * (2 * b + (-a + c_) * f + (2 * a - 5 * b + 4 * c_ - d) * f * f + (-a + 3 * b - 3 * c_ + d) * f * f * f);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
};

const radius = (u: number) => lerp(54, 21, EASE.out(clamp(u))); // smaller as it walks away from the camera

const Light: React.FC<{ t: number }> = ({ t }) => {
  const u = EASE.inOut(prog(t, HOOK.walk[0], HOOK.walk[1]));
  const fade = seg(t, HOOK.fade[0], HOOK.fade[1], EASE.in);
  const arrived = t >= HOOK.walk[1];
  const breath = arrived ? 1 + 0.14 * Math.sin((t - HOOK.walk[1]) * 6.5) : 1;
  const vis = 1 - fade;
  if (vis <= 0.002) return null;
  const [x, y] = along(u);
  const r = radius(u) * breath * (1 - 0.55 * fade);
  const pulse = prog(t, HOOK.pulse, HOOK.pulse + 0.9);

  const trail = Array.from({ length: 14 }, (_, k) => {
    const uk = Math.max(0, u - 0.028 * (k + 1));
    const [tx, ty] = along(uk);
    const a = Math.pow(1 - (k + 1) / 15, 1.7) * 0.5 * (u > 0.02 && u < 0.999 ? 1 : 0);
    return { tx, ty, a, r: radius(uk) * (1 - 0.045 * k) };
  });

  return (
    <AbsoluteFill style={{ opacity: vis, pointerEvents: "none" }}>
      {trail.map((s, k) =>
        s.a > 0.01 ? (
          <div key={k} style={{ position: "absolute", left: s.tx - s.r, top: s.ty - s.r, width: s.r * 2, height: s.r * 2, borderRadius: "50%", background: "radial-gradient(circle, rgba(94,234,212,.9), rgba(34,211,238,0) 70%)", opacity: s.a }} />
        ) : null,
      )}
      {/* its reflection on the polished floor */}
      <div style={{ position: "absolute", left: x - r * 2.2, top: y + r * 1.6, width: r * 4.4, height: r * 1.2, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(34,211,238,.55), rgba(34,211,238,0) 70%)", filter: "blur(6px)", opacity: 0.7 }} />
      <div style={{ position: "absolute", left: x - r * 4.2, top: y - r * 4.2, width: r * 8.4, height: r * 8.4, borderRadius: "50%", background: "radial-gradient(circle, rgba(94,234,212,.5), rgba(34,211,238,.16) 40%, rgba(34,211,238,0) 68%)", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "radial-gradient(circle, #ffffff 0%, #bff7ff 38%, rgba(94,234,212,.9) 62%, rgba(34,211,238,0) 100%)", boxShadow: "0 0 36px rgba(94,234,212,.9)" }} />
      {pulse > 0 && pulse < 1 && (
        <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${3 * (1 - pulse)}px solid rgba(190,247,255,${0.85 * (1 - pulse)})`, transform: `scale(${1 + 6 * EASE.out(pulse)})` }} />
      )}
    </AbsoluteFill>
  );
};

const gradientText: React.CSSProperties = { background: GRADIENT_SOFT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };

export const HookScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.hook.from);

  // slow push-in toward the counter, graded into the brand (navy cast, vignette, a scrim under the copy)
  const k = EASE.inOutSoft(prog(t, 0, 4));
  const pose = coverPose(PHOTO.store, 1 + 0.07 * k, [lerp(480, 560, k), lerp(640, 690, k)]);
  const dim = seg(t, HOOK.fade[0], HOOK.fade[1] + 0.3, EASE.inOut);
  const gather = seg(t, HOOK.gather - 0.2, HOOK.gap[0], EASE.inOut);

  // copy: line 1 is on screen from the first frame; line 2 arrives word by word and the light's fade lands on its last word
  const line1 = 1 - seg(t, HOOK.line1Out - 0.3, HOOK.line1Out, EASE.in);
  const words2 = [
    { w: "The", at: HOOK.line2 },
    { w: "store", at: HOOK.line2 + 0.1 },
    { w: "rarely", at: HOOK.line2 + 0.2 },
    { w: "learns", at: HOOK.line2 + 0.5 },
    { w: "who.", at: HOOK.line2 + 0.62 },
  ];

  return (
    <AbsoluteFill>
      <PhotoStage photo={PHOTO.store} pose={pose} />
      <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(14,24,72,.5), rgba(8,14,40,.2) 55%, rgba(8,70,90,.34))", mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(4,7,20,.5) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 620, background: "linear-gradient(rgba(7,10,26,.82) 0%, rgba(7,10,26,.58) 48%, rgba(7,10,26,0) 100%)" }} />
      <AbsoluteFill style={{ background: `rgba(7,10,26,${0.16 * dim})` }} />

      <Light t={t} />

      {/* light gathering at the centre just before the flash */}
      <AbsoluteFill style={{ opacity: 0.75 * gather, background: "radial-gradient(circle at 50% 52%, rgba(190,247,255,.55), rgba(34,211,238,.22) 30%, rgba(34,211,238,0) 62%)", mixBlendMode: "screen" }} />

      <div style={{ position: "absolute", left: 0, top: 110, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: TYPE.caption, letterSpacing: "-0.02em", color: COLORS.textSoft, opacity: line1, transform: `translateY(${-10 * (1 - line1)}px)` }}>
        A customer walks in.
      </div>

      <div style={{ position: "absolute", left: 0, top: 215, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: TYPE.headline, lineHeight: 1.08, letterSpacing: "-0.035em", color: COLORS.text }}>
        {[words2.slice(0, 3), words2.slice(3)].map((line, li) => (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {line.map((x, i) => {
              const p = pop(t, x.at, fps, { damping: 14, stiffness: 170, mass: 0.9 });
              const last = li === 1 && i === line.length - 1;
              return (
                <span
                  key={x.w}
                  style={{
                    display: "inline-block",
                    marginRight: i === line.length - 1 ? 0 : "0.24em",
                    opacity: clamp(p * 2.4),
                    transform: `translateY(${(1 - p) * 34}px) scale(${lerp(0.9, 1, p)})`,
                    filter: p < 0.98 ? `blur(${(1 - clamp(p)) * 8}px)` : undefined,
                    ...(last ? { ...gradientText, textShadow: "none" } : {}),
                  }}
                >
                  {x.w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
