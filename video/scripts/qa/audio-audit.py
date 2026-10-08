#!/usr/bin/env python3
"""Audio audit of the film's soundtrack (BRIEF v2, phase 1 / 4.1). Needs numpy + scipy; ffmpeg for the AAC re-encode test.

    python3 scripts/qa/audio-audit.py --ffmpeg /path/to/ffmpeg [--md]

Reads audio/cues.json (the cue sheet), public/audio/soundtrack.wav and the pre-master stems in public/audio/stems/ and prints:
  1. event density per second, split into the three layers of the brief (signature / support / texture)
  2. the section map (time, what the music does)
  3. the timbre inventory (families, by cue type)
  4. the phone-speaker translation test (HP 350 Hz + LP 10 kHz): which cues lose most of their energy
  5. the re-encode test: AAC 128 kbps / 96 kbps -> loudness and true peak
"""
import argparse, json, subprocess, tempfile, os, re, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

# --- the three layers of the brief ------------------------------------------------------------------------------------------------
SIGNATURE = {"lock-on", "logo-hit", "counter-hit", "handshake", "logo-hit-soft"}
SUPPORT = {"tap", "swipe-yes", "swipe-no", "success-chime", "notif-ping", "code-ding", "confirm", "lock-click", "redeem-ding", "screen-wake",
           "device-settle", "whoosh-up", "whoosh-swap", "whoosh-down", "whoosh-in", "whoosh-pullback", "whoosh-out", "reveal-whoosh",
           "zoom-whoosh", "photo-whoosh", "swoosh-open", "page-swoosh", "bag-rustle", "riser-a", "riser-b", "riser-count"}
def layer(t):
    return "signature" if t in SIGNATURE else "support" if t in SUPPORT else "texture"

# --- timbre families (by cue type; approximate, from tools/audio/README.md) -------------------------------------------------------------
FAMILY = {
    "glass / bell": {"lock-on", "success-chime", "notif-ping", "code-ding", "redeem-ding", "chip-pop", "tile-pop", "tile-on", "sparkle", "sparkle-up",
                     "shimmer", "screen-wake", "logo-hit", "logo-hit-soft", "counter-hit", "check-tick", "confirm"},
    "thump / knock / click (tuned sine + saturation)": {"word-hit", "device-settle", "tap", "card-in", "lock-click", "count-tick", "key", "chip-tick",
                                                         "caption-pop", "callout-in", "confetti-pop"},
    "soft pluck": {"node-on", "packet"},
    "noise whoosh / riser / air": {"whoosh-up", "whoosh-swap", "whoosh-down", "whoosh-in", "whoosh-pullback", "whoosh-out", "reveal-whoosh", "zoom-whoosh",
                                   "photo-whoosh", "page-swoosh", "swoosh-open", "swipe-yes", "swipe-no", "riser-a", "riser-b", "riser-count",
                                   "scroll-soft", "tagline-air"},
    "foley (noise texture)": {"bag-rustle", "handshake"},
}
def family(t):
    for k, v in FAMILY.items():
        if t in v:
            return k
    return "other"

def ebur(ffmpeg, path):
    r = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr[r.stderr.rindex("Summary:"):]
    g = lambda k: float(re.search(rf"{k}:\s+(-?[\d.]+)", txt).group(1))
    return {"I": g("I"), "LRA": g("LRA"), "TP": g("Peak")}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--md", action="store_true")
    a = ap.parse_args()
    cues = json.load(open(os.path.join(ROOT, "audio", "cues.json")))
    sfx = cues["sfx"]; dur = cues["duration"]

    # 1 -- density -------------------------------------------------------------------------------------------------------------------
    nbin = int(np.ceil(dur))
    dens = {l: np.zeros(nbin, int) for l in ("signature", "support", "texture")}
    for e in sfx:
        dens[layer(e["type"])][min(nbin - 1, int(e["t"]))] += 1
    tot = sum(dens.values())
    print("## 1. Event density (events per second, by layer)\n")
    print(f"{len(sfx)} events in {dur:.1f} s = {len(sfx) / dur:.2f}/s on average. Signature {sum(dens['signature'])}, support {sum(dens['support'])}, texture {sum(dens['texture'])}.\n")
    print("| second | sig | sup | tex | total | |\n|---|---|---|---|---|---|")
    for i in range(nbin):
        if tot[i] > 4 or i % 4 == 0:
            print(f"| {i}-{i + 1} | {dens['signature'][i]} | {dens['support'][i]} | {dens['texture'][i]} | {tot[i]} | {'**> 4/s**' if tot[i] > 4 else ''} |")
    hot = [i for i in range(nbin) if tot[i] > 4]
    print(f"\nSeconds above 4 events/s: {len(hot)} of {nbin} ({', '.join(str(i) for i in hot)}). Peak {tot.max()}/s at {int(tot.argmax())}-{int(tot.argmax()) + 1} s.\n")
    by_type = {}
    for e in sfx:
        by_type[e["type"]] = by_type.get(e["type"], 0) + 1
    top = sorted(by_type.items(), key=lambda kv: -kv[1])[:6]
    print("Most repeated types: " + ", ".join(f"{k} ×{v}" for k, v in top) + ".\n")

    # 2 -- sections ------------------------------------------------------------------------------------------------------------------
    print("## 2. Sections (cue sheet)\n")
    print("| section | from | to | what it is |\n|---|---|---|---|")
    for s in cues.get("sections", []):
        print(f"| {s.get('name')} | {s.get('from')} | {s.get('to')} | {s.get('brief', '')} |")
    print()

    # 3 -- timbre inventory -----------------------------------------------------------------------------------------------------------
    print("## 3. Timbre inventory (by cue type)\n")
    print("| family | cue types | events |\n|---|---|---|")
    for fam in list(FAMILY) + ["other"]:
        ts = sorted({e["type"] for e in sfx if family(e["type"]) == fam})
        n = sum(1 for e in sfx if family(e["type"]) == fam)
        if ts:
            print(f"| {fam} | {len(ts)}: {', '.join(ts)} | {n} |")
    print()

    # 4 -- phone translation ----------------------------------------------------------------------------------------------------------
    sr, sf = wavfile.read(os.path.join(ROOT, "public", "audio", "stems", "sfx.wav"))
    sf = (sf.astype(np.float64) / 2 ** 31).mean(1)
    sr2, mu = wavfile.read(os.path.join(ROOT, "public", "audio", "stems", "music.wav"))
    mu = (mu.astype(np.float64) / 2 ** 31).mean(1)
    hp = butter(4, 350, "hp", fs=sr, output="sos"); lp = butter(4, 10000, "lp", fs=sr, output="sos")
    phone = lambda x: sosfilt(lp, sosfilt(hp, x))
    sfp, mup = phone(sf), phone(mu)
    rms = lambda x: np.sqrt(np.mean(x ** 2)) + 1e-12
    loss = {}
    for e in sfx:
        i = int(e["t"] * sr); j = int((e["t"] + max(e.get("dur", 0.0), 0.35)) * sr)
        d = 20 * np.log10(rms(sfp[i:j]) / rms(sf[i:j]))
        loss.setdefault(e["type"], []).append(d)
    print("## 4. Phone-speaker translation (HP 350 Hz + LP 10 kHz)\n")
    print("Energy kept by each effect type (dB, 0 = nothing lost); only types that lose more than 3 dB:\n")
    print("| type | n | median change | worst |\n|---|---|---|---|")
    for k, v in sorted(loss.items(), key=lambda kv: np.median(kv[1])):
        if np.median(v) < -3:
            print(f"| {k} | {len(v)} | {np.median(v):.1f} dB | {min(v):.1f} dB |")
    print()
    print("Music stem, per section (loudest 1 s window kept after the filter / before):\n")
    print("| section | music energy kept |\n|---|---|")
    for s in cues.get("sections", []):
        i = int(s["from"] * sr); j = int(min(s["to"], dur) * sr)
        print(f"| {s['name']} {s['from']}-{s['to']} s | {20 * np.log10(rms(mup[i:j]) / rms(mu[i:j])):.1f} dB |")
    print()

    # 5 -- re-encode ------------------------------------------------------------------------------------------------------------------
    print("## 5. Re-encode test (what a platform serves)\n")
    wav = os.path.join(ROOT, "public", "audio", "soundtrack.wav")
    print("| file | integrated | LRA | true peak |\n|---|---|---|---|")
    ref = ebur(a.ffmpeg, wav)
    print(f"| master WAV | {ref['I']:.1f} LUFS | {ref['LRA']:.1f} LU | {ref['TP']:.1f} dBTP |")
    with tempfile.TemporaryDirectory() as d:
        for br in ("192k", "128k", "96k"):
            m4a = os.path.join(d, f"t{br}.m4a"); dec = os.path.join(d, f"t{br}.wav")
            subprocess.run([a.ffmpeg, "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", br, m4a], check=True)
            subprocess.run([a.ffmpeg, "-y", "-loglevel", "error", "-i", m4a, "-c:a", "pcm_f32le", dec], check=True)
            r = ebur(a.ffmpeg, dec)
            print(f"| AAC {br} (native encoder) | {r['I']:.1f} LUFS | {r['LRA']:.1f} LU | {r['TP']:.1f} dBTP |")
    print()

if __name__ == "__main__":
    main()
