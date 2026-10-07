#!/usr/bin/env python3
"""Checks that the audio inside a rendered MP4 is aligned with public/audio/soundtrack.wav.

  python scripts/audio-sync.py out/suaipe-film.mp4 [--ffmpeg /path/to/ffmpeg]

Decodes the MP4's audio, cross-correlates it with the source master and reports the offset in milliseconds
(AAC adds ~21 ms of encoder delay that MP4 players compensate for; anything within a few ms is fine).
"""
import argparse, subprocess, sys, tempfile, wave, os
import numpy as np
from scipy.signal import fftconvolve

def read_wav(path):
    with wave.open(path, "rb") as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f"{path}: expected 16-bit PCM, got {8*sw}-bit")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    return x.reshape(-1, ch).mean(axis=1), sr

ap = argparse.ArgumentParser()
ap.add_argument("mp4")
ap.add_argument("--ffmpeg", default="ffmpeg")
ap.add_argument("--master", default=os.path.join(os.path.dirname(__file__), "..", "public", "audio", "soundtrack.wav"))
a = ap.parse_args()

with tempfile.TemporaryDirectory() as d:
    out = os.path.join(d, "mp4.wav")
    subprocess.run([a.ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", a.mp4, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", out], check=True)
    x, sr = read_wav(out)
    m, sr2 = read_wav(a.master)
assert sr == sr2 == 48000, (sr, sr2)
N = min(len(x), len(m), 48000 * 20)
corr = fftconvolve(x[:N], m[:N][::-1], mode="full")
lag = int(np.argmax(corr)) - (N - 1)
print(f"mp4 audio: {len(x)/sr:.3f}s   master: {len(m)/sr:.3f}s")
print(f"offset of the MP4 audio relative to the master: {1000*lag/sr:+.2f} ms (positive = MP4 audio is later)")
xs, ms = x[max(0, lag):][:N], m[: len(x[max(0, lag):][:N])]
r = float(np.corrcoef(xs[: len(ms)], ms[: len(xs)])[0, 1])
print(f"waveform correlation after alignment: {r:.4f}")
