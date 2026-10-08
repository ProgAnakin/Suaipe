import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { still } from "../../assets";
import { PhotoGrade, PhotoScreen, PhotoStage, coverPose, mixPose, type Pose } from "../../components/PhotoStage";
import { IPAD_BODY } from "../../components/Devices";
import { HANDOFF_FG, HANDOFF_QUAD, PHOTO } from "../../people";
import { lerpQuad, quadToRectSimilarity, squaredQuad } from "../../lib/homography";
import { SCREEN } from "../../theme";
import { CHAPTER, IPAD } from "../../timeline";
import { EASE, lerp, prog, seg, useSceneTime } from "../../lib/motion";

/**
 * The opening human beat: a consultant hands a tablet to a customer (photo, hands only). The kiosk screen wakes up on
 * the glass, then the camera flies into it and the photo dissolves into the flat, pixel-exact iPad screen.
 */
export const HandoffLayer: React.FC = () => {
  const t = useSceneTime(CHAPTER.ipad.from);
  const H = IPAD.handoff;
  if (t > H.out + 0.02) return null;

  const inP = seg(t, H.in, H.in + 0.55, EASE.inOut); // a real dissolve out of the lock-up, centred on the bar line (6.0)
  const outP = seg(t, H.zoom[1] - 0.12, H.out, EASE.inOut);
  const zoomE = seg(t, H.zoom[0], H.zoom[1], EASE.inOutSoft);
  const kb = EASE.inOut(prog(t, H.in, H.zoom[0]));
  const on = seg(t, H.wake, H.wake + 0.45, EASE.out);

  const quadCenter: [number, number] = [
    HANDOFF_QUAD.reduce((a, p) => a + p[0], 0) / 4,
    HANDOFF_QUAD.reduce((a, p) => a + p[1], 0) / 4,
  ];
  // A: cover-fit, a slow push toward the tablet while the hands move it forward
  const a = coverPose(PHOTO.handoff, 1 + 0.08 * kb, [lerp(PHOTO.handoff.w / 2, quadCenter[0], 0.45 * kb), lerp(PHOTO.handoff.h / 2, quadCenter[1], 0.45 * kb)]);
  // B: the glass becomes the CSS iPad screen at the zoom the iPad waits at
  const sim = quadToRectSimilarity(HANDOFF_QUAD, { cx: IPAD_BODY.cx, cy: IPAD_BODY.cy, width: 800 * H.zoomTo });
  const b: Pose = { s: sim.scale, rot: sim.rotateRad, focus: sim.center, at: [IPAD_BODY.cx, IPAD_BODY.cy] };
  const pose = mixPose(a, b, zoomE);
  // as the camera arrives the keystone of the photographed glass relaxes, so the warped UI lands exactly on the flat iPad screen
  const square = seg(t, lerp(H.zoom[0], H.zoom[1], 0.4), H.zoom[1], EASE.inOut);
  const quad = lerpQuad(HANDOFF_QUAD, squaredQuad(sim, SCREEN.w * H.zoomTo, SCREEN.h * H.zoomTo), square);

  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP) }}>
      <PhotoStage photo={PHOTO.handoff} pose={pose}>
        <PhotoScreen photo={PHOTO.handoff} quad={quad} on={on} glass={1 - square} fg={HANDOFF_FG} fgOpacity={1 - square}>
          <Img src={still("attract")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </PhotoScreen>
      </PhotoStage>
      <PhotoGrade strength={1 - 0.8 * zoomE} topScrim={0.9 * (1 - zoomE)} />
    </AbsoluteFill>
  );
};
