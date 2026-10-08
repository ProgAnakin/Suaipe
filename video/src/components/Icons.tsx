import React from "react";

type P = { size?: number; color?: string; stroke?: number; style?: React.CSSProperties };
const base = (p: P) => ({
  width: p.size ?? 24,
  height: p.size ?? 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: p.color ?? "currentColor",
  strokeWidth: p.stroke ?? 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: p.style,
});

export const IconGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19" /><path d="M12 2.5c2.8 2.6 4.2 5.8 4.2 9.5s-1.4 6.9-4.2 9.5c-2.8-2.6-4.2-5.8-4.2-9.5S9.2 5.1 12 2.5z" /></svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.7" r="1.2" fill="currentColor" stroke="none" /></svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 2.8l7.5 2.7v6.2c0 4.6-3.1 8.4-7.5 9.9-4.4-1.5-7.5-5.3-7.5-9.9V5.5L12 2.8z" /><path d="M8.6 12.2l2.6 2.6 4.4-5" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="M4.5 12.8l4.6 4.6 10.4-10.8" /></svg>
);
export const IconMail = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6.2L20.5 7" /></svg>
);
export const IconDatabase = (p: P) => (
  <svg {...base(p)}><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5.5" /><path d="M4.5 12v6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V12" /></svg>
);
export const IconBolt = (p: P) => (
  <svg {...base(p)}><path d="M13.2 2.5L4.8 13.4h6l-1 8.1 8.4-10.9h-6l1-8.1z" /></svg>
);
export const IconTablet = (p: P) => (
  <svg {...base(p)}><rect x="5" y="2.5" width="14" height="19" rx="2.8" /><path d="M10.5 18.5h3" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base(p)}><path d="M4 20.5h16" /><rect x="5.5" y="11" width="3.2" height="7" rx="1" /><rect x="10.4" y="6" width="3.2" height="12" rx="1" /><rect x="15.3" y="9" width="3.2" height="9" rx="1" /></svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M12 6.5C10.3 5.2 8 4.6 4.5 4.8v13c3.5-.2 5.8.4 7.5 1.7 1.7-1.3 4-1.9 7.5-1.7v-13C16 4.6 13.7 5.2 12 6.5z" /><path d="M12 6.5v13" /></svg>
);
export const IconSliders = (p: P) => (
  <svg {...base(p)}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
);
export const IconPin = (p: P) => (
  <svg {...base(p)}><path d="M12 21.5s7-6.2 7-11.7a7 7 0 1 0-14 0c0 5.5 7 11.7 7 11.7z" /><circle cx="12" cy="9.8" r="2.6" /></svg>
);
export const IconSheet = (p: P) => (
  <svg {...base(p)}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M4 9.5h16M4 15h16M10 9.5v11" /></svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base(p)}><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3z" /></svg>
);
export const IconKey = (p: P) => (
  <svg {...base(p)}><circle cx="8" cy="15.5" r="4" /><path d="M10.8 12.7L20 3.5M16 7.5l2.5 2.5M13.5 10l2 2" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8.2" r="3.8" /><path d="M4.5 20.5c.6-4 3.6-6.2 7.5-6.2s6.9 2.2 7.5 6.2" /></svg>
);
