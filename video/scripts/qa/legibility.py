#!/usr/bin/env python3
"""Legibility audit on full-size stills of the film (BRIEF v2, phase 3): text contrast and a phone-width check.

    python3 scripts/qa/legibility.py out/qa-stills --md

For every PNG in the folder (named t<seconds>.png, 1080 x 1350):
  * CONTRAST of the caption band (top 62..230 px, where the burned-in captions live): the band is split into text / background with
    Otsu's threshold on luminance, and the WCAG contrast ratio between the mean relative luminance of the two groups is reported
    (>= 4.5 passes; the gradient words are the weakest part, so this is the conservative reading);
  * a PHONE copy at 360 px wide (what a LinkedIn phone feed shows) is written to <folder>/phone/ and tiled into phone-sheet.png, so the
    stills can be judged at the size they will be read.
"""
import argparse, glob, os, re, sys
import numpy as np
from PIL import Image

def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def luminance(rgb):
    r, g, b = lin(rgb[..., 0]), lin(rgb[..., 1]), lin(rgb[..., 2])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def otsu(vals, bins=64):
    h, edges = np.histogram(vals, bins=bins)
    p = h / h.sum(); w = np.cumsum(p); mu = np.cumsum(p * (edges[:-1] + edges[1:]) / 2); mt = mu[-1]
    sb = (mt * w - mu) ** 2 / (w * (1 - w) + 1e-12)
    return edges[int(np.argmax(sb)) + 1]

def band_contrast(arr, y0=62, y1=230):
    band = arr[y0:y1, 60:1020, :3].astype(float)
    L = luminance(band)
    thr = otsu(L.ravel())
    hi, lo = L[L > thr], L[L <= thr]
    if hi.size < 400 or lo.size < 400:
        return None
    return (hi.mean() + 0.05) / (lo.mean() + 0.05), hi.size / L.size

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--md", action="store_true")
    ap.add_argument("--caption-times", default="")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.folder, "t*.png")), key=lambda f: float(re.search(r"t([\d.]+)\.png", f).group(1)))
    caps = [float(x) for x in a.caption_times.split(",") if x]
    os.makedirs(os.path.join(a.folder, "phone"), exist_ok=True)
    tiles = []
    rows = []
    for f in files:
        t = float(re.search(r"t([\d.]+)\.png", f).group(1))
        im = Image.open(f).convert("RGB")
        arr = np.asarray(im)
        small = im.resize((360, round(360 * im.height / im.width)), Image.LANCZOS)
        small.save(os.path.join(a.folder, "phone", os.path.basename(f)))
        tiles.append(small)
        if not caps or any(abs(t - c) < 0.01 for c in caps):
            r = band_contrast(arr)
            rows.append((t, r))
    if tiles:
        cols = 6
        w, h = tiles[0].size
        n = len(tiles); nr = (n + cols - 1) // cols
        sheet = Image.new("RGB", (cols * w, nr * h), (20, 20, 20))
        for i, tl in enumerate(tiles):
            sheet.paste(tl, ((i % cols) * w, (i // cols) * h))
        sheet.save(os.path.join(a.folder, "phone-sheet.png"))
    print("| t (s) | caption-band contrast | text share | verdict |" if a.md else "t  contrast  share  verdict")
    if a.md: print("|---|---|---|---|")
    for t, r in rows:
        if r is None:
            print(f"| {t:.1f} | - | - | no caption text in the band |" if a.md else f"{t:.1f}  -")
            continue
        c, share = r
        v = "ok" if c >= 4.5 else "LOW"
        print(f"| {t:.1f} | {c:.1f}:1 | {share*100:.1f} % | {v} |" if a.md else f"{t:.1f}  {c:.1f}:1  {share*100:.1f}%  {v}")

if __name__ == "__main__":
    main()
