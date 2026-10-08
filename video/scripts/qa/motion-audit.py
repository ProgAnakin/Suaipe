#!/usr/bin/env python3
"""Motion / continuity / safe-area audit of a rendered film (needs numpy + opencv + ffmpeg).

    python3 scripts/qa/motion-audit.py out/suaipe-film.mp4 --ffmpeg /path/to/ffmpeg --out qa/motion-audit.json

For every transition of the master (CHAPTER overlaps in src/timeline.ts) it measures, with dense optical flow on a 270 px wide copy of the
film (all numbers in px/frame of the 1080 px canvas):
  * the speed and direction of the picture in the 6 frames BEFORE the transition starts and in the 6 frames AFTER it ends,
    plus the share of the picture that is moving at all (a hold has ~0), so a hold -> hold hand-over is not flagged;
  * the biggest frame-to-frame luminance jump inside the transition ("pop");
and over the whole film: every luminance pop above a robust threshold, and how much of the bottom 8 % strip / the four 110 px corners
carries detail (edges) — the regions the LinkedIn player covers with its controls.
"""
import argparse, json, os, subprocess, sys
import cv2
import numpy as np

W, H = 270, 338          # analysis size (1080 x 1350 / 4)
S = 1080 / W             # px of the canvas per analysis px
FPS = 60

# the transitions are the CHAPTER overlaps of src/timeline.ts, listed by scripts/qa/transitions.mjs (never copied by hand)
HERE = os.path.dirname(os.path.abspath(__file__))
def load_transitions():
    raw = subprocess.run(["node", os.path.join(HERE, "transitions.mjs")], capture_output=True, text=True, check=True).stdout
    return [(t["name"], t["kind"], t["start"], t["end"]) for t in json.loads(raw)]
TRANSITIONS = load_transitions()

def decode(ffmpeg, path):
    cmd = [ffmpeg, "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W)
    p.wait()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--out", default="qa/motion-audit.json")
    a = ap.parse_args()

    frames = list(decode(a.ffmpeg, a.video))
    n = len(frames)
    print(f"{n} frames decoded ({n / FPS:.2f} s)", file=sys.stderr)

    # per-frame flow (frame i -> i+1), luminance jump, and edge density in the safe-area regions
    flow_mean = np.zeros((n - 1, 2)); speed = np.zeros(n - 1); moving = np.zeros(n - 1); jump = np.zeros(n - 1)
    fl = cv2.optflow if hasattr(cv2, "optflow") else None
    for i in range(n - 1):
        f = cv2.calcOpticalFlowFarneback(frames[i], frames[i + 1], None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag = np.hypot(f[..., 0], f[..., 1])
        flow_mean[i] = f.reshape(-1, 2).mean(0) * S
        speed[i] = mag.mean() * S
        moving[i] = (mag * S > 1.0).mean()
        jump[i] = np.abs(frames[i + 1].astype(np.int16) - frames[i].astype(np.int16)).mean()

    def win(lo, hi):
        lo, hi = max(0, lo), min(n - 1, hi)
        return lo, hi

    out = {"frames": n, "transitions": [], "pops": [], "safe_area": []}
    for name, kind, s, e in TRANSITIONS:
        i0, i1 = int(round(s * FPS)), int(round(e * FPS))
        pre = win(i0 - 6, i0); post = win(i1, i1 + 6); mid = win(i0, i1)
        def stats(lo, hi):
            v = flow_mean[lo:hi]; sp = speed[lo:hi]; mv = moving[lo:hi]
            return {"speed_px_f": float(sp.mean()), "mean_dx": float(v[:, 0].mean()), "mean_dy": float(v[:, 1].mean()), "moving_share": float(mv.mean())}
        before, after = stats(*pre), stats(*post)
        vb = np.array([before["mean_dx"], before["mean_dy"]]); va = np.array([after["mean_dx"], after["mean_dy"]])
        nb, na = np.linalg.norm(vb), np.linalg.norm(va)
        cos = float(vb @ va / (nb * na)) if nb > 0.3 and na > 0.3 else None
        ratio = float(min(before["speed_px_f"], after["speed_px_f"]) / max(before["speed_px_f"], after["speed_px_f"], 1e-6))
        k = int(np.argmax(jump[mid[0]:mid[1]])) + mid[0]
        lo, hi = win(int(round((s - 0.4) * FPS)), int(round((e + 0.4) * FPS)))
        prof = speed[lo:hi]
        d = np.abs(np.diff(prof))
        j = int(np.argmax(d)) if len(d) else 0
        snap = float(d[j] / (prof.max() + 0.5)) if len(d) else 0.0
        out["transitions"].append({
            "speed_profile_from_s": lo / FPS, "speed_profile": [round(float(v), 2) for v in prof],
            "max_single_frame_speed_step": float(d[j]) if len(d) else 0.0, "snap_ratio": snap, "snap_at_s": (lo + j + 1) / FPS,
            "name": name, "presentation": kind, "start": s, "end": e, "before": before, "after": after,
            "speed_ratio_min_over_max": ratio, "direction_cosine": cos,
            "max_luma_jump_in_transition": float(jump[mid[0]:mid[1]].max()), "max_luma_jump_at_s": k / FPS,
        })

    # luminance pops over the whole film (robust z-score on a 1 s rolling median)
    med = np.array([np.median(jump[max(0, i - 30):i + 31]) for i in range(n - 1)])
    mad = np.median(np.abs(jump - med)) + 1e-6
    z = (jump - med) / (1.4826 * mad)
    for i in np.argsort(-z)[:40]:
        if z[i] > 8 and jump[i] > 2.0:
            out["pops"].append({"t": round((i + 1) / FPS, 3), "luma_jump": round(float(jump[i]), 2), "z": round(float(z[i]), 1)})
    out["pops"].sort(key=lambda p: p["t"])

    # safe-area: edge density in the bottom 8 % strip and the four corners, every 0.25 s
    strip = slice(int(H * 0.92), H); c = int(110 / S)
    corners = {"TL": (slice(0, c), slice(0, c)), "TR": (slice(0, c), slice(W - c, W)), "BL": (slice(H - c, H), slice(0, c)), "BR": (slice(H - c, H), slice(W - c, W))}
    for i in range(0, n, 15):
        g = cv2.GaussianBlur(frames[i], (0, 0), 0.8)
        e = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
        row = {"t": round(i / FPS, 2), "bottom": float((e[strip] > 60).mean())}
        for k_, (ys, xs) in corners.items():
            row[k_] = float((e[ys, xs] > 60).mean())
        out["safe_area"].append(row)

    json.dump(out, open(a.out, "w"), indent=1)
    print(json.dumps({"transitions": out["transitions"], "pops": out["pops"]}, indent=1))

if __name__ == "__main__":
    main()
