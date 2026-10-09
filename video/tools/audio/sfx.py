"""Sound design for every `sfx` type in cues.json.

Each designer receives a `Ctx` (the cue, a seeded RNG, the chord at that moment ...) and returns a `Shot`:
a stereo one-shot plus the sample index of its *accent* inside the audio, so the placer can lock the accent
to the cue time with sample accuracy. Pitched sounds take their notes from the chord playing in that bar
(see theory.py); un-pitched sweeps are band-passed so they never fight the harmony.

Level convention: `finish(..., peak_db=)` sets the one-shot's peak in dBFS *before* the master chain.
"""
from __future__ import annotations

import zlib
from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from scipy import signal

import dsp
import instruments as ins
import synth as sy
import theory as th
from dsp import SR, secs, mtof, note
from theory import Harmony


# --------------------------------------------------------------------------------------- plumbing
@dataclass
class Shot:
    audio: np.ndarray                       # (n, 2)
    accent: int = 0                         # sample index of the accent inside `audio`
    target: float | None = None             # absolute time (s) the accent must land on (None -> cue time)
    send: dict = field(default_factory=dict)       # reverb sends {'room'|'plate'|'hall': gain}
    notes: list = field(default_factory=list)      # [(seconds after accent, midi)] for the harmony audit
    kind: str = "onset"                     # QA: 'onset' (transient) | 'peak' (envelope maximum) | 'end' (riser end) | 'swell' (starts at the cue)
    strict: bool = False                    # harmony audit: True = must be chord tones / consonant extensions
    send_src: np.ndarray | None = None      # what feeds the reverbs, if not the whole shot (e.g. keep a dry clasp out of the reverb)


@dataclass
class Ctx:
    ev: dict
    rng: np.random.Generator
    harm: Harmony
    nth: int          # index among cues of the same type
    count: int        # how many cues of this type
    index: int        # global cue index

    def chord_at(self, t: float) -> str:
        return self.harm.at(t)

    @property
    def t(self) -> float:
        return float(self.ev["t"])

    @property
    def chord(self) -> str:
        return self.harm.at(self.t + 1e-4)


REG: dict[str, Callable[[Ctx], Shot]] = {}


def sfx(name: str):
    def deco(fn):
        REG[name] = fn
        return fn
    return deco


class Canvas:
    """Stereo scratch buffer to layer several voices into one one-shot."""

    def __init__(self, dur: float):
        self.y = np.zeros((secs(dur), 2))

    def add(self, x: np.ndarray, t: float = 0.0, gain: float = 1.0, pan: float = 0.0) -> "Canvas":
        if x.ndim == 1:
            x = dsp.pan(x, pan)
        dsp.mix_into(self.y, x, secs(t), gain)
        return self


def finish(y: np.ndarray, peak_db: float, fade_in_ms: float = 1.5, fade_out_ms: float = 6.0) -> np.ndarray:
    """Edge fades (never a click) then set the peak level in dBFS."""
    y = np.array(y, dtype=float)
    dsp.edge_fades(y, fade_in_ms, fade_out_ms)
    pk = np.max(np.abs(y))
    if pk > 0:
        y *= dsp.db2lin(peak_db) / pk
    return y


def finish_pair(y: np.ndarray, wet: np.ndarray, peak_db: float, fade_in_ms: float = 1.5, fade_out_ms: float = 6.0):
    """Like finish(), but also returns the reverb-feed `wet` scaled/faded identically (so it stays aligned with the shot)."""
    y = np.array(y, dtype=float)
    w = np.array(wet, dtype=float)
    dsp.edge_fades(y, fade_in_ms, fade_out_ms)
    dsp.edge_fades(w, fade_in_ms, fade_out_ms)
    pk = np.max(np.abs(y))
    g = dsp.db2lin(peak_db) / pk if pk > 0 else 1.0
    return y * g, w * g


def mono(y: np.ndarray) -> np.ndarray:
    return y if y.ndim == 1 else 0.5 * (y[:, 0] + y[:, 1])


def seed_for(name: str, t: float) -> int:
    """Per-cue RNG seed from the cue's type and time (ms): adding or moving *other* cues never re-rolls a sound."""
    return zlib.crc32(f"{name}:{round(t * 1000)}".encode()) & 0xFFFFFFFF


# The first 33 s of the film were signed off with seeds derived from each cue's position in the first cue sheet ("v1"). Cues before
# LEGACY_UNTIL keep exactly those seeds, so their sounds stay bit-identical when later cues are added or moved; the cues the sheet gained
# since (listed here) are skipped when counting that position. Everything from LEGACY_UNTIL on is seeded from (type, time).
LEGACY_UNTIL = 0.0          # (direction A: a new cue sheet, so every cue is seeded from its type and time)
ADDED_SINCE_V1 = {("screen-wake", 5.9), ("zoom-whoosh", 6.85)}


def cue_seed(cues_sfx: list, idx: int) -> int:
    ev = cues_sfx[idx]
    if float(ev["t"]) >= LEGACY_UNTIL:
        return seed_for(ev["type"], float(ev["t"]))
    shift = sum(1 for e in cues_sfx[:idx] if (e["type"], round(float(e["t"]), 3)) in ADDED_SINCE_V1)
    return zlib.crc32(f"{ev['type']}:{idx - shift}".encode()) & 0xFFFFFFFF


# Second mixing pass (after listening to the numbers, not the speakers): measured against the music (loudest 350 ms of each cue vs the music
# in the same window, above 200 Hz), the interaction sounds - typing, swipes, card-ins, clicks, the iPad -> iPhone swap - sat at or under the
# music and were masked; only the hook pops, chimes and hits stood out. BOOST_DB raises those types (dB, on top of LEVEL; the synthesis and the
# seeds are untouched), BOOST_AT a single cue (type, time) that is weaker than its siblings. Target: >= ~+4..+7 dB over the music.
BOOST_DB = {
    # direction A: the music is a quiet bed, so most of the v2 boosts (made for loud drops) are gone; margins aimed at +6..+10 dB for
    # actions, +12..+16 dB for the hits, measured by the report's "SFX clarity" table
    "typing-texture": 14.0, "lock-click": -1.0, "swipe-no": 0.0, "swipe-yes": 0.0, "device-settle": 2.0, "whoosh-swap": 4.0, "whoosh-down": 3.0,
    "photo-whoosh": 3.0, "handshake": 3.0, "reveal-whoosh": 1.0, "notif-ping": -5.0, "code-ding": -6.0, "redeem-ding": -6.0, "lock-on": -6.0,
    "sparkle": -7.0, "sparkle-up": -3.0, "bag-rustle": -6.0, "logo-hit": -2.0, "counter-hit": -2.0, "store-ticks": -2.0, "node-run": 1.0, "motif": 3.0, "motif-q": 2.0,
    "crm-land": 2.0, "callout-in": -3.0, "tile-bloom": -4.0,
}
BOOST_AT = {("tile-bloom", 0.1): -4.0}   # the fly-into-the-screen whoosh sits under the loud drop-A music; the e-mail zoom at 31.4 s does not


# Peak level (dBFS, pre-master) of each one-shot on the SFX bus - the relative balance of the whole film.
LEVEL = {
    "tile-pop": -15, "word-hit": -11, "riser-a": -16, "lock-on": -11, "whoosh-out": -16, "sparkle-up": -16,
    "riser-b": -12, "logo-hit": -3.0, "shimmer": -18, "tagline-air": -20, "whoosh-up": -12, "caption-pop": -15,
    "device-settle": -9, "tap": -4, "page-swoosh": -15, "callout-in": -12, "chip-tick": -10, "key": -13,
    "check-tick": -9, "lock-click": -7, "confirm": -8, "card-in": -10, "swipe-no": -6, "swipe-yes": -7,
    "reveal-whoosh": -7, "riser-count": -8, "count-tick": -7, "counter-hit": -4.0, "confetti-pop": -9,
    "whoosh-pullback": -10, "success-chime": -7, "whoosh-swap": -11, "notif-ping": -7, "swoosh-open": -17,
    "scroll-soft": -22, "zoom-whoosh": -10, "code-ding": -6, "whoosh-down": -12, "node-on": -9, "packet": -13,
    "tile-on": -9, "whoosh-in": -13, "logo-hit-soft": -11, "chip-pop": -8, "sparkle": -12,
    # closing scenes (hand-off photos)
    "screen-wake": -13, "bag-rustle": -7.5, "redeem-ding": -9, "photo-whoosh": -19, "handshake": -9,
    # direction A (qa/SOUND.md): grouped gestures, the motif, the room
    "typing-texture": -16, "scan-riser": -8, "store-ticks": -10, "node-run": -9, "tile-bloom": -10, "crm-land": -9,
    "motif-q": -9, "motif": -7, "room-tone": -30,
    # complete coverage: levelled by class (CLASS_OF), these are only the pre-class peaks
    "letter-tick": -14, "dot-tick": -16, "underline": -18, "field-tick": -16, "notif-drop": -14, "lead-fly": -14, "line-draw": -22, "sample-tick": -18,
}

# reverb sends (linear gain into the shared room / plate / hall reverbs)
SEND = {
    "tile-pop": {"plate": 0.30}, "word-hit": {"room": 0.10}, "lock-on": {"plate": 0.40}, "sparkle-up": {"plate": 0.45},
    "logo-hit": {"hall": 0.45}, "shimmer": {"hall": 0.30}, "tagline-air": {"hall": 0.25}, "device-settle": {"room": 0.15},
    "tap": {"room": 0.10}, "callout-in": {"plate": 0.25}, "chip-tick": {"plate": 0.28}, "check-tick": {"plate": 0.25},
    "lock-click": {"room": 0.18, "plate": 0.10}, "confirm": {"plate": 0.35}, "card-in": {"plate": 0.15},
    "swipe-yes": {"plate": 0.18}, "swipe-no": {"room": 0.10}, "reveal-whoosh": {"plate": 0.25},
    "riser-count": {"plate": 0.15}, "count-tick": {"plate": 0.15}, "counter-hit": {"hall": 0.50},
    "confetti-pop": {"plate": 0.30}, "success-chime": {"plate": 0.40}, "notif-ping": {"plate": 0.35},
    "code-ding": {"plate": 0.50, "hall": 0.15}, "node-on": {"plate": 0.28}, "packet": {"plate": 0.15},
    "tile-on": {"plate": 0.30}, "logo-hit-soft": {"hall": 0.40}, "chip-pop": {"plate": 0.30}, "sparkle": {"hall": 0.40},
    "whoosh-out": {"plate": 0.12}, "whoosh-pullback": {"plate": 0.15}, "whoosh-swap": {"plate": 0.12},
    "caption-pop": {"plate": 0.20}, "riser-a": {"hall": 0.12}, "riser-b": {"hall": 0.10},
    "screen-wake": {"plate": 0.40}, "bag-rustle": {"room": 0.03}, "redeem-ding": {"plate": 0.30}, "photo-whoosh": {"plate": 0.08},
    "handshake": {"plate": 0.45, "hall": 0.25},
    "typing-texture": {"room": 0.05}, "scan-riser": {"plate": 0.15}, "store-ticks": {"plate": 0.30}, "node-run": {"plate": 0.25},
    "tile-bloom": {"plate": 0.35, "hall": 0.15}, "crm-land": {"plate": 0.22, "hall": 0.08}, "motif-q": {"hall": 0.45, "plate": 0.15},
    "motif": {"hall": 0.50, "plate": 0.20}, "room-tone": {"hall": 0.20},
    "letter-tick": {"plate": 0.22}, "dot-tick": {"plate": 0.18}, "notif-drop": {"plate": 0.10}, "lead-fly": {"plate": 0.15},
    "sample-tick": {"plate": 0.25}, "underline": {"plate": 0.20},
}



# --------------------------------------------------------------------------------------- loudness classes
# The first mixes set a peak per type by hand (the LEVEL table) and then boosted whatever turned out to be masked: a hierarchy found by trial. From the
# complete cue sheet on (qa/SOUND-AUDIT.md) the interface sounds are levelled by CLASS instead: every sound is set so that its own loudest 40 ms (the
# loudest 150 ms for a sound that swells, mode "s") has the A-weighted level of its class, so a tap is as present as a swipe and a key a step quieter
# than either by construction, whatever its timbre. The hits, risers, the motif and the beds (S) keep their hand-set LEVEL: they are tuned with the music.
#   H highlight: an arrival or a confirmation (success, notification, code, redeemed)      A action: a tap, a selection, a pop of something the viewer reads
#   W movement: a whoosh or a swoosh that follows the picture                              T texture: keystrokes, ticks, small pops, glints
#   t whisper: a field waking up, a line drawing itself, the "Sample data" chip
CLASS_DB = {"H": -17.0, "A": -20.5, "W": -19.5, "T": -25.0, "t": -27.5}      # A-weighted dBFS of the sound's own loudest window, before the SFX bus
_I, _S = "i", "s"
CLASS_OF: dict[str, tuple[str, str, float]] = {
    # H
    "success-chime": ("H", _I, 0.0), "notif-ping": ("H", _I, 0.0), "code-ding": ("H", _I, 0.0), "redeem-ding": ("H", _I, 0.0),
    # A
    "tap": ("A", _I, 0.0), "swipe-yes": ("A", _I, 0.0), "swipe-no": ("A", _I, 0.0), "chip-tick": ("A", _I, 0.0), "check-tick": ("A", _I, 0.0),
    "lock-click": ("A", _I, 0.0), "confirm": ("T", _I, 2.0), "callout-in": ("A", _I, 0.0), "chip-pop": ("A", _I, 0.0), "node-on": ("A", _I, 0.0),
    "tile-on": ("A", _I, 2.5), "crm-land": ("A", _I, 0.0), "screen-wake": ("A", _I, 0.0), "device-settle": ("A", _I, 0.0), "word-hit": ("A", _I, 0.0),
    "lead-fly": ("A", _S, 0.0),
    # W
    "whoosh-up": ("W", _S, 0.0), "whoosh-swap": ("W", _S, 0.0), "whoosh-down": ("W", _S, 0.0), "whoosh-in": ("W", _S, 0.0), "whoosh-out": ("W", _S, 0.0),
    "whoosh-pullback": ("W", _S, 0.0), "zoom-whoosh": ("W", _S, 0.0), "reveal-whoosh": ("W", _S, 0.0), "photo-whoosh": ("W", _S, 0.0),
    "swoosh-open": ("W", _S, 0.0), "page-swoosh": ("W", _S, 0.0),
    # T
    "key": ("T", _I, -1.0), "card-in": ("T", _I, 0.0), "tile-pop": ("T", _I, 0.0), "caption-pop": ("T", _I, 0.0), "count-tick": ("T", _I, 0.0),
    "letter-tick": ("T", _I, 0.0), "dot-tick": ("T", _I, 0.0), "packet": ("T", _I, 0.0), "notif-drop": ("T", _S, 0.0), "shimmer": ("T", _S, 0.0),
    "tagline-air": ("T", _S, 0.0), "scroll-soft": ("W", _S, 1.5), "confetti-pop": ("T", _S, 0.0),
    # t
    "field-tick": ("t", _I, 0.0), "line-draw": ("t", _S, 1.0), "sample-tick": ("t", _I, 0.0), "underline": ("t", _S, 1.5),
}

_A_BA = None


def _a_weighting():
    """IEC 61672 A-weighting as a digital filter at 48 kHz (analog poles through a bilinear transform)."""
    global _A_BA
    if _A_BA is None:
        f1, f2, f3, f4 = 20.598997, 107.65265, 737.86223, 12194.217
        num = [(2 * np.pi * f4) ** 2 * 10 ** (1.9997 / 20), 0, 0, 0, 0]
        den = np.polymul(np.polymul([1, 4 * np.pi * f4, (2 * np.pi * f4) ** 2], [1, 4 * np.pi * f1, (2 * np.pi * f1) ** 2]),
                         np.polymul([1, 2 * np.pi * f3], [1, 2 * np.pi * f2]))
        _A_BA = signal.bilinear(num, den, fs=SR)
    return _A_BA


def own_level_db(audio: np.ndarray, accent: int, mode: str) -> float:
    """Loudness (dBFS, mean square) of a one-shot's own loudest window: 40 ms from its accent (mode 'i') or the loudest 150 ms (mode 's').
    The measure is the energy mean of the A-weighted and the K-weighted (BS.1770) signal: A alone under-counts the low thumps (a phone speaker does the same,
    earbuds and laptops do not), K alone over-counts them for a phone, so a 'thock' and a glass tick of the same class are equally present on both."""
    m = audio.mean(axis=1) if audio.ndim == 2 else audio
    b, a = _a_weighting()
    am = signal.lfilter(b, a, m)
    km = dsp.k_weight(np.concatenate([np.zeros(secs(0.03)), m, np.zeros(secs(0.03))]))[secs(0.03):-secs(0.03)]
    e = 0.5 * (am * am + km * km)
    if mode == _S:
        k = min(secs(0.15), len(e))
        c = np.concatenate([[0.0], np.cumsum(e)])
        ms_ = float(np.max((c[k:] - c[:-k]) / k)) if len(e) >= k else float(np.mean(e))
    else:
        a0, a1 = max(0, accent - secs(0.005)), min(len(e), accent + secs(0.035))
        ms_ = float(np.mean(e[a0:a1])) if a1 > a0 else 0.0
    return 10.0 * np.log10(ms_ + 1e-20)


# --------------------------------------------------------------------------------------- helpers
def _glints(rng, canvas: Canvas, times, midis, amps, tau: float, bright: float = 1.0, pan_spread: float = 0.7,
            max_len: float = 0.8):
    for t0, m, a in zip(times, midis, amps):
        g = sy.glass(float(mtof(m)), min(max_len, canvas.y.shape[0] / SR - float(t0)), tau=tau, bright=bright,
                     glide=0.02, glide_tau=0.004, attack_ms=1.0, rng=rng)
        canvas.add(g, float(t0), float(a), rng.uniform(-pan_spread, pan_spread))


def impact(rng: np.random.Generator, length: float, root_midi: int, size: float, sub_tau: float,
           glass_notes: list[tuple[int, float, float]], glass_tau: float, air: float, air_tau: float,
           chime_midi: int | None = None, glass_attack_ms: float = 3.0, click: float = 1.0) -> Canvas:
    """Cinematic hit: tuned sub boom (+ audible harmonics), mid punch, soft transient, glass chord, air."""
    cv = Canvas(length)
    n = secs(length)
    f0 = float(mtof(root_midi))
    sub = sy.thump(f0, length, drop=0.55, drop_tau=0.045, tau=sub_tau, drive=1.7, attack_ms=3.0)
    sub1 = dsp.sine(f0 / 2, n) * dsp.attack_decay(n, 8, sub_tau * 0.9)
    punch = sy.thump(f0 * 2, 0.7, drop=0.45, drop_tau=0.03, tau=0.15, drive=2.2, attack_ms=1.5)
    fifth = sy.thump(f0 * 3, 0.5, drop=0.35, drop_tau=0.025, tau=0.11, drive=2.0, attack_ms=1.5)
    thud = sy.bp_noise(rng, 0.08, 90, 2200, 0.018, attack_ms=1.2)
    crack = sy.bp_noise(rng, 0.03, 2500, 8000, 0.004, attack_ms=0.8)
    cv.add(sub, 0, 1.00 * size)
    cv.add(sub1, 0, 0.42 * size)
    cv.add(punch, 0, 0.55 * size)
    cv.add(fifth, 0, 0.26 * size)
    cv.add(thud, 0, 0.40 * size * click)
    cv.add(crack, 0, 0.07 * size * click)
    for midi, p, lvl in glass_notes:
        g = sy.glass(float(mtof(midi)), length, tau=glass_tau, bright=1.0, attack_ms=glass_attack_ms, rng=rng)
        cv.add(g, 0, 0.30 * lvl * size, p)
    if chime_midi is not None:
        g = sy.glass(float(mtof(chime_midi)), length, tau=glass_tau * 1.3, bright=1.5, attack_ms=2.0, rng=rng)
        cv.add(g, 0, 0.22 * size, 0.0)
    if air > 0:
        nz = rng.standard_normal((n, 2))
        a = dsp.hp(nz, 3500, 2) * dsp.attack_decay(n, 14, air_tau)[:, None]
        cv.y += a * air * size
    return cv


# =========================================================================================== HOOK
@sfx("tile-pop")
def tile_pop(c: Ctx) -> Shot:
    step, of = c.ev.get("step", 0), c.ev.get("of", 10)
    run = th.penta_run(note("A4"), 10)
    m = run[min(step, len(run) - 1)]
    vel = 0.78 + 0.22 * step / max(of - 1, 1)
    g = sy.glass(float(mtof(m)), 0.34, tau=0.07, bright=0.9, glide=0.05, glide_tau=0.006, attack_ms=1.0, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.012, 3500, 8500, 0.002, attack_ms=0.8) * 0.12
    cv = Canvas(0.36)
    cv.add(g * vel, 0, 1.0, c.rng.uniform(-0.35, 0.35))
    cv.add(tick, 0, 1.0, c.rng.uniform(-0.2, 0.2))
    return Shot(finish(cv.y, LEVEL["tile-pop"] + dsp.lin2db(vel)), 0, notes=[(0, m)])


@sfx("word-hit")
def word_hit(c: Ctx) -> Shot:
    """Soft low knock under the headline words: root / third / fifth of the bar's chord (octave 3) with a thud an octave below.
    The saturated fundamental puts harmonics at 400-1000 Hz so a phone speaker still carries it."""
    step, vel = c.ev.get("step", 0), float(c.ev.get("vel", 0.8))
    tones = th.chord_midi(c.chord, 3)
    m = tones[step % len(tones)]
    f0 = float(mtof(m))
    body = sy.thump(f0, 0.28, drop=0.35, drop_tau=0.012, tau=0.075, drive=2.3, attack_ms=1.5)
    thud = sy.thump(f0 / 2, 0.30, drop=0.35, drop_tau=0.015, tau=0.09, drive=1.8, attack_ms=2.0)
    n = secs(0.12)
    knock = dsp.sine(f0 * 3.0, n) * dsp.attack_decay(n, 1.0, 0.016)
    wood = sy.bp_noise(c.rng, 0.04, 900, 3000, 0.006, attack_ms=0.9)
    cv = Canvas(0.32)
    cv.add(body, 0, 1.0).add(thud, 0, 0.60).add(knock, 0, 0.32).add(wood, 0, 0.50)
    return Shot(finish(cv.y, LEVEL["word-hit"] + dsp.lin2db(vel)), 0, notes=[(0, m), (0, m - 12)], strict=True)


@sfx("riser-a")
def riser_a(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 220.0 * (587.33 / 220.0) ** (u ** 1.4)  # A3 -> D5 (the fifth of G: resolves onto the lock-on ping)
    tonal = sum(dsp.saw_curve(f * 2 ** (cents / 1200.0), ph) for cents, ph in ((-7, 0.1), (0, 0.5), (7, 0.8))) / 3.0
    fc = dsp.smooth_curve([(0, 380), (dur, 4200)], n, kind="exp")
    tonal = dsp.sweep(tonal, "lp", fc, 1.3)
    nz = dsp.pink(c.rng, n)
    noise = np.stack([dsp.sweep(nz, "bp", dsp.smooth_curve([(0, 250), (dur, 5200)], n, kind="exp"), 2.2),
                      dsp.sweep(dsp.pink(c.rng, n), "bp", dsp.smooth_curve([(0, 290), (dur, 5600)], n, kind="exp"), 2.2)], axis=1)
    am = 1.0 - 0.14 * (0.5 + 0.5 * np.sin(dsp.phase_of(5.0 + 9.0 * u)))
    env = (0.09 + 0.91 * u ** 2.2) * am          # never fully silent: the film starts with sound at t = 0
    y = (dsp.stereo(tonal) * 0.55 + noise * 0.55) * env[:, None]
    y = finish(y, LEVEL["riser-a"], fade_in_ms=35.0, fade_out_ms=7.0)
    return Shot(y, n, target=c.t + dur, kind="end")             # accent = the instant the riser ends (one past its last sample)


@sfx("lock-on")
def lock_on(c: Ctx) -> Shot:
    ping = sy.glass(float(mtof(note("G5"))), 1.6, tau=0.55, bright=1.1, glide=0.015, glide_tau=0.012, attack_ms=1.3, rng=c.rng)
    fifth = sy.glass(float(mtof(note("D6"))), 1.4, tau=0.45, bright=0.9, attack_ms=1.5, rng=c.rng)
    thump = sy.thump(float(mtof(note("G2"))), 0.5, drop=0.5, drop_tau=0.025, tau=0.16, drive=2.2, attack_ms=2.0)
    knock = sy.thump(float(mtof(note("G3"))), 0.2, drop=0.3, drop_tau=0.012, tau=0.05, drive=1.6, attack_ms=1.2)
    tick = sy.bp_noise(c.rng, 0.01, 3000, 9000, 0.0015) * 0.15
    cv = Canvas(1.7)
    cv.add(ping, 0, 1.0, -0.1).add(fifth, 0, 0.38, 0.2).add(thump, 0, 0.9).add(knock, 0, 0.35).add(tick, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["lock-on"]), 0, notes=[(0, note("G5")), (0, note("D6")), (0, note("G2"))], strict=True)


@sfx("whoosh-out")
def whoosh_out(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    t = np.arange(n) / SR
    f = np.where(t < 0.22, 400 * (4800 / 400) ** (t / 0.22), 4800 * (1500 / 4800) ** ((t - 0.22) / (dur - 0.22)))
    env = sy.bump(n, 0.12, pow_up=1.0, pow_down=1.5)
    width = np.clip(0.25 + 0.75 * t / 0.25, 0, 1)
    y = sy.noise_whoosh(c.rng, dur, f, 1.3, env, width=width, lp_hz=8500, hp_hz=220)
    return Shot(finish(y, LEVEL["whoosh-out"], 3.0, 10.0), secs(0.12), target=c.t + 0.12, kind="peak")   # starts at the cue, peaks 120 ms later


@sfx("sparkle-up")
def sparkle_up(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    nn = 12
    run = th.scale_run(th.G_PENTA_PCS, note("G5"), nn)          # G pentatonic: every glint is a G-chord tone or consonant extension
    u = (np.arange(nn) + c.rng.uniform(-0.25, 0.25, nn)) / (nn - 1)
    times = np.clip(dur * 0.92 * np.clip(u, 0, 1) ** 0.8, 0, dur * 0.92)
    amps = 0.30 + 0.70 * np.linspace(0, 1, nn) ** 1.2
    cv = Canvas(dur + 0.6)
    _glints(c.rng, cv, times, run, amps, tau=0.08, bright=1.0, max_len=0.55)
    # closing ping: octave pair at the very end (lands as riser-b begins)
    end = sy.glass(float(mtof(run[-1])), 0.6, tau=0.2, bright=1.0, attack_ms=1.0, rng=c.rng)
    cv.add(end, dur * 0.97, 0.55, 0.0)
    return Shot(finish(cv.y, LEVEL["sparkle-up"], 1.5, 40.0), 0, notes=[(float(t), m) for t, m in zip(times, run)])


@sfx("riser-b")
def riser_b(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    tail = 1.7
    n = secs(tail)
    chans = []
    for _ in range(2):
        nz = c.rng.standard_normal(n)
        cym = dsp.hp(nz, 1400, 2) + 0.9 * dsp.bp(nz, 2400, 7500, 2)
        chans.append(dsp.lp(cym, 9500, 2))
    cym = np.stack(chans, axis=1) * dsp.attack_decay(n, 2.0, 0.46)[:, None]
    full = cym
    # reverse the first `dur` seconds of the decay (-> a swell that peaks on the final sample)
    rev = full[:secs(dur)][::-1].copy()
    m = len(rev)
    # let the filter open while it grows
    fc = dsp.smooth_curve([(0, 900), (dur, 3200)], m, kind="exp")
    rev = dsp.sweep(rev, "hp", fc, 0.8)
    low = dsp.sweep(c.rng.standard_normal(m), "bp", dsp.smooth_curve([(0, 300), (dur, 2400)], m, kind="exp"), 1.2)
    ug = (np.arange(m) / m) ** 2.0
    y = rev * 1.0 + dsp.stereo(low) * 0.5 * ug[:, None]
    y = finish(y, LEVEL["riser-b"], fade_in_ms=12.0, fade_out_ms=3.0)
    return Shot(y, m, target=c.t + dur, kind="end")


@sfx("logo-hit")
def logo_hit(c: Ctx) -> Shot:
    glass_notes = [(note("C5"), 0.0, 1.0), (note("G5"), -0.35, 0.85), (note("E6"), 0.35, 0.7), (note("C6"), 0.0, 0.6)]
    cv = impact(c.rng, 4.6, note("C2"), size=1.0, sub_tau=0.55, glass_notes=glass_notes, glass_tau=1.1, air=0.10, air_tau=0.9)
    body = [(note("C4"), 0.60, -0.1), (note("G4"), 0.46, 0.12), (note("E4"), 0.36, 0.0)]       # the chord's low-mid body: a phone speaker keeps it
    for m, lv, p in body:
        cv.add(sy.glass(float(mtof(m)), 4.6, tau=1.0, bright=0.6, attack_ms=6.0, rng=c.rng), 0, lv * 0.6, p)
    return Shot(finish(cv.y, LEVEL["logo-hit"], 1.5, 80.0), 0, notes=[(0, m) for m, _, _ in glass_notes] + [(0, note("C2"))] + [(0, m) for m, _, _ in body], strict=True)


@sfx("shimmer")
def shimmer(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    L = dur + 0.5
    n = secs(L)
    t = np.arange(n) / SR
    chord = c.chord
    base = th.chord_midi(chord, 6)               # C6 E6 G6 ...
    notes = base + [m + 12 for m in base]        # + octave above
    y = np.zeros((n, 2))
    for i, m in enumerate(notes):
        f = float(mtof(m))
        rate = c.rng.uniform(3.0, 8.0)
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + c.rng.uniform(0, 6.28))
        s = np.sin(2 * np.pi * f * t + c.rng.uniform(0, 6.28)) * (0.35 + 0.65 * lfo)
        y += dsp.pan(s, (-1) ** i * c.rng.uniform(0.25, 0.7)) * (1.0 / (1 + 0.15 * i))
    glitter = dsp.hp(c.rng.standard_normal((n, 2)), 6500, 2) * 0.03
    y += glitter
    env = sy.bump(n, 0.38 * dur, pow_up=1.4, pow_down=1.2)
    y *= env[:, None]
    return Shot(finish(y, LEVEL["shimmer"], 20.0, 60.0), 0, kind="swell", notes=[(0, m) for m in notes], strict=True)


@sfx("tagline-air")
def tagline_air(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    nz = c.rng.standard_normal((n, 2))
    y = dsp.bp(nz, 2600, 9500, 2)
    y = dsp.sweep(y, "lp", dsp.smooth_curve([(0, 5200), (dur, 8200)], n), 0.7)
    y *= sy.bump(n, 0.42 * dur, pow_up=1.3, pow_down=1.1)[:, None]
    return Shot(finish(y, LEVEL["tagline-air"], 20.0, 40.0), 0, kind="swell")


@sfx("whoosh-up")
def whoosh_up(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 250), (dur, 3800)], n, kind="exp")
    peak = 0.65 * dur
    env = sy.bump(n, peak, pow_up=1.6, pow_down=1.0)
    y = sy.noise_whoosh(c.rng, dur, f, 1.4, env, width=0.9, lp_hz=8000, hp_hz=180)
    # soft tonal body that rises with the iPad (G3 -> D4, stays consonant over the G chord)
    fb = dsp.smooth_curve([(0, 196.0), (dur, 293.7)], n, kind="exp")
    body = np.sin(dsp.phase_of(fb)) * env * 0.22
    y = y + dsp.stereo(body)
    return Shot(finish(y, LEVEL["whoosh-up"], 3.0, 20.0), secs(peak), target=c.t + peak, kind="peak")


@sfx("caption-pop")
def caption_pop(c: Ctx) -> Shot:
    m = th.nearest_tone(c.chord, note("G6"))
    g = sy.glass(float(mtof(m)), 0.16, tau=0.03, bright=0.6, glide=0.04, glide_tau=0.005, attack_ms=1.2, rng=c.rng)
    air = sy.bp_noise(c.rng, 0.02, 4500, 9500, 0.004, attack_ms=1.0) * 0.12
    cv = Canvas(0.18)
    cv.add(g, 0, 1.0, c.rng.uniform(-0.2, 0.2)).add(air, 0, 1.0, 0.0)
    return Shot(finish(cv.y, LEVEL["caption-pop"]), 0, notes=[(0, m)], strict=True)


@sfx("device-settle")
def device_settle(c: Ctx) -> Shot:
    """Soft low thump as the iPad lands: a G3 body (audible on a phone via its saturation harmonics) over a G2 thud and a soft puff."""
    m3 = th.nearest_tone(c.chord, note("G3"))
    f3 = float(mtof(m3))
    body = sy.thump(f3, 0.4, drop=0.40, drop_tau=0.025, tau=0.12, drive=2.2, attack_ms=2.0)
    thud = sy.thump(f3 / 2, 0.5, drop=0.40, drop_tau=0.03, tau=0.14, drive=1.8, attack_ms=2.5)
    knock = sy.thump(f3 * 2, 0.2, drop=0.3, drop_tau=0.015, tau=0.05, drive=1.6, attack_ms=1.2)
    puff = dsp.lp(c.rng.standard_normal(secs(0.1)), 1800, 2) * dsp.attack_decay(secs(0.1), 2.0, 0.03)
    cv = Canvas(0.55)
    knock3 = sy.thump(f3 * 3, 0.14, drop=0.25, drop_tau=0.012, tau=0.035, drive=1.6, attack_ms=1.0)
    cv.add(body, 0, 1.0).add(thud, 0, 0.65).add(knock, 0, 0.75).add(knock3, 0, 0.35).add(puff, 0, 0.35)
    return Shot(finish(cv.y, LEVEL["device-settle"]), 0, notes=[(0, m3), (0, m3 - 12)], strict=True)


# =========================================================================================== iPAD FLOW
@sfx("tap")
def tap(c: Ctx) -> Shot:
    f = 255.0 * (1.0 + c.rng.uniform(-0.05, 0.05))
    body = sy.thump(f, 0.14, drop=0.5, drop_tau=0.008, tau=0.030, drive=1.8, attack_ms=0.9)       # the 'thock' (harmonics 500-1000 Hz)
    n = secs(0.06)
    res = dsp.sine(f * 3.3, n) * dsp.attack_decay(n, 0.7, 0.016)                                   # glass resonance
    res2 = dsp.sine(f * 6.8, n) * dsp.attack_decay(n, 0.6, 0.008)
    low = dsp.sine(f * 0.5, secs(0.14)) * dsp.attack_decay(secs(0.14), 1.5, 0.035)
    click = sy.bp_noise(c.rng, 0.014, 2800, 7500, 0.002, attack_ms=0.6)
    cv = Canvas(0.16)
    cv.add(body, 0, 1.0).add(res, 0, 0.45).add(res2, 0, 0.28).add(low, 0, 0.18).add(click, 0, 0.42)
    return Shot(finish(cv.y, LEVEL["tap"], 1.0, 8.0), 0)


@sfx("page-swoosh")
def page_swoosh(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 700), (dur, 2600)], n, kind="exp")
    env = sy.bump(n, 0.3 * dur, pow_up=1.3, pow_down=1.2)
    pan_c = np.linspace(-0.35, 0.35, n)
    y = sy.noise_whoosh(c.rng, dur, f, 1.0, env, width=0.5, lp_hz=6500, hp_hz=300, pan_curve=pan_c)
    return Shot(finish(y, LEVEL["page-swoosh"], 4.0, 25.0), secs(0.3 * dur), target=c.t + 0.3 * dur, kind="peak")


def _bubble(freq: float, dur: float, rise: float = 0.35, rise_tau: float = 0.012, tau: float = 0.09,
            attack_ms: float = 2.0, rng=None) -> np.ndarray:
    """Soft 'pop': sine that glides UP into pitch (a bubble opening) with a glass overtone."""
    n = secs(dur)
    t = np.arange(n) / SR
    f = freq * (1.0 - rise * np.exp(-t / rise_tau))
    y = np.sin(dsp.phase_of(f)) * dsp.attack_decay(n, attack_ms, tau)
    y += 0.25 * np.sin(2.756 * dsp.phase_of(f)) * dsp.attack_decay(n, attack_ms, tau * 0.35)
    return y


@sfx("callout-in")
def callout_in(c: Ctx) -> Shot:
    m = th.nearest_tone(c.chord, note("E5"))
    pop = _bubble(float(mtof(m)), 0.22, rise=0.30, rise_tau=0.012, tau=0.07, rng=c.rng)
    air = sy.bp_noise(c.rng, 0.03, 3500, 9000, 0.006, attack_ms=1.0) * 0.14
    cv = Canvas(0.24)
    cv.add(pop, 0, 1.0, 0.0).add(air, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["callout-in"]), 0, notes=[(0, m)], strict=True)


@sfx("chip-tick")
def chip_tick(c: Ctx) -> Shot:
    step, of = c.ev.get("step", 0), c.ev.get("of", 5)
    run = th.penta_run(note("C5"), of)
    m = run[min(step, len(run) - 1)]
    last = step == of - 1
    g = sy.glass(float(mtof(m)), 0.42 if last else 0.28, tau=0.11 if last else 0.06, bright=0.85, glide=0.03, glide_tau=0.005,
                 attack_ms=1.0, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.01, 4000, 9000, 0.0015, attack_ms=0.7) * 0.18
    cv = Canvas(0.45)
    p = float(c.ev["pan"]) if "pan" in c.ev else c.rng.uniform(-0.15, 0.15)
    cv.add(g, 0, 1.0, p).add(tick, 0, 1.0, p)
    return Shot(finish(cv.y, LEVEL["chip-tick"] + (1.5 if last else 0.0)), 0, notes=[(0, m)])


@sfx("key")
def key(c: Ctx) -> Shot:
    """Soft keyboard tick: a rounded 'tok' (0.7-1.1 kHz), a 2-3 kHz tick and a 2.5-9 kHz click; hardly any low end,
    so it stays clear of the bass/pad while the groove keeps running underneath."""
    f_tick = c.rng.uniform(2300, 3500)
    f_body = c.rng.uniform(700, 1000)
    n = secs(0.05)
    tick = dsp.sine(f_tick, n) * dsp.attack_decay(n, 0.8, 0.0065)
    tick2 = dsp.sine(f_tick * 1.5, n) * dsp.attack_decay(n, 0.8, 0.004)
    body = sy.thump(f_body, 0.05, drop=0.2, drop_tau=0.004, tau=0.006, drive=1.0, attack_ms=0.8)
    click = sy.bp_noise(c.rng, 0.014, 2500, 9000, 0.0022, attack_ms=0.7)
    thud = sy.thump(c.rng.uniform(190, 250), 0.04, drop=0.2, drop_tau=0.004, tau=0.008, drive=1.0, attack_ms=0.9)
    cv = Canvas(0.052)
    cv.add(tick, 0, 0.85).add(tick2, 0, 0.30).add(body, 0, 0.25).add(click, 0, 0.75).add(thud, 0, 0.10)
    cv.y *= c.rng.uniform(0.82, 1.0)
    cv.y = dsp.pan(mono(cv.y), c.rng.uniform(-0.14, 0.14))
    return Shot(finish(cv.y, LEVEL["key"] + c.rng.uniform(-1.6, 1.0), 1.0, 5.0), 0)


@sfx("check-tick")
def check_tick(c: Ctx) -> Shot:
    """A tick that closes a box. Several in a row (the consent ticks on the leads) climb the chord: G6, B6, D7."""
    step = int(c.ev.get("step", 0))
    m = th.nearest_tone(c.chord, [note("G6"), note("B6"), note("D7")][min(step, 2)], allow_ext=True)
    g = sy.glass(float(mtof(m)), 0.3, tau=0.06, bright=0.8, glide=0.03, glide_tau=0.006, attack_ms=1.0, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.012, 3800, 9000, 0.0018, attack_ms=0.7) * 0.35
    cv = Canvas(0.32)
    cv.add(g, 0, 1.0).add(tick, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["check-tick"]), 0, notes=[(0, m)], strict=True)


@sfx("lock-click")
def lock_click(c: Ctx) -> Shot:
    base = [2350.0, 2480.0, 2300.0][c.nth % 3] * c.rng.uniform(0.985, 1.015)
    n1 = secs(0.09)
    ping = dsp.additive(base, [1, 1.62, 2.31, 3.4], [1, 0.6, 0.35, 0.2], [0.014, 0.010, 0.007, 0.004], n1)
    snap = sy.bp_noise(c.rng, 0.02, 1500, 6500, 0.0035, attack_ms=0.6)
    clack = sy.thump(430.0, 0.09, drop=0.3, drop_tau=0.006, tau=0.02, drive=1.2, attack_ms=0.8)
    clack_n = sy.bp_noise(c.rng, 0.03, 900, 3200, 0.006, attack_ms=0.8)
    cv = Canvas(0.2)
    cv.add(ping, 0, 0.8).add(snap, 0, 0.55)                       # the shackle meets the latch (accent)
    cv.add(clack, 0.042, 0.55).add(clack_n, 0.042, 0.45)           # the body settles
    cv.add(ping * 0.18, 0.075, 1.0)                                # tiny rattle
    return Shot(finish(cv.y, LEVEL["lock-click"], 0.8, 12.0), 0)


@sfx("confirm")
def confirm(c: Ctx) -> Shot:
    m1, m2 = th.nearest_tone(c.chord, note("C5")), th.nearest_tone(c.chord, note("G5"))
    # a short ring-out (0.45 s): the tutorial's NO and YES demonstrations follow within half a second and must not be sung over
    g1 = sy.glass(float(mtof(m1)), 0.35, tau=0.10, bright=0.9, glide=0.02, glide_tau=0.006, attack_ms=1.5, rng=c.rng)
    g2 = sy.glass(float(mtof(m2)), 0.55, tau=0.16, bright=1.0, glide=0.02, glide_tau=0.006, attack_ms=1.5, rng=c.rng)
    cv = Canvas(0.7)
    cv.add(g1, 0, 0.75, -0.1).add(g2, 0.09, 1.0, 0.1)
    return Shot(finish(cv.y, LEVEL["confirm"]), 0, notes=[(0, m1), (0.09, m2)], strict=True)


@sfx("card-in")
def card_in(c: Ctx) -> Shot:
    step = c.ev.get("step", 0)
    m = th.nearest_tone(c.chord, note("D5") + step % 4, allow_ext=False)
    pop = _bubble(float(mtof(m)), 0.16, rise=0.22, rise_tau=0.010, tau=0.045, rng=c.rng)
    air = sy.bp_noise(c.rng, 0.02, 2500, 7000, 0.005, attack_ms=1.0) * 0.18
    cv = Canvas(0.18)
    cv.add(pop, 0, 1.0, 0.0).add(air, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["card-in"]), 0, notes=[(0, m)], strict=True)


def _swipe(c: Ctx, yes: bool) -> Shot:
    """A swipe is a short tuned phrase, so the eight cards play a line and the decision can be heard with eyes closed: YES rises and opens
    (two glass notes and a breath of air going up) and sits on the right; NO falls and closes (two muted plucks and a soft sigh) and sits
    on the left. Under it a quiet band of noise is the card itself moving. Both are tuned to the chord of the bar."""
    ev = c.ev
    dur = float(ev["dur"])
    accent_t = float(ev.get("accent", ev["t"] + 0.12))
    lead = max(0.04, accent_t - c.t)
    chord = c.harm.at(accent_t + 1e-4)
    side = float(ev.get("pan", 0.55 if yes else -0.55))
    n = secs(dur)
    if yes:
        f = dsp.smooth_curve([(0, 800), (dur, 4800)], n, kind="exp")
        q, lp_hz, hp_hz = 1.1, 8000, 400
    else:
        f = dsp.smooth_curve([(0, 2200), (dur, 500)], n, kind="exp")
        q, lp_hz, hp_hz = 0.9, 4200, 200
    env = sy.bump(n, lead, pow_up=1.0, pow_down=1.4)
    pan_c = side * np.clip(np.arange(n) / SR / dur, 0, 1) ** 0.8
    body = sy.noise_whoosh(c.rng, dur, f, q, env, width=0.45, lp_hz=lp_hz, hp_hz=hp_hz, pan_curve=pan_c)
    cv = Canvas(dur + 0.9)
    cv.add(body, 0, 0.30)
    if yes:
        m1 = th.nearest_tone(chord, note("G5"), allow_ext=True)
        m2 = th.nearest_tone(chord, m1 + 4, allow_ext=True)
        if m2 <= m1:
            m2 = th.nearest_tone(chord, m1 + 7, allow_ext=True)
        g1 = sy.glass(float(mtof(m1)), 0.35, tau=0.075, bright=1.0, glide=0.02, glide_tau=0.006, attack_ms=0.9, rng=c.rng)
        g2 = sy.glass(float(mtof(m2)), 0.70, tau=0.16, bright=1.1, glide=0.02, glide_tau=0.006, attack_ms=0.9, rng=c.rng)
        phrase = Canvas(1.0)
        phrase.add(g1, 0, 0.85).add(g2, 0.075, 1.0)
        air = dsp.hp(c.rng.standard_normal((secs(0.25), 2)), 5000, 2) * sy.bump(secs(0.25), 0.12, 1.2, 1.4)[:, None] * 0.05
        cv.add(mono(phrase.y), lead, 1.0, side).add(air, lead, 1.0)
        notes = [(0.0, m1), (0.075, m2)]
    else:
        m1 = th.nearest_tone(chord, note("E4"), allow_ext=True)
        m2 = th.nearest_tone(chord, m1 - 3, allow_ext=True)
        if m2 >= m1:
            m2 = th.nearest_tone(chord, m1 - 7, allow_ext=True)
        p1 = sy.harmonic_pluck(float(mtof(m1)), 0.25, tau=0.07, n_partials=6, tilt=1.4, damp=1.2, attack_ms=1.2, max_hz=3500, rng=c.rng)
        p2 = sy.harmonic_pluck(float(mtof(m2)), 0.35, tau=0.10, n_partials=6, tilt=1.4, damp=1.2, attack_ms=1.2, max_hz=3500, rng=c.rng)
        thud = sy.thump(float(mtof(m2)), 0.12, drop=0.3, drop_tau=0.012, tau=0.03, drive=1.4, attack_ms=1.0)
        close = dsp.lp(c.rng.standard_normal(secs(0.14)), 1500, 2) * sy.bump(secs(0.14), 0.04, 1.0, 1.8)
        phrase = Canvas(0.6)
        phrase.add(p1, 0, 0.9).add(p2, 0.07, 1.0).add(thud, 0.07, 0.35)
        cv.add(mono(phrase.y), lead, 1.0, side).add(close, lead + 0.04, 0.18, side * 0.6)
        notes = [(0.0, m1), (0.07, m2)]
    name = "swipe-yes" if yes else "swipe-no"
    return Shot(finish(cv.y, LEVEL[name], 2.5, 25.0), secs(lead), target=accent_t, notes=notes, kind="onset")


@sfx("swipe-yes")
def swipe_yes(c: Ctx) -> Shot:
    return _swipe(c, True)


@sfx("swipe-no")
def swipe_no(c: Ctx) -> Shot:
    return _swipe(c, False)


@sfx("reveal-whoosh")
def reveal_whoosh(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    t = np.arange(n) / SR
    f = np.where(t < 0.3, 1300 * (6500 / 1300) ** (t / 0.3), 6500 * (1500 / 6500) ** ((t - 0.3) / (dur - 0.3)))
    env = sy.bump(n, 0.06, pow_up=0.8, pow_down=1.6)
    y = sy.noise_whoosh(c.rng, dur, f, 0.9, env, width=0.8, lp_hz=8500, hp_hz=400)
    # rising glass glide G5 -> G6 (the 'flash' has a pitch), plus a soft low whump so it is felt on a phone
    fg = dsp.smooth_curve([(0, 784.0), (0.5, 1568.0), (dur, 1568.0)], n, kind="exp")
    glide = (np.sin(dsp.phase_of(fg)) + 0.3 * np.sin(2.756 * dsp.phase_of(fg)) * 0.5) * sy.bump(n, 0.2, 1.0, 1.4)
    whump = sy.thump(196.0, 0.5, drop=0.4, drop_tau=0.03, tau=0.18, drive=1.6, attack_ms=3.0)
    cv = Canvas(dur)
    cv.add(y, 0, 1.0).add(glide * 0.28, 0, 1.0, 0.0).add(whump, 0, 0.45)
    return Shot(finish(cv.y, LEVEL["reveal-whoosh"], 3.0, 25.0), secs(0.06), target=c.t + 0.06, kind="peak",
                notes=[(0.0, note("G5")), (0.5, note("G6"))])


@sfx("riser-count")
def riser_count(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    gap = 0.15                                  # the 'air' gap: body cuts, only a faint inhale keeps rising to the hit
    n = secs(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 196.0 * 4.0 ** (u ** 1.5)               # G3 -> G5 (chord G)
    rate = 7.0 + 19.0 * u
    am = 1.0 - 0.35 * (0.5 + 0.5 * np.sin(dsp.phase_of(rate)))
    tonal = (np.sin(dsp.phase_of(f)) + 0.5 * np.sin(dsp.phase_of(f * 2)) + 0.25 * np.sin(dsp.phase_of(f * 3))) / 1.75
    nz = np.stack([dsp.sweep(c.rng.standard_normal(n), "bp", dsp.smooth_curve([(0, 400), (dur, 9000)], n, kind="exp"), 1.6),
                   dsp.sweep(c.rng.standard_normal(n), "bp", dsp.smooth_curve([(0, 430), (dur, 9500)], n, kind="exp"), 1.6)], axis=1)
    g_i = secs(dur - gap)
    env = u ** 2.3
    env = env / env[g_i - 1]
    body = (dsp.stereo(tonal * am) * 0.7 + nz * 0.5) * env[:, None]
    body[g_i:] = 0.0
    # the inhale inside the gap: filtered air + the top note, faint, still rising
    k = n - g_i
    ug = np.linspace(0, 1, k)
    air = dsp.hp(c.rng.standard_normal((k, 2)), 6500, 2) * (0.06 * ug ** 1.5)[:, None]
    top = np.sin(dsp.phase_of(f[g_i:])) * 0.05 * ug ** 2
    tail = air + dsp.stereo(top)
    body[g_i:] += tail
    y = finish(body, LEVEL["riser-count"], 80.0, 2.5)
    return Shot(y, g_i, target=c.t + dur - gap, kind="end", notes=[(dur, note("G5"))])


@sfx("count-tick")
def count_tick(c: Ctx) -> Shot:
    step, of = c.ev.get("step", 0), c.ev.get("of", 13)
    out = th.scale_run(th.G_PENTA_PCS, note("G4"), of)            # G A B D E ascending: ends on B6 -> resolves up to the C7 chime
    mm = out[min(step, of - 1)]
    vel = 0.62 + 0.38 * (step / max(of - 1, 1)) ** 0.9
    g = sy.glass(float(mtof(mm)), 0.10, tau=0.024, bright=0.7, attack_ms=0.8, rng=c.rng)
    click = sy.bp_noise(c.rng, 0.008, 3500, 9500, 0.0013, attack_ms=0.6) * 0.45
    cv = Canvas(0.11)
    cv.add(g, 0, 1.0, c.rng.uniform(-0.1, 0.1)).add(click, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["count-tick"] + dsp.lin2db(vel), 0.8, 5.0), 0, notes=[(0, mm)])


@sfx("counter-hit")
def counter_hit(c: Ctx) -> Shot:
    """The 98 % bloom (direction A: the first, smaller peak): a bright C glass chord that opens (soft attack), a sub swell, a low-mid body
    so a phone speaker carries the chord, and a few top glints. No confetti, no drop."""
    glass_notes = [(note("C5"), 0.0, 0.9), (note("E5"), -0.3, 0.8), (note("G5"), 0.3, 0.8), (note("C6"), -0.15, 0.7), (note("E6"), 0.25, 0.5)]
    L = 5.0
    cv = impact(c.rng, L, note("C2"), size=0.80, sub_tau=0.75, glass_notes=glass_notes, glass_tau=1.6, air=0.10, air_tau=1.2,
                chime_midi=note("C7"), glass_attack_ms=16.0, click=0.25)
    for m, lv, p in ((note("C4"), 0.55, -0.1), (note("G4"), 0.42, 0.12), (note("E4"), 0.34, 0.0)):
        cv.add(sy.glass(float(mtof(m)), L, tau=1.1, bright=0.6, attack_ms=12.0, rng=c.rng), 0, lv * 0.55, p)
    k = 9
    u = (np.arange(k) + c.rng.uniform(0, 0.8, k)) / k
    times = 0.05 + 0.9 * u ** 1.4
    pool = [m for m in th.penta_run(note("C6"), 12) if m <= note("G7")][3:]
    midis = [pool[int(c.rng.integers(0, len(pool)))] for _ in range(k)]
    _glints(c.rng, cv, times, midis, 0.30 * (1 - u) ** 1.3 + 0.05, tau=0.10, bright=1.0, max_len=0.7)
    return Shot(finish(cv.y, LEVEL["counter-hit"], 1.5, 100.0), 0,
                notes=[(0, m) for m, _, _ in glass_notes] + [(0, note("C7")), (0, note("C2")), (0, note("C4")), (0, note("G4")), (0, note("E4"))], strict=True)


@sfx("confetti-pop")
def confetti_pop(c: Ctx) -> Shot:
    pop = sy.bp_noise(c.rng, 0.05, 900, 4200, 0.011, attack_ms=0.9)
    whump = sy.thump(220.0, 0.2, drop=0.4, drop_tau=0.015, tau=0.05, drive=1.6, attack_ms=1.2)
    cv = Canvas(1.0)
    cv.add(pop, 0, 0.8, -0.15).add(whump, 0, 0.5)
    wide = bool(c.ev.get("wide"))
    k = 14 if wide else 24
    u = (np.arange(k) + c.rng.uniform(0, 0.9, k)) / k
    times = 0.04 + 0.7 * u ** 1.3
    pool = [m for m in th.penta_run(note("C6"), 12) if m <= note("G7")][3:]
    midis = [pool[int(c.rng.integers(0, len(pool)))] for _ in range(k)]
    amps = 0.5 * (1 - u) ** 1.2 + 0.08
    _glints(c.rng, cv, times, midis, amps, tau=0.035, bright=0.7, pan_spread=0.95 if wide else 0.9, max_len=0.3)
    # a few confetti 'pat' ticks (tiny filtered noise grains)
    for i in range(18):
        tt = 0.02 + 0.8 * c.rng.random() ** 1.4
        grain = sy.bp_noise(c.rng, 0.012, 2500, 8000, 0.0025, attack_ms=0.6)
        cv.add(grain, tt, 0.16 * (1 - tt), c.rng.uniform(-0.9, 0.9))
    return Shot(finish(cv.y, LEVEL["confetti-pop"], 1.2, 80.0), 0)


@sfx("whoosh-pullback")
def whoosh_pullback(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 4500), (dur, 650)], n, kind="exp")
    env = sy.bump(n, 0.2, pow_up=1.0, pow_down=1.3)
    y = sy.noise_whoosh(c.rng, dur, f, 0.95, env, width=1.0, lp_hz=7500, hp_hz=200)
    return Shot(finish(y, LEVEL["whoosh-pullback"], 4.0, 25.0), secs(0.2), target=c.t + 0.2, kind="peak")


@sfx("success-chime")
def success_chime(c: Ctx) -> Shot:
    m1, m2 = th.nearest_tone(c.chord, note("D6")), th.nearest_tone(c.chord, note("G6"))
    g1 = sy.glass(float(mtof(m1)), 0.8, tau=0.22, bright=1.0, glide=0.02, glide_tau=0.008, attack_ms=1.5, rng=c.rng)
    g2 = sy.glass(float(mtof(m2)), 1.8, tau=0.65, bright=1.1, glide=0.02, glide_tau=0.008, attack_ms=1.5, rng=c.rng)
    g3 = sy.glass(float(mtof(m2 - 12)), 1.5, tau=0.45, bright=0.8, attack_ms=2.0, rng=c.rng)
    cv = Canvas(2.0)
    cv.add(g1, 0, 0.8, -0.15).add(g2, 0.11, 1.0, 0.1).add(g3, 0.11, 0.35, 0.0)
    return Shot(finish(cv.y, LEVEL["success-chime"], 1.2, 60.0), 0, notes=[(0, m1), (0.11, m2), (0.11, m2 - 12)], strict=True)


@sfx("whoosh-swap")
def whoosh_swap(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    # iPad leaves to the left: falling sweep, early peak
    f1 = dsp.smooth_curve([(0, 3200), (dur, 480)], n, kind="exp")
    e1 = sy.bump(n, 0.14, pow_up=1.0, pow_down=1.6)
    y1 = sy.noise_whoosh(c.rng, dur, f1, 1.0, e1, width=0.3, lp_hz=7000, hp_hz=200, pan_curve=np.linspace(0.0, -0.9, n))
    # iPhone arrives from the right: rising sweep that decelerates, later peak
    f2 = dsp.smooth_curve([(0, 600), (dur * 0.6, 3300), (dur, 2400)], n, kind="exp")
    e2 = sy.bump(n, 0.52 * dur, pow_up=1.8, pow_down=1.2)
    y2 = sy.noise_whoosh(c.rng, dur, f2, 1.1, e2, width=0.3, lp_hz=8000, hp_hz=220, pan_curve=np.linspace(0.9, 0.05, n))
    y = y1 * 0.8 + y2 * 1.0
    return Shot(finish(y, LEVEL["whoosh-swap"], 4.0, 30.0), secs(0.42), target=c.t + 0.42, kind="peak")


@sfx("notif-ping")
def notif_ping(c: Ctx) -> Shot:
    m1, m2 = th.nearest_tone(c.chord, note("A5")), th.nearest_tone(c.chord, note("E6"))
    g1 = sy.glass(float(mtof(m1)), 0.9, tau=0.30, bright=1.2, glide=0.015, glide_tau=0.01, attack_ms=1.3, rng=c.rng)
    g2 = sy.glass(float(mtof(m2)), 1.5, tau=0.50, bright=1.3, glide=0.015, glide_tau=0.01, attack_ms=1.3, rng=c.rng)
    # slightly detuned twin of the second note -> glassy beating shimmer
    g2b = sy.glass(float(mtof(m2)) * 1.0035, 1.5, tau=0.42, bright=1.0, attack_ms=1.3, rng=c.rng)
    cv = Canvas(1.7)
    cv.add(g1, 0, 0.85, -0.12).add(g2, 0.12, 1.0, 0.1).add(g2b, 0.12, 0.35, 0.18)
    return Shot(finish(cv.y, LEVEL["notif-ping"], 1.2, 60.0), 0, notes=[(0, m1), (0.12, m2)], strict=True)


@sfx("swoosh-open")
def swoosh_open(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 500), (dur, 3600)], n, kind="exp")
    env = sy.bump(n, 0.7 * dur, pow_up=1.4, pow_down=1.4)
    y = sy.noise_whoosh(c.rng, dur, f, 1.2, env, width=0.7, lp_hz=6500, hp_hz=300)
    m = th.nearest_tone(c.chord, note("E6"))
    pop = _bubble(float(mtof(m)), 0.16, rise=0.2, rise_tau=0.01, tau=0.05, rng=c.rng)
    cv = Canvas(dur + 0.05)
    cv.add(y, 0, 1.0).add(pop, 0.7 * dur, 0.20, 0.0)
    return Shot(finish(cv.y, LEVEL["swoosh-open"], 4.0, 25.0), secs(0.7 * dur), target=c.t + 0.7 * dur, kind="peak",
                notes=[(0, m)])


@sfx("scroll-soft")
def scroll_soft(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    t = np.arange(n) / SR
    f = 1500.0 + 900.0 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    env = sy.bump(n, 0.45 * dur, pow_up=1.4, pow_down=1.3)
    grain = np.abs(dsp.lp(c.rng.standard_normal(n), 28, 2))
    grain = 0.55 + 0.45 * grain / (grain.max() + 1e-9)
    y = sy.noise_whoosh(c.rng, dur, f, 0.8, env * grain, width=0.6, lp_hz=5200, hp_hz=500)
    return Shot(finish(y, LEVEL["scroll-soft"], 30.0, 60.0), secs(0.45 * dur), target=c.t + 0.45 * dur, kind="peak")


@sfx("zoom-whoosh")
def zoom_whoosh(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 350), (dur, 5200)], n, kind="exp")
    env = sy.bump(n, 0.92 * dur, pow_up=1.8, pow_down=1.0)
    y = sy.noise_whoosh(c.rng, dur, f, 1.6, env, width=0.8, lp_hz=8500, hp_hz=200)
    fg = dsp.smooth_curve([(0, 392.0), (dur, 784.0)], n, kind="exp")     # G4 -> G5
    tone = np.sin(dsp.phase_of(fg)) * env * 0.16
    y = y + dsp.stereo(tone)
    return Shot(finish(y, LEVEL["zoom-whoosh"], 6.0, 20.0), secs(0.92 * dur), target=c.t + 0.92 * dur, kind="end",
                notes=[(dur, note("G5"))])


@sfx("code-ding")
def code_ding(c: Ctx) -> Shot:
    m = th.nearest_tone(c.chord, note("G6"))
    f = float(mtof(m))
    a = sy.glass(f, 2.6, tau=0.95, bright=1.3, glide=0.01, glide_tau=0.01, attack_ms=1.2, rng=c.rng)
    b = sy.glass(f * 1.0028, 2.6, tau=0.80, bright=1.0, attack_ms=1.2, rng=c.rng)
    low = sy.glass(f / 2, 2.2, tau=0.70, bright=0.8, attack_ms=2.0, rng=c.rng)
    top = sy.glass(float(mtof(m + 7)), 1.4, tau=0.40, bright=0.9, attack_ms=1.0, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.01, 4000, 10000, 0.0016, attack_ms=0.7) * 0.2
    cv = Canvas(2.7)
    cv.add(a, 0, 1.0, -0.05).add(b, 0, 0.45, 0.08).add(low, 0, 0.35, 0.0).add(top, 0, 0.16, 0.2).add(tick, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["code-ding"], 1.2, 80.0), 0, notes=[(0, m), (0, m - 12), (0, m + 7)], strict=True)


@sfx("whoosh-down")
def whoosh_down(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 4500), (dur, 450)], n, kind="exp")
    env = sy.bump(n, 0.12, pow_up=1.0, pow_down=1.3)
    y = sy.noise_whoosh(c.rng, dur, f, 1.0, env, width=0.8, lp_hz=7000, hp_hz=200)
    return Shot(finish(y, LEVEL["whoosh-down"], 3.0, 30.0), secs(0.12), target=c.t + 0.12, kind="peak")


# =========================================================================================== SYSTEM / END
@sfx("node-on")
def node_on(c: Ctx) -> Shot:
    step, of = c.ev.get("step", 0), c.ev.get("of", 5)
    base = th.chord_midi(c.chord, 4)
    seq = base + [m + 12 for m in base]                                  # Am: A4 C5 E5 A5 C6 E6
    m = seq[min(step, len(seq) - 1)]
    f = float(mtof(m))
    pl = sy.harmonic_pluck(f, 0.5, tau=0.16, n_partials=9, tilt=1.2, damp=1.0, attack_ms=2.5, rng=c.rng)
    gl = sy.glass(f, 0.4, tau=0.12, bright=0.8, glide=0.02, glide_tau=0.006, attack_ms=1.5, rng=c.rng)
    pan_v = -0.5 + 1.0 * step / max(of - 1, 1)
    cv = Canvas(0.52)
    cv.add(pl, 0, 0.8, pan_v * 0.6).add(gl, 0, 0.35, pan_v * 0.6)
    return Shot(finish(cv.y, LEVEL["node-on"]), 0, notes=[(0, m)], strict=True)


@sfx("packet")
def packet(c: Ctx) -> Shot:
    tones = th.chord_midi(c.chord, 6)            # chord tones in the 6th octave
    seq = tones + [m + 12 for m in tones]
    m = seq[min(c.nth, len(seq) - 1)]
    f1 = float(mtof(m))
    dur = 0.12
    n = secs(dur)
    t = np.arange(n) / SR
    f = f1 * (0.5 + 0.5 * (1 - np.exp(-t / 0.014)))
    y = np.sin(dsp.phase_of(f)) * dsp.attack_decay(n, 1.5, 0.045)
    zip_n = dsp.sweep(c.rng.standard_normal(n), "bp", dsp.smooth_curve([(0, 2500), (dur, 8000)], n, kind="exp"), 3.0)
    zip_n *= dsp.attack_decay(n, 1.0, 0.02)
    mix = y * 0.9 + zip_n * 0.25
    out = dsp.pan_curve(mix, np.linspace(-0.4, 0.4, n))
    return Shot(finish(out, LEVEL["packet"], 1.2, 12.0), 0, notes=[(0.03, m)], strict=True)


@sfx("tile-on")
def tile_on(c: Ctx) -> Shot:
    """Soft bloom per dashboard tile, rising A5 -> C6 -> F6; each note is the nearest tone of the chord of its own bar
    (the three tiles straddle the Am -> F change at 36.0)."""
    step = c.ev.get("step", 0)
    m = th.nearest_tone(c.chord, [note("A5"), note("C6"), note("F6")][min(step, 2)])
    f = float(mtof(m))
    gl = sy.glass(f, 0.8, tau=0.24, bright=0.9, glide=0.025, glide_tau=0.01, attack_ms=2.0, rng=c.rng)
    pl = sy.harmonic_pluck(f, 0.5, tau=0.12, n_partials=6, tilt=1.4, damp=1.2, attack_ms=3.0, rng=c.rng)
    cv = Canvas(0.85)
    cv.add(gl, 0, 0.8, (step - 1) * 0.3).add(pl, 0, 0.4, (step - 1) * 0.3)
    return Shot(finish(cv.y, LEVEL["tile-on"]), 0, notes=[(0, m)], strict=True)


@sfx("whoosh-in")
def whoosh_in(c: Ctx) -> Shot:
    """The system diagram is pushed back as the next photo fades in: a soft receding sweep (bright -> dark) that peaks right at the cue
    and has died away before the next sound (the bag rustle) starts."""
    dur = float(c.ev["dur"])
    n = secs(dur)
    peak = 0.16
    f = dsp.smooth_curve([(0, 4800), (dur, 650)], n, kind="exp")
    env = sy.bump(n, peak, pow_up=1.2, pow_down=2.1)
    width = np.linspace(0.9, 0.35, n)
    y = sy.noise_whoosh(c.rng, dur, f, 1.0, env, width=width, lp_hz=7500, hp_hz=200)
    return Shot(finish(y, LEVEL["whoosh-in"], 4.0, 25.0), secs(peak), target=c.t + peak, kind="peak")


@sfx("logo-hit-soft")
def logo_hit_soft(c: Ctx) -> Shot:
    """Secondary logo accent on top of the C chord that is already ringing: a soft low 'tuk', two glass notes (G5 + C6, the logo's
    colours) and a breath of air. No chord, no boom - the handshake already carried the weight."""
    L = 3.6
    m_lo = th.nearest_tone(c.chord, note("C3"))
    tuk = sy.thump(float(mtof(m_lo)), 0.4, drop=0.35, drop_tau=0.02, tau=0.12, drive=1.5, attack_ms=3.0)
    g5 = sy.glass(float(mtof(note("G5"))), L, tau=1.2, bright=0.8, attack_ms=4.0, rng=c.rng)
    c6 = sy.glass(float(mtof(note("C6"))), L, tau=1.5, bright=0.8, attack_ms=4.0, rng=c.rng)
    n = secs(L)
    air = dsp.hp(c.rng.standard_normal((n, 2)), 4000, 2) * dsp.attack_decay(n, 14, 0.8)[:, None]
    cv = Canvas(L)
    cv.add(g5, 0, 0.75, -0.2).add(c6, 0, 0.60, 0.2).add(tuk, 0, 0.45, 0.0)
    cv.y += air * 0.035
    return Shot(finish(cv.y, LEVEL["logo-hit-soft"], 2.0, 150.0), 0, notes=[(0, note("G5")), (0, note("C6")), (0, m_lo)], strict=True)


@sfx("chip-pop")
def chip_pop(c: Ctx) -> Shot:
    step, of = c.ev.get("step", 0), c.ev.get("of", 4)
    seq = [note("C5"), note("E5"), note("G5"), note("D6")]
    m = seq[min(step, len(seq) - 1)]
    f = float(mtof(m))
    pop = _bubble(f, 0.2, rise=0.12, rise_tau=0.008, tau=0.06, rng=c.rng)
    gl = sy.glass(f, 0.6, tau=0.14, bright=0.9, glide=0.0, attack_ms=1.5, rng=c.rng)
    cv = Canvas(0.62)
    cv.add(pop, 0, 0.5, -0.4 + 0.8 * step / max(of - 1, 1)).add(gl, 0, 0.9, -0.4 + 0.8 * step / max(of - 1, 1))
    return Shot(finish(cv.y, LEVEL["chip-pop"]), 0, notes=[(0, m)])


@sfx("sparkle")
def sparkle(c: Ctx) -> Shot:
    dur = float(c.ev["dur"])
    L = dur + 0.9
    k = 22
    u = (np.arange(k) + c.rng.uniform(0, 0.9, k)) / k
    u[0] = 0.0                                        # the first glint sits exactly on the cue
    times = dur * u ** 1.5
    pool = [m for m in th.penta_run(note("C6"), 20) if m % 12 in (0, 2, 4, 7) and m <= note("G7")][2:]
    midis = [pool[int(c.rng.integers(0, len(pool)))] for _ in range(k)]
    amps = 0.85 * (1 - u) ** 1.3 + 0.10
    cv = Canvas(L)
    _glints(c.rng, cv, times, midis, amps, tau=0.14, bright=1.0, max_len=1.0)
    bloom = sy.glass(float(mtof(note("G6"))), L, tau=0.7, bright=0.5, attack_ms=30.0, rng=c.rng)
    cv.add(bloom, 0, 0.12, 0.0)
    return Shot(finish(cv.y, LEVEL["sparkle"], 1.5, 120.0), 0, notes=[(float(t), m) for t, m in zip(times, midis)])


# =========================================================================================== CLOSING SCENES (hand-off photos)
@sfx("screen-wake")
def screen_wake(c: Ctx) -> Shot:
    """The kiosk screen lights up on the photographed tablet: a soft, rising two-note glass chime (E5 -> G5; chord tones of the C and
    G bars it straddles) with a breath of light on top - much rounder and quieter than the logo hit."""
    gap = 0.11
    m1 = th.nearest_tone(c.chord, note("E5"))
    m2 = th.nearest_tone(c.chord_at(c.t + gap + 1e-4), note("G5"))
    f1, f2 = float(mtof(m1)), float(mtof(m2))
    g1 = sy.glass(f1, 0.9, tau=0.14, bright=0.75, glide=0.012, glide_tau=0.010, attack_ms=3.0, rng=c.rng)
    g2 = sy.glass(f2, 1.4, tau=0.30, bright=0.80, glide=0.012, glide_tau=0.010, attack_ms=3.0, rng=c.rng)
    halo = sy.glass(f2 * 2.0, 0.9, tau=0.15, bright=0.5, attack_ms=8.0, rng=c.rng)
    dur = float(c.ev.get("dur", 0.6))
    n_air = secs(dur)
    air = dsp.bp(c.rng.standard_normal((n_air, 2)), 3200, 8500, 2) * sy.bump(n_air, 0.55 * dur, 1.5, 1.2)[:, None] * 0.04
    cv = Canvas(1.6)
    cv.add(g1, 0, 0.80, -0.12).add(g2, gap, 1.0, 0.12).add(halo, gap, 0.20, 0.25).add(air, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["screen-wake"], 2.0, 70.0), 0, notes=[(0, m1), (gap, m2), (gap, m2 + 12)], strict=True)


@sfx("bag-rustle")
def bag_rustle(c: Ctx) -> Shot:
    """A close, dry paper-shopping-bag hand-off: the grab (a crunch of paper), settling crinkles, a rope-handle creak and a low warm
    thump when the bag lands in the other hand. Pure noise (no musical pitch), band-limited to 190 Hz - 6.5 kHz.

    The crinkle is a sparse random train of micro-bursts (the density follows the gesture) convolved with two short decaying-noise
    kernels; the creak is a stick-slip pulse train through a swept resonant band-pass; the thump is band-passed noise."""
    rng = c.rng
    dur = float(c.ev.get("dur", 0.5))
    L = dur + 0.18
    n = secs(L)
    t = np.arange(n) / SR

    def blob(t0, w, a):
        return a * np.exp(-0.5 * ((t - t0) / w) ** 2)

    g = 0.05 + np.exp(-t / 0.04) + blob(0.17, 0.04, 0.70) + blob(0.30, 0.05, 0.55) + blob(0.43, 0.04, 0.30)   # grab, then three settling handfuls
    g *= np.clip(1.0 - np.maximum(t - dur, 0.0) / 0.18, 0.0, 1.0)

    k_len = dsp.ms(4.0)
    kernels = []
    for scale in (0.6e-3, 1.2e-3):
        kk = rng.standard_normal(k_len) * np.exp(-np.arange(k_len) / (SR * scale))
        kernels.append(kk / np.sqrt(np.sum(kk ** 2)))

    def crinkle(rate: float) -> np.ndarray:
        idx = np.flatnonzero(rng.random(n) < rate * g / SR)
        imp = np.zeros(n)
        imp[idx] = np.exp(rng.normal(-0.2, 0.85, len(idx))) * np.sqrt(g[idx]) * rng.choice([-1.0, 1.0], len(idx))
        imp[dsp.ms(0.6)] = 1.6                                  # the first crunch: a definite onset at the cue
        pick = rng.random(n) < 0.5
        out = np.zeros(n)
        for sel, kern in ((pick, kernels[0]), (~pick, kernels[1])):
            out += signal.fftconvolve(imp * sel, kern)[:n]
        return out

    crk = dsp.bp(np.stack([crinkle(1300.0), crinkle(1300.0)], axis=1), 1500, 6200, 2)
    crk /= np.max(np.abs(crk)) + 1e-12

    wob = dsp.lp(rng.standard_normal(n), 25, 2)
    wob = 0.6 + 0.4 * (wob - wob.min()) / (np.ptp(wob) + 1e-12)
    body = dsp.bp(rng.standard_normal(n), 280, 1300, 2) * g ** 1.3 * wob
    body /= np.max(np.abs(body)) + 1e-12

    pulses = np.zeros(n)
    pos = secs(0.10)
    while pos < secs(0.33):
        pulses[pos] = rng.uniform(0.4, 1.0)
        pos += int(SR * rng.uniform(0.006, 0.016))
    creak = dsp.sweep(pulses, "bp", dsp.smooth_curve([(0.10, 700.0), (0.33, 1150.0)], n, kind="exp"), 3.5)
    creak *= np.sin(np.pi * np.clip((t - 0.10) / 0.23, 0.0, 1.0)) ** 1.5
    creak /= np.max(np.abs(creak)) + 1e-12

    cv = Canvas(L)
    cv.add(crk, 0, 0.85).add(dsp.stereo(body), 0, 0.14).add(dsp.stereo(creak), 0, 0.22)
    th_n = secs(0.12)
    thump_b = dsp.bp(rng.standard_normal(th_n), 190, 520, 2) * dsp.attack_decay(th_n, 1.5, 0.032)
    slap = sy.bp_noise(rng, 0.03, 700, 2200, 0.008, attack_ms=0.8)
    cv.add(thump_b / (np.max(np.abs(thump_b)) + 1e-12), 0.004, 0.45).add(slap / (np.max(np.abs(slap)) + 1e-12), 0.004, 0.22)
    y = dsp.lp(dsp.hp(cv.y, 190, 2), 6500, 4)
    return Shot(finish(y, LEVEL["bag-rustle"], 1.0, 30.0), 0, kind="onset")


@sfx("redeem-ding")
def redeem_ding(c: Ctx) -> Shot:
    """'Code redeemed' chip: a bright, quick two-note glass ding, third -> fifth of the G chord (B5 -> D6) with a short tail - it is
    a rising minor third (notif-ping is a rising fifth, code-ding a single long G6 bell), plucked and sheened by a high octave."""
    gap = 0.085
    m1 = th.nearest_tone(c.chord, note("B5"))
    m2 = th.nearest_tone(c.chord_at(c.t + gap + 1e-4), note("D6"))
    f1, f2 = float(mtof(m1)), float(mtof(m2))
    g1 = sy.glass(f1, 0.55, tau=0.11, bright=1.5, glide=0.02, glide_tau=0.006, attack_ms=0.9, rng=c.rng)
    g2 = sy.glass(f2, 0.95, tau=0.22, bright=1.6, glide=0.02, glide_tau=0.006, attack_ms=0.9, rng=c.rng)
    sheen = sy.glass(f2 * 2.0, 0.4, tau=0.07, bright=1.0, attack_ms=0.9, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.012, 3500, 9000, 0.0016, attack_ms=0.7) * 0.18
    cv = Canvas(1.1)
    cv.add(g1, 0, 0.85, -0.15).add(g2, gap, 1.0, 0.15).add(sheen, gap, 0.25, 0.25).add(tick, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["redeem-ding"], 1.0, 80.0), 0, notes=[(0, m1), (gap, m2), (gap, m2 + 12)], strict=True)


@sfx("photo-whoosh")
def photo_whoosh(c: Ctx) -> Shot:
    """Soft air as the photo crosses to the handshake: a slow, broad, low-level swell that has faded to nothing by the handshake."""
    dur = float(c.ev["dur"])
    n = secs(dur)
    peak = 0.58 * dur
    f = dsp.smooth_curve([(0, 900.0), (dur, 3000.0)], n, kind="exp")
    env = sy.bump(n, peak, pow_up=1.6, pow_down=1.6)
    y = sy.noise_whoosh(c.rng, dur, f, 0.7, env, width=0.8, lp_hz=5200, hp_hz=450)
    return Shot(finish(y, LEVEL["photo-whoosh"], 40.0, 90.0), secs(peak), target=c.t + peak, kind="peak")


@sfx("handshake")
def handshake(c: Ctx) -> Shot:
    """The hands meet on the downbeat. The SFX part is a soft, dry skin/cloth clasp (very short, low-mid) plus a warm glass bloom of
    the C chord and a small glint of sparkle (both through the reverbs); the big resolving C chord itself is the music's. No boom,
    no cymbal."""
    rng = c.rng
    L = 3.2
    skin = sy.bp_noise(rng, 0.14, 250, 1400, 0.016, attack_ms=1.2)
    cloth = sy.bp_noise(rng, 0.14, 1500, 4500, 0.026, attack_ms=4.0)
    pat = sy.thump(185.0, 0.10, drop=0.25, drop_tau=0.008, tau=0.022, drive=1.0, attack_ms=1.5)
    cl = Canvas(0.16)
    cl.add(skin, 0, 1.0, -0.05).add(cloth, 0, 0.16, 0.1).add(pat, 0, 0.5, 0.0)
    clasp = cl.y / (np.max(np.abs(cl.y)) + 1e-12)

    bloom = Canvas(L)
    chord = ((note("C5"), 0.55, -0.15), (note("G5"), 0.45, 0.20), (note("E6"), 0.28, 0.10), (note("C6"), 0.22, -0.05))
    for m, lv, p in chord:
        bloom.add(sy.glass(float(mtof(m)), L, tau=1.3, bright=0.7, attack_ms=40.0, rng=rng), 0, lv, p)
    k = 7
    u = (np.arange(k) + rng.uniform(0, 0.8, k)) / k
    times = 0.06 + 0.55 * u ** 1.3
    pool = [m for m in th.penta_run(note("G6"), 8) if m % 12 in (0, 2, 4, 7) and m <= note("G7")]
    midis = [pool[int(rng.integers(0, len(pool)))] for _ in range(k)]
    _glints(rng, bloom, times, midis, 0.45 * (1 - u) ** 1.2 + 0.10, tau=0.12, bright=0.9, max_len=0.8)
    wet = bloom.y * 0.55
    dry = np.zeros((secs(L), 2))
    dry[: len(clasp)] = clasp
    audio, send = finish_pair(dry + wet, wet, LEVEL["handshake"], 1.0, 150.0)
    notes = [(0, m) for m, _, _ in chord] + [(float(tt), m) for tt, m in zip(times, midis)]
    return Shot(audio, 0, notes=notes, strict=True, send_src=send)


# =========================================================================================== DIRECTION A (qa/SOUND.md)
# Sequences become single gestures that carry their own times; the film's shop is a bed; the motif is the signature.
def _gesture_notes(c: Ctx, times, targets) -> list[int]:
    """One chord tone (or consonant extension) per time, each in the chord that is playing at that moment.
    A gesture that carries N times must sound N times: with fewer targets than times (the v4 bug that left three of the five language ticks and seven
    of the ten gadget pops silent) it extends the targets with a pentatonic run instead of quietly dropping the rest."""
    times = list(times)
    targets = list(targets)
    if len(targets) < len(times):
        targets += th.penta_run(targets[-1] + 2, len(times) - len(targets))
    notes = [th.nearest_tone(c.harm.at(float(t) + 1e-4), tg, allow_ext=True) for t, tg in zip(times, targets)]
    assert len(notes) == len(times), f"{c.ev['type']} at {c.t}: {len(notes)} notes for {len(times)} times"
    return notes


@sfx("typing-texture")
def typing_texture(c: Ctx) -> Shot:
    """The 33 keystrokes of first name, last name and e-mail as ONE soft texture that follows the real typing (the cue carries every stroke
    time): a rounded 'tok', a hint of tick and click per stroke, low-passed, with a slightly wandering level — a patter, not 33 clicks."""
    strokes = [float(x) for x in c.ev["strokes"]]
    t0 = strokes[0]
    L = strokes[-1] - t0 + 0.12
    cv = Canvas(L)
    for i, ts in enumerate(strokes):
        n_t = secs(0.045)
        tick = dsp.sine(c.rng.uniform(2000, 3000), n_t) * dsp.attack_decay(n_t, 0.8, 0.005) * 0.45
        body = sy.thump(c.rng.uniform(640, 900), 0.04, drop=0.2, drop_tau=0.004, tau=0.006, drive=1.0, attack_ms=0.8) * 0.5
        click = sy.bp_noise(c.rng, 0.012, 2200, 7500, 0.0018, attack_ms=0.6) * 0.5
        thud = sy.thump(c.rng.uniform(190, 250), 0.04, drop=0.2, drop_tau=0.004, tau=0.008, drive=1.0, attack_ms=0.9) * 0.14
        k = min(len(tick), len(body), len(click), len(thud))
        stroke = dsp.lp(tick[:k] + body[:k] + click[:k] + thud[:k], 5200, 1)
        cv.add(stroke, ts - t0, c.rng.uniform(0.55, 1.0), c.rng.uniform(-0.2, 0.2))
    return Shot(finish(cv.y, LEVEL["typing-texture"], 1.0, 14.0), 0)


@sfx("scan-riser")
def scan_riser(c: Ctx) -> Shot:
    """One tonal riser under the scan ring (it replaces the eleven counter ticks): two detuned voices gliding C4 -> C6 with a gentle
    'scanning' tremolo that speeds up, a thin veil of air. The body stops 0.25 s before the 98 %; only a faint inhale of the top note
    keeps rising through that air gap."""
    dur = float(c.ev["dur"])
    gap = 0.25
    n = secs(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 261.63 * 4.0 ** (u ** 1.4)
    tonal = np.zeros(n)
    for det in (1.0, 1.0035):
        ph = dsp.phase_of(f * det)
        tonal += np.sin(ph) + 0.30 * np.sin(2 * ph) + 0.10 * np.sin(3 * ph)
    tonal /= 2.8
    rate = 5.0 + 14.0 * u
    am = 1.0 - 0.28 * (0.5 + 0.5 * np.sin(dsp.phase_of(rate)))
    veil = np.stack([dsp.sweep(c.rng.standard_normal(n), "bp", dsp.smooth_curve([(0, 1200), (dur, 9000)], n, kind="exp"), 1.8),
                     dsp.sweep(c.rng.standard_normal(n), "bp", dsp.smooth_curve([(0, 1300), (dur, 9500)], n, kind="exp"), 1.8)], axis=1)
    g_i = secs(dur - gap)
    env = u ** 2.0
    env = env / env[g_i - 1]
    body = (dsp.stereo(tonal * am) * 0.85 + veil * 0.22) * env[:, None]
    body[g_i:] = 0.0
    k = n - g_i
    ug = np.linspace(0, 1, k)
    air = dsp.hp(c.rng.standard_normal((k, 2)), 6500, 2) * (0.05 * ug ** 1.5)[:, None]
    top = np.sin(dsp.phase_of(f[g_i:])) * 0.05 * ug ** 2
    body[g_i:] += air + dsp.stereo(top)
    return Shot(finish(body, LEVEL["scan-riser"], 80.0, 2.5), g_i, target=c.t + dur - gap, kind="end", notes=[(dur, note("C6"))])


@sfx("store-ticks")
def store_ticks(c: Ctx) -> Shot:
    """Small glass ticks as ONE gesture that carries its own times: three consent ticks climbing the chord (left to right), or the two
    ticks that flip Store A to Store B (the second higher)."""
    times = [float(x) for x in c.ev["times"]]
    k = len(times)
    targets = [note("G5"), note("B5"), note("D6")] if k == 3 else [note("E6"), note("G6")]
    ms_ = _gesture_notes(c, times, targets)
    cv = Canvas(times[-1] - times[0] + 0.5)
    for i, (ts, m) in enumerate(zip(times, ms_)):
        g = sy.glass(float(mtof(m)), 0.4, tau=0.07, bright=0.8, glide=0.02, glide_tau=0.005, attack_ms=0.8, rng=c.rng)
        tick = sy.bp_noise(c.rng, 0.01, 3500, 9000, 0.0013, attack_ms=0.6) * 0.25
        p = -0.3 + 0.6 * i / max(k - 1, 1)
        cv.add(g, ts - times[0], 0.9 + 0.1 * i, p).add(tick, ts - times[0], 1.0, p)
    return Shot(finish(cv.y, LEVEL["store-ticks"], 0.8, 40.0), 0, notes=[(ts - times[0], m) for ts, m in zip(times, ms_)])


@sfx("node-run")
def node_run(c: Ctx) -> Shot:
    """The five nodes of the diagram as ONE run of short glass plucks climbing the chord (the marimba arps of the music stay out of this register)."""
    times = [float(x) for x in c.ev["times"]]
    targets = [note("G4"), note("D5"), note("G5"), note("B5"), note("D6")][: len(times)]
    ms_ = _gesture_notes(c, times, targets)
    cv = Canvas(times[-1] - times[0] + 0.9)
    for i, (ts, m) in enumerate(zip(times, ms_)):
        g = sy.glass(float(mtof(m)), 0.7, tau=0.10, bright=0.9, glide=0.02, glide_tau=0.005, attack_ms=1.0, rng=c.rng)
        wood = sy.bp_noise(c.rng, 0.012, 1800, 5200, 0.002, attack_ms=0.7) * 0.3
        p = (-0.3, 0.2, -0.15, 0.3, 0.0)[i % 5]
        cv.add(g, ts - times[0], 0.85 + 0.03 * i, p).add(wood, ts - times[0], 1.0, p)
    return Shot(finish(cv.y, LEVEL["node-run"], 0.8, 60.0), 0, notes=[(ts - times[0], m) for ts, m in zip(times, ms_)])


@sfx("tile-bloom")
def tile_bloom(c: Ctx) -> Shot:
    """The three dashboard tiles as ONE bloom: three soft-attack glass notes opening a chord over a rising breath of air."""
    times = [float(x) for x in c.ev["times"]]
    targets = [note("B4"), note("E5"), note("A5")][: len(times)]
    ms_ = _gesture_notes(c, times, targets)
    L = times[-1] - times[0] + 1.6
    cv = Canvas(L)
    for i, (ts, m) in enumerate(zip(times, ms_)):
        g = sy.glass(float(mtof(m)), 1.4, tau=0.45, bright=0.7, attack_ms=9.0, rng=c.rng)
        cv.add(g, ts - times[0], 0.85, (-0.4, 0.0, 0.4)[i % 3])
    n = secs(1.0)
    air = dsp.sweep(c.rng.standard_normal((n, 2)), "bp", dsp.smooth_curve([(0, 1500), (1.0, 6000)], n, kind="exp"), 1.2) * sy.bump(n, 0.45, 1.4, 1.3)[:, None]
    cv.add(air, 0, 0.10)
    return Shot(finish(cv.y, LEVEL["tile-bloom"], 1.0, 120.0), 0, notes=[(ts - times[0], m) for ts, m in zip(times, ms_)])


@sfx("crm-land")
def crm_land(c: Ctx) -> Shot:
    """A lead lands in its CRM row: one soft pluck with a felt 'thump' under it and a glass overtone (the second lead is quieter)."""
    strength = float(c.ev.get("strength", 1.0))
    m = th.nearest_tone(c.chord, note("A4") if c.nth == 0 else note("E5"), allow_ext=True)
    f = float(mtof(m))
    pluck = sy.harmonic_pluck(f, 0.8, tau=0.20, n_partials=8, tilt=1.1, damp=0.8, attack_ms=1.5, max_hz=6000, rng=c.rng)
    felt = sy.thump(f / 2, 0.22, drop=0.3, drop_tau=0.012, tau=0.05, drive=1.2, attack_ms=2.0)
    over = sy.glass(f * 2, 0.6, tau=0.12, bright=0.7, attack_ms=1.0, rng=c.rng)
    cv = Canvas(0.9)
    cv.add(pluck, 0, 1.0).add(felt, 0, 0.45).add(over, 0, 0.30, 0.15)
    return Shot(finish(cv.y, LEVEL["crm-land"] + dsp.lin2db(strength), 1.0, 90.0), 0, notes=[(0, m)])


MOTIF = (note("G4"), note("A4"), note("C5"), note("E5"))      # sol - la - do - mi: "contact"
MOTIF_AT = (0.0, 0.25, 0.5, 0.75)
MOTIF_VEL = (0.70, 0.76, 0.86, 1.0)


def _motif(c: Ctx, count: int, last_ring: float) -> Canvas:
    """Glass bell doubled by a felt electric piano, soft attack, no vibrato; the last note rings for `last_ring` seconds."""
    cv = Canvas(MOTIF_AT[count - 1] + last_ring + 0.4)
    for i in range(count):
        last = i == count - 1
        f = float(mtof(MOTIF[i]))
        ring = last_ring if last else 0.5
        bell = sy.glass(f, ring + 0.3, tau=(1.5 if last else 0.45), bright=0.8, attack_ms=5.0, rng=c.rng)
        ep = ins.ep_tone(f, ring * (0.9 if last else 0.4), MOTIF_VEL[i], rng=None)
        cv.add(bell, MOTIF_AT[i], 0.62 * MOTIF_VEL[i], -0.1 + 0.07 * i)
        cv.add(ep, MOTIF_AT[i], 0.50, 0.1 - 0.05 * i)
    return cv


@sfx("motif-q")
def motif_q(c: Ctx) -> Shot:
    """The first half of the sonic motif: G4 - A4, a question left hanging over the C of the logo hit."""
    cv = _motif(c, 2, 1.4)
    return Shot(finish(cv.y, LEVEL["motif-q"], 3.0, 200.0), 0, notes=[(MOTIF_AT[i], MOTIF[i]) for i in range(2)], strict=True)


@sfx("motif")
def motif(c: Ctx) -> Shot:
    """The complete sonic motif on the held Cadd9: G4 - A4 - C5 - E5, the last note ringing into the tail. The circle closes."""
    cv = _motif(c, 4, 2.6)
    return Shot(finish(cv.y, LEVEL["motif"], 3.0, 400.0), 0, notes=[(MOTIF_AT[i], MOTIF[i]) for i in range(4)], strict=True)


@sfx("room-tone")
def room_tone(c: Ctx) -> Shot:
    """The shop, felt rather than heard: large-room air, a low ventilation rumble and a diffuse murmur of voices (filtered, syllable-modulated
    noise — nothing intelligible), slowly breathing. It rhymes the hand-off photograph with the bag and the handshake."""
    dur = float(c.ev["dur"])
    n = secs(dur)
    t = np.arange(n) / SR
    rng = c.rng
    air = np.stack([dsp.bp(dsp.pink(rng, n), 90, 5200, 2), dsp.bp(dsp.pink(rng, n), 90, 5200, 2)], axis=1)
    slow = 1.0 + 0.18 * np.sin(2 * np.pi * (0.11 * t + rng.uniform())) + 0.10 * np.sin(2 * np.pi * (0.27 * t + rng.uniform()))
    rumble = dsp.lp(rng.standard_normal((n, 2)), 150, 2) * 0.55
    voices = np.zeros((n, 2))
    for _ in range(5):
        base = rng.standard_normal(n)
        x = dsp.bp(base, 300, 1100, 2) + 0.6 * dsp.bp(base, 1500, 2600, 2)
        syl = (0.5 + 0.5 * np.sin(2 * np.pi * (rng.uniform(3.0, 5.5) * t + rng.uniform()))) ** 1.6
        gate = dsp.lp(rng.standard_normal(n), 0.6, 1)
        gate = 1.0 / (1.0 + np.exp(-6.0 * (gate / (np.std(gate) + 1e-9) - 0.1)))      # slow random on / off: a conversation, then a pause
        voices += dsp.pan(x * syl * gate, rng.uniform(-0.8, 0.8)) * rng.uniform(0.7, 1.0)
    y = air * slow[:, None] + rumble + voices * 0.30
    fi, fo = float(c.ev.get("fade_in", 0.6)) * 1000.0, float(c.ev.get("fade_out", 0.9)) * 1000.0
    return Shot(finish(y, LEVEL["room-tone"], fi, fo), 0, kind="swell")


# =========================================================================================== placement

# =========================================================================================== EVERY PICTURE EVENT HAS A SOUND
# (qa/SOUND-AUDIT.md): the small things the v4 first cut left silent - the wordmark's letters, the progress dots, a field taking focus, the banner
# dropping in, a lead flying to the CRM, a line drawing itself, the "Sample data" chip. All of them are small, short, in the film's glass / felt
# family, in key, and level to their loudness class (see CLASS_OF), so they are heard as part of the interface and never as an effect.
@sfx("letter-tick")
def letter_tick(c: Ctx) -> Shot:
    """One letter of the wordmark popping in: six short plucks up the C pentatonic (C5 D5 E5 G5 A5 C6), 50 ms apart, spread left to right with the
    letters. Over the logo hit they read as the name being spelled, not as a melody."""
    step, of = int(c.ev.get("step", 0)), int(c.ev.get("of", 6))
    m = th.penta_run(note("C5"), of)[min(step, of - 1)]
    f = float(mtof(m))
    pl = sy.harmonic_pluck(f, 0.26, tau=0.06, n_partials=7, tilt=1.3, damp=1.3, attack_ms=1.2, max_hz=7500, rng=c.rng)
    gl = sy.glass(f * 2.0, 0.14, tau=0.035, bright=0.6, attack_ms=0.9, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.01, 3500, 9000, 0.0015, attack_ms=0.7) * 0.25
    p = -0.45 + 0.9 * step / max(of - 1, 1)
    cv = Canvas(0.28)
    cv.add(pl, 0, 0.9, p).add(gl, 0, 0.30, p).add(tick, 0, 1.0, p)
    return Shot(finish(cv.y, LEVEL["letter-tick"]), 0, notes=[(0, m), (0, m + 12)])


@sfx("dot-tick")
def dot_tick(c: Ctx) -> Shot:
    """A progress dot lights up as its swipe lands: a tiny glass tick, one step higher each time (eight steps up the chord's tones), so the
    eight dots count the eight swipes. A YES dot (teal) rings a little longer than a NO dot (blue)."""
    step, of = int(c.ev.get("step", 0)), int(c.ev.get("of", 8))
    yes = float(c.ev.get("dir", 1)) > 0
    chord = c.harm.at(float(c.ev["t"]) + 1e-4)
    target = note("C6") + round(step * 14.0 / max(of - 1, 1))            # C6 ... C7
    m = th.nearest_tone(chord, target, allow_ext=True)
    g = sy.glass(float(mtof(m)), 0.16 if yes else 0.11, tau=0.040 if yes else 0.026, bright=0.5, attack_ms=0.8, rng=c.rng)
    tick = sy.bp_noise(c.rng, 0.006, 4000, 9500, 0.001, attack_ms=0.6) * 0.25
    cv = Canvas(0.18)
    cv.add(g, 0, 1.0, 0.0).add(tick, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["dot-tick"]), 0, notes=[(0, m)])


@sfx("field-tick")
def field_tick(c: Ctx) -> Shot:
    """A form field takes focus: a soft, rounded felt 'tok' (about 500 Hz) with a hint of tick. Lower and duller than a key, so it reads as the field
    waking up before the first letter."""
    f = 520.0 * c.rng.uniform(0.97, 1.03)
    body = sy.thump(f, 0.07, drop=0.3, drop_tau=0.006, tau=0.016, drive=1.2, attack_ms=0.9)
    click = sy.bp_noise(c.rng, 0.012, 1400, 4800, 0.002, attack_ms=0.7) * 0.4
    cv = Canvas(0.075)
    cv.add(body, 0, 1.0).add(click, 0, 1.0)
    return Shot(finish(cv.y, LEVEL["field-tick"], 1.0, 6.0), 0)


@sfx("notif-drop")
def notif_drop(c: Ctx) -> Shot:
    """The notification banner drops in from the top of the lock screen: a short falling breath of air and a soft rounded 'plip' as it lands,
    a tenth of a second before the ping."""
    dur = 0.22
    n = secs(dur)
    f = dsp.smooth_curve([(0, 3200), (dur, 700)], n, kind="exp")
    env = sy.bump(n, 0.07, pow_up=1.0, pow_down=1.6)
    air = sy.noise_whoosh(c.rng, dur, f, 1.1, env, width=0.5, lp_hz=6500, hp_hz=450)
    m = th.nearest_tone(c.chord, note("E5"))
    plip = _bubble(float(mtof(m)) * 0.5, 0.14, rise=0.25, rise_tau=0.010, tau=0.04, rng=c.rng)
    cv = Canvas(0.3)
    cv.add(air, 0, 0.8).add(plip, 0.07, 0.7, 0.0)
    return Shot(finish(cv.y, LEVEL["notif-drop"], 2.0, 20.0), secs(0.07), target=c.t + 0.07, kind="peak", notes=[(0.07, m - 12)])


@sfx("lead-fly")
def lead_fly(c: Ctx) -> Shot:
    """A lead lifts out of the tablet and flies to its row in the CRM along an S-curve: a soft airy sweep that rises and settles (peaking mid-flight,
    when the chip is fastest) with a faint glass glide G5 -> C6 inside it, swinging to the side the chip swings to."""
    dur = float(c.ev["dur"])
    bend = float(c.ev.get("bend", 1.0))
    strength = float(c.ev.get("strength", 1.0))
    n = secs(dur)
    u = np.arange(n) / SR / dur
    f = dsp.smooth_curve([(0, 900), (0.55 * dur, 3500), (dur, 1500)], n, kind="exp")
    env = sy.bump(n, 0.55 * dur, pow_up=1.5, pow_down=1.3)
    pan = bend * 0.55 * np.sin(np.pi * np.clip(u, 0, 1))
    air = sy.noise_whoosh(c.rng, dur, f, 1.4, env, width=0.5, lp_hz=7500, hp_hz=500, pan_curve=pan)
    fg = dsp.smooth_curve([(0, 784.0), (dur, 1046.5)], n, kind="exp")
    tone = np.sin(dsp.phase_of(fg)) * env * 0.12
    y = air + dsp.pan_curve(tone, pan)
    return Shot(finish(y * strength, LEVEL["lead-fly"], 5.0, 40.0), secs(0.55 * dur), target=c.t + 0.55 * dur, kind="peak")


@sfx("line-draw")
def line_draw(c: Ctx) -> Shot:
    """A line drawing itself (an underline, a connector, an outline closing): a very soft, rising 'sss' of filtered air that fades as the line completes."""
    dur = float(c.ev["dur"])
    n = secs(dur)
    f = dsp.smooth_curve([(0, 2400), (dur, 6400)], n, kind="exp")
    env = sy.bump(n, 0.55 * dur, pow_up=1.3, pow_down=1.5)
    y = sy.noise_whoosh(c.rng, dur, f, 2.4, env, width=0.4, lp_hz=8200, hp_hz=1400)
    return Shot(finish(y, LEVEL["line-draw"], 12.0, 40.0), secs(0.55 * dur), target=c.t + 0.55 * dur, kind="peak")


@sfx("sample-tick")
def sample_tick(c: Ctx) -> Shot:
    """The quiet "Sample data" chip appearing: two tiny glass ticks a third apart (E6, then G6), the amber chip's own small voice."""
    m1 = th.nearest_tone(c.chord, note("E6"), allow_ext=True)
    m2 = th.nearest_tone(c.chord, note("G6"), allow_ext=True)
    g1 = sy.glass(float(mtof(m1)), 0.14, tau=0.03, bright=0.5, attack_ms=0.9, rng=c.rng)
    g2 = sy.glass(float(mtof(m2)), 0.2, tau=0.045, bright=0.5, attack_ms=0.9, rng=c.rng)
    cv = Canvas(0.3)
    cv.add(g1, 0, 0.8, -0.1).add(g2, 0.07, 1.0, 0.1)
    return Shot(finish(cv.y, LEVEL["sample-tick"]), 0, notes=[(0, m1), (0.07, m2)])



@sfx("underline")
def underline(c: Ctx) -> Shot:
    """The highlighted phrase of a caption underlines itself: a small, soft upward glide of glass (a fifth, G6 -> D7 over the chord) with a breath of
    air behind it - the pen of the caption. Pitched, so it stays heard over the pad where a bare noise swish would be lost."""
    dur = float(c.ev.get("dur", 0.4))
    n = secs(dur)
    m0 = th.nearest_tone(c.chord, note("G6"), allow_ext=True)       # an octave above the felt piano's register, so the pad and the keys never hide it
    f0 = float(mtof(m0))
    fc = dsp.smooth_curve([(0, f0), (dur, f0 * 1.5)], n, kind="exp")
    ph = dsp.phase_of(fc)
    env = sy.bump(n, 0.62 * dur, pow_up=1.5, pow_down=1.4)
    tone = (np.sin(ph) + 0.22 * np.sin(2.756 * ph)) * env
    air = sy.noise_whoosh(c.rng, dur, dsp.smooth_curve([(0, 3600), (dur, 7600)], n, kind="exp"), 2.0, env * 0.16, width=0.5, lp_hz=9000, hp_hz=2500)
    y = dsp.stereo(tone) * 0.9 + air
    return Shot(finish(y, LEVEL["underline"], 6.0, 50.0), secs(0.5 * dur), target=c.t + 0.5 * dur, kind="peak", notes=[(0, m0), (dur, m0 + 7)])


def render_sfx(cues: dict, harm: Harmony, n_total: int, verbose: bool = False):
    """Render every cue; returns dict(dry=(N,2), room/plate/hall sends=(N,), log=[...], shots=[(ev, Shot, start)])."""
    dry = np.zeros((n_total, 2))
    sends = {k: np.zeros(n_total) for k in ("room", "plate", "hall")}
    log: list[dict] = []
    shots: list = []
    counts: dict[str, int] = {}
    for e in cues["sfx"]:
        counts[e["type"]] = counts.get(e["type"], 0) + 1
    seen: dict[str, int] = {}
    for idx, ev in enumerate(cues["sfx"]):
        name = ev["type"]
        if name not in REG:
            raise KeyError(f"no sound designer for cue type '{name}'")
        nth = seen.get(name, 0)
        seen[name] = nth + 1
        ctx = Ctx(ev=ev, rng=np.random.default_rng(cue_seed(cues["sfx"], idx)), harm=harm, nth=nth, count=counts[name], index=idx)
        shot = REG[name](ctx)
        if name in CLASS_OF:
            klass, mode, off = CLASS_OF[name]
            boost_db = CLASS_DB[klass] + off - own_level_db(shot.audio, shot.accent, mode)
        else:
            boost_db = BOOST_DB.get(name, 0.0)
        boost_db += BOOST_AT.get((name, round(float(ev["t"]), 3)), 0.0) + float(ev.get("gain_db", 0.0))
        boost = dsp.db2lin(boost_db)
        if boost != 1.0:
            shot.audio = shot.audio * boost
            if shot.send_src is not None:
                shot.send_src = shot.send_src * boost
        target = shot.target if shot.target is not None else float(ev.get("accent", ev["t"]))
        start = secs(target) - shot.accent
        dsp.mix_into(dry, shot.audio, start, 1.0)
        shots.append((ev, shot, start))
        src = shot.audio if shot.send_src is None else shot.send_src
        for bus, g in SEND.get(name, {}).items():
            dsp.mix_into(sends[bus], mono(src), start, g)
        log.append({"index": idx, "type": name, "t": float(ev["t"]), "target": target, "start_sample": start,
                    "accent_sample": start + shot.accent, "kind": shot.kind, "strict": shot.strict,
                    "peak_db": float(dsp.lin2db(np.max(np.abs(shot.audio)))), "len_s": len(shot.audio) / SR,
                    "notes": [(target + dt, int(m)) for dt, m in shot.notes], "step": ev.get("step")})
    return {"dry": dry, "sends": sends, "log": log, "shots": shots}
