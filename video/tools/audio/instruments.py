"""Music instrument voices (drums, bass, pads, plucks, keys, bell lead, texture).

Every voice returns a stereo (n, 2) or mono (n,) float64 array starting at amplitude 0 (>= 0.6 ms raised-cosine
attack) and ending at 0 (release fade) - they can be placed on the timeline without any click.
"""
from __future__ import annotations

import numpy as np

import dsp
import synth as sy
from dsp import SR, secs, ms, mtof

TWO_PI = 2.0 * np.pi


def _norm(y: np.ndarray, peak: float = 1.0) -> np.ndarray:
    pk = np.max(np.abs(y))
    return y * (peak / pk) if pk > 0 else y


def _fade_out(y: np.ndarray, fade_ms: float) -> np.ndarray:
    n = len(y)
    f = min(ms(fade_ms), n)
    if f > 0:
        r = dsp.cos_ramp(f)[::-1]
        y[n - f:] *= r if y.ndim == 1 else r[:, None]
    return y


# ------------------------------------------------------------------------------------------- drums
def kick(rng: np.random.Generator, f_end: float = 56.0, body_tau: float = 0.105, click: float = 1.0,
         length: float = 0.42, punch: float = 1.0, drive: float = 1.7) -> np.ndarray:
    """Clean, rounded kick that survives a phone speaker: a short tuned sine sweep (saturated, so its 2nd-5th harmonics
    fill 110-300 Hz), a strong mid 'knock' around 170 Hz and a soft click. Little energy below 50 Hz."""
    n = secs(length)
    t = np.arange(n) / SR
    f = f_end + (170.0 - f_end) * np.exp(-t / 0.018)
    body = np.sin(dsp.phase_of(f)) * dsp.attack_decay(n, 1.0, body_tau)
    body = dsp.sat(body * 2.4, drive + 0.6)
    mid = sy.thump(f_end * 3.1, 0.16, drop=0.9, drop_tau=0.010, tau=0.045, drive=2.6, attack_ms=0.8) * 1.0 * punch
    mid2 = sy.thump(f_end * 5.2, 0.12, drop=0.7, drop_tau=0.008, tau=0.028, drive=3.0, attack_ms=0.8) * 0.65 * punch
    clk = sy.bp_noise(rng, 0.014, 1800, 7000, 0.0025, attack_ms=0.6) * 0.45 * click
    tk = dsp.sine(2600.0, secs(0.01)) * dsp.attack_decay(secs(0.01), 0.4, 0.002) * 0.12 * click
    y = body * 0.8
    y[: len(mid)] += mid
    y[: len(mid2)] += mid2
    y[: len(clk)] += clk
    y[: len(tk)] += tk
    y = _fade_out(y, 8.0)
    return _norm(y, 1.0)


def clap(rng: np.random.Generator, bright: float = 1.0) -> np.ndarray:
    """Soft layered clap: four micro-bursts then a short band-limited tail."""
    L = 0.32
    n = secs(L)
    y = np.zeros(n)
    for i, (dt, a) in enumerate(((0.0, 0.55), (0.011, 0.7), (0.023, 0.85), (0.036, 1.0))):
        burst = sy.bp_noise(rng, 0.03, 900, 3800 * bright, 0.0055, attack_ms=0.6)
        dsp.mix_into(y, burst, secs(dt), a)
    tail = dsp.bp(rng.standard_normal(n), 1100, 3200 * bright, 2) * dsp.attack_decay(n, 1.0, 0.075)
    y += tail * 0.55
    y = dsp.hp(y, 420, 2)
    y = dsp.sat(y * 1.2, 1.3)
    y = _fade_out(y, 10.0)
    return dsp.stereo(_norm(y, 1.0))


def snare(rng: np.random.Generator, tune: float = 190.0, tau: float = 0.10) -> np.ndarray:
    n = secs(0.3)
    noise = dsp.bp(rng.standard_normal(n), 1300, 6500, 2) * dsp.attack_decay(n, 0.8, tau)
    body = sy.thump(tune, 0.2, drop=0.25, drop_tau=0.012, tau=0.05, drive=1.3, attack_ms=0.8)
    snap = sy.bp_noise(rng, 0.03, 4200, 9000, 0.008, attack_ms=0.6)
    y = noise * 0.9
    y[: len(body)] += body * 0.7
    y[: len(snap)] += snap * 0.25
    y = _fade_out(y, 8.0)
    return dsp.stereo(_norm(y, 1.0))


def hat(rng: np.random.Generator, open_: bool = False, bright: float = 1.0) -> np.ndarray:
    L = 0.42 if open_ else 0.11
    n = secs(L)
    tau = 0.13 if open_ else 0.016
    nz = rng.standard_normal(n)
    y = dsp.hp(nz, 5200, 2) * 0.7 + dsp.bp(nz, 7000, 11000 * bright, 2) * 0.5
    y *= dsp.attack_decay(n, 0.7, tau)
    y = _fade_out(y, 6.0)
    return dsp.stereo(_norm(y, 1.0))


def shaker(rng: np.random.Generator, soft: float = 1.0) -> np.ndarray:
    n = secs(0.09)
    y = dsp.bp(rng.standard_normal(n), 4800, 9000, 2) * dsp.attack_decay(n, 5.0, 0.026)
    y = _fade_out(y, 5.0)
    return dsp.stereo(_norm(y, 1.0)) * soft


def rim(rng: np.random.Generator) -> np.ndarray:
    """Tiny finger-snap-like tick for the email breakdown."""
    n = secs(0.12)
    y = dsp.bp(rng.standard_normal(n), 1800, 3400, 2) * dsp.attack_decay(n, 0.6, 0.012)
    y += dsp.sine(1650.0, n) * dsp.attack_decay(n, 0.6, 0.010) * 0.5
    y = _fade_out(y, 6.0)
    return dsp.stereo(_norm(y, 1.0))


# ------------------------------------------------------------------------------------------- bass
def sub(freq: float, dur: float, vel: float = 1.0, release: float = 0.12, attack_ms: float = 7.0) -> np.ndarray:
    """Clean sub: sine with a whisper of saturation."""
    n = secs(dur + release)
    t = np.arange(n) / SR
    y = np.sin(TWO_PI * freq * t)
    y = dsp.sat(y * 1.1, 1.15)
    env = np.ones(n)
    a = ms(attack_ms)
    env[:a] = dsp.cos_ramp(a)
    r = secs(release)
    env[n - r:] = dsp.cos_ramp(r)[::-1]
    return y * env * vel


def bass(freq: float, dur: float, vel: float = 1.0, release: float = 0.07, bright: float = 1.0,
         rng: np.random.Generator | None = None, attack_ms: float = 4.0) -> np.ndarray:
    """Round, saturated bass: fundamental + 2nd/3rd harmonics (decaying) + a soft filtered saw; drive adds 120-800 Hz body."""
    n = secs(dur + release)
    t = np.arange(n) / SR
    y = np.sin(TWO_PI * freq * t) * 1.0
    for k, (a, tau) in enumerate(((0.46, 0.45), (0.30, 0.28), (0.18, 0.18), (0.10, 0.13), (0.06, 0.09)), start=2):
        if freq * k < 3200:
            y += a * bright * np.exp(-t / tau) * np.sin(TWO_PI * freq * k * t)       # phase 0: odd-symmetric -> no DC after tanh
    y = np.tanh(1.7 * y) / np.tanh(1.7)
    env = np.ones(n)
    a = ms(attack_ms)
    env[:a] = dsp.cos_ramp(a)
    r = secs(release)
    env[n - r:] = dsp.cos_ramp(r)[::-1]
    return y * env * vel


# ------------------------------------------------------------------------------------------- pads
def pad_voice_bank(notes: list[int], dur: float, attack: float, release: float, rng: np.random.Generator,
                   detune_cents: float = 8.0, spread: float = 0.55, sub_octave: bool = True) -> np.ndarray:
    """Detuned PolyBLEP saw unison (3 voices per note, panned) + soft sub-octave sines. Returns stereo; filter it afterwards."""
    n = secs(dur + release)
    out = np.zeros((n, 2))
    env = np.ones(n)
    a = secs(attack)
    env[:a] = dsp.cos_ramp(a)
    r = secs(release)
    env[n - r:] = dsp.cos_ramp(r)[::-1]
    for m in notes:
        f = float(mtof(m))
        for cents, p in ((-detune_cents, -spread), (0.0, 0.0), (detune_cents, spread)):
            ph = rng.uniform(0, 1)
            v = dsp.saw(f * 2 ** (cents / 1200.0), n, ph)
            out += dsp.pan(v, p + rng.uniform(-0.1, 0.1)) * (0.30 / 3.0)
        if sub_octave and m >= 45:
            s = np.sin(TWO_PI * (f / 2) * np.arange(n) / SR + rng.uniform(0, 6.28))
            out += dsp.pan(s, 0.0) * 0.07
    return out * env[:, None]


# ------------------------------------------------------------------------------------------- plucks / keys / bell
def arp_pluck(freq: float, dur: float, vel: float = 0.6, tau: float = 0.14, bright: float = 1.0,
              rng: np.random.Generator | None = None) -> np.ndarray:
    """Soft marimba-ish pluck: harmonic partials (higher ones decay quickly) + a short wooden 3.9x partial."""
    L = dur + 0.25
    n = secs(L)
    t = np.arange(n) / SR
    y = sy.harmonic_pluck(freq, L, tau=tau, n_partials=int(6 + 4 * bright), tilt=1.1, damp=0.9, attack_ms=1.8, max_hz=7500, rng=rng)
    wood = np.sin(TWO_PI * freq * 3.93 * t) * np.exp(-t / 0.028) * 0.22
    wood[: ms(1.8)] *= dsp.cos_ramp(ms(1.8))
    y = y + wood
    # gate: release after `dur`
    g = np.ones(n)
    r0 = secs(dur)
    rr = secs(0.10)
    if r0 < n:
        end = min(n, r0 + rr)
        g[r0:end] = dsp.cos_ramp(end - r0)[::-1]
        g[end:] = 0.0
    return y * g * vel


def ep_tone(freq: float, dur: float, vel: float = 0.6, rng: np.random.Generator | None = None) -> np.ndarray:
    """Warm electric-piano-like tine (self-FM with decaying index) + a short 'bark'."""
    L = dur + 0.6
    n = secs(L)
    t = np.arange(n) / SR
    idx = vel * 1.1 * np.exp(-t / 0.30) + 0.10
    carrier = np.sin(TWO_PI * freq * t + idx * np.sin(TWO_PI * freq * t))
    body = carrier * np.exp(-t / 1.4)
    bark = np.sin(TWO_PI * freq * 7.0 * t) * np.exp(-t / 0.035) * 0.12 * vel
    y = body + bark
    y[: ms(1.5)] *= dsp.cos_ramp(ms(1.5))
    g = np.ones(n)
    r0 = secs(dur)
    rr = secs(0.35)
    if r0 < n:
        end = min(n, r0 + rr)
        g[r0:end] = dsp.cos_ramp(end - r0)[::-1]
        g[end:] = 0.0
    return y * g * vel


def bell_lead(freq: float, dur: float, vel: float = 0.7, tau: float = 1.0, vibrato: float = 0.003,
              rng: np.random.Generator | None = None, attack_ms: float = 6.0) -> np.ndarray:
    """Restrained bell/lead: glassy struck partials over a soft sustained sine core with a touch of vibrato."""
    L = dur + 1.8
    n = secs(L)
    t = np.arange(n) / SR
    g = sy.glass(freq, L, tau=tau, bright=0.75, attack_ms=attack_ms, rng=rng)
    vib = 1.0 + vibrato * np.clip((t - 0.25) / 0.4, 0, 1) * np.sin(TWO_PI * 5.3 * t)
    core = np.sin(dsp.phase_of(freq * vib)) + 0.25 * np.sin(2 * dsp.phase_of(freq * vib))
    env = np.ones(n)
    a = ms(max(attack_ms, 12))
    env[:a] = dsp.cos_ramp(a)
    r0 = secs(dur)
    rr = secs(1.0)
    if r0 < n:
        end = min(n, r0 + rr)
        env[r0:end] = dsp.cos_ramp(end - r0)[::-1]
        env[end:] = 0.0
    y = g * 0.8 + core * env * 0.22
    return dsp.fade_tail(y, 250.0) * vel


# ------------------------------------------------------------------------------------------- texture
def noise_swell(rng: np.random.Generator, dur: float, f_lo: float, f_hi: float, q: float = 1.0, shape: float = 2.0,
                width: float = 1.0, tail: float = 0.0) -> np.ndarray:
    """Band-passed noise swell (filter sweeps f_lo -> f_hi while the level rises as u**shape); stereo."""
    n = secs(dur + tail)
    nd = secs(dur)
    f = dsp.smooth_curve([(0, f_lo), (dur, f_hi), (dur + tail + 1e-3, f_hi)], n, kind="exp")
    nz = rng.standard_normal((n, 2))
    if width < 1.0:
        common = rng.standard_normal(n)
        nz = width * nz + (1 - width) * common[:, None]
    y = dsp.sweep(nz, "bp", f, q)
    u = np.clip(np.arange(n) / max(nd, 1), 0, 1)
    env = u ** shape
    if tail > 0:
        env[nd:] = np.cos(0.5 * np.pi * np.clip((np.arange(n - nd)) / secs(tail), 0, 1)) ** 2
    return y * env[:, None]
