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
import { ConsultScene } from "./scenes/ConsultScene";
import { EndScene } from "./scenes/EndScene";
import { HookScene } from "./scenes/HookScene";
import { HumanScene } from "./scenes/HumanScene";
import { IpadScene } from "./scenes/IpadScene";
import { LockupScene } from "./scenes/LockupScene";
import { PhoneScene } from "./scenes/PhoneScene";
import { StoreScene } from "./scenes/StoreScene";
import { SystemScene } from "./scenes/SystemScene";
import { CHAPTER, END, sec } from "./timeline";
import { EASE, prog } from "./lib/motion";

export type FilmProps = {
  withAudio: boolean;
  /** Show only these burned-in captions (indices into CAPTIONS); omit for all. */
  captionsOnly?: ReadonlyArray<number>;
};

/**
 * The whole film. Chapters overlap by design: each overlap is a transition whose choreography lives in
 * presentations.tsx. Backdrop, captions and grade sit outside the series so they never cut.
 */
export const SuaipeFilm: React.FC<FilmProps> = ({ withAudio, captionsOnly }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const f = (s: number) => sec(s, fps);
  const C = CHAPTER;

  // the film opens cold (no dip from black, so the very first frame is already on-brand) and fades out at the end
  const black = EASE.in(prog(t, END.fadeOut[0], END.fadeOut[1]));

  const seq = (name: string, c: { from: number; to: number }, scene: React.ReactNode) => (
    <TransitionSeries.Sequence name={name} durationInFrames={f(c.to) - f(c.from)} premountFor={fps}>
      {scene}
    </TransitionSeries.Sequence>
  );
  const trans = (presentation: ReturnType<typeof flashThrough>, a: { to: number }, b: { from: number }) => (
    <TransitionSeries.Transition presentation={presentation} timing={linearTiming({ durationInFrames: f(a.to) - f(b.from) })} />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#070a1a" }}>
      <Backdrop />
      <TransitionSeries>
        {seq("Hook", C.hook, <HookScene />)}
        {trans(flashThrough(), C.hook, C.lockup)}
        {seq("Lock-up", C.lockup, <LockupScene />)}
        {trans(passthrough(), C.lockup, C.ipad)}
        {seq("iPad flow", C.ipad, <IpadScene />)}
        {trans(swapSlide(), C.ipad, C.phone)}
        {seq("iPhone e-mail", C.phone, <PhoneScene />)}
        {trans(dropOut(), C.phone, C.store)}
        {seq("Store value", C.store, <StoreScene />)}
        {trans(swapSlide(), C.store, C.consult)}
        {seq("Consultants", C.consult, <ConsultScene />)}
        {trans(dropOut(), C.consult, C.system)}
        {seq("System", C.system, <SystemScene />)}
        {trans(photoCut(), C.system, C.human)}
        {seq("Human close", C.human, <HumanScene />)}
        {trans(defocus(), C.human, C.end)}
        {seq("End card", C.end, <EndScene />)}
      </TransitionSeries>
      <Captions only={captionsOnly} />
      <FilmGrade />
      <AbsoluteFill style={{ backgroundColor: "#070a1a", opacity: black, pointerEvents: "none" }} />
      {withAudio && <Audio src={SOUNDTRACK} premountFor={fps} />}
    </AbsoluteFill>
  );
};
