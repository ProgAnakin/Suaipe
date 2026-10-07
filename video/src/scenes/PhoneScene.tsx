import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { IPHONE_BODY as IPHONE, IphoneFrame } from "../components/Devices";
import { IconLock } from "../components/Icons";
import { LOGO, still } from "../assets";
import { COLORS, FONT } from "../theme";
import { CHAPTER, PHONE } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, seg, useSceneTime } from "../lib/motion";
import { camTranslate, followCamera } from "../lib/camera";

// The real e-mail (rendered from the Edge Function's own template): 485 css px wide, 2582 tall.
const EMAIL = { w: 485, h: 2582, ticket: { x: 37, y: 1023.9, w: 411.2, h: 297 } };
const K = IPHONE.screenW / EMAIL.w;
const STATUS_H = 56;
const SCROLL_MAX = 580; // screen px: puts the discount ticket in the middle of the phone
const TICKET = { x: EMAIL.ticket.x * K, y: EMAIL.ticket.y * K, w: EMAIL.ticket.w * K, h: EMAIL.ticket.h * K };
const TICKET_V = (STATUS_H + TICKET.y - SCROLL_MAX + TICKET.h / 2) / IPHONE.screenH;

const BANNER = { x: 16, y: 336, w: IPHONE.screenW - 32, h: 138, r: 30 };

const StatusBar: React.FC<{ show: number }> = ({ show }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: STATUS_H, zIndex: 20, fontFamily: FONT }}>
    <div style={{ position: "absolute", inset: 0, background: COLORS.bg, opacity: show }} />
    <div style={{ position: "absolute", left: 38, top: 15, fontWeight: 700, fontSize: 19, color: COLORS.text, opacity: show }}>9:41</div>
    <div style={{ position: "absolute", right: 34, top: 19, width: 38, height: 18, borderRadius: 5, border: "2px solid rgba(240,244,255,.7)" }}>
      <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, right: 8, borderRadius: 2, background: COLORS.text }} />
    </div>
  </div>
);

const CAM_KEYS = [
  { t: CHAPTER.phone.from, z: 1, u: 0.5, v: 0.5 },
  { t: PHONE.zoomCode[0], z: 1.95, u: 0.5, v: TICKET_V, omega: 7.5 },
  { t: PHONE.exit - 0.4, z: 1, u: 0.5, v: 0.5, omega: 9 },
];

const PhoneWorld: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.phone.from);

  const cam = followCamera(CAM_KEYS, t);
  const { tx, ty } = camTranslate(cam, IPHONE.screenW, IPHONE.screenH);

  // notification → e-mail
  const drop = pop(t, PHONE.notif, fps, { damping: 14, stiffness: 150, mass: 1 });
  const ping = hit(t, PHONE.notifPing, 9);
  const open = EASE.inOutSoft(prog(t, PHONE.open, PHONE.open + 0.6));
  const scroll = SCROLL_MAX * seg(t, PHONE.scroll[0], PHONE.scroll[1], EASE.inOut);

  // clip-path that grows from the banner rectangle to the whole screen
  const inset = {
    top: lerp(BANNER.y, 0, open),
    right: lerp(BANNER.x, 0, open),
    bottom: lerp(IPHONE.screenH - BANNER.y - BANNER.h, 0, open),
    left: lerp(BANNER.x, 0, open),
    r: lerp(BANNER.r, 0, open),
  };

  // discount-ticket highlight
  const ding = prog(t, PHONE.codeDing, PHONE.codeDing + 1.0);
  const ringA = ding > 0 ? Math.sin(Math.PI * Math.min(1, ding * 1.3)) : 0;
  const sweep = prog(t, PHONE.codeDing, PHONE.codeDing + 0.8);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`, transformOrigin: `${IPHONE.cx}px ${IPHONE.cy}px` }}>
        <IphoneFrame glow={0.35 + 0.5 * ping + 0.4 * ringA} sheen={0.2 + 0.5 * seg(t, PHONE.settle, PHONE.exit, EASE.inOut)}>
          {/* lock screen */}
          <AbsoluteFill style={{ background: "linear-gradient(165deg,#16215a 0%,#0b1233 55%,#0d1228 100%)" }}>
            <div style={{ position: "absolute", left: 0, top: -120, width: "100%", height: 700, background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,.42), rgba(59,130,246,0) 62%)" }} />
            <div style={{ position: "absolute", left: 0, top: 70, width: "100%", display: "flex", justifyContent: "center", color: COLORS.textSoft, opacity: 0.8 }}>
              <IconLock size={22} />
            </div>
            <div style={{ position: "absolute", left: 0, top: 104, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: 118, letterSpacing: "-0.02em", color: COLORS.text, opacity: 0.94 }}>9:41</div>
          </AbsoluteFill>

          {/* notification banner */}
          <div
            style={{
              position: "absolute",
              left: BANNER.x,
              top: lerp(-170, BANNER.y, drop),
              width: BANNER.w,
              height: BANNER.h,
              borderRadius: BANNER.r,
              boxSizing: "border-box",
              padding: "20px 22px",
              fontFamily: FONT,
              color: COLORS.text,
              display: "flex",
              gap: 16,
              background: "linear-gradient(160deg, rgba(60,80,170,.62), rgba(22,32,86,.78))",
              backdropFilter: "blur(22px)",
              border: "1px solid rgba(255,255,255,.16)",
              boxShadow: `0 24px 60px rgba(0,0,0,.5), 0 0 ${40 * ping}px rgba(34,211,238,.7)`,
              transform: `scale(${1 + 0.035 * ping})`,
              opacity: 1 - clamp(open * 6),
            }}
          >
            <div style={{ width: 56, height: 56, flex: "none", borderRadius: 15, background: "linear-gradient(145deg,#12204f,#0a1233)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)" }}>
              <Img src={LOGO} style={{ width: 44, height: 44 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, letterSpacing: "0.08em", color: COLORS.textSoft }}>
                <span>SUAIPE</span>
                <span style={{ fontWeight: 500, letterSpacing: 0, color: COLORS.textDim }}>now</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }}>Your match is ready</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 500, color: COLORS.textSoft, lineHeight: 1.25, whiteSpace: "nowrap" }}>Brevia GoPress · 98% match</div>
            </div>
          </div>

          {/* e-mail, growing out of the notification */}
          {open > 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                clipPath: `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px round ${inset.r}px)`,
                background: COLORS.bg,
              }}
            >
              <div style={{ position: "absolute", inset: 0, transform: `scale(${lerp(1.22, 1, open)})`, transformOrigin: "50% 38%" }}>
                <Img src={still("email-full")} style={{ position: "absolute", left: 0, top: STATUS_H - scroll, width: IPHONE.screenW, height: "auto" }} />
              {/* ticket highlight */}
              <div
                style={{
                  position: "absolute",
                  left: TICKET.x - 4,
                  top: STATUS_H - scroll + TICKET.y - 4,
                  width: TICKET.w + 8,
                  height: TICKET.h + 8,
                  borderRadius: 22,
                  boxShadow: `0 0 0 ${3 * ringA}px rgba(94,234,212,${0.95 * ringA}), 0 0 ${60 * ringA}px rgba(34,211,238,${0.75 * ringA})`,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep * 150 - 45}%, rgba(255,255,255,.55) ${sweep * 150 - 25}%, rgba(255,255,255,0) ${sweep * 150 - 5}%)`,
                    opacity: sweep > 0 && sweep < 1 ? 1 : 0,
                    mixBlendMode: "screen",
                  }}
                />
              </div>
              </div>
            </div>
          )}
          <StatusBar show={open} />
        </IphoneFrame>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Adds motion blur only while the camera is actually moving fast (the zoom into the code, the pull-out). */
export const PhoneScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.phone.from);
  const a = followCamera(CAM_KEYS, t - 0.5 / fps);
  const b = followCamera(CAM_KEYS, t + 0.5 / fps);
  const ta = camTranslate(a, IPHONE.screenW, IPHONE.screenH);
  const tb = camTranslate(b, IPHONE.screenW, IPHONE.screenH);
  const speed = Math.hypot(tb.tx - ta.tx, tb.ty - ta.ty) + Math.abs(Math.log(b.z / a.z)) * 520;
  const shutter = Math.min(250, speed * 9);
  return shutter > 25 ? (
    <CameraMotionBlur samples={8} shutterAngle={shutter}>
      <PhoneWorld />
    </CameraMotionBlur>
  ) : (
    <PhoneWorld />
  );
};
