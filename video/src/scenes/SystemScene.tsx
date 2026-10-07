import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { IconBolt, IconBook, IconChart, IconDatabase, IconLock, IconMail, IconPin, IconShield, IconSheet, IconSliders, IconTablet } from "../components/Icons";
import { COLORS, FONT } from "../theme";
import { CHAPTER, SYSTEM } from "../timeline";
import { EASE, clamp, hit, lerp, pop, prog, useSceneTime } from "../lib/motion";

type NodeDef = { x: number; y: number; w: number; title: string; sub: string; color: string; icon: React.ReactNode; at: number };

const NODES: NodeDef[] = [
  { x: 540, y: 392, w: 560, title: "iPad kiosk", sub: "React PWA · works offline", color: COLORS.blue, icon: <IconTablet size={34} />, at: SYSTEM.nodes[0] },
  { x: 540, y: 590, w: 560, title: "Supabase", sub: "Postgres · row-level security", color: COLORS.cyan, icon: <IconDatabase size={34} />, at: SYSTEM.nodes[1] },
  { x: 540, y: 788, w: 560, title: "Edge Function", sub: "Webhook · unique code · rate limit", color: COLORS.teal, icon: <IconBolt size={34} />, at: SYSTEM.nodes[2] },
  { x: 290, y: 1010, w: 480, title: "Email", sub: "Personalised, via Brevo", color: COLORS.blue, icon: <IconMail size={34} />, at: SYSTEM.nodes[3] },
  { x: 790, y: 1010, w: 480, title: "CRM relay", sub: "Google Sheets", color: COLORS.teal, icon: <IconSheet size={34} />, at: SYSTEM.nodes[4] },
];
const NODE_H = 118;

const LINES = [
  { d: "M540 454 L540 528", at: SYSTEM.nodes[1] - 0.22, packet: SYSTEM.packets[0] },
  { d: "M540 652 L540 726", at: SYSTEM.nodes[2] - 0.22, packet: SYSTEM.packets[1] },
  { d: "M540 850 C540 930 290 920 290 950", at: SYSTEM.nodes[3] - 0.22, packet: SYSTEM.packets[2] },
  { d: "M540 850 C540 930 790 920 790 950", at: SYSTEM.nodes[4] - 0.22, packet: SYSTEM.packets[3] },
].map((l) => ({ ...l, len: getLength(l.d) }));

const TILES = [
  { x: 40, title: "Manager", sub: "Catalog · quiz cards · email · roles", color: COLORS.blue, icon: <IconSliders size={30} />, at: SYSTEM.tiles[0], badge: "2FA" },
  { x: 379, title: "Stats", sub: "Funnel · leaderboard · CSV export", color: COLORS.cyan, icon: <IconChart size={30} />, at: SYSTEM.tiles[1], badge: "2FA" },
  { x: 718, title: "Consultants", sub: "Per-product training guides", color: COLORS.teal, icon: <IconBook size={30} />, at: SYSTEM.tiles[2], badge: "" },
];

const glass: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(40,58,128,.82), rgba(18,28,72,.9))",
  boxShadow: "0 28px 70px rgba(0,0,0,.5), inset 0 1.5px 0 rgba(255,255,255,.13)",
};

const Chip: React.FC<{ x: number; y: number; p: number; label: string; icon: React.ReactNode; blue?: boolean }> = ({ x, y, p, label, icon, blue }) =>
  p <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 18px 9px 12px",
        borderRadius: 999,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: "0.02em",
        color: blue ? "#f0f4ff" : "#04131f",
        background: blue ? "linear-gradient(95deg,#3b82f6,#60a5fa)" : "linear-gradient(95deg,#5eead4,#22d3ee)",
        boxShadow: blue ? "0 10px 30px rgba(0,0,0,.45), 0 0 30px rgba(59,130,246,.7)" : "0 10px 30px rgba(0,0,0,.45), 0 0 30px rgba(34,211,238,.65)",
        transform: `scale(${p}) rotate(${(1 - p) * 12}deg)`,
        transformOrigin: "100% 0%",
        zIndex: 6,
      }}
    >
      {icon}
      {label}
    </div>
  );

export const SystemScene: React.FC = () => {
  const { fps } = useVideoConfig();
  const t = useSceneTime(CHAPTER.system.from);
  const drift = (t - CHAPTER.system.from) * 4;

  return (
    <AbsoluteFill style={{ transform: `translateY(${-drift * 0.4}px) scale(${1 + 0.0035 * (t - CHAPTER.system.from)})`, transformOrigin: "540px 700px" }}>
      <svg style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, overflow: "visible" }} viewBox="0 0 1080 1350">
        <defs>
          <linearGradient id="sys-grad" gradientUnits="userSpaceOnUse" x1="0" y1="440" x2="0" y2="960">
            <stop offset="0" stopColor={COLORS.blue} />
            <stop offset="1" stopColor={COLORS.cyan} />
          </linearGradient>
          <filter id="sys-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {LINES.map((l, i) => {
          const p = EASE.out(prog(t, l.at, l.at + 0.5));
          const evo = evolvePath(p, l.d);
          const flowing = t > l.packet;
          return (
            <g key={i}>
              <path d={l.d} fill="none" stroke="rgba(120,160,255,.16)" strokeWidth={4} strokeLinecap="round" opacity={clamp(p * 3)} />
              <path d={l.d} fill="none" stroke="url(#sys-grad)" strokeWidth={4} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} filter="url(#sys-glow)" />
              {flowing && (
                <path d={l.d} fill="none" stroke="rgba(255,255,255,.65)" strokeWidth={4} strokeLinecap="round" strokeDasharray="1 22" strokeDashoffset={-(t - l.packet) * 90} />
              )}
              {flowing &&
                [0, 1, 2, 3, 4].map((k) => {
                  const period = 1.1;
                  const q = (((t - l.packet) / period - k * 0.035) % 1 + 1) % 1;
                  const pt = getPointAtLength(l.d, l.len * q);
                  if (!pt) return null;
                  const a = Math.sin(Math.PI * q);
                  const size = 9 - k * 1.4;
                  return <circle key={k} cx={pt.x} cy={pt.y} r={size} fill={k === 0 ? "#fff" : COLORS.cyan} opacity={a * (1 - k * 0.2)} style={{ filter: "drop-shadow(0 0 10px #22d3ee) drop-shadow(0 0 22px #22d3ee)" }} />;
                })}
            </g>
          );
        })}
      </svg>

      {NODES.map((n, i) => {
        const p = pop(t, n.at, fps, { damping: 13, stiffness: 170 });
        const flash = hit(t, n.at + 0.05, 5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: n.x - n.w / 2,
              top: n.y - NODE_H / 2,
              width: n.w,
              height: NODE_H,
              borderRadius: 30,
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "0 28px 0 22px",
              boxSizing: "border-box",
              fontFamily: FONT,
              color: COLORS.text,
              border: `1.5px solid rgba(${i % 2 ? "94,234,212" : "120,160,255"},${0.4 + 0.5 * flash})`,
              ...glass,
              boxShadow: `${glass.boxShadow}, 0 0 ${50 * flash}px ${n.color}`,
              opacity: clamp(p * 1.6),
              transform: `translateY(${(1 - p) * 34}px) scale(${lerp(0.92, 1, clamp(p))})`,
            }}
          >
            <div style={{ width: 66, height: 66, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${n.color}, ${COLORS.panelHi})`, color: "#fff", boxShadow: `0 0 26px ${n.color}88` }}>
              {n.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: "-0.01em" }}>{n.title}</div>
              <div style={{ marginTop: 6, fontWeight: 500, fontSize: 23, color: COLORS.textDim }}>{n.sub}</div>
            </div>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: n.color, boxShadow: `0 0 ${16 + 12 * Math.sin(t * 4 + i)}px ${n.color}` }} />
          </div>
        );
      })}

      {/* "×4 stores" on the kiosk node: the caption's "Multi-store." made literal */}
      <Chip x={540 + 280 - 168} y={392 - NODE_H / 2 - 22} p={pop(t, SYSTEM.nodes[0] + 0.5, fps, { damping: 10, stiffness: 230 })} label="×4 stores" icon={<IconPin size={24} stroke={2.4} />} blue />
      {/* RLS badge on the database node */}
      <Chip x={540 + 280 - 150} y={590 - NODE_H / 2 - 22} p={pop(t, SYSTEM.locks[1], fps, { damping: 10, stiffness: 230 })} label="RLS" icon={<IconLock size={24} stroke={2.6} />} />
      {/* scan line over the node when RLS lands */}
      {(() => {
        const sp = prog(t, SYSTEM.locks[1] - 0.05, SYSTEM.locks[1] + 0.55);
        if (sp <= 0 || sp >= 1) return null;
        return <div style={{ position: "absolute", left: 540 - 280, width: 560, top: 590 - NODE_H / 2 + NODE_H * sp - 2, height: 4, background: "linear-gradient(90deg, rgba(34,211,238,0), #5eead4, rgba(34,211,238,0))", boxShadow: "0 0 24px #22d3ee", opacity: Math.sin(Math.PI * sp) }} />;
      })()}

      {TILES.map((n, i) => {
        const p = pop(t, n.at, fps, { damping: 14, stiffness: 160 });
        const flash = hit(t, n.at + 0.05, 5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: n.x,
              top: 1138,
              width: 322,
              height: 168,
              borderRadius: 28,
              padding: "26px 24px",
              boxSizing: "border-box",
              fontFamily: FONT,
              color: COLORS.text,
              border: `1.5px solid rgba(120,160,255,${0.3 + 0.4 * flash})`,
              ...glass,
              boxShadow: `${glass.boxShadow}, 0 0 ${44 * flash}px ${n.color}`,
              opacity: clamp(p * 1.6),
              transform: `translateY(${(1 - p) * 46}px)`,
            }}
          >
            <div style={{ position: "absolute", left: 24, top: 0, width: 66, height: 5, borderRadius: "0 0 6px 6px", background: n.color, boxShadow: `0 0 18px ${n.color}` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: n.color }}>
              {n.icon}
              <span style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.1, color: COLORS.text }}>{n.title}</span>
            </div>
            <div style={{ marginTop: 12, fontWeight: 500, fontSize: 22, lineHeight: 1.3, color: COLORS.textDim }}>{n.sub}</div>
            {n.badge && (
              <Chip x={n.badge ? 322 - 128 : 0} y={-20} p={pop(t, SYSTEM.locks[0] + 0.05 * i, fps, { damping: 10, stiffness: 230 })} label={n.badge} icon={<IconShield size={24} stroke={2.6} />} />
            )}
          </div>
        );
      })}
      {/* 2FA shockwave */}
      {(() => {
        const rp = prog(t, SYSTEM.locks[0], SYSTEM.locks[0] + 0.8);
        if (rp <= 0 || rp >= 1) return null;
        return <div style={{ position: "absolute", left: 40, top: 1138, width: 1000, height: 168, borderRadius: 40, border: `3px solid rgba(94,234,212,${0.7 * (1 - rp)})`, transform: `scale(${1 + 0.08 * EASE.out(rp)})`, boxShadow: `0 0 50px rgba(34,211,238,${0.4 * (1 - rp)})` }} />;
      })()}
    </AbsoluteFill>
  );
};
