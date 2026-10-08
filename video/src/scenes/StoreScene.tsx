import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { IpadFrame, IPAD_BODY } from "../components/Devices";
import { LabelChip, SampleChip, TickBadge } from "../components/Chips";
import { CRM, CrmCard, slotCenterY, type CrmRow } from "../components/CrmCard";
import { LeadToken } from "../components/LeadToken";
import { IconCheck, IconPin } from "../components/Icons";
import { still } from "../assets";
import { SCREEN } from "../theme";
import { ADMIN } from "../layout";
import { CHAPTER, STORE } from "../timeline";
import { EASE, clamp, hit, prog, seg, useSceneTime } from "../lib/motion";
import { dirBlur, speedOf } from "../presentations";
import { CRM_AT, K, TABLET, navAt, pageScale, pageToCanvas, poseAt, poseTransform, scrollAt } from "../storeTimeline";

/**
 * Store value (BRIEF v2, block 5): what the store gets from every claimed match.
 *   30.0  the manager's list of leads ("Sessions & Codes", the real screen with sample data), consent ticks pop in on the first rows
 *   32.5  page push to the dashboard of one store, scroll to the product ranking, then the same ranking for the other store
 *   34.85 the tablet steps back, a CRM card rises, one lead flies from the tablet into a row; the next one follows, quicker
 *   37.75 everything is pushed back as the system diagram arrives
 */

// ── the two real screens, one on top of the other ──────────────────────────────────────────────────────────────────────
const Pages: React.FC<{ t: number }> = ({ t }) => {
  const nav = navAt(t);
  const scroll = scrollAt(t);
  const swapB = seg(t, STORE.storeB, STORE.storeB + 0.28, EASE.inOut);
  const pushBlur = dirBlur("store-push", 22 * speedOf(EASE.inOut, nav), 0);
  const scrollBlur = dirBlur("store-scroll", 0, 7 * speedOf(EASE.inOut, prog(t, STORE.scroll[0], STORE.scroll[1])));
  return (
    <AbsoluteFill>
      {pushBlur.defs}
      {scrollBlur.defs}
      {/* the lead list: moves away to the left, a little slower than the new page arrives, and dims */}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-0.28 * SCREEN.w * nav}px)`, filter: nav > 0 ? pushBlur.filter : undefined }}>
        <Img src={still("manager-sessions")} style={{ display: "block", width: SCREEN.w, height: SCREEN.h }} />
        <div style={{ position: "absolute", inset: 0, background: "#04060f", opacity: 0.55 * nav }} />
      </div>
      {/* the dashboard of one store, as one tall page */}
      {nav > 0 && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `translateX(${(1 - nav) * SCREEN.w}px)`, boxShadow: "-40px 0 80px rgba(0,0,0,.55)", filter: pushBlur.filter }}>
          <div style={{ position: "absolute", left: 0, top: -scroll * K, width: SCREEN.w, filter: scrollBlur.filter }}>
            <Img src={still("stats-page-a")} style={{ display: "block", width: SCREEN.w, height: "auto" }} />
            {swapB > 0 && <Img src={still("stats-page-b")} style={{ position: "absolute", left: 0, top: 0, display: "block", width: SCREEN.w, height: "auto", opacity: swapB }} />}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The tablet with its screen: everything that moves WITH the camera (and gets motion blur when the camera moves fast). */
const TabletWorld: React.FC = () => {
  const t = useSceneTime(CHAPTER.store.from);
  const pose = poseAt(t);
  const glow = 0.3 + 0.55 * hit(t, STORE.consent[0], 4) + 0.5 * hit(t, STORE.fly[0], 5) + 0.3 * hit(t, STORE.fly2[0], 5);
  const sheen = 0.05 + 0.9 * prog(t, CHAPTER.store.from, STORE.out);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: poseTransform(pose), transformOrigin: `${IPAD_BODY.cx}px ${IPAD_BODY.cy}px` }}>
        <IpadFrame glow={glow} sheen={sheen}>
          <Pages t={t} />
        </IpadFrame>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Canvas-pixel speed of the camera (per frame): drives how much motion blur the shot gets. */
const camSpeed = (t: number, fps: number) => {
  const a = poseAt(t - 0.5 / fps);
  const b = poseAt(t + 0.5 / fps);
  const dx = Math.hypot(b.tx * b.ls - a.tx * a.ls, b.ty * b.ls + b.sy - a.ty * a.ls - a.sy);
  return dx + Math.abs(Math.log(b.z * b.ls) - Math.log(a.z * a.ls)) * 520;
};

// ── call-outs on the lead list and the ranking (canvas space, so they stay crisp and at the film's type size) ────────────
const Annotations: React.FC<{ t: number }> = ({ t }) => {
  const pose = poseAt(t);
  const s = pageScale(pose);
  const C = ADMIN.card;
  const gone = 1 - EASE.in(prog(t, STORE.labelOut - 0.1, STORE.labelOut + 0.15)); // the list leaves
  const top0 = pageToCanvas(pose, C.x, C.y0);

  // soft outline around the first lead: the one the film has just watched being created
  const outline = EASE.out(prog(t, STORE.consent[0] - 0.15, STORE.consent[0] + 0.25)) * gone;

  // the ranking of the store on screen: its name flips A → B when the data does
  const chipA = EASE.out(prog(t, STORE.storeA, STORE.storeA + 0.3)) * (1 - prog(t, STORE.storeB - 0.05, STORE.storeB + 0.2));
  const chipB = EASE.out(prog(t, STORE.storeB + 0.05, STORE.storeB + 0.35)) * (1 - EASE.in(prog(t, STORE.shift[0], STORE.shift[0] + 0.25)));

  // the store chip sits in the header of the ranking card, to the right of its title
  const R = ADMIN.dashboard.ranking;
  const rankTR = pageToCanvas(pose, R.x + R.w, R.y, scrollAt(t));
  const chipX = rankTR.x - 22 * s;
  const chipTop = rankTR.y + 10 * s;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {outline > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: top0.x - 8,
            top: top0.y - 8,
            width: C.w * s + 16,
            height: C.h * s + 16,
            borderRadius: 22 * s + 8,
            border: "3px solid rgba(94,234,212,.85)",
            boxShadow: "0 0 34px rgba(34,211,238,.55), inset 0 0 26px rgba(34,211,238,.12)",
            opacity: outline,
          }}
        />
      )}
      <div style={{ opacity: gone }}>
        {STORE.consent.map((at, i) => {
          const p = pageToCanvas(pose, C.x, C.y0 + C.pitch * i + C.h / 2);
          return <TickBadge key={i} cx={p.x - 17} cy={p.y} t={t} at={at} />;
        })}
        <LabelChip
          cx={540}
          top={top0.y - 78 - 26}
          label="Consent on record"
          icon={<IconCheck size={28} stroke={3} />}
          p={EASE.out(prog(t, STORE.label, STORE.label + 0.3)) * gone}
          pointer
        />
      </div>
      <LabelChip cx={chipX} top={chipTop} align="right" label="Store A" icon={<IconPin size={28} stroke={2.4} />} p={chipA} />
      <LabelChip cx={chipX} top={chipTop} align="right" label="Store B" icon={<IconPin size={28} stroke={2.4} />} p={chipB} />
    </AbsoluteFill>
  );
};

// ── the CRM and the leads that land in it ─────────────────────────────────────────────────────────────────────────────
const CRM_ROWS: CrmRow[] = [
  { name: "Liam Byrne", product: "Nimbus Sip", launch: -Infinity, land: -2 },
  { name: "Ana Souza", product: "Aeris Glow", launch: -Infinity, land: -1 },
  { name: "Marco Rossi", product: "Brevia GoPress", launch: STORE.fly[0], land: STORE.land },
  { name: "Chiara Conti", product: "Echobox Riff", launch: STORE.fly2[0], land: STORE.land2 },
];
const TABLET_AT = { x: 540, y: TABLET.centreY };
const SLOT0 = { x: CRM_AT.x + CRM_AT.w / 2, y: slotCenterY(CRM_AT.y, 0) };
const ROW_W = CRM_AT.w - 2 * CRM.pad;

const CrmLayer: React.FC<{ t: number }> = ({ t }) => {
  const cardP = EASE.out(prog(t, STORE.shift[0] + 0.1, STORE.shift[1] + 0.2));
  // the tablet "lets go" of a lead: a soft light at its screen
  const lift = Math.max(hit(t, STORE.fly[0] - 0.04, 6) * (t >= STORE.fly[0] - 0.04 ? 1 : 0), 0.6 * hit(t, STORE.fly2[0] - 0.04, 6) * (t >= STORE.fly2[0] - 0.04 ? 1 : 0));
  const landRing = (at: number) => prog(t, at, at + 0.7);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {lift > 0.01 && (
        <div style={{ position: "absolute", left: TABLET_AT.x - 230, top: TABLET_AT.y - 230, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.75), rgba(94,234,212,.4) 36%, rgba(34,211,238,0) 70%)", opacity: 0.7 * lift, mixBlendMode: "screen" }} />
      )}
      <CrmCard x={CRM_AT.x} y={CRM_AT.y} w={CRM_AT.w} t={t} p={cardP} rows={CRM_ROWS} />
      <LeadToken t={t} from={TABLET_AT} to={SLOT0} fly={STORE.fly} name="Marco Rossi" rowW={ROW_W} bend={1} />
      <LeadToken t={t} from={TABLET_AT} to={SLOT0} fly={STORE.fly2} name="Chiara Conti" rowW={ROW_W} bend={-1} strength={0.7} />
      {[STORE.land, STORE.land2].map((at, i) => {
        const r = landRing(at);
        if (t < at || r >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: SLOT0.x - (ROW_W / 2) * (1 + 0.06 * EASE.out(r)),
              top: SLOT0.y - 33 * (1 + 0.4 * EASE.out(r)),
              width: ROW_W * (1 + 0.06 * EASE.out(r)),
              height: 66 * (1 + 0.4 * EASE.out(r)),
              borderRadius: 24,
              border: `${3 * (1 - r)}px solid rgba(94,234,212,${0.8 * (1 - r) * (i ? 0.7 : 1)})`,
              boxShadow: `0 0 ${50 * (1 - r)}px rgba(34,211,238,${0.5 * (1 - r)})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const StoreScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.store.from);
  const shutter = Math.min(250, camSpeed(t, fps) * 9);
  const outP = seg(t, STORE.out, CHAPTER.store.to - 0.05, EASE.in);
  const sample = seg(t, CHAPTER.store.from + 0.4, CHAPTER.store.from + 0.7, EASE.out) * (1 - seg(t, STORE.out, STORE.out + 0.25, EASE.in));
  // while the screens run off the bottom of the frame they dissolve into the backdrop: no small text under the player controls
  const bleed = 1 - seg(t, STORE.shift[0], STORE.shift[1], EASE.inOut);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 - 0.07 * outP})`,
        filter: outP > 0.01 ? `blur(${10 * outP}px)` : undefined,
        opacity: 1 - clamp((outP - 0.2) / 0.8),
      }}
    >
      {shutter > 25 ? (
        <CameraMotionBlur samples={8} shutterAngle={shutter}>
          <TabletWorld />
        </CameraMotionBlur>
      ) : (
        <TabletWorld />
      )}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 250, background: "linear-gradient(rgba(7,10,26,0), rgba(7,10,26,.94) 72%)", opacity: bleed, pointerEvents: "none" }} />
      <Annotations t={t} />
      <CrmLayer t={t} />
      <SampleChip p={sample} />
    </AbsoluteFill>
  );
};
