import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { IPAD_BODY, IpadFrame } from "../components/Devices";
import { Callout } from "../components/Callout";
import { ConfettiBurst } from "../components/Confetti";
import { IconGlobe, IconLock } from "../components/Icons";
import { SCREEN } from "../theme";
import { CHAPTER, IPAD } from "../timeline";
import { LAYOUT } from "../layout";
import { CAM_KEYS, PUNCH_TIMES } from "../ipadTimeline";
import { EASE, beatPulse, flashEnv, hit, prog, seg, useSceneTime } from "../lib/motion";
import { camTranslate, followCamera, punch, screenToCanvas, type Cam } from "../lib/camera";
import { ScreenContent } from "./ipad/ScreenContent";
import { ScreenOverlays } from "./ipad/ScreenOverlays";
import { MatchRing } from "./ipad/MatchRing";
import { HandoffLayer } from "./ipad/HandoffLayer";
import { SwipeDots } from "../components/SwipeDots";
import { SWIPES } from "./ipad/screens";

const camAt = (t: number): Cam => {
  const c = followCamera(CAM_KEYS, t);
  return { ...c, z: c.z * punch(t, PUNCH_TIMES, 0.022, 0.1) };
};

/** Canvas-pixel speed of the camera (per frame) — drives how much motion blur the shot gets. */
const camSpeed = (t: number, fps: number) => {
  const a = camAt(t - 0.5 / fps);
  const b = camAt(t + 0.5 / fps);
  const ta = camTranslate(a, SCREEN.w, SCREEN.h);
  const tb = camTranslate(b, SCREEN.w, SCREEN.h);
  return Math.hypot(tb.tx - ta.tx, tb.ty - ta.ty) + Math.abs(Math.log(b.z / a.z)) * 520;
};

const callP = (t: number, [a, b]: readonly [number, number]) => Math.min(EASE.out(prog(t, a, a + 0.35)), 1 - EASE.in(prog(t, b - 0.3, b)));

/** The device with its screen, finger and call-outs: everything that moves WITH the camera (gets motion blur). */
const IpadWorld: React.FC = () => {
  const t = useSceneTime(CHAPTER.ipad.from);
  const cam = camAt(t);
  const { tx, ty } = camTranslate(cam, SCREEN.w, SCREEN.h);
  const at = (u: number, v: number) => screenToCanvas(cam, SCREEN.w, SCREEN.h, { x: IPAD_BODY.cx, y: IPAD_BODY.cy }, u, v);

  const glow = 0.28 + 0.5 * beatPulse(t, 6, 21, 6) + 0.7 * hit(t, IPAD.counterHit, 5);
  const sheen = 0.05 + 0.9 * prog(t, 5.6, 26.4);

  // call-outs follow the camera
  const lang = LAYOUT.welcome.chipsRow;
  const langC = at(lang.u, lang.v);
  const gdpr = LAYOUT.welcome.consentRow;
  const gdprC = at(gdpr.u, gdpr.v);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`, transformOrigin: `${IPAD_BODY.cx}px ${IPAD_BODY.cy}px` }}>
        <IpadFrame glow={glow} sheen={sheen}>
          <ScreenContent t={t} />
          <ScreenOverlays t={t} />
        </IpadFrame>
      </AbsoluteFill>

      <Callout
        x={langC.x}
        y={langC.y}
        w={lang.w * SCREEN.w * cam.z}
        h={lang.h * SCREEN.h * cam.z}
        label="5 languages"
        icon={<IconGlobe size={28} stroke={2.4} />}
        p={callP(t, IPAD.callLang)}
        side="below"
        radius={18}
      />
      <Callout
        x={gdprC.x}
        y={gdprC.y}
        w={gdpr.w * SCREEN.w * cam.z}
        h={gdpr.h * SCREEN.h * cam.z}
        label="GDPR consent, captured at the source"
        icon={<IconLock size={28} stroke={2.4} />}
        p={callP(t, IPAD.callGdpr)}
        side="below"
        radius={16}
      />
    </AbsoluteFill>
  );
};

/** Canvas-space layers that must stay crisp (and cheap): swipe dots, the match ring, flashes and confetti. */
const IpadOverlays: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const dh = t - IPAD.counterHit;
  const shock = prog(t, IPAD.counterHit, IPAD.counterHit + 1.0);
  const ringC = { x: 540, y: 650 };
  return (
    <AbsoluteFill>
      <SwipeDots t={t} landed={SWIPES.map((sw) => sw.accent)} from={14.9} to={20.1} y={262} yesIdx={new Set(SWIPES.flatMap((sw, i) => (sw.dir > 0 ? [i] : [])))} />

      {/* flashes: reveal of the result screen, and the 98 % hit */}
      <AbsoluteFill style={{ opacity: 0.8 * flashEnv(t, IPAD.counterStart, 0.1, 9), background: "radial-gradient(circle at 50% 48%, rgba(255,255,255,.95), rgba(120,220,255,.5) 34%, rgba(59,130,246,0) 70%)", mixBlendMode: "screen", pointerEvents: "none" }} />
      <AbsoluteFill style={{ opacity: 0.55 * hit(t, IPAD.counterHit, 8) * (t >= IPAD.counterHit ? 1 : 0), background: "radial-gradient(circle at 50% 48%, rgba(255,255,255,.9), rgba(94,234,212,.45) 30%, rgba(34,211,238,0) 66%)", mixBlendMode: "screen", pointerEvents: "none" }} />
      {shock > 0 && shock < 1 && (
        <div style={{ position: "absolute", left: ringC.x - 330, top: ringC.y - 330, width: 660, height: 660, borderRadius: "50%", border: `${9 * (1 - shock)}px solid rgba(94,234,212,${0.85 * (1 - shock)})`, transform: `scale(${1 + 1.5 * EASE.out(shock)})`, boxShadow: `0 0 80px rgba(34,211,238,${0.5 * (1 - shock)})` }} />
      )}
      <ConfettiBurst t={dh} x={ringC.x} y={ringC.y} count={170} seed={21} power={1.15} radius={300} />
      <ConfettiBurst t={dh - 0.12} x={30} y={1340} count={70} seed={5} power={1.25} angle={-62} spread={46} />
      <ConfettiBurst t={dh - 0.12} x={1050} y={1340} count={70} seed={6} power={1.25} angle={-118} spread={46} />
      <MatchRing t={t} cam={cam} />
    </AbsoluteFill>
  );
};

export const IpadScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.ipad.from);
  const shutter = Math.min(250, camSpeed(t, fps) * 9);
  // the CSS iPad stays hidden while the hand-off photo is on screen, then takes over from it
  const reveal = seg(t, IPAD.handoff.zoom[1] - 0.1, IPAD.handoff.out, EASE.inOut);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: reveal }}>
      {shutter > 25 ? (
        <CameraMotionBlur samples={8} shutterAngle={shutter}>
          <IpadWorld />
        </CameraMotionBlur>
      ) : (
        <IpadWorld />
      )}
      </AbsoluteFill>
      <HandoffLayer />
      <IpadOverlays t={t} cam={camAt(t)} />
    </AbsoluteFill>
  );
};
