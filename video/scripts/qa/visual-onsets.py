#!/usr/bin/env python3
"""Independent, picture-derived list of "something appeared / changed here" moments (needs numpy + ffmpeg).

    python3 scripts/qa/visual-onsets.py out/pv7.mp4 --ffmpeg /path/to/ffmpeg [--out qa/visual-onsets.json]

The code-derived inventory (scripts/picture-events.mjs) says what the scenes were *written* to do; this reads the *rendered* picture, so an event the
inventory forgot still shows up. Method: every frame is reduced to a grey 135 x 169 image; |frame - previous frame| above a threshold is the "changed area";
a camera move changes a lot of area smoothly, a pop-in / tick / chip / flash changes a little area suddenly. An onset is a frame where the changed area
jumps above the local baseline (median of the surrounding second) by more than `--min-jump` of the picture and then falls back (a spike, not a ramp).
Each onset is reported with its time, the size of the change, where in the picture it happened (centroid, 3 x 3 grid cell) and whether the camera was
moving at that moment (large baseline).
"""
import argparse, json, subprocess, sys
import numpy as np

W, H, FPS = 135, 169, 60


def frames(video, ffmpeg):
    raw = subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", video, "-an", "-vf", f"scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(raw) // (W * H)
    return np.frombuffer(raw[: n * W * H], np.uint8).reshape(n, H, W).astype(np.int16)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--out", default=None)
    ap.add_argument("--tau", type=int, default=10, help="grey-level difference that counts as changed")
    ap.add_argument("--min-jump", type=float, default=0.0035, help="onset: jump of the changed area over its local baseline (fraction of the picture)")
    ap.add_argument("--gap", type=float, default=0.09, help="minimum distance between two onsets, seconds")
    a = ap.parse_args()

    f = frames(a.video, a.ffmpeg)
    n = len(f)
    d = np.abs(f[1:] - f[:-1])                       # (n-1, H, W)
    ch = d > a.tau
    area = ch.mean(axis=(1, 2))                      # changed fraction per frame transition
    # local baseline: median of the surrounding +-0.5 s (excluding nothing: spikes are rare, the median ignores them)
    k = int(0.5 * FPS)
    base = np.array([np.median(area[max(0, i - k): i + k + 1]) for i in range(len(area))])
    jump = area - base
    # a spike, not a ramp: bigger than both neighbours' mean by the min jump
    out = []
    last = -9.0
    for i in range(1, len(area) - 1):
        if jump[i] < a.min_jump:
            continue
        if not (area[i] >= area[i - 1] and area[i] >= area[i + 1]):
            continue
        t = (i + 1) / FPS
        if t - last < a.gap:
            # same event: keep the stronger one
            if out and jump[i] > out[-1]["jump"]:
                out[-1].update(t=round(t, 3), jump=round(float(jump[i]), 4))
            continue
        ys, xs = np.nonzero(ch[i])
        cx, cy = (xs.mean() / W, ys.mean() / H) if len(xs) else (0.5, 0.5)
        out.append({
            "t": round(t, 3), "jump": round(float(jump[i]), 4), "area": round(float(area[i]), 4), "baseline": round(float(base[i]), 4),
            "cx": round(float(cx), 2), "cy": round(float(cy), 2), "cell": f"{int(cy * 3)}{int(cx * 3)}",
            "camera_moving": bool(base[i] > 0.12),
        })
        last = t
    print(json.dumps({"video": a.video, "frames": n, "tau": a.tau, "min_jump": a.min_jump, "onsets": out}, indent=1) if not a.out else f"{len(out)} onsets")
    if a.out:
        json.dump({"video": a.video, "frames": n, "tau": a.tau, "min_jump": a.min_jump, "onsets": out}, open(a.out, "w"), indent=1)


if __name__ == "__main__":
    main()
