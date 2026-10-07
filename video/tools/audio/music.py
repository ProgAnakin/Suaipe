"""Original 120 BPM underscore for the Suaipe film, composed bar by bar against the cue sheet's harmony + sections.

compose()      -> Score (plain lists of timed notes / hits: nothing is rendered yet)
render_music() -> stereo stems per instrument group (+ reverb sends), ready for the mixer

Palette: tuned clean kick with click, soft clap/snare, off-beat hats + quiet shaker, round saturated bass over a clean sub,
warm detuned saw pad (filter automation), marimba-ish plucked arpeggio with ping-pong delay, warm electric-piano keys for the
e-mail breakdown, and a restrained glass bell lead for the big moments. Everything is chord-locked to cues.json.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

import dsp
import instruments as ins
from dsp import SR, secs, mtof
from theory import Harmony

BAR, BEAT, STEP = 2.0, 0.5, 0.125


def S(b: int, step: float = 0.0) -> float:
    """time (s) of 16th-note `step` in 0-based bar `b`"""
    return b * BAR + step * STEP


# --------------------------------------------------------------------------------------- tables
PAD = {  # voice-led pad voicings (MIDI), bottom -> top; only 1-2 semitone moves between neighbouring chords
    "Am": [52, 57, 60, 64, 69], "G": [50, 55, 59, 62, 67], "C": [52, 55, 60, 64, 67],
    "F": [53, 57, 60, 65, 69], "Cadd9": [52, 55, 60, 62, 64, 67, 72],
}
PAD_HI = {"Am": [76, 81, 84], "G": [74, 79, 83], "C": [76, 79, 84], "F": [77, 81, 84], "Cadd9": [76, 79, 84, 86]}
BASS_ROOT = {"Am": 45, "G": 43, "C": 48, "F": 41, "Cadd9": 48}        # A2 G2 C3 F2
SUB_ROOT = {k: v - 12 for k, v in BASS_ROOT.items()}
ARP = {
    "Am": [57, 60, 64, 69, 72, 76, 81, 84], "G": [55, 59, 62, 67, 71, 74, 79, 83],
    "C": [60, 64, 67, 72, 76, 79, 84, 88], "F": [53, 57, 60, 65, 69, 72, 77, 81],
    "Cadd9": [60, 62, 64, 67, 72, 74, 76, 79],
}
KEYS = {"Am": [57, 60, 64, 67, 71], "G": [55, 59, 62, 64, 67], "C": [60, 64, 67, 71, 74],
        "F": [53, 57, 60, 64, 67], "Cadd9": [60, 62, 64, 67, 71]}

BASS_PATTERNS = {   # (step, length in 16ths, degree)
    "long": [(0, 12, "r")],
    "pedal": [(0, 15, "r")],
    "offbeat": [(0, 2, "r"), (2, 2, "r"), (6, 2, "r"), (10, 2, "r"), (14, 2, "5")],
    "groove1": [(0, 3, "r"), (3, 1, "r"), (6, 2, "o"), (8, 3, "r"), (11, 1, "r"), (14, 2, "5")],
    "groove2": [(0, 2, "r"), (3, 2, "r"), (6, 1, "o"), (8, 2, "r"), (10, 2, "r"), (12, 3, "5"), (15, 1, "o")],
    "groove3": [(0, 3, "r"), (4, 1, "o"), (6, 2, "r"), (8, 2, "r"), (11, 2, "5"), (14, 2, "r")],
    "drive": [(0, 2, "r"), (2, 2, "r"), (4, 2, "o"), (6, 2, "r"), (8, 2, "r"), (10, 2, "r"), (12, 2, "o"), (14, 2, "5")],
    "rolling": [(0, 1, "r"), (2, 1, "r"), (3, 1, "o"), (4, 1, "r"), (6, 1, "r"), (7, 1, "o"), (8, 1, "r"), (10, 1, "r"),
                (11, 1, "o"), (12, 1, "r"), (14, 1, "5"), (15, 1, "o")],
    "soft": [(0, 6, "r"), (8, 5, "r"), (14, 2, "5")],
}
DEG = {"r": 0, "o": 12, "5": 7}

@dataclass
class Score:
    kicks: list = field(default_factory=list)      # (t, vel, kind) kind in big|norm|soft|tight
    claps: list = field(default_factory=list)      # (t, vel)
    snares: list = field(default_factory=list)     # (t, vel, tune)
    hats: list = field(default_factory=list)       # (t, vel, open)
    shakers: list = field(default_factory=list)    # (t, vel)
    rims: list = field(default_factory=list)       # (t, vel)
    bass: list = field(default_factory=list)       # (t, dur, midi, vel)
    subs: list = field(default_factory=list)       # (t, dur, midi, vel)
    arps: list = field(default_factory=list)       # (t, dur, midi, vel, reg)
    keys: list = field(default_factory=list)       # (t, dur, midi, vel)
    leads: list = field(default_factory=list)      # (t, dur, midi, vel, tau)
    pads: list = field(default_factory=list)       # dict(t0, t1, notes, gain, attack, release, layer)
    swells: list = field(default_factory=list)     # dict(t0, t1, f_lo, f_hi, q, shape, gain, tail)
    hearts: list = field(default_factory=list)     # (t, vel)
    gates: list = field(default_factory=list)      # (t0, t1) pad gate windows (system section)
    sections: dict = field(default_factory=dict)   # name -> (from, to)
    air_gaps: list = field(default_factory=list)   # (t0, t1) everything but reverb tails cut
    roll_hits: list = field(default_factory=list)


def arp_bar(rng, tones, b, density, dur_steps, vel_base, lo, hi, offset=0, mask=None):
    """One bar of 16th-note arpeggio: the pitch walks up and down through the chord's tones (mostly stepwise, an occasional skip),
    so it reads as a melodic arpeggio instead of random leaps; `density` thins the 16ths, accents sit on the beats."""
    span = max(hi - lo, 1)
    idx = lo + ((b + offset) * 3) % (span + 1)
    d = 1 if (b + offset) % 2 == 0 else -1
    out = []
    for s in range(16):
        accent = s % 4 == 0
        play = 0.95 if accent else (density if s % 2 == 0 else density * 0.62)
        if (mask is None or mask[s]) and rng.random() <= play:
            out.append((S(b, s), dur_steps * STEP, tones[int(np.clip(idx, 0, len(tones) - 1))],
                        vel_base * (1.16 if accent else 1.0) * float(rng.uniform(0.86, 1.04))))
        step = 2 if rng.random() < 0.22 else 1          # occasional skip
        nxt = idx + d * step
        if nxt > hi or nxt < lo:
            d = -d
            nxt = idx + d
        idx = int(np.clip(nxt, lo, hi))
        if s in (7,) and rng.random() < 0.5:           # change of direction mid-bar now and then
            d = -d
    return out


def snare_roll(sc: Score, t0: float, t_end: float, d0: float = 0.125, ratio: float = 0.86, v0: float = 0.30, v1: float = 1.0):
    t, d, hits = t0, d0, []
    while t < t_end - 0.004:
        hits.append(t)
        t += d
        d *= ratio
    for i, tt in enumerate(hits):
        u = i / max(len(hits) - 1, 1)
        sc.snares.append((tt, v0 + (v1 - v0) * u ** 1.3, 185.0 + 70.0 * u))
    sc.roll_hits += hits


# --------------------------------------------------------------------------------------- composition
def compose(cues: dict, harm: Harmony) -> Score:
    rng = np.random.default_rng(20260607)
    sc = Score()
    chords = [b["chord"] for b in harm.bars]
    sec = {s["name"]: (float(s["from"]), float(s["to"])) for s in cues["sections"]}
    sc.sections = sec
    nb = len(chords)
    assert abs(float(cues["bar"]) - BAR) < 1e-9, "the score is written for 120 BPM / 2 s bars"
    dur = float(cues["duration"])

    def bars_of(name):
        a, z = sec[name]
        return list(range(int(round(a / BAR)), min(nb, int(np.ceil(z / BAR - 1e-9)))))

    def add_bass(b, pattern, vel=0.9, oct_up=False):
        ch = chords[b]
        root = BASS_ROOT[ch]
        for step, ln, deg in BASS_PATTERNS[pattern]:
            m = root + DEG[deg] + (12 if oct_up and deg == "r" else 0)
            sc.bass.append((S(b, step), ln * STEP * 0.92, m, vel * (1.0 if step % 4 == 0 else 0.86)))

    def add_sub(b, vel=0.9, step=0, dur=1.9):
        sc.subs.append((S(b, step), dur - step * STEP, SUB_ROOT[chords[b]], vel))

    def add_pad(b, gain=1.0, attack=0.25, release=0.45, layer="pad", extra_hi=False, span=1):
        ch = chords[b]
        sc.pads.append(dict(t0=S(b), t1=S(b + span), notes=PAD[ch], gain=gain, attack=attack, release=release, layer=layer))
        if extra_hi:
            sc.pads.append(dict(t0=S(b), t1=S(b + span), notes=PAD_HI[ch], gain=gain * 0.55, attack=attack, release=release, layer="hi"))

    def add_kicks(b, steps=(0, 4, 8, 12), vel=0.9, kind="norm", skip=()):
        for s in steps:
            if (b, s) in skip:
                continue
            sc.kicks.append((S(b, s), vel * (1.0 if s % 8 == 0 else 0.92), kind))

    def add_backbeat(b, vel=0.6):
        for s in (4, 12):
            sc.claps.append((S(b, s), vel))

    def add_hats(b, vel=0.5, sixteenths=False, open_steps=(), ghost=0.0):
        for s in (2, 6, 10, 14):
            sc.hats.append((S(b, s), vel * (1.0 if s in (2, 10) else 0.82), s in open_steps))
        if sixteenths:
            for s in (1, 3, 5, 7, 9, 11, 13, 15):
                sc.hats.append((S(b, s), ghost, False))

    def add_shaker(b, vel=0.5, eighths=False):
        pat = [0.55, 0.22, 0.45, 0.22] * 4
        for s in range(16):
            if eighths and s % 2:
                continue
            sc.shakers.append((S(b, s), vel * pat[s] / 0.55 * (1.0 if s % 4 == 0 else 0.7)))

    def add_arps(b, density, dur_steps, vel, lo, hi, offset=0, mask=None):
        for t, d, m, v in arp_bar(rng, ARP[chords[b]], b, density, dur_steps, vel, lo, hi, offset, mask):
            sc.arps.append((t, d, m, v, "mid"))

    # ---------------------------------------------------------------- intro (bars 1-2): drone, swell, heartbeat
    a, z = sec["intro"]
    sc.pads.append(dict(t0=0.0, t1=BAR, notes=[33, 40, 45, 52], gain=1.0, attack=1.0, release=0.35, layer="drone"))
    sc.pads.append(dict(t0=BAR, t1=z - 0.02, notes=[31, 38, 43, 50], gain=1.0, attack=0.25, release=0.04, layer="drone"))
    sc.swells.append(dict(t0=0.0, t1=z - 0.01, f_lo=220.0, f_hi=3600.0, q=1.1, shape=1.7, gain=0.55, tail=0.0))
    sc.hearts += [(1.0, 0.55), (1.3, 0.40), (z - 1.0, 0.62), (z - 0.5, 0.72), (z - 0.25, 0.85), (z - 0.125, 0.95)]   # accelerating into the drop

    # ---------------------------------------------------------------- drop A (bars 3-4)
    for i, b in enumerate(bars_of("drop-A")):
        add_pad(b, 1.0, attack=0.04 if i == 0 else 0.25, release=0.4, extra_hi=False)
        if i == 0:
            add_kicks(b, (0, 8), 1.0, "big")
            add_kicks(b, (12,), 0.55, "soft")
            add_bass(b, "long", 0.9)
            add_sub(b, 0.85, step=4, dur=1.6)
            add_arps(b, 0.55, 2, 0.50, 2, 6, offset=0, mask=[s >= 4 for s in range(16)])
            sc.swells.append(dict(t0=S(b), t1=S(b) + 0.9, f_lo=5200.0, f_hi=1800.0, q=0.9, shape=0.6, gain=0.20, tail=0.0))
        else:
            add_kicks(b, vel=0.9)
            add_bass(b, "offbeat", 0.9)
            add_sub(b, 0.85)
            add_arps(b, 0.7, 2, 0.5, 2, 7, offset=1)
            add_shaker(b, 0.30, eighths=True)
    g0 = sec["groove-A"][0]
    sc.swells.append(dict(t0=g0 - 0.45, t1=g0, f_lo=3500.0, f_hi=9500.0, q=0.9, shape=2.0, gain=0.22, tail=0.0))

    # ---------------------------------------------------------------- groove A (bars 5-7)
    pats = ["groove1", "groove2", "groove3"]
    for i, b in enumerate(bars_of("groove-A")):
        add_pad(b, 1.0, attack=0.25, release=0.45, extra_hi=False)
        add_kicks(b, vel=0.88)
        if i > 0:
            add_backbeat(b, 0.50)
        else:
            sc.claps.append((S(b, 12), 0.42))
        add_bass(b, pats[i % 3], 0.9)
        add_sub(b, 0.8)
        add_hats(b, 0.42, sixteenths=False, open_steps=(14,) if i == 2 else ())
        add_shaker(b, 0.38, eighths=(i == 1))   # bar 6 is the typing bar: a lighter 8th-note shaker leaves room for the key clicks
        if i == 1:   # the typing bar: fewer, lower plucks so the key clicks sit in clear air
            add_arps(b, 0.36, 2, 0.40, 2, 6, offset=i)
        else:
            add_arps(b, 0.50 + 0.12 * i, 1 + (i % 2), 0.45 + 0.04 * i, 1, 6, offset=i)
    # end of bar 7: short snare pickup into the build
    b = bars_of("groove-A")[-1]
    for s, v in ((13, 0.35), (14, 0.45), (15, 0.6)):
        sc.snares.append((S(b, s), v, 200.0))

    # ---------------------------------------------------------------- build (bars 8-10)
    for i, b in enumerate(bars_of("build")):
        add_pad(b, 1.0 + 0.06 * i, attack=0.2, release=0.4, extra_hi=(i == 2))
        add_kicks(b, vel=0.92)
        add_backbeat(b, 0.62 + 0.05 * i)
        add_bass(b, "drive", 0.92)
        add_sub(b, 0.8)
        add_hats(b, 0.46 + 0.04 * i, sixteenths=True, ghost=0.17 + 0.03 * i, open_steps=(14,))
        add_shaker(b, 0.40)
        add_arps(b, 0.72 + 0.06 * i, 1, 0.50 + 0.04 * i, 2 + i, 7, offset=i + 1)
        if i < 2:
            # fill on the last beat of the bar
            for s, v in ((12, 0.4), (13, 0.32), (14, 0.5), (15, 0.7)):
                sc.snares.append((S(b, s), v, 195.0 + 8 * i))
    be = sec["build"][1]
    sc.swells.append(dict(t0=be - 2.0, t1=be - 0.02, f_lo=500.0, f_hi=7500.0, q=1.1, shape=2.4, gain=0.35, tail=0.0))

    # ---------------------------------------------------------------- counter (bar 11): kick out at 21.0, roll, air gap
    (b,) = bars_of("counter")[:1]
    add_pad(b, 1.15, attack=0.15, release=0.2, extra_hi=True)
    add_kicks(b, (0, 4), 0.92)
    sc.claps.append((S(b, 4), 0.62))
    add_bass(b, "drive", 0.92)
    sc.bass = [x for x in sc.bass if not (x[0] >= S(b, 8) - 1e-6 and x[0] < sc.sections["counter"][1])]
    sc.bass.append((S(b, 8), 0.8, BASS_ROOT[chords[b]], 0.8))
    add_sub(b, 0.8)
    sc.subs[-1] = (S(b), 0.9, SUB_ROOT[chords[b]], 0.8)
    add_hats(b, 0.5, sixteenths=True, ghost=0.2)
    sc.hats = [h for h in sc.hats if not (S(b) + 1.0 <= h[0] < sc.sections["counter"][1])]
    add_arps(b, 0.8, 1, 0.58, 3, 8, offset=3, mask=[s < 8 for s in range(16)])
    ce = sec["counter"][1]
    snare_roll(sc, ce - 1.0, ce - 0.15)
    sc.air_gaps.append((ce - 0.15, ce))                 # the 'air' right before the hit

    # ---------------------------------------------------------------- drop B (bars 12-13)
    for i, b in enumerate(bars_of("drop-B")):
        add_pad(b, 1.25, attack=0.05 if i == 0 else 0.2, release=0.45, extra_hi=True)
        add_kicks(b, vel=0.95, kind="big" if i == 0 else "norm")
        add_backbeat(b, 0.72)
        for s in (4, 12):
            sc.snares.append((S(b, s), 0.30, 200.0))
        add_bass(b, "groove1" if i == 0 else "groove2", 0.92)
        add_sub(b, 0.8, step=4 if i == 0 else 0, dur=1.9 if i else 1.6)
        add_hats(b, 0.52, sixteenths=True, ghost=0.22, open_steps=(2, 6, 10, 14))
        add_shaker(b, 0.42)
        add_arps(b, 0.62, 1, 0.52, 2, 7, offset=2 * i)
    # restrained bell lead (C then G): leaves room for the counter-hit chime, the tap and the success chime
    d0 = sec["drop-B"][0]
    sc.leads += [(d0 + 0.5, 0.45, 76, 0.60, 1.0), (d0 + 1.0, 0.45, 79, 0.62, 1.0), (d0 + 1.5, 0.9, 84, 0.70, 1.2),
                 (d0 + 3.0, 0.45, 83, 0.60, 1.0), (d0 + 3.5, 1.4, 86, 0.66, 1.4)]

    # ---------------------------------------------------------------- email breakdown (bars 14-17)
    em = bars_of("email")
    for i, b in enumerate(em):
        add_pad(b, 0.9 + 0.08 * i, attack=0.5, release=0.8, extra_hi=False)
        for s, v in ((0, 0.52), (8, 0.40)):
            sc.kicks.append((S(b, s), v + 0.04 * i, "soft"))
        add_bass(b, "soft", 0.65 + 0.05 * i)
        add_sub(b, 0.62 + 0.04 * i, dur=1.85)
        for s in (4, 12):
            sc.rims.append((S(b, s), 0.30 + 0.03 * i))
        for s in range(0, 16, 2):
            sc.shakers.append((S(b, s), 0.18 + 0.02 * i))
        # warm keys: slow broken chords, kept out of the way of the notif-ping (27.0) and its tail
        tones = KEYS[chords[b]]
        pat = [(0, 0), (3, 2), (6, 1), (8, 3), (11, 2), (14, 4)]
        for s, k in pat:
            t = S(b, s)
            if i == 0 and t < 27.5:
                continue
            sc.keys.append((t, 0.55, tones[k], 0.42 + 0.03 * (k % 3) + 0.03 * i))
    ee = sec["email"][1]
    sc.swells.append(dict(t0=ee - 0.65, t1=ee - 0.02, f_lo=1500.0, f_hi=9500.0, q=1.0, shape=1.8, gain=0.20, tail=0.0))

    # ---------------------------------------------------------------- system (bars 18-20)
    syst = bars_of("system")
    mask_g = [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0]       # always open on the beats: the pad pulses with the node-on cues
    mask_a = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0]
    for i, b in enumerate(syst):
        add_pad(b, 0.95 + 0.08 * i, attack=0.12, release=0.2, extra_hi=(i == 2))
        for s, on in enumerate(mask_g):
            if on:
                sc.gates.append((S(b, s) - 0.004, S(b, s) + 0.105))
        add_kicks(b, vel=0.86, kind="tight")
        add_backbeat(b, 0.40 + 0.06 * i)
        add_bass(b, "rolling" if i != 1 else "drive", 0.85)
        add_sub(b, 0.7)
        add_hats(b, 0.40, sixteenths=True, ghost=0.18 + 0.03 * i, open_steps=(14,) if i == 2 else ())
        add_arps(b, 0.92, 1, 0.56 + 0.04 * i, 3 + (i % 2), 8, offset=i + 2, mask=mask_a)
    t_roll0 = S(syst[-1], 8)
    se = sec["system"][1]
    snare_roll(sc, t_roll0, se - 0.08, d0=0.125, ratio=0.93, v0=0.28, v1=0.9)
    sc.swells.append(dict(t0=se - 2.0, t1=se - 0.1, f_lo=600.0, f_hi=9000.0, q=1.2, shape=2.2, gain=0.40, tail=0.0))
    sc.air_gaps.append((se - 0.08, se))

    # ---------------------------------------------------------------- outro (bars 21-22 + tail)
    o0 = sec["outro"][0]
    final = [48, 55, 60, 64, 67, 72, 76, 79]
    sc.pads.append(dict(t0=o0, t1=o0 + 2.0, notes=final, gain=1.35, attack=0.03, release=0.6, layer="final"))
    sc.pads.append(dict(t0=o0, t1=o0 + 2.0, notes=PAD_HI["C"], gain=0.8, attack=0.05, release=0.6, layer="hi"))
    sc.pads.append(dict(t0=o0 + 2.0, t1=dur, notes=PAD["Cadd9"] + [74], gain=1.5, attack=0.5, release=2.0, layer="final"))   # Cadd9 bloom
    sc.pads.append(dict(t0=o0 + 2.0, t1=dur, notes=PAD_HI["Cadd9"], gain=0.9, attack=0.6, release=2.0, layer="hi"))
    sc.kicks.append((o0, 1.0, "big"))
    sc.bass.append((o0, 3.2, 48, 0.85))
    sc.subs.append((o0 + 0.25, 4.0, 36, 0.8))
    sc.leads += [(o0, 1.9, 84, 0.52, 1.6), (o0 + 2.05, 2.0, 86, 0.48, 1.8), (o0 + 3.0, 1.0, 88, 0.36, 1.4)]
    return sc


# --------------------------------------------------------------------------------------- rendering helpers
def duck_curve(n: int, windows: list[tuple[float, float, float, float, float]]) -> np.ndarray:
    """Gain curve (1 = unity). windows = (t0, t1, depth_lin, attack_s, release_s): dip to `depth` over `attack`,
    hold until t1, recover over `release` (raised-cosine ramps). Overlaps combine with min()."""
    g = np.ones(n)
    for t0, t1, depth, att, rel in windows:
        i0, i1 = secs(t0), secs(t1)
        a, r = max(secs(att), 1), max(secs(rel), 1)
        seg_a = np.linspace(0, 1, a, endpoint=False)
        ramp_dn = 1.0 - (1.0 - depth) * (0.5 - 0.5 * np.cos(np.pi * seg_a))
        ramp_up = depth + (1.0 - depth) * (0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, r, endpoint=False)))
        parts = [(i0, ramp_dn), (i0 + a, np.full(max(i1 - i0 - a, 0), depth)), (max(i1, i0 + a), ramp_up)]
        for start, arr in parts:
            if len(arr) == 0:
                continue
            s0, s1 = max(start, 0), min(n, start + len(arr))
            if s1 > s0:
                g[s0:s1] = np.minimum(g[s0:s1], arr[s0 - start:s1 - start])
    return g


def gate_curve(n: int, windows: list[tuple[float, float]], floor: float, attack: float = 0.003, release: float = 0.035) -> np.ndarray:
    """Trance-gate style envelope: `floor` between windows, 1.0 inside, smooth edges."""
    g = np.full(n, float(floor))
    a, r = max(secs(attack), 1), max(secs(release), 1)
    for t0, t1 in windows:
        i0, i1 = secs(t0), secs(t1)
        up = floor + (1 - floor) * (0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, a, endpoint=False)))
        dn = 1.0 - (1 - floor) * (0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, r, endpoint=False)))
        for start, arr in ((i0, up), (i0 + a, np.ones(max(i1 - i0 - a, 0))), (max(i1, i0 + a), dn)):
            s0, s1 = max(start, 0), min(n, start + len(arr))
            if s1 > s0:
                g[s0:s1] = np.maximum(g[s0:s1], arr[s0 - start:s1 - start])
    return g


def _variants(fn, count: int, seed: int, **kw):
    return [fn(np.random.default_rng(seed + i), **kw) for i in range(count)]


def render_music(sc: Score, harm: Harmony, cues: dict, n: int) -> dict:
    """Render the score. Returns {'stems': {name: (n,2)}, 'sends': {'room'|'plate'|'hall': (n,)}, 'curves': {...}}."""
    rng = np.random.default_rng(777)
    st: dict[str, np.ndarray] = {}
    sends = {"room": np.zeros(n), "plate": np.zeros(n), "hall": np.zeros(n)}

    def place(bus, x, t, gain=1.0):
        dsp.mix_into(bus, x, secs(t), gain)

    def mono(x):
        return 0.5 * (x[:, 0] + x[:, 1])

    # ------------------------------------------------ drums
    kick_v = {"big": _variants(ins.kick, 3, 100, f_end=52.0, body_tau=0.16, click=1.0, length=0.5),
              "norm": _variants(ins.kick, 3, 110, f_end=56.0, body_tau=0.105, click=0.9),
              "soft": _variants(ins.kick, 3, 120, f_end=55.0, body_tau=0.15, click=0.3, punch=0.6, drive=1.1, length=0.45),
              "tight": _variants(ins.kick, 3, 130, f_end=58.0, body_tau=0.07, click=1.0, length=0.3)}
    kb = np.zeros((n, 2))
    for i, (t, v, kind) in enumerate(sc.kicks):
        place(kb, dsp.stereo(kick_v[kind][i % 3]), t, v)
    st["kick"] = kb

    claps = _variants(ins.clap, 4, 200)
    cb = np.zeros((n, 2))
    for i, (t, v) in enumerate(sc.claps):
        place(cb, claps[i % 4], t, v)
    st["clap"] = cb

    snares = {}
    sb = np.zeros((n, 2))
    for i, (t, v, tune) in enumerate(sc.snares):
        key = int(round(tune / 15.0))
        if key not in snares:
            snares[key] = ins.snare(np.random.default_rng(300 + key), tune=float(key * 15.0))
        place(sb, snares[key], t, v)
    st["snare"] = sb

    hats_c = _variants(ins.hat, 4, 400, open_=False)
    hats_o = _variants(ins.hat, 3, 410, open_=True)
    hb = np.zeros((n, 2))
    for i, (t, v, op) in enumerate(sc.hats):
        s = hats_o[i % 3] if op else hats_c[i % 4]
        place(hb, dsp.pan(0.5 * (s[:, 0] + s[:, 1]), (-0.25 if i % 2 else 0.25)), t, v)
    st["hat"] = hb

    shk = _variants(ins.shaker, 4, 500)
    shb = np.zeros((n, 2))
    for i, (t, v) in enumerate(sc.shakers):
        place(shb, shk[i % 4], t, v)
    st["shaker"] = shb

    rm = _variants(ins.rim, 3, 600)
    rb = np.zeros((n, 2))
    for i, (t, v) in enumerate(sc.rims):
        place(rb, rm[i % 3], t, v)
    st["rim"] = rb

    # ------------------------------------------------ bass / sub / heartbeat
    bb = np.zeros((n, 2))
    for t, d, m, v in sc.bass:
        place(bb, dsp.stereo(ins.bass(float(mtof(m)), d, v)), t)
    st["bass"] = bb
    sbb = np.zeros((n, 2))
    for t, d, m, v in sc.subs:
        place(sbb, dsp.stereo(ins.sub(float(mtof(m)), d, v)), t)
    st["sub"] = sbb
    hr = np.zeros((n, 2))
    for t, v in sc.hearts:
        thump = (np.sin(2 * np.pi * 55.0 * np.cumsum(1.0 + 0.9 * np.exp(-np.arange(secs(0.4)) / SR / 0.03)) / SR)
                 * dsp.attack_decay(secs(0.4), 4.0, 0.09))
        thump = dsp.sat(thump * 1.6, 1.6)
        thump += 0.35 * np.sin(2 * np.pi * 110.0 * np.arange(secs(0.4)) / SR) * dsp.attack_decay(secs(0.4), 3.0, 0.07)
        dsp.edge_fades(thump, 3.0, 12.0)
        place(hr, dsp.stereo(thump), t, v * 0.9)
    st["heart"] = hr

    # ------------------------------------------------ pads (one raw bus per layer family, filtered per layer later)
    pad_raw = np.zeros((n, 2))
    drone_raw = np.zeros((n, 2))
    hi_raw = np.zeros((n, 2))
    final_raw = np.zeros((n, 2))
    for p in sc.pads:
        dur = p["t1"] - p["t0"]
        bank = ins.pad_voice_bank(p["notes"], dur, p["attack"], p["release"], rng,
                                  detune_cents=9.0 if p["layer"] != "drone" else 14.0, spread=0.5,
                                  sub_octave=(p["layer"] in ("pad", "final")))
        tgt = {"pad": pad_raw, "drone": drone_raw, "hi": hi_raw, "final": final_raw}[p["layer"]]
        place(tgt, bank, p["t0"], p["gain"] * (0.8 if p["layer"] == "hi" else 1.0))
    st["pad_raw"], st["drone_raw"], st["hi_raw"], st["final_raw"] = pad_raw, drone_raw, hi_raw, final_raw

    # ------------------------------------------------ arps (marimba-ish plucks) + ping-pong delay
    ab = np.zeros((n, 2))
    arp_mono = np.zeros(n)
    for i, (t, d, m, v, reg) in enumerate(sc.arps):
        tau = 0.10 if d < 0.2 else 0.16
        note = ins.arp_pluck(float(mtof(m)), d, v, tau=tau, bright=1.0, rng=np.random.default_rng(900 + i))
        pan = 0.30 * np.sin(i * 1.7)
        dsp.mix_into(ab, dsp.pan(note, pan), secs(t), 1.0)
        dsp.mix_into(arp_mono, note, secs(t), 1.0)
    st["arp"] = ab
    st["arp_mono"] = arp_mono

    # ------------------------------------------------ keys
    kb2 = np.zeros((n, 2))
    for i, (t, d, m, v) in enumerate(sc.keys):
        note = ins.ep_tone(float(mtof(m)), d, v, rng=None)
        dsp.mix_into(kb2, dsp.pan(note, 0.18 * np.sin(i * 2.3)), secs(t), 1.0)
    st["keys"] = kb2

    # ------------------------------------------------ lead
    lb = np.zeros((n, 2))
    for i, (t, d, m, v, tau) in enumerate(sc.leads):
        note = ins.bell_lead(float(mtof(m)), d, v, tau=tau, rng=np.random.default_rng(1200 + i))
        dsp.mix_into(lb, dsp.stereo(note), secs(t), 1.0)
    st["lead"] = lb

    # ------------------------------------------------ texture swells
    fx = np.zeros((n, 2))
    for i, w in enumerate(sc.swells):
        sw = ins.noise_swell(np.random.default_rng(1500 + i), w["t1"] - w["t0"], w["f_lo"], w["f_hi"], w["q"], w["shape"], tail=w.get("tail", 0.0))
        dsp.edge_fades(sw, 8.0, 12.0)
        dsp.mix_into(fx, sw, secs(w["t0"]), w["gain"])
    st["fx"] = fx
    return {"stems": st, "sends": sends}
