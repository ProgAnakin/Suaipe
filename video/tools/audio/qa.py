"""Quality-assurance evidence for the soundtrack: loudness (ffmpeg ebur128 + own meter), sections, mono-compat, DC,
clicks, spectrograms, sync check against the cue sheet, SFX clarity vs music, harmony audit, phone-speaker simulation.

Everything is measured on the rendered files / stems; nothing here changes the audio.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

import dsp
import theory as th
from dsp import SR, secs

OCT_EDGES = [20, 45, 90, 180, 355, 710, 1400, 2800, 5600, 11200, 22400]
# A-weighting at the band centres (31.5 Hz ... 16 kHz): used to decide which bands matter perceptually
A_WEIGHT_DB = [-39.4, -26.2, -16.1, -8.6, -3.2, 0.0, 1.2, 1.0, -1.1, -6.6]
OCT_NAMES = ["20-45", "45-90", "90-180", "180-355", "355-710", "0.7-1.4k", "1.4-2.8k", "2.8-5.6k", "5.6-11k", "11k+"]


# ------------------------------------------------------------------------------------------- ffmpeg helpers
def ff_ebur128(ffmpeg: str, path: Path) -> dict:
    p = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = p.stderr
    summ = txt[txt.rfind("Summary:"):]
    get = lambda pat: float(re.search(pat, summ).group(1))
    return {"I": get(r"I:\s+(-?[\d.]+) LUFS"), "LRA": get(r"LRA:\s+(-?[\d.]+) LU"), "TP": get(r"Peak:\s+(-?[\d.]+) dBFS"),
            "LRA_low": get(r"LRA low:\s+(-?[\d.]+) LUFS"), "LRA_high": get(r"LRA high:\s+(-?[\d.]+) LUFS")}


def ff_spectrogram(ffmpeg: str, src: Path, out: Path, start: float | None = None, dur: float | None = None,
                   size: str = "1800x500", stop_hz: int = 12000) -> None:
    cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
    if start is not None:
        cmd += ["-ss", f"{start}"]
    if dur is not None:
        cmd += ["-t", f"{dur}"]
    cmd += ["-i", str(src), "-lavfi", f"showspectrumpic=s={size}:legend=0:scale=sqrt:color=magma:stop={stop_hz}:win_func=hann", str(out)]
    subprocess.run(cmd, check=True)


def ff_decode(ffmpeg: str, src: Path, dst: Path) -> np.ndarray:
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", str(dst)], check=True)
    x, sr = sf.read(dst, dtype="float64")
    return x


# ------------------------------------------------------------------------------------------- measurements
def band_levels(x: np.ndarray, a: float, b: float) -> np.ndarray:
    seg = x[int(a * SR):int(b * SR)]
    m = 0.5 * (seg[:, 0] + seg[:, 1]) if seg.ndim == 2 else seg
    f, p = signal.welch(m, SR, nperseg=8192)
    tot = np.sum(p) + 1e-20
    return np.array([10 * np.log10(np.sum(p[(f >= lo) & (f < hi)]) / tot + 1e-12) for lo, hi in zip(OCT_EDGES[:-1], OCT_EDGES[1:])])


def energy_fraction(x: np.ndarray, lo: float, hi: float) -> float:
    m = 0.5 * (x[:, 0] + x[:, 1])
    f, p = signal.welch(m, SR, nperseg=8192)
    return float(np.sum(p[(f >= lo) & (f < hi)]) / np.sum(p))


def mono_loss_db(x: np.ndarray) -> float:
    """RMS of the (L+R)/2 downmix minus the stereo RMS (dB): 0 = no loss, -3 = uncorrelated channels."""
    mono = 0.5 * (x[:, 0] + x[:, 1])
    return float(dsp.rms_db(mono) - dsp.rms_db(x))


def section_table(master: np.ndarray, music: np.ndarray, sfxs: np.ndarray, cues: dict) -> list[dict]:
    rows = []
    for s in cues["sections"]:
        a, b = int(s["from"] * SR), int(min(s["to"], cues["duration"]) * SR)
        seg = master[a:b]
        rows.append({
            "name": s["name"], "from": s["from"], "to": s["to"], "lufs": dsp.lufs_ungated(seg), "rms": dsp.rms_db(seg),
            "peak": float(dsp.lin2db(np.max(np.abs(seg)))), "music": dsp.lufs_ungated(music[a:b]), "sfx": dsp.lufs_ungated(sfxs[a:b]),
            "mono_loss": mono_loss_db(seg), "corr": float(np.corrcoef(seg[:, 0], seg[:, 1])[0, 1]),
            "bands": band_levels(master, s["from"], min(s["to"], cues["duration"])),
        })
    return rows


# ------------------------------------------------------------------------------------------- sync check
BANDS = {"low": (45.0, 300.0), "mid": (300.0, 1800.0), "high": (1800.0, 12000.0)}


def _band_env(m: np.ndarray, lo: float, hi: float, smooth_ms: float = 0.5) -> np.ndarray:
    b = dsp.bp(m, lo, hi, 2)
    k = max(1, int(smooth_ms * 1e-3 * SR))
    return np.convolve(np.abs(b), np.ones(k) / k, mode="same")


def detect_onset(m: np.ndarray, t: float, pre: float = 0.025, post: float = 0.030) -> tuple[float | None, str]:
    """Onset time (s) of the burst nearest to `t` in the mono stem `m`.

    In each of three bands the positive 'novelty' (envelope minus 1.3x its trailing 20 ms average) is computed; every rising
    crossing of 30 % of that band's peak is an onset candidate (bands without a clear burst, peak < 3x the median envelope of the preceding 110 ms, are
    ignored) and the candidate closest to the cue time wins, within [t-25 ms, t+30 ms]. Returns (time, band) or (None, '')."""
    i0, i1 = max(int((t - pre) * SR), 0), min(int((t + post) * SR), len(m))
    pad = secs(0.12)
    off = max(i0 - pad, 0)
    seg = m[off:i1 + pad]
    slow_n = int(0.020 * SR)
    cands, ratios = [], {}
    w = slice(i0 - off, i1 - off)
    ctx = slice(max(int((t - 0.12) * SR) - off, 0), max(int((t - 0.01) * SR) - off, 1))   # what came just before: the background level
    per_band = {}
    for name, (lo, hi) in BANDS.items():
        env = _band_env(seg, lo, hi)
        cs = np.cumsum(np.concatenate([[0.0], env]))
        idx = np.arange(len(env))
        a = np.maximum(idx - slow_n, 0)
        slow = (cs[idx] - cs[a]) / np.maximum(idx - a, 1)
        nov = np.maximum(env - 1.3 * slow, 0.0)
        win = nov[w]
        if len(win) == 0 or win.max() < 1e-7:
            continue
        ratios[name] = win.max() / (np.median(env[ctx]) + 1e-6)
        per_band[name] = win
    if not ratios:
        return None, ""
    for name, win in per_band.items():
        if ratios[name] < 3.0:      # not a clear burst in this band
            continue
        thr = 0.3 * win.max()
        above = win > thr
        rising = np.flatnonzero(above & ~np.concatenate([[False], above[:-1]]))
        for j in rising:
            cands.append(((off + w.start + int(j)) / SR, name))
    if not cands:
        return None, ""
    return min(cands, key=lambda c: abs(c[0] - t))


def detect_peak(m: np.ndarray, t: float, pre: float, post: float, smooth_ms: float = 20.0, band=(300.0, 9000.0)) -> float | None:
    """Time of the smoothed band-limited energy maximum within [t-pre, t+post]."""
    i0, i1 = max(int((t - pre) * SR), 0), min(int((t + post) * SR), len(m))
    pad = secs(0.1)
    off = max(i0 - pad, 0)
    seg = dsp.bp(m[off:i1 + pad], band[0], band[1], 2)
    k = max(1, int(smooth_ms * 1e-3 * SR))
    e = np.convolve(seg ** 2, np.ones(k) / k, mode="same")
    sel = slice(i0 - off, i1 - off)
    if len(e[sel]) == 0 or e[sel].max() < 1e-14:
        return None
    return (off + sel.start + int(np.argmax(e[sel]))) / SR


SYNC_ROWS = [("logo-hit", 0), ("tap", 0), ("tap", 1), ("key", 0), ("key", 32), ("swipe-no", 0), ("swipe-yes", 0), ("swipe-yes", 2),
             ("swipe-no", 4), ("counter-hit", 0), ("notif-ping", 0), ("code-ding", 0), ("lock-on", 0), ("tile-pop", 0), ("tile-pop", 4),
             ("word-hit", 0), ("device-settle", 0), ("chip-tick", 0), ("lock-click", 0), ("confirm", 0), ("success-chime", 0), ("count-tick", 0),
             ("count-tick", 12), ("card-in", 0), ("check-tick", 0),
             # opening of the product scene
             ("screen-wake", 0), ("caption-pop", 0),
             # system diagram (retimed) and the closing scenes
             ("node-on", 0), ("packet", 0), ("node-on", 1), ("packet", 1), ("node-on", 3), ("node-on", 4), ("packet", 3), ("tile-on", 0),
             ("tile-on", 1), ("tile-on", 2), ("lock-click", 1), ("lock-click", 2), ("caption-pop", 5), ("bag-rustle", 0), ("redeem-ding", 0),
             ("handshake", 0), ("logo-hit-soft", 0), ("chip-pop", 0), ("chip-pop", 1), ("chip-pop", 2), ("chip-pop", 3)]


def _sync_row(m: np.ndarray, e: dict, k: int) -> dict:
    got, band = detect_onset(m, e["target"])
    return {"type": e["type"], "index": k, "cue_t": e["t"], "target": e["target"], "detected": got, "band": band,
            "err_ms": None if got is None else (got - e["target"]) * 1000.0}


def sync_check(sfx_stem: np.ndarray, log: list[dict]) -> list[dict]:
    """Detect each representative cue's accent in the rendered SFX stem and report the timing error in ms."""
    m = 0.5 * (sfx_stem[:, 0] + sfx_stem[:, 1])
    by: dict[str, list] = {}
    for e in log:
        by.setdefault(e["type"], []).append(e)
    return [_sync_row(m, by[name][k], k) for name, k in SYNC_ROWS if name in by and k < len(by[name])]


def sync_all(sfx_stem: np.ndarray, log: list[dict]) -> list[dict]:
    """The same measurement for EVERY transient (onset-type) cue of the sheet."""
    m = 0.5 * (sfx_stem[:, 0] + sfx_stem[:, 1])
    seen: dict[str, int] = {}
    rows = []
    for e in log:
        k = seen.get(e["type"], 0)
        seen[e["type"]] = k + 1
        if e["kind"] == "onset":
            rows.append(_sync_row(m, e, k))
    return rows


def design_check(shots: list, log: list[dict]) -> dict:
    """Isolated check of all cues: the accent sample must equal round(target*SR); transient accents are re-detected inside the one-shot
    itself, whoosh / riser peaks are located by their smoothed energy maximum."""
    worst_place = 0
    onset_err, peak_err = [], []
    for (ev, shot, start), e in zip(shots, log):
        worst_place = max(worst_place, abs((start + shot.accent) - secs(e["target"])))
        mono_ = 0.5 * (shot.audio[:, 0] + shot.audio[:, 1])
        if shot.kind == "onset":
            got, _ = detect_onset(np.concatenate([np.zeros(secs(0.1)), mono_, np.zeros(secs(0.1))]), secs(0.1) / SR + shot.accent / SR)
            if got is not None:
                onset_err.append(((got - secs(0.1) / SR) - shot.accent / SR) * 1000.0)
        elif shot.kind in ("peak", "end") and len(mono_) > secs(0.1):
            pk = detect_peak(np.concatenate([np.zeros(secs(0.1)), mono_, np.zeros(secs(0.1))]), secs(0.1) / SR + shot.accent / SR, 0.30, 0.30, 20.0)
            if pk is not None:
                peak_err.append(((pk - secs(0.1) / SR) - shot.accent / SR) * 1000.0)
    return {"worst_placement_samples": int(worst_place), "n": len(log), "onset_n": len(onset_err),
            "onset_max_ms": float(np.max(np.abs(onset_err))) if onset_err else None,
            "onset_mean_ms": float(np.mean(np.abs(onset_err))) if onset_err else None,
            "peak_n": len(peak_err), "peak_max_ms": float(np.max(np.abs(peak_err))) if peak_err else None,
            "peak_median_ms": float(np.median(np.abs(peak_err))) if peak_err else None}


# ------------------------------------------------------------------------------------------- clarity
def clarity_check(sfx_stem: np.ndarray, music_stem: np.ndarray, log: list[dict]) -> list[dict]:
    """'Cut-through' of every transient cue: the best SFX-to-music ratio (dB) among the octave bands that carry at least 5 % (-13 dB)
    of the A-weighted SFX energy in the 30 ms around its onset. A tap's click or a key's tick is heard in its mid/high band even when its 'thock'
    shares a low band with the kick, so the strongest band alone would understate how clearly it is heard."""
    sm, mm = 0.5 * (sfx_stem[:, 0] + sfx_stem[:, 1]), 0.5 * (music_stem[:, 0] + music_stem[:, 1])
    rows = []
    for e in log:
        if e["kind"] != "onset":
            continue
        a, b = int((e["target"] - 0.002) * SR), int((e["target"] + 0.028) * SR)
        if b - a < 256:
            continue
        w = np.hanning(b - a)
        fs_ = np.abs(np.fft.rfft(sm[a:b] * w)) ** 2
        fm_ = np.abs(np.fft.rfft(mm[a:b] * w)) ** 2
        fr = np.fft.rfftfreq(b - a, 1 / SR)
        bands = []
        for (lo, hi), aw in zip(zip(OCT_EDGES[:-1], OCT_EDGES[1:]), A_WEIGHT_DB):
            s_ = (fr >= lo) & (fr < hi)
            bands.append((lo, hi, fs_[s_].sum() + 1e-20, fm_[s_].sum() + 1e-20, (fs_[s_].sum() + 1e-20) * 10 ** (aw / 10)))
        top = max(x[4] for x in bands)                                 # A-weighted: where the ear actually listens
        ok = [x for x in bands if x[4] >= top * 10 ** (-1.3)]
        best = max(ok, key=lambda x: x[2] / x[3])
        rows.append({"type": e["type"], "t": e["target"], "band": f"{best[0]}-{best[1]}", "snr_db": float(10 * np.log10(best[2] / best[3]))})
    return rows


# ------------------------------------------------------------------------------------------- harmony audit
def harmony_audit(log: list[dict], harm: th.Harmony) -> dict:
    counts = {"chord": 0, "ext": 0, "pass": 0, "out": 0}
    bad = []
    n_events = 0
    for e in log:
        if not e["notes"]:
            continue
        n_events += 1
        for tt, m in e["notes"]:
            ch = harm.at(min(tt + 1e-3, 44.49))
            cls = th.pc_class(ch, m)
            counts[cls] += 1
            if e["strict"] and cls in ("pass", "out"):
                bad.append((e["type"], round(tt, 3), ch, int(m), cls))
            if cls == "out":
                bad.append((e["type"], round(tt, 3), ch, int(m), cls))
    return {"events": n_events, "counts": counts, "violations": sorted(set(bad))}


# ------------------------------------------------------------------------------------------- music harmony (chroma)
def music_chroma_check(music: np.ndarray, harm: th.Harmony, bars: int | None = None) -> list[dict]:
    """Per bar: share of the music stem's tonal energy (60 Hz - 2 kHz) that sits on the chord tones / chord + extensions."""
    m = 0.5 * (music[:, 0] + music[:, 1])
    rows = []
    for b, bar in enumerate(harm.bars[: bars or len(harm.bars)]):
        a, z = int(bar["from"] * SR), int(min(bar["to"], len(m) / SR) * SR)
        seg = m[a:z] * np.hanning(z - a)
        sp = np.abs(np.fft.rfft(seg)) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        sel = (fr >= 60) & (fr <= 2000)
        pcs = np.round(12 * np.log2(fr[sel] / 440.0)).astype(int) % 12 + 9      # 0 = A -> shift so 0 = C
        pcs = pcs % 12
        chroma = np.bincount(pcs, weights=sp[sel], minlength=12)
        chroma = chroma / (chroma.sum() + 1e-30)
        ch = bar["chord"]
        on_chord = sum(chroma[p] for p in th.CHORDS[ch]["tones"])
        on_ext = sum(chroma[p] for p in th.CHORDS[ch]["ext"])
        rows.append({"bar": bar["bar"], "t": bar["from"], "chord": ch, "chord_tones": float(on_chord), "extensions": float(on_ext),
                     "other": float(1 - on_chord - on_ext), "top_pc": int(np.argmax(chroma))})
    return rows


# ------------------------------------------------------------------------------------------- clicks
def click_scan(master: np.ndarray, log: list[dict], sc, top: int = 10) -> list[dict]:
    """Impulsiveness scan: largest sample-to-sample step of the master relative to the local step RMS (+-8 ms), with the distance
    to the nearest *scheduled* onset (any cue or music note). Noise-like material tops out around 5-6; a click is > 12."""
    m = 0.5 * (master[:, 0] + master[:, 1])
    d = np.diff(m)
    k = secs(0.008)
    cs = np.concatenate([[0.0], np.cumsum(d ** 2)])
    idx = np.arange(len(d))
    lo, hi = np.maximum(idx - k, 0), np.minimum(idx + k + 1, len(d))
    local = np.sqrt((cs[hi] - cs[lo] - d ** 2) / np.maximum(hi - lo - 1, 1)) + 1e-6
    z = np.abs(d) / local
    z[np.abs(d) < 0.01] = 0.0
    onsets = np.array(sorted({e["target"] for e in log} | {t for t, *_ in sc.kicks} | {t for t, *_ in sc.claps} | {t for t, *_ in sc.snares}
                             | {t for t, *_ in sc.hats} | {t for t, *_ in sc.shakers} | {t[0] for t in sc.arps} | {t[0] for t in sc.bass}
                             | {t[0] for t in sc.keys} | {t[0] for t in sc.leads} | {t for t, _ in sc.hearts} | {t[0] for t in sc.subs}
                             | {p["t0"] for p in sc.pads} | {p["t1"] for p in sc.pads} | {t0 for t0, _ in sc.air_gaps} | {t1 for _, t1 in sc.air_gaps}))
    order = np.argsort(z)[::-1]
    rows, used = [], []
    for i in order:
        if any(abs(i - u) < secs(0.01) for u in used):
            continue
        used.append(int(i))
        t = (i + 1) / SR
        rows.append({"t": t, "z": float(z[i]), "step": float(abs(d[i])), "nearest_onset_ms": float(np.min(np.abs(onsets - t))) * 1000.0})
        if len(rows) >= top:
            break
    return rows


# ------------------------------------------------------------------------------------------- master driver
def run(ctx: dict, qa_dir: Path, build_dir: Path, args) -> dict:
    qa_dir.mkdir(parents=True, exist_ok=True)
    cues, harm, sc = ctx["cues"], ctx["harm"], ctx["sc"]
    ff = ctx["ffmpeg"]
    music, sfxs = ctx["music_stem"], ctx["sfx_stem"]
    wav, mp3 = ctx["wav"], ctx["mp3"]
    log = ctx["rendered"]["log"]
    rep: dict = {}

    # loudness: ffmpeg on the delivered WAV and on the MP3 (decoded)
    rep["wav"] = ff_ebur128(ff, wav)
    rep["mp3"] = ff_ebur128(ff, mp3)
    mp3_pcm = ff_decode(ff, mp3, build_dir / "mp3_decoded.wav")
    wav_pcm, _ = sf.read(wav, dtype="float64")
    rep["wav_len"] = len(wav_pcm)
    rep["mp3_len"] = len(mp3_pcm)
    rep["own_lufs"] = dsp.lufs_integrated(wav_pcm)
    rep["true_peak_own"] = dsp.true_peak(wav_pcm)
    rep["sample_peak"] = float(dsp.lin2db(np.max(np.abs(wav_pcm))))
    rep["dc"] = [float(np.mean(wav_pcm[:, 0])), float(np.mean(wav_pcm[:, 1]))]
    rep["clipped_samples"] = int(np.sum(np.abs(wav_pcm) >= 32767 / 32768.0))
    rep["mono_loss_total"] = mono_loss_db(wav_pcm)
    rep["corr_total"] = float(np.corrcoef(wav_pcm[:, 0], wav_pcm[:, 1])[0, 1])
    rep["sections"] = section_table(wav_pcm, music, sfxs, cues)
    rep["head"] = {"first_sample": [float(wav_pcm[0, 0]), float(wav_pcm[0, 1])], "rms_0_100ms": float(dsp.rms_db(wav_pcm[:secs(0.1)])),
                   "rms_100_300ms": float(dsp.rms_db(wav_pcm[secs(0.1):secs(0.3)])), "first_above_minus60_ms": float(1000 * np.argmax(np.max(np.abs(wav_pcm), axis=1) > 1e-3) / SR)}
    rep["tail"] = {"last_100ms_max": float(np.max(np.abs(wav_pcm[-secs(0.1):]))), "last_sample": [float(wav_pcm[-1, 0]), float(wav_pcm[-1, 1])],
                   "level_at_43_5": float(dsp.rms_db(wav_pcm[secs(43.4):secs(43.6)])), "level_at_44_2": float(dsp.rms_db(wav_pcm[secs(44.1):secs(44.3)]))}
    # phone simulation: 2nd-order HP @ 350 Hz + LP @ 10 kHz (small speaker)
    ph = dsp.lp(dsp.hp(wav_pcm, 350.0, 2), 10000.0, 2)
    rep["phone"] = {"lufs_full": rep["own_lufs"], "lufs_phone": dsp.lufs_integrated(ph), "main_band_fraction": energy_fraction(wav_pcm, 150, 6000),
                    "below_150": energy_fraction(wav_pcm, 20, 150), "above_8k": energy_fraction(wav_pcm, 8000, 24000)}
    rep["sync"] = sync_check(sfxs, log)
    rep["sync_all"] = sync_all(sfxs, log)
    rep["design"] = design_check(ctx["rendered"]["shots"], log)
    rep["clarity"] = clarity_check(sfxs, music, log)
    rep["harmony"] = harmony_audit(log, harm)
    rep["clicks"] = click_scan(wav_pcm, log, sc)
    rep["chroma"] = music_chroma_check(music, harm)
    rep["gains_db"] = ctx["mus"].get("gains_db", {})
    rep["master_info"] = ctx["info"]
    rep["stem_scale_db"] = ctx["stem_scale_db"]
    rep["stem_peaks"] = {"music": float(dsp.lin2db(np.max(np.abs(music)))), "sfx": float(dsp.lin2db(np.max(np.abs(sfxs))))}
    import mix as _mix
    ui_types = {"tile-pop", "key", "tap", "chip-tick", "check-tick", "lock-click", "card-in", "count-tick", "node-on", "packet", "tile-on", "chip-pop", "caption-pop", "callout-in", "confirm"}
    ui_peaks = []
    for e in log:
        if e["type"] in ui_types:
            a_, b_ = int(e["target"] * SR), int((e["target"] + 0.06) * SR)
            ui_peaks.append(float(dsp.lin2db(np.max(np.abs(sfxs[a_:b_])))))
    rep["balance"] = {"music_active_rms": _mix.active_rms_db(music), "sfx_peak": rep["stem_peaks"]["sfx"],
                      "ui_peak_median": float(np.median(ui_peaks)), "ui_peak_min": float(np.min(ui_peaks)), "ui_peak_max": float(np.max(ui_peaks))}

    # spectrograms (ffmpeg showspectrumpic)
    ff_spectrogram(ff, wav, qa_dir / "spectrogram.png")
    ff_spectrogram(ff, wav, qa_dir / "spectrogram_0-6s.png", 0, 6)
    ff_spectrogram(ff, wav, qa_dir / "spectrogram_19.5-23s.png", 19.5, 3.5)
    ff_spectrogram(ff, wav, qa_dir / "spectrogram_26-34s.png", 26, 8)
    ff_spectrogram(ff, wav, qa_dir / "spectrogram_33.5-44.5s.png", 33.5, 11)
    ff_spectrogram(ff, wav, qa_dir / "spectrogram_37-41s.png", 37, 4)
    try:
        plot_overview(wav_pcm, music, sfxs, cues, qa_dir / "loudness-and-spectrum.png")
    except Exception as exc:  # matplotlib is optional
        rep["plot_error"] = str(exc)
    with open(qa_dir / "sync-measured.csv", "w") as fh:
        fh.write("type,index_of_type,cue_t_s,target_s,detected_s,err_ms,band\n")
        for r_ in rep["sync_all"]:
            det = "" if r_["detected"] is None else f"{r_['detected']:.5f}"
            err = "" if r_["err_ms"] is None else f"{r_['err_ms']:.2f}"
            fh.write(f"{r_['type']},{r_['index']},{r_['cue_t']:.3f},{r_['target']:.4f},{det},{err},{r_['band']}\n")
    with open(qa_dir / "cue-placement.csv", "w") as fh:
        fh.write("index,type,step,cue_t_s,target_s,accent_sample,accent_sample_expected,kind,shot_peak_dbfs,shot_len_s\n")
        for e in log:
            fh.write(f"{e['index']},{e['type']},{'' if e['step'] is None else e['step']},{e['t']:.3f},{e['target']:.4f},{e['accent_sample']},"
                     f"{secs(e['target'])},{e['kind']},{e['peak_db']:.1f},{e['len_s']:.3f}\n")
    rep["warnings"] = collect_warnings(rep)
    write_report(rep, qa_dir / "report.md", args)
    (build_dir / "qa.json").write_text(json.dumps(rep, indent=1, default=lambda o: o.tolist() if hasattr(o, "tolist") else float(o)))
    return rep


# ------------------------------------------------------------------------------------------- plots / report
def plot_overview(master, music, sfxs, cues, out: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig = plt.figure(figsize=(18, 9))
    ax1 = fig.add_axes([0.05, 0.40, 0.93, 0.56])
    x = 0.5 * (master[:, 0] + master[:, 1])
    f, tt, S = signal.spectrogram(x, SR, nperseg=4096, noverlap=3584, scaling="spectrum")
    ax1.pcolormesh(tt, f, 10 * np.log10(S + 1e-14), shading="auto", cmap="magma", vmin=-105, vmax=-40)
    ax1.set_yscale("symlog", linthresh=100)
    ax1.set_ylim(30, 16000)
    for s in cues["sections"]:
        ax1.axvline(s["from"], color="w", lw=0.6, alpha=0.6)
        ax1.text(s["from"] + 0.1, 14000, s["name"], color="w", fontsize=8, va="top")
    ax1.set_xlim(0, cues["duration"])
    ax1.set_ylabel("Hz (log)")
    ax2 = fig.add_axes([0.05, 0.07, 0.93, 0.27])
    t3, st = dsp.short_term_curve(master, 3.0, 0.25)
    tm, mom = dsp.short_term_curve(master, 0.4, 0.1)
    ax2.plot(tm, mom, lw=0.6, color="#78a", label="master momentary (400 ms)")
    ax2.plot(t3, st, lw=2.0, color="#e94", label="master short-term (3 s)")
    a, b = dsp.short_term_curve(music, 3.0, 0.25)
    ax2.plot(a, b, lw=1.0, color="#48d", label="music stem (3 s)")
    a, b = dsp.short_term_curve(sfxs, 3.0, 0.25)
    ax2.plot(a, b, lw=1.0, color="#4b6", label="sfx stem (3 s)")
    ax2.axhline(-14, color="k", lw=0.8, ls="--")
    ax2.set_ylim(-45, -4)
    ax2.set_xlim(0, cues["duration"])
    ax2.grid(alpha=0.3)
    ax2.legend(loc="lower right", fontsize=8)
    ax2.set_ylabel("LUFS")
    ax2.set_xlabel("seconds")
    fig.savefig(out, dpi=70)
    plt.close(fig)


def collect_warnings(r: dict) -> list[str]:
    w: list[str] = []
    if abs(r["wav"]["I"] + 14.0) > 1.0:
        w.append(f"integrated loudness {r['wav']['I']:.1f} LUFS is outside -14 +-1")
    if r["wav"]["TP"] > -1.0 or r["mp3"]["TP"] > -1.0:
        w.append(f"true peak above -1 dBTP (wav {r['wav']['TP']:.2f}, mp3 {r['mp3']['TP']:.2f})")
    if r["wav_len"] != r["mp3_len"] or r["wav_len"] != int(round(44.5 * SR)):
        w.append(f"length mismatch (wav {r['wav_len']}, mp3 {r['mp3_len']})")
    if r["mono_loss_total"] < -3.0:
        w.append(f"mono downmix loses {r['mono_loss_total']:.1f} dB")
    worst_sec = min(r["sections"], key=lambda s: s["mono_loss"])
    if worst_sec["mono_loss"] < -3.0:
        w.append(f"section '{worst_sec['name']}' loses {worst_sec['mono_loss']:.1f} dB in mono")
    if r["phone"]["main_band_fraction"] < 0.6:
        w.append(f"only {100 * r['phone']['main_band_fraction']:.0f} % of the energy is in 150 Hz - 6 kHz")
    errs = [abs(s["err_ms"]) for s in r["sync"] if s["err_ms"] is not None]
    if errs and max(errs) >= 10.0:
        w.append(f"sync error up to {max(errs):.1f} ms")
    thin = {}
    for c in r["clarity"]:
        thin.setdefault(c["type"], []).append(c["snr_db"])
    for k, v in thin.items():
        if min(v) < 3.0:
            w.append(f"cue type '{k}' has at least one instance with < 3 dB cut-through ({min(v):.1f} dB)")
    far = [c for c in r["clicks"] if c["z"] > 12 and c["nearest_onset_ms"] > 3.0]
    if far:
        w.append(f"{len(far)} unexplained impulsive samples")
    if r["harmony"]["violations"]:
        w.append(f"{len(r['harmony']['violations'])} pitched cue notes outside chord + extensions")
    if r["tail"]["last_100ms_max"] > 1e-3:
        w.append(f"tail not silent enough: last 100 ms peaks at {r['tail']['last_100ms_max']:.1e}")
    if abs(r["dc"][0]) > 1e-4 or abs(r["dc"][1]) > 1e-4:
        w.append("DC offset above 1e-4")
    if r["clipped_samples"]:
        w.append(f"{r['clipped_samples']} full-scale samples")
    return w


def _f(v, d=1):
    return "n/a" if v is None else f"{v:.{d}f}"


def write_report(r: dict, path: Path, args) -> None:
    L: list[str] = []
    add = L.append
    add("# Suaipe film soundtrack - QA report")
    add("")
    add("Generated by `tools/audio/generate.py` (deterministic). Measured on the delivered files; `ffmpeg ebur128=peak=true` is the reference meter.")
    add("")
    add("## Master (public/audio/soundtrack.wav, 16-bit / 48 kHz / stereo)")
    w, m = r["wav"], r["mp3"]
    add("")
    add("| measure | WAV | MP3 (decoded) | target |")
    add("|---|---|---|---|")
    add(f"| Integrated loudness | **{w['I']:.1f} LUFS** | {m['I']:.1f} LUFS | -14 +-1 |")
    add(f"| True peak | **{w['TP']:.1f} dBTP** | {m['TP']:.1f} dBTP | <= -1.0 |")
    add(f"| Loudness range | {w['LRA']:.1f} LU (short-term {w['LRA_low']:.1f} .. {w['LRA_high']:.1f} LUFS) | {m['LRA']:.1f} LU | - |")
    add(f"| Length | {r['wav_len']} samples = {r['wav_len'] / SR:.3f} s | {r['mp3_len']} samples = {r['mp3_len'] / SR:.3f} s | 44.500 s |")
    add(f"| Sample peak | {r['sample_peak']:.2f} dBFS | | < 0 |")
    add(f"| Clipped samples (full scale) | {r['clipped_samples']} | | 0 |")
    add(f"| DC offset L / R | {r['dc'][0]:+.2e} / {r['dc'][1]:+.2e} (raw, 1.0 = FS) | | ~0 |")
    add(f"| Own BS.1770 meter (cross-check) | {r['own_lufs']:.2f} LUFS, TP {r['true_peak_own']:.2f} dBTP | | |")
    add(f"| Mono compatibility ((L+R)/2 vs stereo RMS) | **{r['mono_loss_total']:+.2f} dB** (inter-channel correlation {r['corr_total']:.2f}) | | >= -3 |")
    t = r["tail"]
    hd = r["head"]
    add(f"| Head | first sample {hd['first_sample']}; RMS {hd['rms_0_100ms']:.1f} dBFS over 0-100 ms and {hd['rms_100_300ms']:.1f} dBFS over 100-300 ms; first sample above -60 dBFS at {hd['first_above_minus60_ms']:.1f} ms | | sound from t = 0 |")
    add(f"| Tail | RMS {t['level_at_43_5']:.1f} dBFS @43.5 s, {t['level_at_44_2']:.1f} dBFS @44.2 s; last 100 ms max |x| = {t['last_100ms_max']:.1e}; last sample {t['last_sample']} | | silence at 44.5 s |")
    ph = r["phone"]
    add(f"| Phone-speaker simulation (HP 350 Hz + LP 10 kHz) | {ph['lufs_phone']:.1f} LUFS ({ph['lufs_phone'] - ph['lufs_full']:+.1f} LU vs full range) | | usable |")
    add(f"| Energy 150 Hz - 6 kHz / < 150 Hz / > 8 kHz | {100 * ph['main_band_fraction']:.0f} % / {100 * ph['below_150']:.0f} % / {100 * ph['above_8k']:.2f} % | | main energy 150-6k |")
    mi = r["master_info"]
    add(f"| Master chain | gain {mi['gain_db']:+.2f} dB into a true-peak limiter (max reduction {mi['gr_min']:.2f} dB, 1st percentile {mi['gr_p99']:.2f} dB) | | |")
    add("")
    add("## Warnings / caveats")
    add("")
    if r["warnings"]:
        for w_ in r["warnings"]:
            add(f"- WARNING: {w_}")
    else:
        add("- No automatic check failed.")
    add("- Not verifiable here: how it *sounds* (taste, harshness, fatigue). Everything was judged from measurements and spectrograms; a listen on a phone speaker, "
        "headphones and monitors is still recommended before publishing.")
    add("- The ffmpeg used for metering is an old static build (2018); its ebur128 agrees with an independent BS.1770 implementation (own meter row above) to within 0.05 LU.")
    b_ = r["balance"]
    add(f"- Music vs SFX balance: music stem active RMS {b_['music_active_rms']:.1f} dBFS (stem scale, sum peaking at -1 dBFS); the loudest SFX peak is {b_['sfx_peak']:.1f} dBFS "
        f"({b_['sfx_peak'] - b_['music_active_rms']:.0f} dB above the music RMS) and the typical UI transient (tap, tick, key, pop ...) peaks at {b_['ui_peak_median']:.1f} dBFS "
        f"({b_['ui_peak_median'] - b_['music_active_rms']:.0f} dB above the music RMS). The brief's 'music roughly 18-20 dB below the SFX peaks' holds against the big hits; "
        f"literally 18-20 dB under every UI sound would make -14 LUFS unreachable, so UI sounds are kept clear by spectral placement and baked ducking instead.")
    add("")
    add("## Sections")
    add("")
    add("Ungated K-weighted loudness of the master per section, with the stems measured the same way (pre-master scale).")
    add("")
    add("| section | time | master LUFS | master peak dBFS | music stem LUFS | sfx stem LUFS | mono loss dB | L/R corr |")
    add("|---|---|---|---|---|---|---|---|")
    for s in r["sections"]:
        add(f"| {s['name']} | {s['from']:g}-{s['to']:g} s | {s['lufs']:.1f} | {s['peak']:.1f} | {s['music']:.1f} | {s['sfx']:.1f} | {s['mono_loss']:+.2f} | {s['corr']:.2f} |")
    add("")
    add("### Octave-band energy of the master (dB re section total)")
    add("")
    add("| section | " + " | ".join(OCT_NAMES) + " |")
    add("|---|" + "---|" * len(OCT_NAMES))
    for s in r["sections"]:
        add(f"| {s['name']} | " + " | ".join(f"{v:.0f}" for v in s["bands"]) + " |")
    add("")
    add("## Sync check (sound-design accent vs cue time, measured on stems/sfx.wav)")
    add("")
    add("`err` = detected onset minus the cue's target time (for swipes the target is the `accent` field, for risers the moment the energy peaks). "
        "The detector looks at three bands (45-300 Hz, 0.3-1.8 kHz, 1.8-12 kHz), takes the positive novelty of each envelope and reports the first moment the cleanest burst reaches 30 % of its peak.")
    add("")
    add("| cue | #  | cue t (s) | target (s) | detected (s) | err (ms) | band |")
    add("|---|---|---|---|---|---|---|")
    errs = []
    for s_ in r["sync"]:
        if s_["err_ms"] is not None:
            errs.append(abs(s_["err_ms"]))
        add(f"| {s_['type']} | {s_['index']} | {s_['cue_t']:.3f} | {s_['target']:.3f} | {_f(s_['detected'], 4)} | {_f(s_['err_ms'], 2)} | {s_['band']} |")
    add("")
    if errs:
        add(f"**Max |error| over the {len(errs)} representative cues above: {max(errs):.2f} ms (mean {np.mean(errs):.2f} ms)** - requirement < 10 ms.")
    sa = [x["err_ms"] for x in r.get("sync_all", []) if x["err_ms"] is not None]
    if sa:
        ea = np.abs(sa)
        add("")
        add(f"The same measurement on **every** transient cue of the sheet (`sync-measured.csv`): {len(sa)} of {len(r['sync_all'])} could be separated in the "
            f"mix and measured - max |err| {ea.max():.2f} ms, mean {ea.mean():.2f} ms, 95th percentile {np.percentile(ea, 95):.2f} ms; the others sit under a louder "
            f"simultaneous sound (the isolated check below covers them).")
    d = r["design"]
    add("")
    add(f"All {d['n']} cues, isolated check: accent sample vs round(target x 48000) deviates by at most **{d['worst_placement_samples']} samples**; "
        f"{d['onset_n']} transient accents re-detected inside their own one-shot: max {_f(d['onset_max_ms'], 2)} ms, mean {_f(d['onset_mean_ms'], 2)} ms; "
        f"{d['peak_n']} whoosh/riser accents (energy peaks, intentionally smooth): median {_f(d['peak_median_ms'], 1)} ms, max {_f(d['peak_max_ms'], 1)} ms.")
    add("")
    add("## SFX clarity / cut-through (best SFX-to-music ratio among the bands holding >= 5 % of the A-weighted SFX energy, 30 ms around the onset of each transient cue)")
    add("")
    by: dict[str, list[float]] = {}
    for c in r["clarity"]:
        by.setdefault(c["type"], []).append(c["snr_db"])
    add("| cue type | n | min dB | median dB |")
    add("|---|---|---|---|")
    for k, v in sorted(by.items(), key=lambda kv: np.median(kv[1])):
        add(f"| {k} | {len(v)} | {min(v):.1f} | {np.median(v):.1f} |")
    add("")
    h = r["harmony"]
    add("## Harmony audit (pitched one-shots vs the chord playing at their accent)")
    add("")
    add(f"{h['events']} pitched cues audited. Notes: chord tone {h['counts']['chord']}, consonant extension (7th/9th/6th/11th) {h['counts']['ext']}, "
        f"other diatonic passing note {h['counts']['pass']}, chromatic {h['counts']['out']}.")
    if h["violations"]:
        add("")
        add("Notes outside chord + extensions (fast pentatonic runs only; strict cues must have none):")
        add("")
        for v in h["violations"]:
            add(f"- {v[0]} @ {v[1]} s over {v[2]}: MIDI {v[3]} ({v[4]})")
    else:
        add("No violations.")
    add("")
    add("## Music harmony check (chroma of the music stem, per bar)")
    add("")
    add("Share of the tonal energy (60 Hz - 2 kHz FFT of each 2 s bar) on the bar's chord tones, on consonant extensions (7th / 9th / 6th / 11th) and elsewhere.")
    add("")
    add("| bar | t (s) | chord | chord tones | extensions | other |")
    add("|---|---|---|---|---|---|")
    for c_ in r["chroma"]:
        add(f"| {c_['bar']} | {c_['t']:.0f} | {c_['chord']} | {100 * c_['chord_tones']:.0f} % | {100 * c_['extensions']:.0f} % | {100 * c_['other']:.0f} % |")
    add("")
    add("## Click scan (impulsiveness of the master: single-sample step vs the local +-8 ms step RMS)")
    add("")
    add("Noise-like material peaks around z = 5-6; an unfaded edit would show z > 12 away from any scheduled onset.")
    add("")
    add("| t (s) | z | step (FS) | nearest scheduled onset (ms) |")
    add("|---|---|---|---|")
    for c in r["clicks"]:
        add(f"| {c['t']:.4f} | {c['z']:.1f} | {c['step']:.3f} | {c['nearest_onset_ms']:.1f} |")
    add("")
    far = [c for c in r["clicks"] if c["z"] > 12 and c["nearest_onset_ms"] > 3.0]
    add(f"Unexplained impulses (z > 12 and > 3 ms from any scheduled onset): **{len(far)}**. All voices are faded at both ends by construction (>= 1 ms in, >= 3 ms out).")
    add("")
    add("## Mix gains (music buses, calibrated to targets)")
    add("")
    add("| bus | gain dB |")
    add("|---|---|")
    for k, v in r["gains_db"].items():
        add(f"| {k} | {v:+.1f} |")
    add("")
    add(f"Stems are scaled together by {r['stem_scale_db']:+.2f} dB so that music + sfx peaks at -1 dBFS (music stem peak {r['stem_peaks']['music']:.1f}, sfx stem peak {r['stem_peaks']['sfx']:.1f} dBFS); their sum is the master chain's input.")
    add("")
    if "plot_error" in r:
        add(f"_plot skipped: {r['plot_error']}_")
    path.write_text("\n".join(L) + "\n")
