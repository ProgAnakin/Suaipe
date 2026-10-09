#!/usr/bin/env python3
"""The catalogue of every sound effect of the film, one after the other, so each can be judged on its own.

    python tools/audio/catalogue.py [--cues audio/cues.json] [--out out/audio-ab/sfx-catalogue] [--md qa/SFX-CATALOGUE.md] [--ffmpeg ...]

For every cue type of the cue sheet the FIRST cue of that type is rendered with exactly the film's chain (the designer, its loudness class, the per-cue gain and trim,
the shared reverbs) in the chord it has in the film, then 0.9 s of silence; the sounds are grouped by what they do (taps and selections, typing, swipes, pops, movements,
highlights, the hits, ...). The level is the film's own: the same gain the film's stems and master apply, so what you hear here is as loud, against the other sounds, as it is in the film.
Besides the audio it writes a table (qa/SFX-CATALOGUE.md): the time of every sound in the catalogue, what it is for, where the film uses it, its class and its measured level.
"""
from __future__ import annotations

import argparse
import copy
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402
import mix  # noqa: E402
import sfx  # noqa: E402
import theory  # noqa: E402
from dsp import SR, secs  # noqa: E402

ROOT = HERE.parent.parent

FAMILIES = [
    ("Taps, selections and confirmations", ["tap", "chip-tick", "check-tick", "lock-click", "confirm", "callout-in", "chip-pop", "swipe-no", "swipe-yes", "dot-tick", "field-tick", "sample-tick"],
     "what the viewer does or chooses: a tap, a language, a tick in a box, a swipe (NO falls, YES rises), a label popping in"),
    ("Typing and small texture", ["key", "count-tick", "tile-pop", "letter-tick", "caption-pop", "underline", "card-in", "packet", "word-hit"],
     "the small sounds of things appearing: keystrokes, the scan counter, the gadget cards, the letters of the name, captions and their underline, the question cards, the data packets, the headline words"),
    ("Movements", ["whoosh-up", "whoosh-down", "whoosh-swap", "whoosh-in", "whoosh-out", "whoosh-pullback", "zoom-whoosh", "reveal-whoosh", "photo-whoosh", "swoosh-open", "page-swoosh", "scroll-soft", "lead-fly", "line-draw", "notif-drop", "shimmer", "tagline-air"],
     "air that follows the picture: a page, a camera move, a scroll, a lead flying to the CRM, a line drawing itself, a sheen sweeping across"),
    ("Arrivals and confirmations", ["screen-wake", "device-settle", "success-chime", "notif-ping", "code-ding", "redeem-ding", "crm-land", "node-on", "tile-on", "confetti-pop"],
     "something arrives or is accepted: the kiosk wakes, the tablet changes hands, success, the notification, the code, the redeemed chip, a lead lands, a node or a tile lights"),
    ("The film's big moments", ["lock-on", "logo-hit", "motif-q", "counter-hit", "bag-rustle", "handshake", "motif", "sparkle-up", "sparkle", "riser-a", "riser-b", "scan-riser"],
     "the few sounds that carry the story: the chosen product, the logo and the first half of the motif, the 98 %, the bag, the handshake, the motif on the logo, the risers and glints"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cues", default=str(ROOT / "audio" / "cues.json"))
    ap.add_argument("--out", default=str(ROOT / "out" / "audio-ab" / "sfx-catalogue"))
    ap.add_argument("--md", default=str(ROOT / "qa" / "SFX-CATALOGUE.md"))
    ap.add_argument("--gain-db", type=float, default=4.2, help="the film's own stem + master gain (stem scale -1.0 dB, master +5.2 dB)")
    ap.add_argument("--gap", type=float, default=0.9)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    a = ap.parse_args()

    cues = json.loads(Path(a.cues).read_text())
    harm = theory.Harmony.from_cues(cues)
    by_type: dict[str, list[dict]] = {}
    for e in cues["sfx"]:
        by_type.setdefault(e["type"], []).append(e)
    order = []
    for fam, types, _ in FAMILIES:
        order += [(fam, ty) for ty in types if ty in by_type]
    rest = [ty for ty in by_type if ty not in {t for _, t in order} and ty != "room-tone"]
    if rest:
        order += [("Everything else", ty) for ty in rest]

    # one slot per sound: the cue is moved to its slot, and the slot has the chord the cue had in the film
    slots, bars = [], []
    t_cursor = 1.0
    rows = []
    last_fam = None
    for fam, ty in order:
        # the representative cue: the first one at the type's own level (a tutorial demonstration or a side burst is a quieter version of it)
        ev0 = next((u for u in by_type[ty] if not float(u.get("gain_db", 0.0)) and not u.get("wide")), by_type[ty][0])
        if fam != last_fam and last_fam is not None:
            t_cursor += 1.2                                           # a longer pause between families
        last_fam = fam
        dur = {"scan-riser": 2.0, "riser-a": 2.2, "riser-b": 1.2, "logo-hit": 4.8, "counter-hit": 4.5, "handshake": 3.4, "motif": 3.8, "motif-q": 2.2, "sparkle": 2.6,
               "sparkle-up": 1.5, "success-chime": 2.0, "code-ding": 2.7, "notif-ping": 1.7, "redeem-ding": 1.5, "lock-on": 1.8, "bag-rustle": 0.9}.get(ty, 1.0)
        extra = float(ev0.get("dur", 0.0))
        delta = t_cursor - float(ev0["t"])
        ev = copy.deepcopy(ev0)
        ev["t"] = round(float(ev0["t"]) + delta, 4)
        for k in ("accent",):
            if k in ev:
                ev[k] = round(float(ev[k]) + delta, 4)
        for k in ("times", "strokes"):
            if k in ev:
                ev[k] = [round(float(x) + delta, 4) for x in ev[k]]
        ev["gain_db"] = float(ev0.get("gain_db", 0.0))
        slot_len = max(dur, extra + 0.3) + a.gap
        bars.append({"bar": len(bars) + 1, "from": t_cursor - 0.2, "to": t_cursor - 0.2 + slot_len, "chord": harm.at(float(ev0["t"]) + 1e-4)})
        slots.append(ev)
        uses = by_type[ty]
        rows.append({"fam": fam, "type": ty, "t": t_cursor, "n": len(uses), "first": float(ev0["t"]), "event": ev0.get("event", ""), "tier": ev0.get("tier", ""),
                     "note": ev0.get("note", ""), "times": [float(u["t"]) for u in uses][:12]})
        t_cursor += slot_len
    total = t_cursor + 1.0
    # the chord map must cover [0, total]: pad the first and the last bar
    bars[0]["from"] = 0.0
    bars[-1]["to"] = total + 1.0
    cat = {"bpm": cues["bpm"], "beat": cues["beat"], "bar": 2.0, "duration": total, "sampleRate": SR, "harmony": {"bars": bars}, "sfx": slots}
    cat_harm = theory.Harmony(bars=bars, bar_len=2.0)
    n = secs(total)
    rendered = sfx.render_sfx(cat, cat_harm, n)
    irs = mix.ir_bank()
    st = mix.process_sfx(rendered, n, irs)["stem"] * dsp.db2lin(a.gain_db)
    st, _ = dsp.tp_limiter(st, -1.5, lookahead_ms=2.0, release_ms=90.0)
    st[-secs(0.05):] = 0.0
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    wav = out.with_suffix(".wav")
    q = np.clip(np.round(st * 32767.0), -32768, 32767).astype(np.int16)
    sf.write(wav, q, SR, subtype="PCM_16")
    subprocess.run([a.ffmpeg, "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "256k", str(out.with_suffix(".mp3"))], check=True)
    print(f"{wav.name}: {len(slots)} sounds in {total:.1f} s")

    # ---- the table
    lines = ["# Sound-effect catalogue", "",
             "`out/audio-ab/sfx-catalogue.wav` plays **every sound effect of the film once, on its own**, at the film's own level (the same gain the stems and the master apply, so the sounds are as loud against each other",
             "as they are in the film). Each sound is followed by 0.9 s of silence; the families are separated by a longer pause. Use the time to find the sound you want to talk about, then tell me",
             "*fine · change it · remove it* — the **type** column is its name in the cue sheet, the last column says where the film uses it.", "",
             "Regenerate with `python tools/audio/catalogue.py --ffmpeg $FFMPEG`.", ""]
    cur = None
    for r in rows:
        if r["fam"] != cur:
            cur = r["fam"]
            desc = next((d for f, _, d in FAMILIES if f == cur), "")
            lines += [f"## {cur}", "", f"*{desc}*" if desc else "", "", "| time in file | type | class | used | first use in the film | what it is for |", "|---|---|---|---|---|---|"]
        mm, ss = divmod(r["t"], 60)
        used = f"{r['n']}×"
        note = (r["note"] or "").replace("|", "/")
        lines.append(f"| {int(mm)}:{ss:05.2f} | `{r['type']}` | {r['tier'] or '—'} | {used} | {r['first']:.2f} s ({r['event'] or 'music cue'}) | {note} |")
    lines.append("")
    lines += ["### Classes", "", "S signature (the few big moments, levelled by hand with the music) · H highlight (an arrival or a confirmation) · A action (something the viewer does or reads) · T texture (small pops, keys, ticks)",
              "· movements (whooshes) and whispers (underlines, outlines, the field waking up) are levelled as classes too: see `CLASS_OF` in `tools/audio/sfx.py`.", ""]
    Path(a.md).write_text("\n".join(lines))
    print(f"wrote {a.md}")


if __name__ == "__main__":
    main()
