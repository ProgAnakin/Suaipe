#!/usr/bin/env python3
"""Fallback for when only the 192x256 hosted previews of the AI stills are available (the full-resolution files sit on a host the
sandbox network policy denies): cleans the JPEG blocking, upscales 4x and writes public/people/<id>.webp (960x1280).

Two upscalers are blended 50/50, because each fails differently on an ~8 KB preview: EDSR keeps natural textures (knit, skin) but is soft,
Real-ESRGAN gives crisp edges but paints flat, illustration-like surfaces. A touch of fine grain then puts back photographic texture.

    curl -L -o EDSR_x4.pb https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x4.pb      # 38 MB, not committed
    pip install realesrgan-ncnn-py && pip install --force-reinstall --no-deps opencv-contrib-python-headless
    #   ^ the wheel bundles the Real-ESRGAN models but pulls in plain opencv-python (no dnn_superres): reinstall the contrib build last
    sudo apt-get install libomp5-18 mesa-vulkan-drivers libvulkan1                      # Linux without a GPU: software Vulkan (lavapipe)
    python3 tools/people/upscale.py --model EDSR_x4.pb [handoff bag handshake store]

Reads tools/people/previews/<id>.jpg. An upscaler cannot recover detail that is not in the preview, so these files are PROVISIONAL:
`node tools/people/fetch.mjs` replaces them with the real full-resolution images (then re-run measure_quad.py on the hand-off).
Without Real-ESRGAN installed the script falls back to EDSR alone (`--no-esrgan` forces that).
"""
import argparse
import pathlib
import sys

import cv2
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
ALL = ["handoff", "bag", "handshake", "store"]
ESRGAN_X4PLUS = 3  # index of "realesrgan-x4plus" (the photographic model) in realesrgan-ncnn-py


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", default=ALL)
    ap.add_argument("--model", default="EDSR_x4.pb", help="path to EDSR_x4.pb")
    ap.add_argument("--out", default=str(ROOT / "public" / "people"))
    ap.add_argument("--no-esrgan", action="store_true", help="EDSR only")
    ap.add_argument("--grain", type=float, default=3.2, help="sigma of the fine grain added at the end (0-255 scale)")
    a = ap.parse_args()

    sr = cv2.dnn_superres.DnnSuperResImpl.create()
    sr.readModel(a.model)
    sr.setModel("edsr", 4)
    esr = None
    if not a.no_esrgan:
        try:
            from PIL import Image
            from realesrgan_ncnn_py import Realesrgan

            esr = Realesrgan(gpuid=0, tta_mode=False, tilesize=0, model=ESRGAN_X4PLUS)
        except Exception as e:  # noqa: BLE001 - optional dependency
            print(f"(Real-ESRGAN unavailable: {e}; using EDSR alone)", file=sys.stderr)

    for i in a.ids:
        img = cv2.imread(str(ROOT / "tools" / "people" / "previews" / f"{i}.jpg"))
        if img is None:
            print(f"✗ {i}: no preview", file=sys.stderr)
            return 1
        img = cv2.fastNlMeansDenoisingColored(img, None, 3, 3, 5, 15)  # the previews are ~8 KB JPEGs: take the blocking out first
        up = cv2.resize(sr.upsample(img), (960, 1280), interpolation=cv2.INTER_LANCZOS4)
        up = cv2.addWeighted(up, 1.35, cv2.GaussianBlur(up, (0, 0), 1.3), -0.35, 0)  # mild unsharp mask on the EDSR branch
        if esr is not None:
            out = esr.process_pil(Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
            gan = cv2.resize(cv2.cvtColor(np.asarray(out), cv2.COLOR_RGB2BGR), (960, 1280), interpolation=cv2.INTER_LANCZOS4)
            up = cv2.addWeighted(up, 0.5, gan, 0.5, 0)
        if a.grain > 0:
            rng = np.random.default_rng(sum(map(ord, i)))
            g = cv2.GaussianBlur(rng.normal(0, a.grain, up.shape[:2]).astype(np.float32), (0, 0), 0.6)
            up = np.clip(up.astype(np.float32) + g[..., None], 0, 255).astype(np.uint8)
        dst = pathlib.Path(a.out) / f"{i}.webp"
        cv2.imwrite(str(dst), up, [cv2.IMWRITE_WEBP_QUALITY, 92])
        print(f"✓ {i}: 192x256 → {up.shape[1]}x{up.shape[0]} → {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB){' [EDSR + Real-ESRGAN]' if esr else ' [EDSR]'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
