"""Harmony helpers: reads the per-bar chord map out of cues.json and answers 'what chord is playing at t?'."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


# pitch classes (0 = C) of each chord's tones, plus the extensions that are consonant on top of it
CHORDS: dict[str, dict[str, tuple[int, ...]]] = {
    "Am": {"tones": (9, 0, 4), "ext": (7, 11, 2)},       # A C E  | G(7) B(9) D(11)
    "G": {"tones": (7, 11, 2), "ext": (5, 9, 4)},        # G B D  | F(b7) A(9) E(6)
    "C": {"tones": (0, 4, 7), "ext": (11, 2, 9)},        # C E G  | B(maj7) D(9) A(6)
    "F": {"tones": (5, 9, 0), "ext": (4, 7, 2)},         # F A C  | E(maj7) G(9) D(6)
    "Cadd9": {"tones": (0, 4, 7, 2), "ext": (11, 9)},    # C E G D| B(maj7) A(6)
}
ROOT_PC = {"Am": 9, "G": 7, "C": 0, "F": 5, "Cadd9": 0}
DIATONIC = {0, 2, 4, 5, 7, 9, 11}  # C major / A minor


def pc_class(chord: str, midi: int) -> str:
    """'chord' tone, 'ext' (consonant extension), 'pass' (other diatonic note) or 'out' (chromatic)."""
    pc = int(midi) % 12
    if pc in CHORDS[chord]["tones"]:
        return "chord"
    if pc in CHORDS[chord]["ext"]:
        return "ext"
    return "pass" if pc in DIATONIC else "out"


def chord_midi(chord: str, octave_of_root: int, degrees: tuple[int, ...] | None = None) -> list[int]:
    """MIDI notes of the chord stacked upwards from the root in `octave_of_root` (C4 = octave 4)."""
    tones = CHORDS[chord]["tones"]
    root = ROOT_PC[chord]
    base = 12 * (octave_of_root + 1) + root
    out = []
    for pc in tones:
        m = base + ((pc - root) % 12)
        out.append(m)
    out.sort()
    return out if degrees is None else [out[d % len(out)] + 12 * (d // len(out)) for d in degrees]


def nearest_tone(chord: str, target_midi: float, allow_ext: bool = False) -> int:
    """Chord tone (optionally extension) closest to a target pitch."""
    pcs = set(CHORDS[chord]["tones"]) | (set(CHORDS[chord]["ext"]) if allow_ext else set())
    best, bd = None, 1e9
    for m in range(int(target_midi) - 7, int(target_midi) + 8):
        if m % 12 in pcs and abs(m - target_midi) < bd:
            best, bd = m, abs(m - target_midi)
    return int(best)


# C-major pentatonic: consonant over every chord of this progression (C D E G A)
PENTA_PCS = (0, 2, 4, 7, 9)


def scale_run(pcs: tuple[int, ...], start_midi: int, count: int) -> list[int]:
    """`count` ascending notes of the pitch-class set `pcs`, starting at the first member >= start_midi."""
    out, m = [], int(start_midi)
    while len(out) < count:
        if m % 12 in pcs:
            out.append(m)
        m += 1
    return out


G_PENTA_PCS = (7, 9, 11, 2, 4)      # G A B D E: the pentatonic that is consonant over the G chord (B = its third)


def penta_run(start_midi: int, count: int) -> list[int]:
    """`count` ascending C-pentatonic notes starting at the first pentatonic note >= start_midi."""
    return scale_run(PENTA_PCS, start_midi, count)


@dataclass
class Harmony:
    """The chord map: consecutive segments (`bars`, each {from, to, chord}). In the master every segment is a 2 s bar; in the 15 s cut-down
    a chord may change off the bar line, where two excerpts of the master meet, so lookups go by time, not by bar number."""
    bars: list[dict]
    bar_len: float = 2.0

    @classmethod
    def from_cues(cls, cues: dict) -> "Harmony":
        return cls(bars=cues["harmony"]["bars"], bar_len=float(cues["bar"]))

    def __post_init__(self):
        self._starts = np.array([float(b["from"]) for b in self.bars])

    def bar_index(self, t: float) -> int:
        """0-based index of the segment containing time t (the last one is extended to cover the tail)."""
        i = int(np.searchsorted(self._starts, t + 1e-9, side="right")) - 1
        return int(min(max(i, 0), len(self.bars) - 1))

    def at(self, t: float) -> str:
        return self.bars[self.bar_index(t)]["chord"]

    def bar_start(self, i: int) -> float:
        return float(self.bars[i]["from"])
