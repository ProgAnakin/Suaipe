import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { IPHONE_BODY, IphoneFrame } from "../components/Devices";
import { Callout } from "../components/Callout";
import { SampleChip } from "../components/Chips";
import { IconChart, IconSearch, IconVideo } from "../components/Icons";
import { TapRipple, TouchPoint } from "../components/Touch";
import { still } from "../assets";
import { COLORS } from "../theme";
import { CHAPTER, CONSULT } from "../timeline";
import { EASE, clamp, hit, lerp, prog, seg, useSceneTime } from "../lib/motion";
import { dirBlur, speedOf } from "../presentations";
import { StatusBar } from "./PhoneScene";
import { HEADER_CSS, K, SCREEN_H, SCREEN_W, STATUS_H, navAt, pageScale, pageToCanvas, poseAt, poseTransform, scrollAt } from "../consultTimeline";

/**
 * Consultants (BRIEF: the /consulente zone): "Consultant Training — Product knowledge base". On a phone, the way a consultant would read it
 * before the customer arrives: the searchable list of product guides, then one guide — what the customer sees, the manager's video, two
 * insights and the manager's advice. The real page (captured with invented sample guides); the camera stays on the phone while the
 * content moves under it. "Files & manuals" is still "coming soon" in the app, so the film neither shows nor promises it.
 */

// css-px rectangles of the capture (tools/capture/consult.mjs → public/app/consult-layout.json)
const R = {
  search: { x: 16, y: 81.5, w: 398, h: 42 },
  row3: { x: 16, y: 279.5, w: 398, h: 62 }, // Brevia GoPress, the product the film's customer matched
  video: { x: 16, y: 376.5, w: 398, h: 274.75 },
  advice: { x: 16, y: 1084.5, w: 398, h: 115.5 },
} as const;

const env = (t: number, [a, b]: readonly [number, number]) => Math.min(EASE.out(prog(t, a, a + 0.35)), 1 - EASE.in(prog(t, b - 0.3, b)));

const Pages: React.FC<{ t: number }> = ({ t }) => {
  const nav = navAt(t);
  const scroll = scrollAt(t);
  const pushBlur = dirBlur("consult-push", 16 * speedOf(EASE.inOut, nav), 0);
  const scrollBlur = dirBlur("consult-scroll", 0, 5 * Math.max(speedOf(EASE.inOut, prog(t, CONSULT.scroll1[0], CONSULT.scroll1[1])), speedOf(EASE.inOut, prog(t, CONSULT.scroll2[0], CONSULT.scroll2[1]))));
  // the finger that taps the third product
  const [t0, t1] = [CONSULT.tap - 0.62, CONSULT.tap + 0.62];
  const finger = t > t0 && t < t1;
  const row = { x: (R.row3.x + R.row3.w * 0.62) * K, y: (R.row3.y + R.row3.h / 2) * K };
  const fromP = { x: SCREEN_W * 0.9, y: SCREEN_H * 0.8 };
  const approach = EASE.out(prog(t, t0, CONSULT.tap - 0.06));
  const leave = EASE.in(prog(t, CONSULT.tap + 0.1, t1));
  const fx = lerp(fromP.x, row.x, approach) + 30 * leave;
  const fy = lerp(fromP.y, row.y, approach) + 40 * leave;
  const press = Math.min(clamp((t - (CONSULT.tap - 0.07)) / 0.06), 1 - clamp((t - (CONSULT.tap + 0.06)) / 0.14));
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {pushBlur.defs}
      {scrollBlur.defs}
      <div style={{ position: "absolute", left: 0, top: STATUS_H, width: SCREEN_W, height: SCREEN_H - STATUS_H, overflow: "hidden" }}>
        {/* the product list: moves away to the left, a little slower than the guide arrives, and dims */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${-0.3 * SCREEN_W * nav}px)`, filter: nav > 0 ? pushBlur.filter : undefined }}>
          <Img src={still("consult-list")} style={{ display: "block", width: SCREEN_W, height: "auto" }} />
          <div style={{ position: "absolute", inset: 0, background: "#04060f", opacity: 0.55 * nav }} />
        </div>
        {/* the guide, one tall page */}
        {nav > 0 && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `translateX(${(1 - nav) * SCREEN_W}px)`, boxShadow: "-24px 0 50px rgba(0,0,0,.55)", filter: pushBlur.filter }}>
            <div style={{ position: "absolute", left: 0, top: -scroll * K, width: SCREEN_W, filter: scrollBlur.filter }}>
              <Img src={still("consult-guide")} style={{ display: "block", width: SCREEN_W, height: "auto" }} />
            </div>
          </div>
        )}
        {/* the app's sticky header stays put while the page moves: a slice of the same capture, pinned */}
        <div style={{ position: "absolute", left: 0, top: 0, width: SCREEN_W, height: HEADER_CSS * K, overflow: "hidden", zIndex: 5, borderBottom: "1px solid rgba(143,162,207,.18)" }}>
          <Img src={still("consult-list")} style={{ position: "absolute", left: 0, top: 0, display: "block", width: SCREEN_W, height: "auto" }} />
        </div>
        {finger && <TouchPoint x={fx} y={fy} press={Math.max(0, press)} opacity={clamp((t - t0) / 0.2) * (1 - clamp((t - (CONSULT.tap + 0.1)) / 0.45))} size={58} />}
        <TapRipple x={row.x} y={row.y} p={prog(t, CONSULT.tap, CONSULT.tap + 0.6)} size={120} />
      </div>
      <StatusBar show={1} />
    </AbsoluteFill>
  );
};

const PhoneWorld: React.FC = () => {
  const t = useSceneTime(CHAPTER.consult.from);
  const pose = poseAt(t);
  const glow = 0.3 + 0.35 * hit(t, CONSULT.top, 4) + 0.3 * hit(t, CONSULT.tap, 6);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: poseTransform(pose), transformOrigin: `${IPHONE_BODY.cx}px ${IPHONE_BODY.cy}px` }}>
        <IphoneFrame glow={glow} sheen={0.15 + 0.6 * prog(t, CHAPTER.consult.from, CONSULT.pull[1])}>
          <Pages t={t} />
        </IphoneFrame>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Annotations: React.FC<{ t: number }> = ({ t }) => {
  const pose = poseAt(t);
  const s = pageScale(pose);
  const sc = scrollAt(t);
  const at = (r: { x: number; y: number; w: number; h: number }, scroll = 0) => {
    const c = pageToCanvas(pose, r.x + r.w / 2, r.y + r.h / 2, scroll);
    return { x: c.x, y: c.y, w: r.w * s, h: r.h * s };
  };
  const search = at(R.search);
  const video = at(R.video, sc);
  const advice = at(R.advice, sc);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Callout {...search} label="Search any product" icon={<IconSearch size={28} stroke={2.4} />} p={env(t, CONSULT.search)} side="below" radius={22} />
      <Callout {...video} label="Manager's video" icon={<IconVideo size={28} stroke={2.4} />} p={env(t, [CONSULT.video[0] + 0.1, CONSULT.video[1]])} side="below" radius={30} />
      <Callout {...advice} label="" p={env(t, [CONSULT.advice[0] + 0.1, CONSULT.advice[1]])} side="below" radius={30} />
    </AbsoluteFill>
  );
};

/** Canvas-pixel speed of the camera (per frame), for the motion blur. */
const camSpeed = (t: number, fps: number) => {
  const a = poseAt(t - 0.5 / fps);
  const b = poseAt(t + 0.5 / fps);
  return Math.hypot(b.tx - a.tx, b.ty - a.ty) + Math.abs(Math.log(b.z / a.z)) * 520;
};

export const ConsultScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.consult.from);
  const shutter = Math.min(250, camSpeed(t, fps) * 9);
  const sample = seg(t, CHAPTER.consult.from + 0.6, CHAPTER.consult.from + 0.9, EASE.out) * (1 - seg(t, CONSULT.pull[0], CONSULT.pull[0] + 0.3, EASE.in));
  return (
    <AbsoluteFill>
      {shutter > 25 ? (
        <CameraMotionBlur samples={8} shutterAngle={shutter}>
          <PhoneWorld />
        </CameraMotionBlur>
      ) : (
        <PhoneWorld />
      )}
      <Annotations t={t} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 250, background: "linear-gradient(rgba(7,10,26,0), rgba(7,10,26,.94) 72%)", opacity: sample, pointerEvents: "none" }} />
      <SampleChip p={sample} />
    </AbsoluteFill>
  );
};
