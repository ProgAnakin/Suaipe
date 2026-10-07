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

/** LinkedIn thumbnail / poster frame (1080x1350): brand, the claim, the real result screen on a tilted iPad. */
export const Cover: React.FC = () => (
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
