import React from "react";
import { Img } from "remotion";
import { still, swipeFrame, typingFrame } from "../../assets";
import { IPAD } from "../../timeline";
import { TYPING, TYPING_ENABLED } from "../../layout";
import { EASE, clamp, lerp, prog } from "../../lib/motion";
import { SCREEN_LAYERS, SWIPES, SWIPE_FRAMES, type ScreenLayer } from "./screens";

const fill: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" };

const layerStyle = (t: number, l: ScreenLayer): React.CSSProperties => {
  const a = EASE.out(prog(t, l.from, l.from + l.inD));
  const b = EASE.inOut(prog(t, l.to - l.outD, l.to));
  const scaleIn = l.card ? lerp(0.9, 1, a) : lerp(1.035, 1, a);
  const scaleOut = lerp(1, 0.965, b);
  const blur = (1 - a) * (l.card ? 3 : 5) + b * 3.5;
  return {
    ...fill,
    opacity: a * (1 - b),
    transform: `translateY(${(1 - a) * (l.card ? 8 : 26)}px) scale(${scaleIn * scaleOut})`,
    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
  };
};

// typing frames in chronological order: { field, index, time }
type TypeStep = { field: "first" | "last" | "email"; index: number; time: number };
const TYPE_STEPS: TypeStep[] = (() => {
  const out: TypeStep[] = [];
  const add = (field: TypeStep["field"], cfg: { start: number; step: number }, chars: number, lead: number) => {
    out.push({ field, index: 0, time: cfg.start - lead });
    for (let k = 1; k <= chars; k++) out.push({ field, index: k, time: cfg.start + cfg.step * (k - 1) });
  };
  add("first", IPAD.typeFirst, TYPING.frames.first, 0.22);
  add("last", IPAD.typeLast, TYPING.frames.last, 0.18);
  add("email", IPAD.typeEmail, TYPING.frames.email, 0.18);
  return out;
})();

export const TypingOverlay: React.FC<{ t: number }> = ({ t }) => {
  if (!TYPING_ENABLED) return null;
  let cur: TypeStep | null = null;
  for (const s of TYPE_STEPS) if (s.time <= t) cur = s;
  if (!cur) return null;
  const x = TYPING.u0 * 100;
  const y = TYPING.v0 * 100;
  return (
    <Img
      src={typingFrame(cur.field, cur.index)}
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: `${(TYPING.u1 - TYPING.u0) * 100}%`, height: `${(TYPING.v1 - TYPING.v0) * 100}%` }}
    />
  );
};

/**
 * Everything that happens INSIDE the iPad glass: real screenshots of the running kiosk, cross-faded with an
 * app-like "push" (scale + soft blur) and the real drag recordings for the eight swipes.
 */
export const ScreenContent: React.FC<{ t: number }> = ({ t }) => {
  // result plate: defocused + dimmed while the big counter runs, then a focus pull at the hit
  const counterFocus = t < IPAD.counterHit + 0.05 ? 1 : 1 - EASE.out(prog(t, IPAD.counterHit + 0.05, IPAD.counterHit + 0.6));
  const plateFocus = t >= IPAD.counterStart - 0.05 ? counterFocus : 0;

  // stills and swipe recordings share one chronological stack, so an entering card sits on top of the tail of the
  // previous swipe (the departing card cross-fades out underneath it)
  type Item = { order: number; node: React.ReactNode };
  const items: Item[] = [];

  for (const l of SCREEN_LAYERS) {
    if (t < l.from - 0.001 || t > l.to + 0.001) continue;
    const style = layerStyle(t, l);
    if (l.key === "attract") {
      // idle "breathing" so the held attract screen never feels frozen
      style.transform = `${style.transform ?? ""} scale(${1 + 0.022 * EASE.inOutSoft(prog(t, IPAD.handoff.in, IPAD.tap1 + 0.4))})`;
    }
    const filter =
      l.key === "result-plate" && plateFocus > 0.01
        ? `${style.filter ? `${style.filter} ` : ""}blur(${16 * plateFocus}px) brightness(${1 - 0.5 * plateFocus})`
        : style.filter;
    items.push({
      order: l.from,
      node: (
        <React.Fragment key={l.key}>
          <Img src={still(l.still)} style={{ ...style, filter }} />
          {l.key === "welcome-empty" && <TypingOverlay t={t} />}
        </React.Fragment>
      ),
    });
  }

  for (const s of SWIPES) {
    if (t < s.from - 0.001 || t > s.to + 0.16) continue;
    const p = clamp((t - s.from) / (s.to - s.from));
    const idx = Math.min(SWIPE_FRAMES - 1, Math.floor(p * SWIPE_FRAMES));
    const fadeOut = clamp((t - s.to) / 0.12);
    items.push({ order: s.from, node: <Img key={`swipe-${s.card}`} src={swipeFrame(s.card, idx)} style={{ ...fill, opacity: 1 - EASE.inOut(fadeOut) }} /> });
  }

  return <>{items.sort((a, b) => a.order - b.order).map((i) => i.node)}</>;
};
