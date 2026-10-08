import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { Audio } from "@remotion/media";
import "./fonts";
import { SOUNDTRACK } from "./assets";
import { Backdrop } from "./components/Backdrop";
import { Captions } from "./components/Caption";
import { FilmGrade } from "./components/FilmGrade";
import { defocus, dropOut, flashThrough, passthrough, photoCut, swapSlide } from "./presentations";
import { EndScene } from "./scenes/EndScene";
import { HookScene } from "./scenes/HookScene";
import { HumanScene } from "./scenes/HumanScene";
import { IpadScene } from "./scenes/IpadScene";
import { LockupScene } from "./scenes/LockupScene";
import { PhoneScene } from "./scenes/PhoneScene";
import { SystemScene } from "./scenes/SystemScene";
import { CHAPTER, END, sec } from "./timeline";
import { EASE, prog } from "./lib/motion";

export type FilmProps = { withAudio: boolean };

/**
 * The whole film. Chapters overlap by design: each overlap is a transition whose choreography lives in
 * presentations.tsx. Backdrop, captions and grade sit outside the series so they never cut.
 */
export const SuaipeFilm: React.FC<FilmProps> = ({ withAudio }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const f = (s: number) => sec(s, fps);
  const C = CHAPTER;

  // the film opens cold (no dip from black, so the very first frame is already on-brand) and fades out at the end
  const black = EASE.in(prog(t, END.fadeOut[0], END.fadeOut[1]));

  return (
    <AbsoluteFill style={{ backgroundColor: "#070a1a" }}>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={f(C.hook.to) - f(C.hook.from)} premountFor={fps}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={flashThrough()} timing={linearTiming({ durationInFrames: f(C.hook.to) - f(C.lockup.from) })} />
        <TransitionSeries.Sequence name="Lock-up" durationInFrames={f(C.lockup.to) - f(C.lockup.from)} premountFor={fps}>
          <LockupScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={passthrough()} timing={linearTiming({ durationInFrames: f(C.lockup.to) - f(C.ipad.from) })} />
        <TransitionSeries.Sequence name="iPad flow" durationInFrames={f(C.ipad.to) - f(C.ipad.from)} premountFor={fps}>
          <IpadScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={swapSlide()} timing={linearTiming({ durationInFrames: f(C.ipad.to) - f(C.phone.from) })} />
        <TransitionSeries.Sequence name="iPhone e-mail" durationInFrames={f(C.phone.to) - f(C.phone.from)} premountFor={fps}>
          <PhoneScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={dropOut()} timing={linearTiming({ durationInFrames: f(C.phone.to) - f(C.system.from) })} />
        <TransitionSeries.Sequence name="System" durationInFrames={f(C.system.to) - f(C.system.from)} premountFor={fps}>
          <SystemScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={photoCut()} timing={linearTiming({ durationInFrames: f(C.system.to) - f(C.human.from) })} />
        <TransitionSeries.Sequence name="Human close" durationInFrames={f(C.human.to) - f(C.human.from)} premountFor={fps}>
          <HumanScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={defocus()} timing={linearTiming({ durationInFrames: f(C.human.to) - f(C.end.from) })} />
        <TransitionSeries.Sequence name="End card" durationInFrames={f(C.end.to) - f(C.end.from)} premountFor={fps}>
          <EndScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Captions />
      <FilmGrade />
      <AbsoluteFill style={{ backgroundColor: "#070a1a", opacity: black, pointerEvents: "none" }} />
      {withAudio && <Audio src={SOUNDTRACK} premountFor={fps} />}
    </AbsoluteFill>
  );
};
