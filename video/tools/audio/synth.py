"""Reusable sound-design voices (glass / pluck / thump / noise sweeps) shared by the SFX and the music.

All voices return float64 arrays and start at exactly zero amplitude (raised-cosine attack >= 1 ms).
Mono voices have shape (n,), stereo voices (n, 2).
"""
from __future__ import annotations

import numpy as np

import dsp
from dsp import SR, secs, ms

TWO_PI = 2.0 * np.pi

# --- bar / glass partial tables --------------------------------------------------------------------
# free-free bar ratios (1, 2.756, 5.404, 8.933) plus the octave and a 4.07 for body
GLASS_R = np.array([1.0, 2.0, 2.756, 4.07, 5.404, 8.933])
GLASS_A = np.array([1.00, 0.14, 0.30, 0.07, 0.12, 0.035])
GLASS_T = np.array([1.00, 0.55, 0.42, 0.30, 0.22, 0.12])   # decay constants relative to the fundamental's tau


def glass(freq: float, dur: float, tau: float = 0.15, bright: float = 1.0, glide: float = 0.0,
          glide_tau: float = 0.008, attack_ms: float = 1.2, rng: np.random.Generator | None = None,
          max_hz: float = 9_500.0, ratios=None, amps=None, taus=None) -> np.ndarray:
    """Glassy / bell-like struck tone: inharmonic partials with their own decay times.

    `glide` is a relative pitch offset that settles exponentially (e.g. 0.05 = starts 5 % sharp) - gives the
    rounded 'pop' feel of tiny UI sounds. `bright` scales the upper partials.
    """
    ratios = GLASS_R if ratios is None else np.asarray(ratios, dtype=float)
    amps = GLASS_A if amps is None else np.asarray(amps, dtype=float)
    taus = GLASS_T if taus is None else np.asarray(taus, dtype=float)
    n = secs(dur)
    t = np.arange(n) / SR
    if glide:
        ph = TWO_PI * np.cumsum(freq * (1.0 + glide * np.exp(-t / glide_tau))) / SR
    else:
        ph = TWO_PI * freq * t
    y = np.zeros(n)
    for k, (r, a, tt) in enumerate(zip(ratios, amps, taus)):
        if freq * r > max_hz:
            continue
        det = 1.0 + (rng.uniform(-0.002, 0.002) if (rng is not None and k >= 2) else 0.0)
        ph0 = rng.uniform(0, TWO_PI) if rng is not None else 0.0
        amp = a * (bright ** k if k > 0 else 1.0)
        y += amp * np.exp(-t / (tau * tt)) * np.sin(r * det * ph + ph0)
    a = min(n, ms(attack_ms))
    if a > 0:
        y[:a] *= dsp.cos_ramp(a)
    return dsp.fade_tail(y, 30.0)


def harmonic_pluck(freq: float, dur: float, tau: float = 0.2, n_partials: int = 10, tilt: float = 1.0,
                   damp: float = 0.9, attack_ms: float = 2.0, inharm: float = 0.0, max_hz: float = 9000.0,
                   rng: np.random.Generator | None = None) -> np.ndarray:
    """Plucked-string-ish additive voice: partial k has amplitude k^-tilt and decays faster the higher it is."""
    n = secs(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, n_partials + 1):
        f = freq * k * np.sqrt(1.0 + inharm * k * k)
        if f > max_hz:
            break
        a = k ** (-tilt)
        tk = tau / (1.0 + damp * (k - 1))
        ph0 = rng.uniform(0, TWO_PI) if rng is not None else 0.0
        y += a * np.exp(-t / tk) * np.sin(TWO_PI * f * t + ph0)
    a = min(n, ms(attack_ms))
    if a > 0:
        y[:a] *= dsp.cos_ramp(a)
    return dsp.fade_tail(y, 30.0)


def thump(f_end: float, dur: float, drop: float = 0.5, drop_tau: float = 0.02, tau: float = 0.12,
          drive: float = 1.5, attack_ms: float = 1.5) -> np.ndarray:
    """Sine 'thud' whose pitch falls from f_end*(1+drop) to f_end, soft-saturated (adds 2nd/3rd harmonics)."""
    n = secs(dur)
    t = np.arange(n) / SR
    f = f_end * (1.0 + drop * np.exp(-t / drop_tau))
    y = np.sin(TWO_PI * np.cumsum(f) / SR) * dsp.attack_decay(n, attack_ms, tau)
    return dsp.fade_tail(dsp.sat(y, drive) if drive > 0 else y, 15.0)


def bp_noise(rng: np.random.Generator, dur: float, f_lo: float, f_hi: float, tau: float, attack_ms: float = 0.8,
             order: int = 2) -> np.ndarray:
    """Band-passed noise burst with a percussive envelope (clicks / transients)."""
    n = secs(dur)
    x = dsp.bp(rng.standard_normal(n), f_lo, f_hi, order)
    return dsp.fade_tail(x * dsp.attack_decay(n, attack_ms, tau), 8.0)


def bump(n: int, peak_s: float, pow_up: float = 1.0, pow_down: float = 1.0) -> np.ndarray:
    """Smooth 0 -> 1 -> 0 envelope over n samples with its maximum at peak_s (raised-cosine flanks)."""
    t = np.arange(n) / SR
    total = n / SR
    peak_s = min(max(peak_s, 1.0 / SR), total - 1.0 / SR)
    up = (0.5 - 0.5 * np.cos(np.pi * np.clip(t / peak_s, 0, 1))) ** pow_up
    down = (0.5 + 0.5 * np.cos(np.pi * np.clip((t - peak_s) / (total - peak_s), 0, 1))) ** pow_down
    return np.where(t < peak_s, up, down)


def noise_whoosh(rng: np.random.Generator, dur: float, f_curve: np.ndarray, q: float | np.ndarray,
                 env: np.ndarray, width: float | np.ndarray = 1.0, lp_hz: float | None = 9000.0,
                 hp_hz: float | None = 120.0, pan_curve: np.ndarray | None = None) -> np.ndarray:
    """Stereo band-passed noise sweep. `width` (0..1) blends a common noise with independent L/R noise."""
    n = secs(dur)
    base = rng.standard_normal((n, 3))
    w = np.broadcast_to(np.asarray(width, dtype=float), (n,))
    norm = 1.0 / np.sqrt((1 - w) ** 2 + w ** 2)
    left = ((1 - w) * base[:, 0] + w * base[:, 1]) * norm
    right = ((1 - w) * base[:, 0] + w * base[:, 2]) * norm
    x = np.stack([left, right], axis=1)
    y = dsp.sweep(x, "bp", f_curve, q)
    if hp_hz:
        y = dsp.hp(y, hp_hz, 2)
    if lp_hz:
        y = dsp.lp(y, lp_hz, 2)
    y *= env[:, None]
    if pan_curve is not None:
        mono = 0.5 * (y[:, 0] + y[:, 1])
        y = dsp.pan_curve(mono, pan_curve) * np.sqrt(2.0) * 0.8 + 0.2 * y
    return y


def stereo_glints(rng: np.random.Generator, times: np.ndarray, freqs: np.ndarray, amps: np.ndarray, total_dur: float,
                  tau: float = 0.1, pan_spread: float = 0.7, bright: float = 1.0) -> np.ndarray:
    """A cloud of tiny glass pings at given times/pitches (stereo, randomly panned)."""
    n = secs(total_dur)
    out = np.zeros((n, 2))
    for t0, f, a in zip(times, freqs, amps):
        g = glass(float(f), min(total_dur - float(t0), tau * 6 + 0.1), tau=tau, bright=bright, glide=0.02,
                  glide_tau=0.004, attack_ms=1.0, rng=rng)
        dsp.mix_into(out, dsp.pan(g, rng.uniform(-pan_spread, pan_spread)), secs(float(t0)), float(a))
    return out
