#!/usr/bin/env python3
"""Fallback for when only the 192x256 hosted previews of the AI stills are available (the full-resolution files sit on a host the
sandbox network policy denies): removes the JPEG blocking, upscales 4x with EDSR and writes public/people/<id>.webp (960x1280).

    curl -L -o EDSR_x4.pb https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x4.pb      # 38 MB, not committed
    pip install opencv-contrib-python-headless
    python3 tools/people/upscale.py --model EDSR_x4.pb [handoff bag handshake store]

Reads tools/people/previews/<id>.jpg. An upscaler cannot recover detail that is not in the preview, so these files are PROVISIONAL:
`node tools/people/fetch.mjs` replaces them with the real full-resolution images (then re-run measure_quad.py on the hand-off).
"""
import argparse
import pathlib
import sys

import cv2

ROOT = pathlib.Path(__file__).resolve().parents[2]
ALL = ["handoff", "bag", "handshake", "store"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", default=ALL)
    ap.add_argument("--model", default="EDSR_x4.pb", help="path to EDSR_x4.pb")
    ap.add_argument("--out", default=str(ROOT / "public" / "people"))
    a = ap.parse_args()

    sr = cv2.dnn_superres.DnnSuperResImpl.create()
    sr.readModel(a.model)
    sr.setModel("edsr", 4)
    for i in a.ids:
        img = cv2.imread(str(ROOT / "tools" / "people" / "previews" / f"{i}.jpg"))
        if img is None:
            print(f"✗ {i}: no preview", file=sys.stderr)
            return 1
        img = cv2.fastNlMeansDenoisingColored(img, None, 3, 3, 5, 15)  # the previews are ~8 KB JPEGs: take the blocking out first
        up = sr.upsample(img)  # 768 x 1024
        up = cv2.resize(up, (960, 1280), interpolation=cv2.INTER_LANCZOS4)
        up = cv2.addWeighted(up, 1.35, cv2.GaussianBlur(up, (0, 0), 1.3), -0.35, 0)  # mild unsharp mask
        dst = pathlib.Path(a.out) / f"{i}.webp"
        cv2.imwrite(str(dst), up, [cv2.IMWRITE_WEBP_QUALITY, 92])
        print(f"✓ {i}: {img.shape[1]}x{img.shape[0]} → {up.shape[1]}x{up.shape[0]} → {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
