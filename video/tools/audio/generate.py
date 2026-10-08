#!/usr/bin/env python3
"""Generate the Suaipe film soundtrack (music + sound design) from audio/cues.json.

    python tools/audio/generate.py                 # render, master, write deliverables + QA evidence
    python tools/audio/generate.py --skip-qa       # faster: no spectrograms / sync analysis
    python tools/audio/generate.py --help

Everything is synthesised in code (numpy/scipy), seeded and deterministic: the same cues.json gives the same files.
See README.md for the signal flow.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

sys.dont_write_bytecode = True      # keep the committed tool directory free of __pycache__
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402
import mix  # noqa: E402
import music  # noqa: E402
import music_a  # noqa: E402
import sfx  # noqa: E402
import theory  # noqa: E402
from dsp import SR, secs  # noqa: E402

VIDEO_ROOT = HERE.parent.parent


def find_ffmpeg(arg: str | None) -> str:
    for cand in (arg, os.environ.get("FFMPEG"), shutil.which("ffmpeg")):
        if cand and Path(cand).exists() or (cand and shutil.which(cand)):
            return cand
    raise SystemExit("ffmpeg not found: pass --ffmpeg /path/to/ffmpeg or set $FFMPEG")


def to_int16(x: np.ndarray, seed: int = 1234, silent_tail_s: float = 0.12) -> np.ndarray:
    """16-bit with TPDF dither (1 LSB), but exact digital silence over the last `silent_tail_s`."""
    rng = np.random.default_rng(seed)
    lsb = 1.0 / 32768.0
    d = (rng.random(x.shape) - rng.random(x.shape)) * lsb
    y = x + d
    tail = secs(silent_tail_s)
    y[-tail:] = x[-tail:]
    q = np.clip(np.round(y * 32767.0), -32768, 32767).astype(np.int16)
    q[-tail:] = np.round(x[-tail:] * 32767.0).astype(np.int16)
    return q


def remix(args) -> None:
    """Re-master from the exported stems (no synthesis): sum them with optional trims, run the same master chain, write the files."""
    t0 = time.time()
    out_dir = Path(args.out_dir)
    stems_dir = out_dir / ("stems" if args.name == "soundtrack" else f"stems-{args.name}")
    music, sr = sf.read(stems_dir / "music.wav", dtype="float64")
    sfxs, _ = sf.read(stems_dir / "sfx.wav", dtype="float64")
    assert sr == SR and music.shape == sfxs.shape
    pre = music * dsp.db2lin(args.music_gain_db) + sfxs * dsp.db2lin(args.sfx_gain_db)
    master, info = mix.master_chain(pre, len(pre), target_lufs=args.target_lufs, ceiling_db=args.ceiling_db)
    wav = out_dir / args.remix_name
    sf.write(wav, to_int16(master), SR, subtype="PCM_16")
    subprocess.run([find_ffmpeg(args.ffmpeg), "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "320k",
                    "-ar", str(SR), "-ac", "2", str(wav.with_suffix(".mp3"))], check=True)
    print(f"[{time.time() - t0:5.1f}s] re-mastered {wav.name} (music {args.music_gain_db:+.1f} dB, sfx {args.sfx_gain_db:+.1f} dB, "
          f"{dsp.lufs_integrated(master):.2f} LUFS, true peak {dsp.true_peak(master):.2f} dBTP)")


def build(args) -> dict:
    t_start = time.time()
    mix.RECALIBRATE = bool(args.recalibrate)
    cues = json.loads(Path(args.cues).read_text())
    assert cues["sampleRate"] == SR, "cue sheet sample rate must be 48 kHz"
    n = secs(cues["duration"])
    harm = theory.Harmony.from_cues(cues)
    build_dir = Path(args.build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)
    log = lambda *a: print(f"[{time.time() - t_start:6.1f}s]", *a, flush=True)

    log(f"cues: {len(cues['sfx'])} sfx, {len(harm.bars)} bars, {cues['duration']} s")
    irs = mix.ir_bank()
    log(f"composing + rendering music (direction {args.direction.upper()})")
    mix.RECALIBRATE = True                                    # the arrangement is new: every bus is calibrated to its target
    sc = music_a.compose_a(cues, harm, args.direction)
    raw = music.render_music(sc, harm, cues, n)
    mus = mix.process_music_a(sc, raw, cues, n, irs)
    log("rendering sound design")
    rendered = sfx.render_sfx(cues, harm, n)
    sfxm = mix.process_sfx(rendered, n, irs, sfx_gain_db=args.sfx_gain_db)
    fade = mix.end_fade_curve(n, cues["duration"] - 1.1, cues["duration"] - 0.08)[:, None]   # both stems end in exact digital silence
    music_stem = mus["stem"] * dsp.db2lin(args.music_gain_db) * fade
    sfx_stem = sfxm["stem"] * fade

    # ---- stems: the exact buses feeding the master, scaled together so their sum peaks at -1 dBFS
    pre = music_stem + sfx_stem
    k = dsp.db2lin(-1.0) / np.max(np.abs(pre))
    music_stem, sfx_stem, pre = music_stem * k, sfx_stem * k, pre * k
    log(f"pre-master: music {dsp.lufs_integrated(music_stem):.1f} LUFS, sfx {dsp.lufs_integrated(sfx_stem):.1f} LUFS, stem scale {dsp.lin2db(k):+.2f} dB")

    out_dir = Path(args.out_dir)
    (out_dir / "stems").mkdir(parents=True, exist_ok=True)
    wav = out_dir / f"{args.name}.wav"
    mp3 = out_dir / f"{args.name}.mp3"
    stems_dir = out_dir / ("stems" if args.name == "soundtrack" else f"stems-{args.name}")
    stems_dir.mkdir(parents=True, exist_ok=True)
    sf.write(stems_dir / "music.wav", music_stem, SR, subtype="PCM_24")
    sf.write(stems_dir / "sfx.wav", sfx_stem, SR, subtype="PCM_24")
    ffmpeg = find_ffmpeg(args.ffmpeg)

    log("mastering")
    ceiling = args.ceiling_db
    for attempt in range(3):
        master, info = mix.master_chain(pre, n, target_lufs=args.target_lufs, ceiling_db=ceiling)
        log(f"master: gain {info['gain_db']:+.2f} dB, max limiter reduction {info['gr_min']:.2f} dB (ceiling {ceiling:.2f} dBFS)")
        sf.write(wav, to_int16(master), SR, subtype="PCM_16")
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "320k",
                        "-ar", str(SR), "-ac", "2", str(mp3)], check=True)
        # the MP3 decoder can overshoot the WAV's true peak by a fraction of a dB: tighten the limiter if so, so both files meet the ceiling
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le",
                        str(build_dir / "mp3_decoded.wav")], check=True)
        tp_mp3 = dsp.true_peak(sf.read(build_dir / "mp3_decoded.wav", dtype="float64")[0])
        log(f"true peak: wav {dsp.true_peak(master):.2f} dBTP, mp3 {tp_mp3:.2f} dBTP")
        if tp_mp3 <= args.ceiling_db + 0.02 or attempt == 2:
            break
        ceiling -= (tp_mp3 - args.ceiling_db) + 0.02
    log(f"wrote {wav.name}, {mp3.name}, stems/")

    ctx = dict(cues=cues, harm=harm, sc=sc, mus=mus, sfxm=sfxm, rendered=rendered, master=master, music_stem=music_stem,
               sfx_stem=sfx_stem, pre=pre, info=info, ffmpeg=ffmpeg, wav=wav, mp3=mp3, stem_scale_db=float(dsp.lin2db(k)), n=n)
    if not args.skip_qa:
        import qa
        log("QA")
        qa.run(ctx, Path(args.qa_dir), build_dir, args)
    log("done")
    return ctx


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cues", default=str(VIDEO_ROOT / "audio" / "cues.json"))
    ap.add_argument("--out-dir", default=str(VIDEO_ROOT / "public" / "audio"))
    ap.add_argument("--qa-dir", default=str(VIDEO_ROOT / "audio" / "qa"))
    ap.add_argument("--build-dir", default=str(VIDEO_ROOT / "audio" / "build"))
    ap.add_argument("--ffmpeg", default=None, help="ffmpeg with libmp3lame, ebur128, showspectrumpic (default: $FFMPEG or PATH)")
    ap.add_argument("--target-lufs", type=float, default=-14.0)
    ap.add_argument("--ceiling-db", type=float, default=-1.6, help="true-peak limiter ceiling in dBFS (-1.6 leaves >= 0.5 dB after an AAC 128k re-encode)")
    ap.add_argument("--direction", default="a", choices=["a", "b"], help="a = Minimal pulse (the chosen direction), b = Confident build (A/B listening files only)")
    ap.add_argument("--name", default="soundtrack", help="output name: <out-dir>/<name>.wav/.mp3 (stems in stems/ or stems-<name>/)")
    ap.add_argument("--music-gain-db", type=float, default=0.0, help="music bus trim before the master (balance vs sfx)")
    ap.add_argument("--sfx-gain-db", type=float, default=0.0, help="sfx bus trim before the master")
    ap.add_argument("--skip-qa", action="store_true")
    ap.add_argument("--recalibrate", action="store_true",
                    help="derive the music bus gains from the rendered stems instead of using the frozen ones (changes the whole mix)")
    ap.add_argument("--from-stems", action="store_true",
                    help="no synthesis: re-balance and re-master the exported stems (use with --music-gain-db / --sfx-gain-db)")
    ap.add_argument("--remix-name", default="soundtrack_remix.wav", help="output file name for --from-stems (written next to the stems' folder)")
    args = ap.parse_args()
    remix(args) if args.from_stems else build(args)


if __name__ == "__main__":
    main()
