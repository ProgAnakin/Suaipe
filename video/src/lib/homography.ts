export type Pt = readonly [number, number];
export type Quad = readonly [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL

/**
 * Homography (3x3, h33 = 1) that maps the four `src` points onto the four `dst` points.
 * Solved with Gaussian elimination (8 unknowns); returns [a, b, c, d, e, f, g, h] where
 *   x' = (a x + b y + c) / (g x + h y + 1),   y' = (d x + e y + f) / (g x + h y + 1)
 */
export const solveHomography = (src: Quad, dst: Quad): number[] => {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Gaussian elimination with partial pivoting on the augmented 8x9 matrix
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    const d = A[col][col];
    if (Math.abs(d) < 1e-12) throw new Error("degenerate quad");
    for (let c = col; c < 9; c++) A[col][c] /= d;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col];
      if (f === 0) continue;
      for (let c = col; c < 9; c++) A[r][c] -= f * A[col][c];
    }
  }
  return A.map((row) => row[8]);
};

export const applyHomography = (h: number[], x: number, y: number): [number, number] => {
  const w = h[6] * x + h[7] * y + 1;
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
};

/** CSS `matrix3d(...)` for the homography (use with transform-origin: 0 0). */
export const homographyToMatrix3d = (h: number[]) => {
  const [a, b, c, d, e, f, g, hh] = h;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
};

/** Matrix that maps the rectangle (0,0)-(w,h) onto the quad. */
export const rectToQuad = (w: number, h: number, quad: Quad) => homographyToMatrix3d(solveHomography([[0, 0], [w, 0], [w, h], [0, h]], quad));

/** Similarity transform (uniform scale + rotation + translation) taking quad -> the axis-aligned rect target (cx, cy, width). */
export const quadToRectSimilarity = (quad: Quad, target: { cx: number; cy: number; width: number }) => {
  const [tl, tr, br, bl] = quad;
  const topMid: Pt = [(tl[0] + tr[0]) / 2, (tl[1] + tr[1]) / 2];
  const botMid: Pt = [(bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2];
  const leftMid: Pt = [(tl[0] + bl[0]) / 2, (tl[1] + bl[1]) / 2];
  const rightMid: Pt = [(tr[0] + br[0]) / 2, (tr[1] + br[1]) / 2];
  const wq = Math.hypot(rightMid[0] - leftMid[0], rightMid[1] - leftMid[1]);
  // roll: angle of the vertical axis (top-mid → bottom-mid) relative to straight down
  const roll = Math.atan2(botMid[0] - topMid[0], botMid[1] - topMid[1]); // 0 when the screen is upright
  const center: Pt = [(tl[0] + tr[0] + br[0] + bl[0]) / 4, (tl[1] + tr[1] + br[1] + bl[1]) / 4];
  return { scale: target.width / wq, rotateRad: roll, center, target };
};

export const lerpQuad = (a: Quad, b: Quad, e: number): Quad =>
  a.map((p, i) => [p[0] + (b[i][0] - p[0]) * e, p[1] + (b[i][1] - p[1]) * e] as Pt) as unknown as Quad;

/**
 * The quad (in photo space) that the similarity `sim` maps onto an axis-aligned `w` x `h` rectangle of the canvas centred on
 * `sim.target`: the photographed glass "squared up", i.e. what it would look like seen straight on at that zoom.
 */
export const squaredQuad = (sim: ReturnType<typeof quadToRectSimilarity>, w: number, h: number): Quad => {
  const hw = w / 2 / sim.scale;
  const hh = h / 2 / sim.scale;
  const c = Math.cos(sim.rotateRad);
  const s = Math.sin(sim.rotateRad);
  const ex: Pt = [c, -s]; // the photo is rotated by +rot to make the glass upright, so the glass axes are rotated by -rot
  const ey: Pt = [s, c];
  const at = (kx: number, ky: number): Pt => [sim.center[0] + kx * hw * ex[0] + ky * hh * ey[0], sim.center[1] + kx * hw * ex[1] + ky * hh * ey[1]];
  return [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
};
