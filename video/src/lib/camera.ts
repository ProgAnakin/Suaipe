import { clamp } from "./motion";

/** Camera state over a device: zoom `z`, focus point (u,v) in screen fractions, `fy` = extra vertical offset in canvas px. */
export type Cam = { z: number; u: number; v: number; fy: number };
export type CamKey = { t: number; z: number; u: number; v: number; fy?: number; omega?: number; zeta?: number };

/** Unit step response of a 2nd-order system (natural frequency `omega`, damping ratio `zeta`). */
export const stepResponse = (tau: number, omega: number, zeta: number) => {
  if (tau <= 0) return 0;
  if (zeta >= 1) return 1 - (1 + omega * tau) * Math.exp(-omega * tau);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * tau) * (Math.cos(wd * tau) + ((zeta * omega) / wd) * Math.sin(wd * tau));
};

/**
 * Cinematographer-style camera: each key sets a NEW TARGET at time `t` and the camera glides there like a
 * critically damped spring, so a move that starts before the previous one has settled keeps its momentum
 * (no robotic stop-and-go between keyframes). Zoom is interpolated in log space. The first key is the start pose.
 */
export const followCamera = (keys: ReadonlyArray<CamKey>, t: number, defaults: { omega: number; zeta: number } = { omega: 9, zeta: 1 }): Cam => {
  const first = keys[0];
  let lz = Math.log(first.z);
  let u = first.u;
  let v = first.v;
  let fy = first.fy ?? 0;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const p = keys[i - 1];
    const s = stepResponse(t - k.t, k.omega ?? defaults.omega, k.zeta ?? defaults.zeta);
    lz += (Math.log(k.z) - Math.log(p.z)) * s;
    u += (k.u - p.u) * s;
    v += (k.v - p.v) * s;
    fy += ((k.fy ?? 0) - (p.fy ?? 0)) * s;
  }
  return { z: Math.exp(lz), u, v, fy };
};

/** Short zoom "thump" on beats/hits: multiply the camera zoom by the returned factor. */
export const punch = (t: number, times: ReadonlyArray<number>, amp = 0.025, tau = 0.11) => {
  let f = 1;
  for (const tp of times) if (t >= tp) f += amp * Math.exp(-(t - tp) / tau);
  return f;
};

/**
 * Translation (canvas px, with the element centred on the focus) that zooms about screen point (u,v).
 * Framing strength ramps in with the zoom so a 1.0 zoom keeps the device centred.
 */
export const camTranslate = (cam: Cam, w: number, h: number) => {
  const px = (cam.u - 0.5) * w;
  const py = (cam.v - 0.5) * h;
  const al = clamp((cam.z - 1) / 0.9);
  return { tx: px * (1 - cam.z - al), ty: py * (1 - cam.z - al) + al * cam.fy };
};

/** Where screen point (u,v) lands on the canvas (ignores tilt), given the device centre `c`. */
export const screenToCanvas = (cam: Cam, w: number, h: number, c: { x: number; y: number }, u: number, v: number) => {
  const { tx, ty } = camTranslate(cam, w, h);
  return { x: c.x + tx + cam.z * (u - 0.5) * w, y: c.y + ty + cam.z * (v - 0.5) * h };
};

/**
 * The same critically damped follow as `followCamera`, for any set of named scalars (take logs yourself where a ratio should be
 * interpolated). Each key sets a new TARGET at `t`; the first key is the start pose.
 */
export const followValues = <K extends string>(
  keys: ReadonlyArray<{ t: number; omega?: number; zeta?: number } & Record<K, number>>,
  t: number,
  names: ReadonlyArray<K>,
  defaults: { omega: number; zeta: number } = { omega: 9, zeta: 1 },
): Record<K, number> => {
  const out = {} as Record<K, number>;
  for (const n of names) out[n] = keys[0][n];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const p = keys[i - 1];
    const s = stepResponse(t - k.t, k.omega ?? defaults.omega, k.zeta ?? defaults.zeta);
    for (const n of names) out[n] += (k[n] - p[n]) * s;
  }
  return out;
};
