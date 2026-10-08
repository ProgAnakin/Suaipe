import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { Audio } from "@remotion/media";
import "./fonts";
import { SOUNDTRACK } from "./assets";
import { Backdrop } from "./components/Backdrop";
import { Captions } from "./components/Caption";
import { FilmGrade } from "./components/FilmGrade";
import { defocus, dropOut, flashThrough, passthrough, photoCut, swapSlide } from "./presentations";
import { HookScene } from "./scenes/HookScene";
import { HumanScene } from "./scenes/HumanScene";
import { IpadScene } from "./scenes/IpadScene";
import { LockupScene } from "./scenes/LockupScene";
import { PhoneScene } from "./scenes/PhoneScene";
import { SignatureScene } from "./scenes/SignatureScene";
import { StoreScene } from "./scenes/StoreScene";
import { SystemScene } from "./scenes/SystemScene";
import { CHAPTER, sec } from "./timeline";

export type FilmProps = {
  withAudio: boolean;
  /** Show only these burned-in captions (indices into CAPTIONS); omit for all. The 15 s cut-down re-uses the master and keeps one. */
  captionsOnly?: ReadonlyArray<number>;
};

/**
 * The whole film. Chapters overlap by design: each overlap is a transition whose choreography lives in
 * presentations.tsx. Backdrop, captions and grade sit outside the series so they never cut.
 */
export const SuaipeFilm: React.FC<FilmProps> = ({ withAudio, captionsOnly }) => {
  const { fps } = useVideoConfig();
  const f = (s: number) => sec(s, fps);
  const C = CHAPTER;

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
        <TransitionSeries.Transition presentation={dropOut()} timing={linearTiming({ durationInFrames: f(C.phone.to) - f(C.store.from) })} />
        <TransitionSeries.Sequence name="Store value" durationInFrames={f(C.store.to) - f(C.store.from)} premountFor={fps}>
          <StoreScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={passthrough()} timing={linearTiming({ durationInFrames: f(C.store.to) - f(C.system.from) })} />
        <TransitionSeries.Sequence name="System" durationInFrames={f(C.system.to) - f(C.system.from)} premountFor={fps}>
          <SystemScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={photoCut()} timing={linearTiming({ durationInFrames: f(C.system.to) - f(C.human.from) })} />
        <TransitionSeries.Sequence name="Human close" durationInFrames={f(C.human.to) - f(C.human.from)} premountFor={fps}>
          <HumanScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={defocus()} timing={linearTiming({ durationInFrames: f(C.human.to) - f(C.signature.from) })} />
        <TransitionSeries.Sequence name="Signature" durationInFrames={f(C.signature.to) - f(C.signature.from)} premountFor={fps}>
          <SignatureScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Captions only={captionsOnly} />
      <FilmGrade />
      {withAudio && <Audio src={SOUNDTRACK} premountFor={fps} />}
    </AbsoluteFill>
  );
};
