"""Direction A, "Minimal pulse" (qa/SOUND.md): the underscore of the 50 s film and of its 15 s cut-down.

A warm breathing pad, felt electric piano playing sparse chord tones, a soft TUNED sub pulse in half-time (one thump per second), a dark
drone and a faint heartbeat for the hook, a bright bloom for the 98 %, and ONE big resolved chord at the handshake that rings under the
signature. No snare, no hats, no snare roll, no confetti. The swipes themselves (tuned yes / no phrases, see sfx.py) are the rhythm.

`compose_a` is driven by the cue sheet's sections and chord segments, never by bar numbers, so the same code writes the master
(cues.json) and the cut-down (cues-15s.json, whose chords may change off the bar line where two excerpts of the master meet).
`direction="b"` adds the "Confident build" drums on the same bed (kick every beat, claps on 2 and 4, a clean drop at the 98 %): it exists
for the A/B listening files only.
"""
from __future__ import annotations

import numpy as np

import music as mu
from music import BASS_ROOT, KEYS, PAD, PAD_HI, SOFT, SUB_ROOT, Score
from theory import Harmony

BAR, BEAT, STEP = mu.BAR, mu.BEAT, mu.STEP


def compose_a(cues: dict, harm: Harmony, direction: str = "a") -> Score:
    rng = np.random.default_rng(20261008)
    sc = Score()
    sec = {s["name"]: (float(s["from"]), float(s["to"])) for s in cues["sections"]}
    sc.sections = sec
    dur = float(cues["duration"])
    B = direction.lower() == "b"
    segs = [(float(b["from"]), float(b["to"]), b["chord"]) for b in harm.bars]
    sfx_t = lambda *types: sorted(float(e["t"]) for e in cues["sfx"] if e["type"] in types)

    # ----------------------------------------------------------------------------------------------- cells: (section x chord segment)
    cells = []
    for name, (a, z) in sec.items():
        for sa, sz, ch in segs:
            lo, hi = max(a, sa), min(z, sz)
            if hi - lo > 1e-6:
                cells.append((lo, hi, ch, name))
    cells.sort()

    def bar0(t: float) -> float:
        return BAR * np.floor((t + 1e-6) / BAR)

    def steps(t0, t1, pattern):
        """(time, *rest) for every (step, *rest) of `pattern` that falls inside [t0, t1) in the bar(s) the cell touches."""
        out = []
        b = bar0(t0)
        while b < t1 - 1e-6:
            for s, *rest in pattern:
                t = b + s * STEP
                if t0 - 1e-6 <= t < t1 - 1e-6:
                    out.append((t, *rest))
            b += BAR
        return out

    def pad(t0, t1, ch, gain=1.0, attack=0.25, release=0.45, layer="pad", hi=False, notes=None):
        sc.pads.append(dict(t0=t0, t1=t1, notes=notes or PAD[ch], gain=gain, attack=attack, release=release, layer=layer))
        if hi:
            sc.pads.append(dict(t0=t0, t1=t1, notes=PAD_HI[ch], gain=gain * 0.55, attack=attack, release=release, layer="hi"))

    def bass(t, d, ch, vel, up=False, attack=4.0):
        sc.bass.append((t, d, BASS_ROOT[ch] + (12 if up else 0), vel, attack))

    def sub(t, d, ch, vel, attack=7.0):
        sc.subs.append((t, d, SUB_ROOT[ch], vel, attack))

    def pulse_times(t0, t1, every=1.0):
        t = np.ceil(t0 / every - 1e-9) * every
        while t < t1 - 1e-6:
            yield float(t)
            t += every

    def keys(t, ch_keys, idx, vel, dur_=0.55):
        sc.keys.append((t, dur_, ch_keys[idx % len(ch_keys)], vel))

    typing = [(float(e["t"]), float(e["t"]) + float(e["dur"])) for e in cues["sfx"] if e["type"] == "typing-texture"]
    first_in = {name: min(lo for lo, hi, ch, nm in cells if nm == name) for name in sec if any(nm == name for *_, nm in cells)}

    # ----------------------------------------------------------------------------------------------- hook: drone, swell, a faint heartbeat
    if "hook" in sec:
        a, z = sec["hook"]
        sc.pads.append(dict(t0=a, t1=a + BAR, notes=[33, 40, 45, 52], gain=1.0, attack=1.0, release=0.35, layer="drone"))
        sc.pads.append(dict(t0=a + BAR, t1=z - 0.02, notes=[31, 38, 43, 50], gain=1.0, attack=0.25, release=0.04, layer="drone"))
        sc.swells.append(dict(t0=a, t1=z - 0.01, f_lo=220.0, f_hi=3600.0, q=1.1, shape=1.7, gain=0.55, tail=0.0))
        sc.hearts += [(a + 0.5, 0.42), (a + 0.78, 0.30), (a + 2.5, 0.48), (a + 2.78, 0.34), (a + 3.25, 0.52), (a + 3.5, 0.62)]
        sc.air_gaps.append((z - 0.25, z))                            # 0.25 s of near-silence before the hit

    # ----------------------------------------------------------------------------------------------- sections, cell by cell
    for t0, t1, ch, name in cells:
        L = t1 - t0
        start = abs(t0 - first_in.get(name, -1)) < 1e-6
        if name == "hook":
            continue
        if name == "idea":
            pad(t0, t1, ch, 1.0, attack=0.04 if start else 0.25, release=0.5)
            bass(t0, L * 0.95, ch, 0.80, attack=6.0)
            sub(t0, L * 0.9, ch, 0.70)
            for t in pulse_times(max(t0, sec["idea"][0] + 1.0), t1):
                sc.pulses.append((t, 0.55, BASS_ROOT[ch]))
        elif name in ("handoff", "form", "swipes"):
            g = {"handoff": 0.95, "form": 1.0, "swipes": 0.92}[name]
            pad(t0, t1, ch, g, attack=0.4 if start else 0.3, release=0.5)
            bass(t0, min(L, BAR) * 0.92, ch, 0.55, attack=8.0)
            v = {"handoff": 0.40, "form": 0.45, "swipes": 0.50}[name]
            for t in pulse_times(t0, t1):
                sc.pulses.append((t, v if (t % 2.0) < 0.5 else v * 0.78, BASS_ROOT[ch]))
            kt = KEYS[ch]
            pat = {"handoff": [(0, 3)], "form": [(0, 2), (8, 3)], "swipes": [(0, 3)]}[name]
            for t, idx in steps(t0, t1, pat):
                if any(a - 0.1 <= t <= z + 0.15 for a, z in typing):
                    continue
                keys(t, kt, idx, 0.24 if name == "swipes" else 0.28)
        elif name == "scan":
            pad(t0, t1, ch, 1.0, attack=0.3, release=0.4, hi=(t1 > sec["scan"][1] - 1.9))
            bass(t0, min(L, BAR) * 0.9, ch, 0.55, attack=8.0)
            for t in pulse_times(t0, min(t1, sec["scan"][1] - 0.6)):
                sc.pulses.append((t, 0.50, BASS_ROOT[ch]))
            if start:
                sc.swells.append(dict(t0=t0 + 0.2, t1=sec["scan"][1] - 0.02, f_lo=500.0, f_hi=7500.0, q=1.1, shape=2.2, gain=0.26, tail=0.0))
            sc.air_gaps.append((sec["scan"][1] - 0.25, sec["scan"][1]))              # the air before the 98 %
        elif name == "match":
            if start:                                                              # the 98 % bloom: a rolled felt chord over the C pad
                pad(t0, t0 + 2.0, ch, 1.15, attack=0.10, release=0.9, hi=True)
                for j, m in enumerate((48, 55, 60, 64, 67, 72)):
                    sc.keys.append((t0 + 0.016 * j, 1.8, m, 0.34 - 0.012 * j))
                bass(t0, 1.8, ch, 0.85, attack=14.0)
                sub(t0, 1.9, ch, 0.80, attack=20.0)
                sc.pulses.append((t0, 0.80, BASS_ROOT[ch]))
                if B:                                                              # B only: the clean drop
                    sc.kicks.append((t0, 0.95, "big"))
                    sc.claps.append((t0, 0.5))
                    for k, (dt, m, v) in enumerate(((0.5, 76, 0.60), (1.0, 79, 0.62), (1.5, 84, 0.70))):
                        sc.leads.append((t0 + dt, 0.45 if k < 2 else 0.9, m, v, 1.0 if k < 2 else 1.2))
            tail0 = t0 + (2.0 if start else 0.0)
            if t1 > tail0 + 1e-6:
                pad(tail0, t1, ch, 0.95, attack=0.5, release=0.6)
            for t in pulse_times(max(t0 + (1.0 if start else 0.0), t0), t1):
                sc.pulses.append((t, 0.46, BASS_ROOT[ch]))
            for t, idx in steps(max(t0, sec["match"][0] + 2.0), t1, [(0, 2), (8, 3)]):
                keys(t, KEYS[ch], idx, 0.26)
        elif name == "email":
            i = int(round((t0 - sec["email"][0]) / BAR))
            pad(t0, t1, ch, 0.9 + 0.06 * i, attack=0.5, release=0.8)
            bass(t0, min(L, BAR) * 0.92, ch, 0.58 + 0.04 * i, attack=10.0)
            sub(t0, min(L, BAR) * 0.92, ch, 0.50)
            for t in pulse_times(t0, t1, every=2.0):
                sc.pulses.append((t, 0.38 + 0.03 * i, BASS_ROOT[ch]))
            kt = KEYS[ch]
            for t, k_ in steps(t0, t1, [(0, 0), (3, 2), (6, 1), (8, 3), (11, 2), (14, 4)]):
                if t < sec["email"][0] + 1.0:
                    continue                                                       # leave the notification and the mail opening alone
                keys(t, kt, k_, 0.40 + 0.03 * (k_ % 3) + 0.03 * i)
        elif name == "store":
            i = int(round((t0 - sec["store"][0]) / BAR))
            pad(t0, t1, ch, 1.0, attack=0.3, release=0.45)
            bass(t0, min(L, BAR) * 0.92, ch, 0.72, attack=6.0)
            sub(t0, min(L, BAR) * 0.90, ch, 0.62)
            for t in pulse_times(t0, t1):
                sc.pulses.append((t, 0.62 if (t % 2.0) < 0.5 else 0.48, BASS_ROOT[ch]))
            for t, _ in steps(t0, t1, [(6, 0), (14, 0)]):                          # the one quiet off-beat tick: steady means competent
                sc.rims.append((t, 0.20))
            for t, idx in steps(t0, t1, [(0, 0), (4, 1), (8, 2), (12, 1)]):
                keys(t, KEYS[ch], idx, 0.34, 0.50)
            if B:
                for t in pulse_times(t0, t1, every=0.5):
                    sc.kicks.append((t, 0.62, "tight"))
                for t, _ in steps(t0, t1, [(4, 0), (12, 0)]):
                    sc.claps.append((t, 0.36))
        elif name == "system":
            stop = min([t for t in sfx_t("whoosh-in") if sec["system"][0] <= t <= sec["system"][1]] or [sec["system"][1] - 0.1])
            t_end = min(t1, stop)
            if t_end - t0 <= 0.05:
                continue
            i = int(round((t0 - sec["system"][0]) / BAR))
            pad(t0, t_end, ch, 0.95 + 0.06 * i, attack=0.12, release=0.25 if t_end < t1 else 0.2)
            for s_, on in enumerate([1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0]):    # the pad is gated on the beats (trance-gate)
                t = bar0(t0) + s_ * STEP
                if on and t0 - 1e-6 <= t < t_end - 1e-6:
                    sc.gates.append((t - 0.004, t + 0.105))
            bass(t0, min(t_end - t0, BAR) * 0.92, ch, 0.60, attack=6.0)
            for t in pulse_times(t0, t_end):
                sc.pulses.append((t, 0.50 if (t % 2.0) < 0.5 else 0.40, BASS_ROOT[ch]))
            ui_t = np.array(sfx_t("node-run", "tile-bloom", "lock-click", "store-ticks") + [x for e in cues["sfx"] if e["type"] in ("node-run", "tile-bloom") for x in e.get("times", [])])

            def flams(t):
                d = np.abs(ui_t - t)
                return bool(np.any((d > 0.012) & (d < 0.070)))

            mask = [0 if flams(bar0(t0) + s_ * STEP) else 1 for s_ in range(16)]
            n0 = len(sc.arps)
            for t, d, m, v in mu.arp_bar(rng, mu.ARP[ch], int(bar0(t0) // BAR), 0.80, 1, 0.52 + 0.04 * i, 3 + (i % 2), 8, offset=i + 2, mask=mask):
                if t0 - 1e-6 <= t < t_end - 1e-6:
                    sc.arps.append((t, min(d, t_end - t), m, v, "mid"))
            if t_end < t1:
                sc.echo_cuts.append((stop + 0.20, stop + 0.50))                    # the repeats of the last notes die out under the whoosh
        elif name == "human":
            ch2 = harm.at(t1 - 0.01)
            voic = SOFT.get(ch2, {"pad": PAD[ch2], "lean": PAD[ch2], "keys": KEYS[ch2], "keys_lean": KEYS[ch2]})
            sc.pads.append(dict(t0=t0 + 0.05, t1=t1 - 0.5, notes=voic["pad"], gain=1.0, attack=0.60, release=0.55, layer="soft"))
            sc.pads.append(dict(t0=t1 - 0.55, t1=t1 - 0.05, notes=voic["lean"], gain=0.80, attack=0.35, release=0.20, layer="soft"))
            sc.pads.append(dict(t0=t0 + 0.6, t1=t1 - 0.1, notes=PAD_HI[ch2], gain=0.7, attack=1.0, release=0.6, layer="hi"))
            sub(t1 - 2.0 if L > 2.0 else t0, t1 - (t1 - 2.0 if L > 2.0 else t0) - 0.45, ch2, 0.5, attack=120.0)
            for t_k, notes_k, vel_k, dur_k in ((t1 - 1.0, voic["keys"], 0.42, 0.40), (t1 - 0.5, voic["keys_lean"], 0.38, 0.20)):
                for j, m in enumerate(notes_k):
                    sc.keys.append((t_k + 0.022 * j, dur_k, m, vel_k * (1.0 - 0.06 * j)))
            sc.keys.append((t1 - 0.25, 0.25, 72, 0.34))
        elif name == "resolve":
            o0 = t0
            o_add9 = next((a for a, z, c_ in segs if c_ == "Cadd9" and a >= o0 - 1e-6), t1)
            final = [48, 55, 60, 64, 67, 72, 76, 79]
            sc.pads.append(dict(t0=o0, t1=max(o_add9, o0 + 0.4), notes=final, gain=1.35, attack=0.08, release=0.6, layer="final"))
            sc.pads.append(dict(t0=o0, t1=max(o_add9, o0 + 0.4), notes=[64, 76], gain=0.5, attack=0.10, release=0.6, layer="final"))
            sc.pads.append(dict(t0=o0, t1=max(o_add9, o0 + 0.4), notes=PAD_HI["C"], gain=0.8, attack=0.10, release=0.6, layer="hi"))
            for j, m in enumerate((48, 55, 60, 64, 67, 72, 76)):                   # the felt piano rolls the chord (14 ms per note): a warm hammer, not a hit
                sc.keys.append((o0 + 0.014 * j, 2.6, m, 0.40 - 0.012 * j))
            sc.bass.append((o0, 3.4, 48, 0.80, 18.0))
            sc.subs.append((o0, 4.2, 36, 0.75, 60.0))
            sc.leads.append((o0, 1.9, 84, 0.46, 1.6))
        elif name == "signature":
            o_add9 = t0
            sc.pads.append(dict(t0=o_add9, t1=dur, notes=PAD["Cadd9"] + [74], gain=1.5, attack=0.5, release=2.0, layer="final"))      # Cadd9 bloom
            sc.pads.append(dict(t0=o_add9, t1=dur, notes=PAD_HI["Cadd9"], gain=0.9, attack=0.6, release=2.0, layer="hi"))
            sc.keys += [(o_add9, 1.8, 64, 0.30), (o_add9 + 0.03, 1.8, 67, 0.26)]
            sc.leads += [(o_add9 + 0.05, 2.0, 86, 0.48, 1.8), (o_add9 + 1.0, 1.0, 88, 0.36, 1.4)]

    # B only: a light kick on every beat of the experience, claps on 2 and 4
    if B:
        for name in ("idea", "handoff", "form", "swipes", "scan", "match"):
            if name not in sec:
                continue
            a, z = sec[name]
            lo = a + (1.0 if name == "idea" else 0.0)
            hi_ = z - (0.6 if name == "scan" else 0.0)
            for t in pulse_times(lo, hi_, every=0.5):
                if abs(t - sec.get("match", (1e9, 0))[0]) < 1e-6:
                    continue
                sc.kicks.append((t, 0.55, "soft"))
            if name in ("handoff", "form", "swipes", "match"):
                b = bar0(lo)
                while b < hi_:
                    for off in (0.5, 1.5):
                        if lo - 1e-6 <= b + off < hi_ - 1e-6 and abs(b + off - sec.get("match", (1e9, 0))[0]) > 1e-6:
                            sc.claps.append((b + off, 0.34))
                    b += BAR

    # ----------------------------------------------------------------------------------------------- the pad's low-pass and the macro level curve
    def at(name, i=0, default=None):
        return sec[name][i] if name in sec else default

    cut = [(0.0, 1500.0)]
    for name, f0, f1 in (("idea", 1500, 2000), ("handoff", 1800, 2200), ("form", 2400, 2600), ("swipes", 2600, 2800), ("scan", 2800, 9000),
                         ("match", 6500, 4500), ("email", 1100, 3200), ("store", 3200, 3600), ("system", 3600, 7000), ("human", 800, 1800),
                         ("resolve", 7000, 7000), ("signature", 7000, 7000)):
        if name in sec:
            a, z = sec[name]
            cut += [(a + 0.01, float(f0)), (z - 0.01, float(f1))]
    cut.append((dur, 7000.0))
    sc.pad_cut = sorted({round(t, 3): f for t, f in cut}.items())

    mac = [(0.0, -6.0)]
    if "idea" in sec:
        mac += [(sec["idea"][0] - 0.1, -1.0), (sec["idea"][0], 0.0)]
    elif "hook" in sec:
        mac += [(sec["hook"][1] - 0.1, -1.0), (sec["hook"][1], 0.0)]
    for name, db, db_end in (("match", 1.0, 0.0), ("email", -2.0, -2.0), ("store", 0.0, 0.0), ("system", 0.5, 0.5), ("human", -1.5, -1.0)):
        if name in sec:
            a, z = sec[name]
            if name == "match":
                mac += [(a - 0.05, 0.0), (a, db), (min(a + 2.0, z - 0.1), db_end)]
            else:
                mac += [(a + 0.1, db), (z - 0.1, db_end)]
    if "resolve" in sec:
        a, z = sec["resolve"]
        mac += [(a - 0.1, 0.5), (a, 3.5), (a + 0.5, 3.5), (a + 1.4, 0.0)]
    mac.append((dur, -24.0))
    sc.macro = sorted({round(t, 3): v for t, v in mac}.items())
    return sc
