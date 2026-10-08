import React from "react";
import { Composition, Folder, Still } from "remotion";
import "./fonts";
import { Backdrop } from "./components/Backdrop";
import { FilmGrade } from "./components/FilmGrade";
import { Cover, CoverDevice } from "./Cover";
import { SuaipeFilm } from "./SuaipeFilm";
import { EndScene } from "./scenes/EndScene";
import { HookScene } from "./scenes/HookScene";
import { HumanScene } from "./scenes/HumanScene";
import { IpadScene } from "./scenes/IpadScene";
import { LockupScene } from "./scenes/LockupScene";
import { PhoneScene } from "./scenes/PhoneScene";
import { SystemScene } from "./scenes/SystemScene";
import { CHAPTER, DURATION_S, FPS, HEIGHT, WIDTH, sec } from "./timeline";

// Each scene is registered on its own so it can be previewed (and rendered) in isolation; local frame 0 = chapter start.
const stage = (Scene: React.FC): React.FC => () => (
  <>
    <Backdrop />
    <Scene />
    <FilmGrade />
  </>
);
const HookPreview = stage(HookScene);
const LockupPreview = stage(LockupScene);
const IpadPreview = stage(IpadScene);
const PhonePreview = stage(PhoneScene);
const SystemPreview = stage(SystemScene);
const HumanPreview = stage(HumanScene);
const EndPreview = stage(EndScene);
const len = (c: { from: number; to: number }) => sec(c.to - c.from);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SuaipeFilm"
        component={SuaipeFilm}
        durationInFrames={sec(DURATION_S)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ withAudio: true }}
      />
      <Still id="Cover" component={Cover} width={WIDTH} height={HEIGHT} />
      <Still id="CoverDevice" component={CoverDevice} width={WIDTH} height={HEIGHT} />
      <Folder name="Scenes">
        <Composition id="Hook" component={HookPreview} durationInFrames={len(CHAPTER.hook)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Lockup" component={LockupPreview} durationInFrames={len(CHAPTER.lockup)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="IpadFlow" component={IpadPreview} durationInFrames={len(CHAPTER.ipad)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="PhoneEmail" component={PhonePreview} durationInFrames={len(CHAPTER.phone)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="System" component={SystemPreview} durationInFrames={len(CHAPTER.system)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="HumanClose" component={HumanPreview} durationInFrames={len(CHAPTER.human)} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="EndCard" component={EndPreview} durationInFrames={len(CHAPTER.end)} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>
    </>
  );
};
