import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTIONS } from "../timeline";
import { COLORS, FONT, GRADIENT_SOFT } from "../theme";
import { EASE, prog, seg } from "../lib/motion";
import { GradientText } from "./GradientText";

type Word = { text: string; em: boolean };
type Line = Word[];

/** Tiny markup parser: "<em>…</em>" highlights, "<br/>" breaks lines. */
const parse = (markup: string): Line[] =>
  markup.split(/<br\s*\/?>/i).map((line) => {
    const words: Word[] = [];
    let em = false;
    for (const part of line.split(/(<\/?em>)/i)) {
      if (/^<em>$/i.test(part)) em = true;
      else if (/^<\/em>$/i.test(part)) em = false;
      else for (const w of part.split(/\s+/).filter(Boolean)) words.push({ text: w, em });
    }
    return words;
  });

/**
 * Burned-in captions (most LinkedIn viewers watch muted). Words rise in one by one; highlighted phrases get a
 * gradient fill and an underline that draws itself. Absolute film time: mount at composition level.
 */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const active = CAPTIONS.find((c) => t >= c.from - 0.01 && t < c.to);
  if (!active) return null;

  const lines = parse(active.text);
  const small = "small" in active && active.small;
  const fontSize = small ? 46 : 60;
  const local = t - active.from;
  const outP = seg(t, active.to - 0.3, active.to, EASE.inOut);
  const scrim = 0.94 * seg(t, active.from, active.from + 0.35, EASE.out) * (1 - outP);

  let wordIndex = 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: 350,
          opacity: scrim,
          background: "linear-gradient(rgba(10,15,36,.97) 0%, rgba(10,15,36,.8) 46%, rgba(10,15,36,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          width: 960,
          top: 62,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize,
          lineHeight: small ? 1.2 : 1.12,
          letterSpacing: "-0.02em",
          color: COLORS.text,
          opacity: 1 - outP,
          transform: `translateY(${-14 * outP}px)`,
        }}
      >
        {lines.map((line, li) => {
          // group consecutive highlighted words so one underline spans the whole phrase
          const groups: Word[][] = [];
          for (const w of line) {
            const last = groups[groups.length - 1];
            if (last && last[0].em === w.em) last.push(w);
            else groups.push([w]);
          }
          return (
            <div key={li} style={{ display: "block" }}>
              {groups.map((g, gi) => {
                const startIdx = wordIndex;
                const content = g.map((w, wi) => {
                  const idx = wordIndex++;
                  const p = seg(local, 0.04 * idx, 0.04 * idx + 0.42, EASE.out);
                  const word = (
                    <span
                      key={wi}
                      style={{
                        display: "inline-block",
                        opacity: p,
                        transform: `translateY(${(1 - p) * 26}px) scale(${0.96 + 0.04 * p})`,
                        filter: p < 1 ? `blur(${(1 - p) * 7}px)` : undefined,
                        marginRight: wi === g.length - 1 ? 0 : "0.27em",
                      }}
                    >
                      {w.em ? <GradientText>{w.text}</GradientText> : w.text}
                    </span>
                  );
                  return word;
                });
                const underline = g[0].em ? prog(local, 0.04 * startIdx + 0.35, 0.04 * startIdx + 0.85) : 0;
                return (
                  <span key={gi} style={{ position: "relative", display: "inline-block", marginRight: gi === groups.length - 1 ? 0 : "0.27em" }}>
                    {content}
                    {g[0].em && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: small ? -4 : -6,
                          height: small ? 3 : 4,
                          borderRadius: 3,
                          background: GRADIENT_SOFT,
                          opacity: 0.85,
                          transformOrigin: "0 50%",
                          transform: `scaleX(${EASE.out(underline)})`,
                          boxShadow: "0 0 18px rgba(34,211,238,.55)",
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
