import React from "react";
import { AbsoluteFill, Img } from "remotion";
import "./fonts";
import { still } from "./assets";
import { Backdrop } from "./components/Backdrop";
import { IpadFrame } from "./components/Devices";
import { FilmGrade } from "./components/FilmGrade";
import { GradientText } from "./components/GradientText";
import { LogoMark } from "./components/LogoMark";
import { COLORS, FONT } from "./theme";

/** LinkedIn thumbnail / poster frame (1080x1350): the claim, the real result screen on a tilted iPad, the brand. */
export const Cover: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily: FONT }}>
    <Backdrop time={22.5} />

    {/* halo behind the device */}
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 470,
        width: 920,
        height: 920,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,.42) 0%, rgba(59,130,246,.2) 38%, rgba(59,130,246,0) 66%)",
      }}
    />

    <div style={{ position: "absolute", inset: 0, perspective: 2200, perspectiveOrigin: "50% 60%" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translate(12px, 372px) rotateY(-15deg) rotateX(7deg) rotateZ(1.6deg) scale(0.9)", transformOrigin: "50% 40%" }}>
        <IpadFrame glow={0.9} sheen={0.62}>
          <Img src={still("result")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </IpadFrame>
      </div>
    </div>

    {/* bottom fade so the device sinks into the frame */}
    <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 340, background: "linear-gradient(rgba(7,10,26,0), rgba(7,10,26,.92) 78%)" }} />

    <div style={{ position: "absolute", left: 0, top: 78, width: "100%", textAlign: "center", fontWeight: 700, fontSize: 118, lineHeight: 1.02, letterSpacing: "-0.035em", color: COLORS.text }}>
      Eight swipes.
      <br />
      <GradientText>One perfect match.</GradientText>
    </div>

    <div style={{ position: "absolute", left: 0, bottom: 74, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
      <LogoMark size={86} glow={0.45} />
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 700, fontSize: 56, letterSpacing: "0.16em", color: COLORS.blue }}>
          <GradientText>SUAIPE</GradientText>
        </div>
        <div style={{ marginTop: 2, fontWeight: 500, fontSize: 28, color: COLORS.textSoft }}>Product discovery for physical retail</div>
      </div>
    </div>

    <FilmGrade grain={0.2} />
  </AbsoluteFill>
);
