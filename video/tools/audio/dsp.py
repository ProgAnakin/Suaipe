"""Low-level DSP building blocks for the Suaipe film soundtrack generator.

Everything here is plain numpy/scipy, deterministic and sample-rate aware (48 kHz).
Conventions
  * audio is float64, mono = shape (n,), stereo = shape (n, 2)
  * 0 dBFS = 1.0
  * every function that creates a "one-shot" is expected to be faded at its edges by
    the caller (see `edge_fades`) so no click can reach the master.
"""
from __future__ import annotations

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

SR = 48_000
NYQ = SR / 2.0


# --------------------------------------------------------------------------- units
def ms(v: float) -> int:
    """milliseconds -> samples"""
    return int(round(v * SR / 1000.0))


def secs(v: float) -> int:
    """seconds -> samples"""
    return int(round(v * SR))


def db2lin(db: float | np.ndarray) -> float | np.ndarray:
    return 10.0 ** (np.asarray(db, dtype=float) / 20.0)


def lin2db(x: float | np.ndarray) -> float | np.ndarray:
    return 20.0 * np.log10(np.maximum(np.abs(x), 1e-12))


def mtof(m: float | np.ndarray) -> float | np.ndarray:
    """MIDI note number -> Hz (A4 = 69 = 440 Hz)"""
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note(name: str) -> int:
    """'A4' -> 69, 'C#5' -> 73, 'Bb3' -> 58"""
    pc = _PC[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        pc += 1 if name[i] == "#" else -1
        i += 1
    return pc + 12 * (int(name[i:]) + 1)


def nhz(name: str) -> float:
    return float(mtof(note(name)))


# --------------------------------------------------------------------------- envelopes
def cos_ramp(n: int) -> np.ndarray:
    """0 -> 1 raised-cosine ramp of n samples (first sample exactly 0)."""
    if n <= 0:
        return np.zeros(0)
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def edge_fades(x: np.ndarray, fade_in_ms: float = 1.5, fade_out_ms: float = 4.0) -> np.ndarray:
    """In-place raised-cosine fade at both ends (guarantees no click at a one-shot's edges)."""
    n = len(x)
    a = min(ms(fade_in_ms), n // 2)
    b = min(ms(fade_out_ms), n // 2)
    if a > 0:
        r = cos_ramp(a)
        x[:a] *= r if x.ndim == 1 else r[:, None]
    if b > 0:
        r = cos_ramp(b)[::-1]
        x[n - b:] *= r if x.ndim == 1 else r[:, None]
    return x


def fade_tail(x: np.ndarray, fade_ms: float = 12.0) -> np.ndarray:
    """In-place raised-cosine fade-out over the last min(fade_ms, n/4) samples, so a synthesised voice always ends at exactly 0."""
    n = len(x)
    f = min(ms(fade_ms), n // 4)
    if f > 1:
        r = cos_ramp(f)[::-1]
        x[n - f:] *= r if x.ndim == 1 else r[:, None]
    elif n:
        x[-1:] = 0.0
    return x


def expd(n: int, tau_s: float) -> np.ndarray:
    """exp(-t/tau)"""
    return np.exp(-np.arange(n) / (max(tau_s, 1e-6) * SR))


def attack_decay(n: int, attack_ms: float, tau_s: float) -> np.ndarray:
    """Percussive envelope: raised-cosine attack then exponential decay."""
    e = expd(n, tau_s)
    a = min(ms(attack_ms), n)
    if a > 0:
        e[:a] *= cos_ramp(a)
    return fade_tail(e, 8.0)


def smooth_curve(points: list[tuple[float, float]], n: int, t0: float = 0.0, kind: str = "lin") -> np.ndarray:
    """Piece-wise curve through (time_s, value) points evaluated on n samples starting at t0.

    kind 'lin' = linear, 'exp' = geometric interpolation (all values must be > 0).
    """
    ts = np.array([p[0] for p in points], dtype=float)
    vs = np.array([p[1] for p in points], dtype=float)
    t = t0 + np.arange(n) / SR
    if kind == "exp":
        return np.exp(np.interp(t, ts, np.log(vs)))
    return np.interp(t, ts, vs)


# --------------------------------------------------------------------------- filters
def biquad_coefs(kind: str, f0, q=0.7071, gain_db=0.0):
    """RBJ cookbook biquad coefficients, vectorised over f0 / q. Returns (b0,b1,b2,a1,a2) normalised by a0."""
    f0 = np.clip(np.asarray(f0, dtype=float), 10.0, 0.46 * SR)
    q = np.maximum(np.asarray(q, dtype=float), 0.05)
    w0 = 2 * np.pi * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2 * q)
    A = 10 ** (np.asarray(gain_db, dtype=float) / 40.0)
    if kind == "lp":
        b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    elif kind == "hp":
        b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    elif kind == "bp":  # constant 0 dB peak gain
        b0, b1, b2 = alpha, 0 * alpha, -alpha
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    elif kind == "notch":
        b0, b1, b2 = 1 + 0 * alpha, -2 * cw, 1 + 0 * alpha
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    elif kind == "peak":
        b0, b1, b2 = 1 + alpha * A, -2 * cw, 1 - alpha * A
        a0, a1, a2 = 1 + alpha / A, -2 * cw, 1 - alpha / A
    elif kind == "lowshelf":
        sA = 2 * np.sqrt(A) * alpha
        b0 = A * ((A + 1) - (A - 1) * cw + sA)
        b1 = 2 * A * ((A - 1) - (A + 1) * cw)
        b2 = A * ((A + 1) - (A - 1) * cw - sA)
        a0 = (A + 1) + (A - 1) * cw + sA
        a1 = -2 * ((A - 1) + (A + 1) * cw)
        a2 = (A + 1) + (A - 1) * cw - sA
    elif kind == "highshelf":
        sA = 2 * np.sqrt(A) * alpha
        b0 = A * ((A + 1) + (A - 1) * cw + sA)
        b1 = -2 * A * ((A - 1) + (A + 1) * cw)
        b2 = A * ((A + 1) + (A - 1) * cw - sA)
        a0 = (A + 1) - (A - 1) * cw + sA
        a1 = 2 * ((A - 1) - (A + 1) * cw)
        a2 = (A + 1) - (A - 1) * cw - sA
    else:
        raise ValueError(kind)
    return b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0


def biquad(x: np.ndarray, kind: str, f0: float, q: float = 0.7071, gain_db: float = 0.0) -> np.ndarray:
    b0, b1, b2, a1, a2 = (float(v) for v in biquad_coefs(kind, f0, q, gain_db))
    return signal.lfilter([b0, b1, b2], [1.0, a1, a2], x, axis=0)


def lp(x, f, order: int = 2):
    return signal.sosfilt(signal.butter(order, f, "lp", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order: int = 2):
    return signal.sosfilt(signal.butter(order, f, "hp", fs=SR, output="sos"), x, axis=0)


def bp(x, f_lo, f_hi, order: int = 2):
    return signal.sosfilt(signal.butter(order, [f_lo, f_hi], "bp", fs=SR, output="sos"), x, axis=0)


def sweep(x: np.ndarray, kind: str, f_curve, q_curve=0.7071, block: int = 96) -> np.ndarray:
    """Time-varying biquad (cutoff / centre and Q automation), processed in short blocks.

    State is carried across blocks so there is no discontinuity; the block size (2 ms)
    is far below the speed of any sweep used here.
    """
    x = np.asarray(x, dtype=float)
    n = len(x)
    f_curve = np.broadcast_to(np.asarray(f_curve, dtype=float), (n,))
    q_curve = np.broadcast_to(np.asarray(q_curve, dtype=float), (n,))
    centers = np.minimum(np.arange(0, n, block) + block // 2, n - 1)
    b0, b1, b2, a1, a2 = biquad_coefs(kind, f_curve[centers], q_curve[centers])
    y = np.empty_like(x)
    zi = np.zeros((2,) + x.shape[1:])
    for k, i in enumerate(range(0, n, block)):
        j = min(i + block, n)
        y[i:j], zi = signal.lfilter([b0[k], b1[k], b2[k]], [1.0, a1[k], a2[k]], x[i:j], axis=0, zi=zi)
    return y


# --------------------------------------------------------------------------- noise / oscillators
def white(rng: np.random.Generator, n: int, ch: int | None = None) -> np.ndarray:
    shape = (n,) if ch is None else (n, ch)
    return rng.standard_normal(shape)


def pink(rng: np.random.Generator, n: int) -> np.ndarray:
    """1/f noise via FFT shaping, unit RMS."""
    w = rng.standard_normal(n)
    spec = np.fft.rfft(w)
    f = np.arange(len(spec), dtype=float)
    f[0] = 1.0
    spec /= np.sqrt(f)
    spec[0] = 0.0
    y = np.fft.irfft(spec, n)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-12)


def phase_of(freq_curve: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    """Instantaneous phase (radians) for a per-sample frequency curve (Hz)."""
    return phase0 + 2 * np.pi * np.cumsum(freq_curve) / SR


def sine(freq: float | np.ndarray, n: int, phase0: float = 0.0) -> np.ndarray:
    if np.isscalar(freq):
        return np.sin(phase0 + 2 * np.pi * freq * np.arange(n) / SR)
    return np.sin(phase_of(np.asarray(freq, dtype=float), phase0))


def _polyblep(t: np.ndarray, dt) -> np.ndarray:
    """PolyBLEP residual for a phase ramp t in [0,1) with per-sample (or scalar) phase increment dt."""
    dt = np.broadcast_to(np.asarray(dt, dtype=float), t.shape)
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]
    y[m] = x * x + x + x + 1.0
    return y


def saw(freq: float, n: int, phase0: float = 0.0) -> np.ndarray:
    """Band-limited (PolyBLEP) rising saw at a constant frequency."""
    dt = freq / SR
    t = (phase0 + dt * np.arange(n)) % 1.0
    return 2.0 * t - 1.0 - _polyblep(t, dt)


def saw_curve(freq_curve: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    """Band-limited saw following a per-sample frequency curve (Hz)."""
    dt = np.asarray(freq_curve, dtype=float) / SR
    t = (phase0 + np.cumsum(dt)) % 1.0
    return 2.0 * t - 1.0 - _polyblep(t, dt)


def square(freq: float, n: int, pw: float = 0.5, phase0: float = 0.0) -> np.ndarray:
    """Band-limited (PolyBLEP) pulse wave."""
    dt = freq / SR
    t = (phase0 + dt * np.arange(n)) % 1.0
    y = np.where(t < pw, 1.0, -1.0)
    y = y + _polyblep(t, dt) - _polyblep((t - pw) % 1.0, dt)
    return y


def additive(freq: float, ratios, amps, taus, n: int, phases=None, max_hz: float = 15_000.0) -> np.ndarray:
    """Sum of decaying sine partials. `taus` = exponential decay constant (s) per partial (inf = sustained)."""
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, (r, a, tau) in enumerate(zip(ratios, amps, taus)):
        f = freq * r
        if f > max_hz or a == 0:
            continue
        ph = 0.0 if phases is None else phases[i]
        env = np.exp(-t / tau) if np.isfinite(tau) else 1.0
        y += a * env * np.sin(ph + 2 * np.pi * f * t)
    return fade_tail(y, 10.0)


# --------------------------------------------------------------------------- saturation
def sat(x, drive: float = 1.5):
    """Symmetric tanh soft clip, unity small-signal gain-ish (normalised to the drive)."""
    return np.tanh(drive * x) / np.tanh(drive)


def sat_warm(x, drive: float = 1.5, bias: float = 0.15):
    """Asymmetric tanh (adds even harmonics) with DC removed."""
    y = np.tanh(drive * (x + bias)) - np.tanh(drive * bias)
    y = y / (np.tanh(drive * (1 + bias)) - np.tanh(drive * bias))
    return y - np.mean(y, axis=0)


def sat_os(x, fn, factor: int = 2):
    """Apply a non-linearity with oversampling to keep aliasing out of the audible band."""
    up = signal.resample_poly(x, factor, 1, axis=0)
    return signal.resample_poly(fn(up), 1, factor, axis=0)


# --------------------------------------------------------------------------- stereo helpers
def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Constant-power pan of a mono signal; p in [-1, 1]. Returns (n, 2)."""
    a = (p + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def pan_curve(x: np.ndarray, p: np.ndarray) -> np.ndarray:
    a = (np.asarray(p) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def stereo(x: np.ndarray) -> np.ndarray:
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def width(x: np.ndarray, w: float) -> np.ndarray:
    """Mid/side width scaling (w=1 unchanged, 0 = mono)."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1]) * w
    return np.stack([m + s, m - s], axis=1)


def mono_bass(x: np.ndarray, f: float = 150.0) -> np.ndarray:
    """Keep everything below `f` centred (side channel high-passed)."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = hp(0.5 * (x[:, 0] - x[:, 1]), f)
    return np.stack([m + s, m - s], axis=1)


def decorrelate(rng: np.random.Generator, x: np.ndarray, amount: float = 1.0) -> np.ndarray:
    """Cheap stereo decorrelator: a chain of random 2nd-order all-passes per side (mono-safe, keeps magnitude)."""
    out = []
    for _ in range(2):
        y = x
        for _ in range(4):
            f0 = rng.uniform(250, 3500)
            w0 = 2 * np.pi * f0 / SR
            alpha = np.sin(w0) / (2 * 0.6)
            b = np.array([1 - alpha, -2 * np.cos(w0), 1 + alpha])
            a = np.array([1 + alpha, -2 * np.cos(w0), 1 - alpha])
            y = signal.lfilter(b / a[0], a / a[0], y)
        out.append(y)
    d = np.stack(out, axis=1)
    return (1 - amount) * stereo(x) + amount * d


# --------------------------------------------------------------------------- placement
def mix_into(dst: np.ndarray, src: np.ndarray, start: int, gain: float = 1.0) -> None:
    """dst[start:start+len(src)] += gain*src (clipped to dst bounds, negative starts allowed)."""
    n = len(dst)
    s0 = max(0, -start)
    d0 = max(0, start)
    d1 = min(n, start + len(src))
    if d1 <= d0:
        return
    dst[d0:d1] += gain * src[s0:s0 + (d1 - d0)]


# --------------------------------------------------------------------------- reverb / delay
def make_ir(rt60: float, predelay: float = 0.012, lp_hz: float = 8000.0, hp_hz: float = 180.0,
            early: int = 10, early_span: float = 0.075, build: float = 0.025,
            low_mult: float = 1.15, high_mult: float = 0.5, seed: int = 1) -> np.ndarray:
    """Synthetic stereo impulse response: sparse early reflections + dense exponentially decaying tail.

    The tail is built from three noise bands with their own decay time (warm lows ring a bit longer,
    highs die earlier), then band-limited and normalised to unit energy.
    """
    rng = np.random.default_rng(seed)
    pre = secs(predelay)
    length = pre + secs(rt60 * 1.1)
    t = np.maximum(np.arange(length) - pre, 0) / SR
    k_decay = 6.9078  # ln(1000): -60 dB after rt60
    ir = np.zeros((length, 2))
    for ch in range(2):
        nz = rng.standard_normal(length)
        lo = lp(nz, 400.0, 2)
        mid = bp(nz, 400.0, 3500.0, 2)
        hi = hp(nz, 3500.0, 2)
        tail = (0.9 * lo * np.exp(-k_decay * t / (rt60 * low_mult))
                + mid * np.exp(-k_decay * t / rt60)
                + 0.8 * hi * np.exp(-k_decay * t / (rt60 * high_mult)))
        tail *= 1.0 - np.exp(-t / build)
        tail[:pre] = 0.0
        # sparse early reflections, scaled against the tail's early level
        ref = np.std(tail[pre + secs(0.03):pre + secs(0.12)]) + 1e-9
        for _ in range(early):
            e = rng.uniform(0.004, early_span)
            idx = pre + secs(e)
            if idx < length:
                tail[idx] += rng.choice([-1.0, 1.0]) * rng.uniform(0.6, 1.0) * 6.0 * ref * np.exp(-e / 0.04)
        ir[:, ch] = tail
    ir = lp(ir, lp_hz, 2)
    ir = hp(ir, hp_hz, 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True).mean())
    return ir


def reverb(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Convolve a mono/stereo send with a stereo IR (mono-summed send -> true stereo wet)."""
    mono = x if x.ndim == 1 else 0.5 * (x[:, 0] + x[:, 1])
    out = np.stack([signal.fftconvolve(mono, ir[:, 0]), signal.fftconvolve(mono, ir[:, 1])], axis=1)
    return out[: len(mono)]


def pingpong(x: np.ndarray, delay_s: float, feedback: float = 0.38, taps: int = 7, lp_hz: float = 3800.0,
             hp_hz: float = 220.0, start_side: int = 0) -> np.ndarray:
    """Filtered ping-pong echoes of a mono signal (echoes only - no dry). Returns stereo, same length as x."""
    d = secs(delay_s)
    n = len(x)
    out = np.zeros((n, 2))
    cur = x
    for k in range(1, taps + 1):
        cur = hp(lp(cur, lp_hz, 1), hp_hz, 1) * feedback
        side = (start_side + k - 1) % 2
        if k * d >= n:
            break
        out[k * d:, side] += cur[: n - k * d]
    return out


# --------------------------------------------------------------------------- dynamics
def compressor(x: np.ndarray, thr_db: float = -18.0, ratio: float = 2.0, attack_ms: float = 15.0,
               release_ms: float = 160.0, knee_db: float = 6.0, makeup_db: float = 0.0,
               sidechain: np.ndarray | None = None, ctrl: int = 16) -> tuple[np.ndarray, np.ndarray]:
    """Feed-forward linked peak compressor evaluated at a control rate of SR/ctrl. Returns (y, gain_db curve)."""
    sc = x if sidechain is None else sidechain
    peak = np.max(np.abs(sc), axis=1) if sc.ndim == 2 else np.abs(sc)
    n = len(peak)
    m = n // ctrl
    pk = peak[: m * ctrl].reshape(m, ctrl).max(axis=1)
    lvl = lin2db(pk)
    over = lvl - thr_db
    w = knee_db
    gr = np.zeros(m)
    hard = 2 * over > w
    soft = (2 * np.abs(over) <= w)
    gr[hard] = (1.0 / ratio - 1.0) * over[hard]
    gr[soft] = (1.0 / ratio - 1.0) * (over[soft] + w / 2) ** 2 / (2 * w)
    # ballistics (loop at control rate)
    ca = np.exp(-1.0 / (attack_ms * 1e-3 * SR / ctrl))
    cr = np.exp(-1.0 / (release_ms * 1e-3 * SR / ctrl))
    g = np.empty(m)
    s = 0.0
    for i in range(m):
        tgt = gr[i]
        c = ca if tgt < s else cr
        s = c * s + (1 - c) * tgt
        g[i] = s
    centers = (np.arange(m) + 0.5) * ctrl
    g_full = np.interp(np.arange(n), centers, g)
    gain = db2lin(g_full + makeup_db)
    y = x * (gain[:, None] if x.ndim == 2 else gain)
    return y, g_full


def _release_follow(r: np.ndarray, tau_samples: float, chunk: int = 400_000) -> np.ndarray:
    """r_s[n] = max(r[n], r_s[n-1]*exp(-1/tau)) computed exactly with vectorised cummax in chunks."""
    out = np.empty_like(r)
    carry = 0.0
    k = np.exp(-1.0 / tau_samples)
    for i in range(0, len(r), chunk):
        seg = r[i:i + chunk]
        idx = np.arange(len(seg))
        scale = np.exp(idx / tau_samples)
        v = np.maximum.accumulate(seg * scale)
        v = np.maximum(v, carry * k ** (idx + 1) * scale)
        res = v / scale
        out[i:i + chunk] = res
        carry = res[-1]
    return out


def true_peak(x: np.ndarray, os: int = 4) -> float:
    """Inter-sample ('true') peak in dBFS via polyphase oversampling."""
    up = signal.resample_poly(x, os, 1, axis=0)
    return float(lin2db(np.max(np.abs(up))))


def tp_limiter(x: np.ndarray, ceiling_db: float = -1.3, lookahead_ms: float = 2.0, release_ms: float = 90.0,
               os: int = 4) -> tuple[np.ndarray, np.ndarray]:
    """Look-ahead true-peak limiter. Returns (limited, gain_reduction_db per sample at base rate).

    1. oversample, find per-sample required gain
    2. sliding minimum over +/- lookahead, smoothed by a Hann window of the same width -> smooth attack
       that is guaranteed to be <= required gain at every peak
    3. exponential release applied on the gain reduction (exact, vectorised)
    """
    ceil = db2lin(ceiling_db)
    up = signal.resample_poly(x, os, 1, axis=0)
    pk = np.max(np.abs(up), axis=1)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    la = max(2, int(lookahead_ms * 1e-3 * SR * os))
    gmin = minimum_filter1d(need, size=2 * la + 1, mode="nearest")
    win = np.hanning(2 * la + 1)
    win /= win.sum()
    g = np.convolve(np.pad(gmin, (la, la), mode="edge"), win, mode="valid")
    g = np.minimum(g, need)  # never less reduction than required (numerical safety)
    r = 1.0 - g
    r = _release_follow(r, release_ms * 1e-3 * SR * os / 3.0)
    g = 1.0 - r
    # decimate conservatively (min over each oversampled group) back to the base rate
    n = len(x)
    g_base = g[: n * os].reshape(n, os).min(axis=1)
    return x * g_base[:, None], lin2db(g_base)


# --------------------------------------------------------------------------- loudness (ITU-R BS.1770-4)
_KB1 = np.array([1.53512485958697, -2.69169618940638, 1.19839281085285])
_KA1 = np.array([1.0, -1.69065929318241, 0.73248077421585])
_KB2 = np.array([1.0, -2.0, 1.0])
_KA2 = np.array([1.0, -1.99004745483398, 0.99007225036621])


def k_weight(x: np.ndarray) -> np.ndarray:
    y = signal.lfilter(_KB1, _KA1, x, axis=0)
    return signal.lfilter(_KB2, _KA2, y, axis=0)


def _block_ms(xk: np.ndarray, block_s: float = 0.4, hop_s: float = 0.1) -> np.ndarray:
    """Mean-square per block, per channel -> (nblocks, nch)."""
    if xk.ndim == 1:
        xk = xk[:, None]
    b, h = secs(block_s), secs(hop_s)
    c = np.concatenate([np.zeros((1, xk.shape[1])), np.cumsum(xk ** 2, axis=0)])
    starts = np.arange(0, len(xk) - b + 1, h)
    return (c[starts + b] - c[starts]) / b


def lufs_integrated(x: np.ndarray) -> float:
    """Gated integrated loudness (absolute -70 LUFS, relative -10 LU)."""
    z = _block_ms(k_weight(x))
    if len(z) == 0:
        return -120.0
    l = -0.691 + 10 * np.log10(np.maximum(z.sum(axis=1), 1e-20))
    keep = l > -70.0
    if not keep.any():
        return -120.0
    rel = -0.691 + 10 * np.log10(z[keep].sum(axis=1).mean()) - 10.0
    keep = l > max(rel, -70.0)
    if not keep.any():
        return -120.0
    return float(-0.691 + 10 * np.log10(z[keep].sum(axis=1).mean()))


def lufs_ungated(x: np.ndarray) -> float:
    """Plain K-weighted mean loudness of a segment (no gating) - for per-section figures."""
    xk = k_weight(x)
    if xk.ndim == 1:
        xk = xk[:, None]
    return float(-0.691 + 10 * np.log10(max(np.sum(np.mean(xk ** 2, axis=0)), 1e-20)))


def short_term_curve(x: np.ndarray, win_s: float = 3.0, hop_s: float = 0.25) -> tuple[np.ndarray, np.ndarray]:
    z = _block_ms(k_weight(x), win_s, hop_s)
    t = (np.arange(len(z)) * hop_s) + win_s
    return t, -0.691 + 10 * np.log10(np.maximum(z.sum(axis=1), 1e-20))


def rms_db(x: np.ndarray) -> float:
    return float(lin2db(np.sqrt(np.mean(np.square(x)))))
