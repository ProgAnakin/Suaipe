import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { IconCheck } from "../components/Icons";
import { PhotoGrade, PhotoStage, coverPose, photoToCanvas } from "../components/PhotoStage";
import { PHOTO } from "../people";
import { COLORS, FONT, MONO } from "../theme";
import { CHAPTER, HUMAN } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, rng, seg, useSceneTime } from "../lib/motion";

const SPARKS = (() => {
  const r = rng(515);
  return Array.from({ length: 14 }, () => ({ a: r() * Math.PI * 2, v: 160 + r() * 330, s: 4 + r() * 7, life: 0.8 + r() * 0.8 }));
})();

const CLASP: [number, number] = [520, 640]; // photo px: where the two hands meet in the handshake still

/**
 * The sale happens in person: a consultant hands over the bag with the product (the discount code is redeemed), then the
 * handshake. Real-looking photographs (hands only), pushed in slowly, graded into the brand.
 */
export const HumanScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.human.from);

  // bag hand-off
  const bagIn = seg(t, HUMAN.bagIn - 0.1, HUMAN.bagIn + 0.4, EASE.out);
  const bagOut = seg(t, HUMAN.handshakeIn, HUMAN.handshakeIn + 0.45, EASE.inOut);
  const bagK = EASE.inOutSoft(prog(t, HUMAN.bagIn, HUMAN.handshakeIn + 0.45));
  const bagPose = coverPose(PHOTO.bag, 1 + 0.15 * bagK, [lerp(480, 440, bagK), lerp(640, 420, bagK)]);

  // handshake
  const hsIn = bagOut;
  const hsOut = seg(t, HUMAN.out - 0.5, HUMAN.out, EASE.in);
  const hsK = EASE.out(prog(t, HUMAN.handshakeIn, HUMAN.out));
  const hsPose = coverPose(PHOTO.handshake, 1.02 + 0.2 * hsK, [lerp(480, 505, hsK), lerp(640, 625, hsK)]);

  // clasp: a soft bloom + ring + glints at the moment the hands meet
  const clasp = t - HUMAN.clasp;
  const claspP = prog(t, HUMAN.clasp, HUMAN.clasp + 1.1);
  const [claspX, claspY] = photoToCanvas(hsPose, CLASP); // the palms meet here in the photo; the bloom follows the push-in
  const claspC = { x: claspX, y: claspY };

  // "code redeemed" chip (the real mark_code_redeemed flow in Manager → Sessions & Codes)
  const chipP = pop(t, HUMAN.redeemed, fps, { damping: 11, stiffness: 200 });
  const chipOut = 1 - seg(t, HUMAN.handshakeIn - 0.1, HUMAN.handshakeIn + 0.25, EASE.in);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: bagIn * (1 - bagOut) }}>
        <PhotoStage photo={PHOTO.bag} pose={bagPose} />
        <PhotoGrade bottomFade={0.25} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: hsIn * (1 - hsOut) }}>
        <PhotoStage photo={PHOTO.handshake} pose={hsPose} />
        <PhotoGrade bottomFade={0.35} />
      </AbsoluteFill>

      {chipP > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: 520,
            top: 880, // on the plain navy side of the bag, clear of the hands and the product box
            transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, clamp(chipP))}) translateY(${(1 - clamp(chipP)) * 24}px)`,
            opacity: clamp(chipP * 2) * chipOut,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "16px 34px 16px 18px",
            borderRadius: 999,
            fontFamily: FONT,
            color: COLORS.text,
            background: "linear-gradient(160deg, rgba(14,24,58,.9), rgba(8,14,36,.92))",
            border: "1.5px solid rgba(94,234,212,.55)",
            boxShadow: "0 24px 60px rgba(0,0,0,.55), 0 0 46px rgba(34,211,238,.35), inset 0 1px 0 rgba(255,255,255,.12)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 58, height: 58, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#5eead4,#22d3ee)", color: "#06101f", boxShadow: "0 0 26px rgba(34,211,238,.6)" }}>
            <IconCheck size={32} stroke={3.2} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 700, fontSize: 36 }}>Code redeemed in store</span>
            <span style={{ marginTop: 6, fontFamily: MONO, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", color: COLORS.textSoft }}>SUP-7F3A9C2E10</span>
          </span>
        </div>
      )}

      {/* clasp bloom */}
      {clasp > 0 && clasp < 1.2 && (
        <>
          <AbsoluteFill style={{ opacity: 0.45 * hit(t, HUMAN.clasp, 7), background: `radial-gradient(circle at ${claspC.x}px ${claspC.y}px, rgba(255,240,214,.95), rgba(255,200,140,.35) 22%, rgba(34,211,238,0) 55%)`, mixBlendMode: "screen" }} />
          {claspP < 1 && (
            <div style={{ position: "absolute", left: claspC.x - 200, top: claspC.y - 200, width: 400, height: 400, borderRadius: "50%", border: `${6 * (1 - claspP)}px solid rgba(255,230,190,${0.7 * (1 - claspP)})`, transform: `scale(${0.4 + 2.2 * EASE.out(claspP)})` }} />
          )}
          {SPARKS.map((s, i) => {
            if (clasp > s.life) return null;
            const d = (s.v * (1 - Math.exp(-3 * clasp))) / 3;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: claspC.x + Math.cos(s.a) * d,
                  top: claspC.y + Math.sin(s.a) * d * 0.8,
                  width: s.s,
                  height: s.s,
                  borderRadius: "50%",
                  background: i % 3 ? "#fff3dc" : COLORS.cyan,
                  opacity: 1 - clasp / s.life,
                  boxShadow: "0 0 14px rgba(255,220,170,.9)",
                }}
              />
            );
          })}
        </>
      )}
    </AbsoluteFill>
  );
};
