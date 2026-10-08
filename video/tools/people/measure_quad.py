#!/usr/bin/env python3
"""Finds the glass of the (switched-off, black) tablet in a hand-off photo and prints it as the HANDOFF_QUAD for src/people.ts.

    python3 tools/people/measure_quad.py public/people/handoff.webp [--seed X,Y] [--thr 48] [--erode 6] [--inset 0.025] [--debug out.png]
                                         [--fg public/people/handoff-fg.webp]

How it works: the glass is the big dark blob around the picture centre (the silver aluminium rim separates it from the sleeves and
the shelves). It is thresholded, thinly connected bridges are cut by an erosion and holes (reflections) are filled. The four sides are
then fitted as straight lines with RANSAC on the blob's outline (fingers and hands covering an edge or a corner are outliers) and
the quad is the intersection of neighbouring lines — so a corner hidden behind a hand is still found. `--inset` pulls the quad in by that
fraction of its size, so the lit UI leaves a thin black border like a real display. Always look at the --debug overlay before trusting
the numbers.

`--fg` also writes the foreground cut-out: the photo with an alpha channel that is opaque where fingers / hands cover the glass. The film draws
it above the lit screen, so the UI stays *behind* the fingers that hold the tablet. Needs numpy, scipy and Pillow (with WebP support).
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.spatial import ConvexHull


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--seed", help="a point inside the glass, 'x,y' in photo px (default: the centre of the picture)")
    ap.add_argument("--thr", type=float, default=48, help="luminance (0-255) below which a pixel counts as glass")
    ap.add_argument("--erode", type=int, default=6, help="px of erosion used to cut thin bridges to the sleeves / shelves")
    ap.add_argument("--inset", type=float, default=0.025, help="fraction of the quad size to pull the corners in by")
    ap.add_argument("--debug", help="write an overlay PNG here")
    ap.add_argument("--fg", help="write the foreground cut-out (RGBA WebP: the photo, opaque where hands cover the glass) here")
    a = ap.parse_args()

    im = Image.open(a.image).convert("RGB")
    w, h = im.size
    lum = np.asarray(im.convert("L"), dtype=np.float32)
    lum = ndi.gaussian_filter(lum, 1.5)
    dark = lum < a.thr
    core = ndi.binary_erosion(dark, iterations=a.erode) if a.erode else dark

    sx, sy = (int(v) for v in a.seed.split(",")) if a.seed else (w // 2, h // 2)
    labels, n = ndi.label(core)
    lab = labels[sy, sx]
    if lab == 0:  # the seed is not dark: take the biggest blob near it
        ys, xs = np.nonzero(core)
        if not len(xs):
            print("no dark region found — raise --thr", file=sys.stderr)
            return 1
        d = (xs - sx) ** 2 + (ys - sy) ** 2
        lab = labels[ys[np.argmin(d)], xs[np.argmin(d)]]
    blob = labels == lab
    blob = ndi.binary_dilation(blob, iterations=a.erode) if a.erode else blob
    blob = ndi.binary_fill_holes(blob)
    ys, xs = np.nonzero(blob)
    pts = np.stack([xs, ys], 1).astype(np.float64)
    hull = pts[ConvexHull(pts).vertices]

    s_, d_ = hull[:, 0] + hull[:, 1], hull[:, 0] - hull[:, 1]
    tl, br, tr, bl = hull[np.argmin(s_)], hull[np.argmax(s_)], hull[np.argmax(d_)], hull[np.argmin(d_)]
    rough = np.array([tl, tr, br, bl])

    edge = blob & ~ndi.binary_erosion(blob)
    ey, ex = np.nonzero(edge)
    outline = np.stack([ex, ey], 1).astype(np.float64)
    rng = np.random.default_rng(7)

    def fit_side(p0, p1, band):
        v = p1 - p0
        L = np.linalg.norm(v)
        u = v / L
        nrm = np.array([-u[1], u[0]])
        rel = outline - p0
        t = rel @ u / L
        dist = rel @ nrm
        cand = outline[(np.abs(dist) < band * L) & (t > 0.12) & (t < 0.88)]
        if len(cand) < 20:
            raise SystemExit("not enough outline points on a side — adjust --thr / --seed")
        best, best_n = None, -1
        for _ in range(400):
            a_, b_ = cand[rng.choice(len(cand), 2, replace=False)]
            if np.linalg.norm(b_ - a_) < 0.2 * L:
                continue
            n_ = np.array([-(b_ - a_)[1], (b_ - a_)[0]])
            n_ /= np.linalg.norm(n_)
            inl = np.abs((cand - a_) @ n_) < 1.6
            if inl.sum() > best_n:
                best, best_n = inl, inl.sum()
        P = cand[best]
        m = P.mean(0)
        _, _, vt = np.linalg.svd(P - m)  # total least squares
        return m, vt[0]

    def meet(l1, l2):
        (m1, d1), (m2, d2) = l1, l2
        t = np.linalg.solve(np.array([d1, -d2]).T, m2 - m1)
        return m1 + t[0] * d1

    # the hull extremes are only a first guess (a hand over a corner moves them): refit a few times with a narrowing band
    quad = rough
    for band in (0.16, 0.09, 0.05):
        sides = [fit_side(quad[i], quad[(i + 1) % 4], band) for i in range(4)]  # top, right, bottom, left
        quad = np.array([meet(sides[3], sides[0]), meet(sides[0], sides[1]), meet(sides[1], sides[2]), meet(sides[2], sides[3])])  # TL TR BR BL
    tl, tr, br, bl = quad

    c = quad.mean(0)
    wq = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2
    hq = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2
    quad_in = c + (quad - c) * (1 - 2 * a.inset)

    print(f"blob area {blob.sum() / (w * h) * 100:.1f}% of the picture · quad {wq:.0f} x {hq:.0f} px (aspect {wq / hq:.3f}; an iPad screen is 0.750)")
    print("export const HANDOFF_QUAD: Quad = [")
    for p in quad_in:
        print(f"  [{p[0]:.0f}, {p[1]:.0f}],")
    print("];")

    if a.fg:
        poly = Image.new("L", (w, h), 0)
        ImageDraw.Draw(poly).polygon([tuple(p) for p in quad_in], fill=255)
        inside = ndi.binary_dilation(np.asarray(poly) > 0, iterations=3)
        cover = inside & ~blob  # in the glass area but not glass: the fingers
        cover = ndi.binary_opening(cover, iterations=2)  # drop specks and 1-px outlines
        cover = ndi.binary_erosion(cover, iterations=1)  # keep the dark anti-aliased fringe out of the cut-out
        alpha = np.clip(ndi.gaussian_filter(cover.astype(np.float32), 1.1) * 1.25, 0, 1)
        rgba = np.dstack([np.asarray(im), (alpha * 255).astype(np.uint8)])
        Image.fromarray(rgba, "RGBA").save(a.fg, quality=92, method=6)
        print(f"foreground cut-out → {a.fg} ({cover.sum() / max(1, inside.sum()) * 100:.1f}% of the glass is covered by fingers)")

    if a.debug:
        ov = im.copy()
        dr = ImageDraw.Draw(ov, "RGBA")
        m = Image.fromarray((blob * 90).astype(np.uint8))
        ov.paste((255, 0, 80), mask=m)
        dr.polygon([tuple(p) for p in quad], outline=(255, 220, 0, 255))
        dr.polygon([tuple(p) for p in quad_in], outline=(0, 255, 200, 255))
        for i, p in enumerate(quad_in):
            dr.ellipse([p[0] - 6, p[1] - 6, p[0] + 6, p[1] + 6], outline=(0, 255, 200, 255), width=2)
            dr.text((p[0] + 10, p[1] + 10), ["TL", "TR", "BR", "BL"][i], fill=(255, 255, 255, 255))
        ov.save(a.debug)
        print(f"overlay → {a.debug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
