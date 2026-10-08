import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SuaipeFilm } from "./SuaipeFilm";
import { CUT_CAPTIONS, EXCERPTS, FADE } from "./cutdown";
import { EASE, clamp, flashEnv, prog } from "./lib/motion";
import { sec } from "./timeline";

/** One excerpt of the master, cross-faded with its neighbours around the `join` instants. */
const Excerpt: React.FC<{ index: number }> = ({ index }) => {
  const e = EXCERPTS[index];
  const next = EXCERPTS[index + 1];
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame(); // local to this excerpt's outer Sequence (starts FADE/2 before `join`, except the first)
  const t = frame / fps + (index === 0 ? 0 : e.join - FADE / 2);
  const fadeIn = index === 0 ? 1 : EASE.inOut(prog(t, e.join - FADE / 2, e.join + FADE / 2));
  const fadeOut = next ? 1 - EASE.inOut(prog(t, next.join - FADE / 2, next.join + FADE / 2)) : 1;
  // a little push-through on the way out so the dissolve reads as a move, not as a fade
  const leave = next ? EASE.in(prog(t, next.join - FADE / 2, next.join + FADE / 2)) : 0;
  return (
    <AbsoluteFill style={{ opacity: clamp(fadeIn) * clamp(fadeOut), transform: `scale(${1 + 0.035 * leave})` }}>
      <Sequence from={-sec(e.master - (index === 0 ? 0 : FADE / 2) , fps)} layout="none">
        <SuaipeFilm withAudio={false} captionsOnly={CUT_CAPTIONS} />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * The 15 s cut-down of the film (BRIEF v2 §4.7 / SCRIPT §7): the problem, the play, the match, the person. It is the master itself,
 * excerpted — no scene is duplicated — so every fix to the master carries over. The sound for it is its own arrangement.
 */
export const Cutdown15: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  // bright bloom over the join into the tablet; a dip through dark before the name
  const j1 = EXCERPTS[1].join;
  const j3 = EXCERPTS[3].join;
  const bloom = 0.7 * flashEnv(t, j1 - 0.05, 0.1, 14);
  const dip = Math.max(0, 1 - Math.abs(t - j3) / 0.3) * 0.92;
  return (
    <AbsoluteFill style={{ backgroundColor: "#070a1a" }}>
      {EXCERPTS.map((e, i) => {
        const start = i === 0 ? 0 : e.join - FADE / 2;
        const end = i === EXCERPTS.length - 1 ? e.to : e.to + FADE / 2;
        return (
          <Sequence key={i} from={sec(start, fps)} durationInFrames={sec(end - start, fps)} layout="none" name={`excerpt ${i + 1}`}>
            <Excerpt index={i} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ opacity: bloom, background: "radial-gradient(circle at 50% 46%, rgba(255,255,255,.9), rgba(150,235,255,.45) 30%, rgba(59,130,246,0) 66%)", mixBlendMode: "screen", pointerEvents: "none" }} />
      <AbsoluteFill style={{ opacity: dip, background: "#05070f", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
