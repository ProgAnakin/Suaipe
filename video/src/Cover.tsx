import React from "react";
import { AbsoluteFill, Img } from "remotion";
import "./fonts";
import { still } from "./assets";
import { Backdrop } from "./components/Backdrop";
import { IpadFrame } from "./components/Devices";
import { FilmGrade } from "./components/FilmGrade";
import { GradientText } from "./components/GradientText";
import { LogoMark } from "./components/LogoMark";
import { PhotoScreen, PhotoStage, coverPose } from "./components/PhotoStage";
import { HANDOFF_FG, HANDOFF_QUAD, PHOTO } from "./people";
import { HEIGHT, WIDTH } from "./timeline";
import { COLORS, FONT } from "./theme";

/** Alternative thumbnail (1080x1350): brand, the claim, the real result screen on a tilted iPad — no people. */
export const CoverDevice: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONT }}>
    <Backdrop time={22.5} />

    {/* halo behind the device */}
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 560,
        width: 960,
        height: 960,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,.4) 0%, rgba(59,130,246,.2) 38%, rgba(59,130,246,0) 66%)",
      }}
    />

    {/* the real result screen; the device runs off the bottom edge on purpose */}
    <div style={{ position: "absolute", inset: 0, perspective: 2400, perspectiveOrigin: "50% 55%" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translate(8px, 250px) rotateY(-11deg) rotateX(6deg) rotateZ(1.2deg) scale(0.98)", transformOrigin: "50% 30%" }}>
        <IpadFrame glow={0.9} sheen={0.6}>
          <Img src={still("result")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </IpadFrame>
      </div>
    </div>

    {/* bottom fade so the device sinks into the frame */}
    <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 300, background: "linear-gradient(rgba(7,10,26,0), rgba(7,10,26,.94) 70%)" }} />

    {/* brand row */}
    <div style={{ position: "absolute", left: 0, top: 50, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <LogoMark size={64} glow={0.4} />
      <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: "0.2em" }}>
        <GradientText>SUAIPE</GradientText>
      </div>
    </div>

    <div style={{ position: "absolute", left: 0, top: 150, width: "100%", textAlign: "center", fontWeight: 700, fontSize: 106, lineHeight: 1.04, letterSpacing: "-0.035em", color: COLORS.text }}>
      Eight swipes.
      <br />
      <GradientText>One perfect match.</GradientText>
    </div>

    <div style={{ position: "absolute", left: 0, bottom: 56, width: "100%", textAlign: "center", fontWeight: 500, fontSize: 34, color: COLORS.textSoft }}>
      Product discovery for physical retail
    </div>

    <FilmGrade grain={0.14} />
  </AbsoluteFill>
);

// the hand-off photo sits lower than cover-fit so the claim has the dark top of the frame to itself
const PUSH = 1; // 1 = cover-fit; > 1 pushes in toward the tablet
const SHIFT_Y = 190; // px the photo is moved down on the canvas
const MELT = `linear-gradient(to bottom, transparent ${SHIFT_Y - 40}px, #000 ${SHIFT_Y + 270}px)`; // photo top edge -> opaque, behind the claim

/**
 * LinkedIn thumbnail / poster frame (1080x1350): the human moment — a consultant hands the tablet to a customer — with the
 * real "perfect match" screen of the app lit up inside the glass, under the claim.
 */
export const Cover: React.FC = () => {
  const pose = coverPose(PHOTO.handoff, PUSH, [PHOTO.handoff.w / 2, PHOTO.handoff.h / 2], [WIDTH / 2, HEIGHT / 2 + SHIFT_Y]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep, fontFamily: FONT }}>
      <Backdrop time={22.5} />

      {/* the photograph melts into the navy at the top */}
      <PhotoStage
        photo={PHOTO.handoff}
        pose={pose}
        style={{ WebkitMaskImage: MELT, maskImage: MELT }}
      >
        <PhotoScreen photo={PHOTO.handoff} quad={HANDOFF_QUAD} on={1} fg={HANDOFF_FG}>
          <Img src={still("result")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </PhotoScreen>
      </PhotoStage>

      {/* brand grade: navy cast, vignette, floor fade for the footer line */}
      <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(14,24,72,.4), rgba(8,14,40,.12) 55%, rgba(8,70,90,.26))", mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(4,7,20,.6) 100%)" }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 300, background: "linear-gradient(rgba(7,10,26,0), rgba(7,10,26,.94) 70%)" }} />

      {/* brand row */}
      <div style={{ position: "absolute", left: 0, top: 50, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <LogoMark size={64} glow={0.4} />
        <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: "0.2em" }}>
          <GradientText>SUAIPE</GradientText>
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, top: 150, width: "100%", textAlign: "center", fontWeight: 700, fontSize: 106, lineHeight: 1.04, letterSpacing: "-0.035em", color: COLORS.text }}>
        Eight swipes.
        <br />
        <GradientText>One perfect match.</GradientText>
      </div>

      <div style={{ position: "absolute", left: 0, bottom: 56, width: "100%", textAlign: "center", fontWeight: 500, fontSize: 34, color: COLORS.textSoft }}>
        Product discovery for physical retail
      </div>

      <FilmGrade grain={0.14} />
    </AbsoluteFill>
  );
};
