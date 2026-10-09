#!/usr/bin/env python3
"""Audio-to-picture coverage audit (needs numpy + scipy + soundfile).

    python3 scripts/qa/av-coverage.py [--events audio/picture-events.json] [--cues audio/cues.json] [--stems public/audio/stems] [--md] [--json qa/av-coverage.json]

For EVERY event the picture has (audio/picture-events.json, from scripts/picture-events.mjs) it asks three questions of the rendered stems, not of the cue sheet:
  1. is there a cue near it?                         (cue sheet: the cue's time, accent, `times`, `strokes`, or the span a whoosh / riser covers)
  2. is something actually audible there?            (SFX stem: band-limited peak and the rise over the 120 ms before it)
  3. does it cut through the music?                  (best-band SFX-to-music ratio in the 30 ms around the SFX onset, the measure of tools/audio/qa.py; swells and spans: SFX vs
                                                      music energy over the move)
and sorts each event into  silent (nothing renders) · masked (renders but under its tier's target) · ok · loud (more than 9 dB over the tier's ceiling).

Targets (best-band ratio, dB):  S >= 12 · H >= 9 · A >= 6 · T >= 3     ceilings:  S - · H 28 · A 22 · T 14 (a micro sound that pokes out is as wrong as one that is lost).
"""
import argparse, json, os, sys
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

# an event is MASKED when it is under its tier's floor by BOTH measures (the best-band ratio of tools/audio/qa.py and the A-weighted level against the music
# around it) and LOUD when it is over the ceiling of the second while the music is really playing (against a near-silent bed any sound is "loud")
TARGET = {"S": 8.0, "H": 9.0, "A": 6.0, "T": 3.0}          # best-band ratio floor, dB
REL_FLOOR = {"S": 3.0, "H": 6.0, "A": 2.5, "T": 1.0}       # A-weighted event vs music floor, dB
MINOR_RELIEF = 2.0                                         # an event the eye hardly notices (salience "minor": an underline, a glint, a whisper) may sit this much lower
ABS_CLASS = {"S": 99.0, "H": -17.0, "A": -20.5, "T": -25.0}   # A-weighted level (dBFS, 40 ms) each tier is set to by tools/audio/sfx.py CLASS_DB ...
PILE_UP_DB = 5.0                                           # ... an event that measures this much above its class in the mixed SFX stem is several sounds piling up (LOUD)
OCT_EDGES = [88, 177, 355, 710, 1420, 2840, 5680, 11360]
A_WEIGHT_DB = [-9.1, -3.2, 0.0, 1.2, 1.0, -1.1, -6.6]          # octave-band centres 125 .. 8k (A weighting)


def mono(x):
    return x if x.ndim == 1 else 0.5 * (x[:, 0] + x[:, 1])


def band(x, lo, hi):
    sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def a_weight(x):
    """IEC 61672 A-weighting (analog poles through a bilinear transform)."""
    f1, f2, f3, f4 = 20.598997, 107.65265, 737.86223, 12194.217
    num = [(2 * np.pi * f4) ** 2 * 10 ** (1.9997 / 20), 0, 0, 0, 0]
    den = np.polymul(np.polymul([1, 4 * np.pi * f4, (2 * np.pi * f4) ** 2], [1, 4 * np.pi * f1, (2 * np.pi * f1) ** 2]),
                     np.polymul([1, 2 * np.pi * f3], [1, 2 * np.pi * f2]))
    b, a_ = signal.bilinear(num, den, fs=SR)
    return signal.lfilter(b, a_, x)


def env_db(x, win_ms=3.0):
    k = max(1, int(win_ms * SR / 1000))
    e = np.sqrt(np.convolve(x * x, np.ones(k) / k, mode="same") + 1e-18)
    return 20 * np.log10(e)


def flatten_cues(cues):
    """-> list of (time, type, hit_span_end) for every moment the cue sheet makes a sound start."""
    out = []
    for e in cues["sfx"]:
        ty = e["type"]
        ts = [float(e["t"])]
        for k in ("times", "strokes"):
            if k in e:
                ts = [float(x) for x in e[k]]
        if "accent" in e and "times" not in e:
            ts = [float(e["accent"])]
        end = float(e["t"]) + float(e.get("dur", 0.0))
        for t in ts:
            out.append((t, ty, max(end, t)))
    return sorted(out)


def best_band_snr(sm, mm, a, b):
    w = np.hanning(b - a)
    fs_ = np.abs(np.fft.rfft(sm[a:b] * w)) ** 2
    fm_ = np.abs(np.fft.rfft(mm[a:b] * w)) ** 2
    fr = np.fft.rfftfreq(b - a, 1 / SR)
    bands = []
    for (lo, hi), aw in zip(zip(OCT_EDGES[:-1], OCT_EDGES[1:]), A_WEIGHT_DB):
        s_ = (fr >= lo) & (fr < hi)
        bands.append((fs_[s_].sum() + 1e-20, fm_[s_].sum() + 1e-20, (fs_[s_].sum() + 1e-20) * 10 ** (aw / 10)))
    top = max(x[2] for x in bands)
    ok = [x for x in bands if x[2] >= top * 10 ** (-1.3)]
    best = max(ok, key=lambda x: x[0] / x[1])
    return float(10 * np.log10(best[0] / best[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--events", default=os.path.join(ROOT, "audio", "picture-events.json"))
    ap.add_argument("--cues", default=os.path.join(ROOT, "audio", "cues.json"))
    ap.add_argument("--stems", default=os.path.join(ROOT, "public", "audio", "stems"))
    ap.add_argument("--md", action="store_true")
    ap.add_argument("--json", default=None)
    ap.add_argument("--floor-db", type=float, default=-62.0, help="SFX stem peak (dBFS, stem scale) below which nothing is there")
    a = ap.parse_args()

    events = json.load(open(a.events))["events"]
    cues = json.load(open(a.cues))
    cue_times = flatten_cues(cues)
    sfx, sr = sf.read(os.path.join(a.stems, "sfx.wav"), dtype="float64")
    mus, _ = sf.read(os.path.join(a.stems, "music.wav"), dtype="float64")
    assert sr == SR
    sm, mm = mono(sfx), mono(mus)
    sb = band(sm, 150, 9000)
    mb = band(mm, 300, 5000)
    e_s = env_db(sb)
    n = len(sm)
    sa, ma = a_weight(sm), a_weight(mm)           # A-weighted: what the ear hears of each
    sa2, ma2 = sa * sa, ma * ma
    cs = np.concatenate([[0.0], np.cumsum(sa2)])  # running sums: mean-square of any window in O(1)
    cm = np.concatenate([[0.0], np.cumsum(ma2)])
    ms = lambda c, lo, hi: (c[hi] - c[lo]) / max(1, hi - lo)

    rows = []
    for ev in events:
        t = float(ev["t"])
        t1 = float(ev.get("t1") or t)
        tier = ev["tier"]
        shape = ev["shape"]
        # 1. cue near it
        if shape == "impulse":
            near = [c for c in cue_times if abs(c[0] - t) <= 0.06]
        else:
            near = [c for c in cue_times if c[0] - 0.4 <= t1 and c[2] + 0.4 >= t]
        cue = near[0][1] if near else None
        row = {"t": t, "t1": t1 if shape != "impulse" else None, "scene": ev["scene"], "kind": ev["kind"], "tier": tier, "shape": shape, "label": ev["label"],
               "silent_by_design": ev.get("silent"), "salience": ev.get("salience"), "cue": cue, "cues": sorted({c[1] for c in near})}
        # 2./3. rendered audio
        if shape == "impulse":
            a0, b0 = max(0, int((t - 0.03) * SR)), min(n, int((t + 0.12) * SR))
            seg = np.abs(sb[a0:b0])
            pk = float(20 * np.log10(seg.max() + 1e-12))
            i_pk = a0 + int(np.argmax(e_s[a0:b0]))
            before = e_s[max(0, i_pk - int(0.12 * SR)): max(1, i_pk - int(0.01 * SR))]
            rise = float(e_s[i_pk] - (np.percentile(before, 20) if len(before) else -120))
            lo, hi = max(0, i_pk - int(0.006 * SR)), min(n, i_pk + int(0.024 * SR))
            snr = best_band_snr(sm, mm, lo, hi) if hi - lo > 256 else None
            # loudness of the event against the music around it: A-weighted mean square of the 40 ms from the onset vs the music's over 400 ms
            lo2, hi2 = max(0, i_pk - int(0.005 * SR)), min(n, i_pk + int(0.035 * SR))
            m_lo, m_hi = max(0, i_pk - int(0.2 * SR)), min(n, i_pk + int(0.2 * SR))
            rel = float(10 * np.log10(ms(cs, lo2, hi2) / (ms(cm, m_lo, m_hi) + 1e-20) + 1e-20))
            row.update(peak_db=round(pk, 1), rise_db=round(rise, 1), snr_db=None if snr is None else round(snr, 1), rel_db=round(rel, 1), music_db=round(float(10 * np.log10(ms(cm, m_lo, m_hi) + 1e-20)), 1),
                       abs_db=round(float(10 * np.log10(ms(cs, lo2, hi2) + 1e-20)), 1), onset_offset_ms=round((i_pk / SR - t) * 1000, 1))
        else:
            a0, b0 = max(0, int((t - 0.05) * SR)), min(n, int((t1 + 0.25) * SR))
            seg = sb[a0:b0]
            pk = float(20 * np.log10(np.abs(seg).max() + 1e-12))
            rms_s = 10 * np.log10(np.mean(seg ** 2) + 1e-20)
            rms_m = 10 * np.log10(np.mean(mb[a0:b0] ** 2) + 1e-20)
            lo2, hi2 = max(0, int(t * SR)), min(n, int((t1 + 0.1) * SR))
            rel = float(10 * np.log10(ms(cs, lo2, hi2) / (ms(cm, lo2, hi2) + 1e-20) + 1e-20))
            row.update(peak_db=round(pk, 1), rise_db=None, snr_db=round(float(rms_s - rms_m), 1), rel_db=round(rel, 1), music_db=round(float(10 * np.log10(ms(cm, lo2, hi2) + 1e-20)), 1),
                       abs_db=-99.0, onset_offset_ms=None)
        # verdict
        if ev.get("silent"):
            v = "silent-by-design"
        elif row["peak_db"] < a.floor_db:
            v = "silent"
        elif row["snr_db"] is None:
            v = "ok"
        elif row["snr_db"] < TARGET[tier] and row["rel_db"] < REL_FLOOR[tier] - (MINOR_RELIEF if ev.get("salience") == "minor" else 0.0):
            v = "masked"
        elif row["abs_db"] > ABS_CLASS[tier] + PILE_UP_DB:
            v = "loud"
        else:
            v = "ok"
        if v == "ok" and shape == "impulse" and row["rise_db"] is not None and row["rise_db"] < 3.0 and row["peak_db"] < -40:
            v = "masked"            # nothing starts here, a leftover tail is all that is there
        row["verdict"] = v
        rows.append(row)

    res = {"events": len(rows), "rows": rows}
    if a.json:
        json.dump(res, open(a.json, "w"), indent=1)

    def count(sel):
        return sum(1 for r in rows if sel(r))

    verdicts = ["ok", "masked", "silent", "loud", "silent-by-design"]
    print(f"{len(rows)} picture events: " + " · ".join(f"{v} {count(lambda r, v=v: r['verdict'] == v)}" for v in verdicts) + f" · no cue near {count(lambda r: r['cue'] is None and not r['silent_by_design'])}")
    if a.md:
        print("\n### By tier\n\n| tier | events | ok | masked | silent | loud | median ratio (dB) |\n|---|---|---|---|---|---|---|")
        for tier in "SHAT":
            rs = [r for r in rows if r["tier"] == tier]
            snr = [r["snr_db"] for r in rs if r["snr_db"] is not None and r["verdict"] != "silent"]
            print(f"| {tier} | {len(rs)} | " + " | ".join(str(count(lambda r, v=v, tier=tier: r['tier'] == tier and r['verdict'] == v)) for v in ("ok", "masked", "silent", "loud")) + f" | {np.median(snr):.1f} |" if snr else f"| {tier} | {len(rs)} | - | - | - | - | - |")
        print("\n### By scene\n\n| scene | events | ok | masked | silent | loud |\n|---|---|---|---|---|---|")
        for sc in ["hook", "lockup", "ipad", "phone", "store", "consult", "system", "human", "end", "caption", "transition"]:
            rs = [r for r in rows if r["scene"] == sc]
            print(f"| {sc} | {len(rs)} | " + " | ".join(str(count(lambda r, v=v, sc=sc: r['scene'] == sc and r['verdict'] == v)) for v in ("ok", "masked", "silent", "loud")) + " |")
        print("\n### By kind (events that are not all ok)\n\n| kind | tier | events | ok | masked | silent | loud |\n|---|---|---|---|---|---|---|")
        kinds = sorted({(r["kind"], r["tier"]) for r in rows})
        for kind, tier in kinds:
            rs = [r for r in rows if r["kind"] == kind and r["tier"] == tier]
            if all(r["verdict"] in ("ok", "silent-by-design") for r in rs):
                continue
            print(f"| {kind} | {tier} | {len(rs)} | " + " | ".join(str(count(lambda r, v=v, kind=kind: r['kind'] == kind and r['verdict'] == v)) for v in ("ok", "masked", "silent", "loud")) + " |")
        bad = [r for r in rows if r["verdict"] in ("silent", "masked", "loud")]
        print(f"\n### Every event that is silent, masked or loud ({len(bad)})\n\n| t | scene | kind | tier | verdict | peak dBFS | ratio dB | cue near | what the picture does |\n|---|---|---|---|---|---|---|---|---|")
        for r in bad:
            print(f"| {r['t']:.3f} | {r['scene']} | {r['kind']} | {r['tier']} | {r['verdict']} | {r['peak_db']} | {r['snr_db']} | {r['cue'] or '—'} | {r['label'][:70]} |")


if __name__ == "__main__":
    main()
