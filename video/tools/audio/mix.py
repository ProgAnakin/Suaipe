"""Mixing: bus processing, sidechain pumping + cue-driven ducking baked from cues.json, reverb/delay returns, master chain."""
from __future__ import annotations

import numpy as np

import dsp
import music as mu
from dsp import SR, secs, db2lin, lin2db

# ------------------------------------------------------------------------------------------- mix balance (dB)
# Mix targets for the music buses, in dBFS BEFORE the master chain. ('rms', x): average level over the frames where the bus is
# active (sustained instruments); ('peak', x): sample peak (drums). The gains are derived from the rendered stems at run time,
# so changing the arrangement never unbalances the mix. `trim` is an extra per-bus offset in dB.
MUSIC_TARGET = {
    "kick": ("peak", -10.5), "clap": ("peak", -16.5), "snare": ("peak", -17.5), "hat": ("peak", -23.0), "shaker": ("peak", -28.0),
    "rim": ("peak", -25.0), "bass": ("rms", -28.0), "sub": ("rms", -42.0), "heart": ("peak", -16.0),
    "pad": ("rms", -24.0), "drone": ("rms", -25.0), "hi": ("rms", -37.0), "final": ("rms", -23.0),
    "arp": ("rms", -27.5), "keys": ("rms", -27.5), "lead": ("rms", -30.0), "fx": ("rms", -37.0),
    "soft": ("rms", -26.0),           # the quiet drum-less pad of the `human` section (only bus without a v1 ancestor)
}
TRIM_DB: dict[str, float] = {}

# The gains (dB) that the targets above produced for the arrangement of bars 1-17 + the groove (the "v1" master the picture was cut to).
# They are FROZEN: re-deriving them from the stems would re-balance the whole film every time the closing scenes change (the loudest bus
# of an arrangement moves its mean level), and the first 33 s must stay identical. `generate.py --recalibrate` derives them afresh.
FROZEN_GAINS_DB = {
    "kick": -10.068502798672169, "clap": -14.290021462901468, "snare": -18.776746009947193, "hat": -16.747584354719187,
    "shaker": -19.486216586089462, "rim": -16.821292140529984, "bass": -23.437592312834216, "sub": -36.7254604351375,
    "heart": -20.262354813781887, "pad": -6.7375112739602905, "drone": -12.63898721533998, "hi": -12.642167965410117,
    "final": -12.428056651456668, "arp": -9.114965276802963, "keys": -14.907190513566233, "lead": -17.64484897597135,
    "fx": -15.149448217550916,
}
RECALIBRATE = False


def macro_points(sec: dict, duration: float) -> list[tuple[float, float]]:
    """Section macro curve of the whole music stem (time s, dB): the dynamic arc of the film - quiet hook, big drops, warm breakdown,
    a quiet human pause that lifts into the film's big resolving chord, and its ring-out - anchored to the section boundaries of the cue sheet."""
    d_a, d_b, cnt, em, sy, hu, out = (sec["drop-A"][0], sec["drop-B"], sec["counter"][0], sec["email"], sec["system"], sec["human"],
                                      sec["outro"][0])
    return [(0.0, -6.0), (d_a - 0.1, -1.0), (d_a, 0.0), (cnt, 0.0), (d_b[0], 0.5), (d_b[1] - 0.1, 0.5), (d_b[1] + 0.1, -3.5),
            (em[1] - 0.1, -2.0), (sy[0] + 0.1, 0.0), (sy[1] - 0.1, 0.5),
            (hu[0] + 0.4, HUMAN_DB[0]), (out - 1.0, HUMAN_DB[1]), (out - 0.1, HUMAN_DB[2]),
            (out, OUTRO_BUMP_DB), (out + 0.5, OUTRO_BUMP_DB), (out + 1.4, 0.0), (duration, -24.0)]


HUMAN_DB = (-1.5, -1.0, 0.5)       # macro (dB) of the quiet scene: at its start, a second before the downbeat, just before it
OUTRO_BUMP_DB = 3.5                # the resolving chord's first 500 ms (it then settles over the next second)
# return levels of the shared reverbs (linear)
REVERB_RETURN = {"room": 1.0, "plate": 1.0, "hall": 1.0}
MUSIC_SENDS = {  # bus -> {reverb: send gain}
    "clap": {"room": 0.35}, "snare": {"room": 0.30}, "hat": {"room": 0.10}, "rim": {"room": 0.3, "plate": 0.2},
    "pad": {"hall": 0.28}, "drone": {"hall": 0.20}, "hi": {"hall": 0.55, "plate": 0.2}, "final": {"hall": 0.30},
    "arp": {"plate": 0.22}, "keys": {"plate": 0.30, "hall": 0.1}, "lead": {"plate": 0.35, "hall": 0.30},
    "fx": {"hall": 0.2}, "soft": {"hall": 0.25, "plate": 0.10},
}


def ir_bank() -> dict[str, np.ndarray]:
    return {
        "room": dsp.make_ir(0.38, predelay=0.004, lp_hz=9000.0, hp_hz=260.0, early=8, early_span=0.04, build=0.008, seed=11),
        "plate": dsp.make_ir(1.5, predelay=0.012, lp_hz=9500.0, hp_hz=300.0, early=10, early_span=0.06, build=0.02, high_mult=0.6, seed=12),
        "hall": dsp.make_ir(3.4, predelay=0.022, lp_hz=6500.0, hp_hz=190.0, early=12, early_span=0.1, build=0.04, high_mult=0.45, seed=13),
    }


def active_rms_db(x: np.ndarray, frame_s: float = 0.1, floor_db: float = -45.0) -> float:
    """RMS (dBFS) averaged over the frames whose level is within `floor_db` of the loudest frame (ignores silence)."""
    f = secs(frame_s)
    n = (len(x) // f) * f
    if n == 0:
        return -120.0
    fr = np.mean(np.square(x[:n]).reshape(n // f, f, -1), axis=(1, 2))
    mx = fr.max()
    if mx <= 0:
        return -120.0
    sel = fr > mx * 10 ** (floor_db / 10.0)
    return float(10 * np.log10(np.mean(fr[sel])))


def bus_gain_db(name: str, x: np.ndarray) -> float:
    if name in FROZEN_GAINS_DB and not RECALIBRATE:
        return float(FROZEN_GAINS_DB[name] + TRIM_DB.get(name, 0.0))
    kind, target = MUSIC_TARGET[name]
    ref = lin2db(np.max(np.abs(x))) if kind == "peak" else active_rms_db(x)
    return float(target - ref + TRIM_DB.get(name, 0.0))


def apply_gain(x: np.ndarray, gain_db: float) -> np.ndarray:
    return x * db2lin(gain_db)


# ------------------------------------------------------------------------------------------- curves from cues
def sfx_ducks(cues: dict) -> dict[str, list]:
    """Duck windows (t0, t1, depth_lin, attack_s, release_s) per bus group, derived from the cue sheet at run time."""
    ev = cues["sfx"]
    by = {}
    for e in ev:
        by.setdefault(e["type"], []).append(e)
    t_of = lambda name: [float(e["t"]) for e in by.get(name, [])]
    mid, low, keys, hf = [], [], [], []

    def cluster(name, depth_db, pre=0.05, post=0.25, groups=("mid",), att=0.08, rel=0.35):
        ts = t_of(name)
        if not ts:
            return
        w = (min(ts) - pre, max(ts) + post, float(db2lin(depth_db)), att, rel)
        for g in groups:
            {"mid": mid, "low": low, "keys": keys, "hf": hf}[g].append(w)

    cluster("key", -5.0, pre=0.1, post=0.15, groups=("mid",))                 # typing passage: leave space for the key clicks
    cluster("key", -10.0, pre=0.1, post=0.15, groups=("hf",))                 # ... especially up where the clicks live (hats / shaker)
    cluster("chip-tick", -4.5, pre=0.1, post=0.3, groups=("mid",))
    cluster("chip-tick", -7.0, pre=0.1, post=0.3, groups=("hf",))
    cluster("count-tick", -3.5, pre=0.2, post=0.15, groups=("mid",))
    cluster("count-tick", -5.0, pre=0.2, post=0.15, groups=("hf",))
    cluster("success-chime", -3.5, pre=0.02, post=0.9, att=0.02, rel=0.5)
    cluster("notif-ping", -5.0, pre=0.02, post=0.8, groups=("keys", "mid"), att=0.02, rel=0.5)
    cluster("code-ding", -5.0, pre=0.02, post=1.0, groups=("keys", "mid"), att=0.02, rel=0.6)
    cluster("redeem-ding", -4.0, pre=0.02, post=0.4, groups=("keys", "mid"), att=0.02, rel=0.4)
    cluster("bag-rustle", -9.0, pre=0.05, post=0.50, groups=("keys", "mid"), att=0.03, rel=0.35)   # the real, close sound: the music steps back
    # (the soft logo accent at the end is only a secondary accent on the ringing chord: it ducks nothing, so the chord is never 'restarted')
    for name, depth_db, post in (("logo-hit", -4.0, 0.08), ("counter-hit", -4.5, 0.08)):
        for t in t_of(name):
            mid.append((t, t + post, float(db2lin(depth_db)), 0.004, 0.6))
            low.append((t, t + 0.40, float(db2lin(-10.0)), 0.004, 0.7))
    return {"mid": mid, "low": low, "keys": keys, "hf": hf}


def end_fade_curve(n: int, start: float = 43.4, end: float = 44.5) -> np.ndarray:
    """Squared raised-cosine fade to exact zero at `end` (the last sample is 0.0, the last 150 ms are below -60 dB re the tail)."""
    t = np.arange(n) / SR
    return np.where(t < start, 1.0, (0.5 + 0.5 * np.cos(np.pi * np.clip((t - start) / (end - start), 0, 1))) ** 2)


def air_gap_curve(n: int, gaps: list[tuple[float, float]], fade_ms: float = 5.0) -> np.ndarray:
    g = np.ones(n)
    f = dsp.ms(fade_ms)
    for t0, t1 in gaps:
        i0, i1 = secs(t0), secs(t1)
        dn = np.cos(0.5 * np.pi * np.linspace(0, 1, f, endpoint=False)) ** 2
        up = 1.0 - dn
        g[max(i0 - f, 0):i0] = np.minimum(g[max(i0 - f, 0):i0], dn[f - (i0 - max(i0 - f, 0)):])
        g[i0:i1] = 0.0
        e = min(i1 + f, n)
        g[i1:e] = np.minimum(g[i1:e], up[: e - i1])
    return g


def pump_curve(n: int, kicks: list, depth_db: float, release: float, attack: float = 0.004, kinds=None) -> np.ndarray:
    wins = []
    for t, v, kind in kicks:
        if kinds is not None and kind not in kinds:
            continue
        d = 1.0 - (1.0 - db2lin(depth_db)) * min(1.0, v / 0.9) * (0.4 if kind == "soft" else 1.0)
        wins.append((t, t + 0.002, d, attack, release * (0.7 if kind == "tight" else 1.0)))
    return mu.duck_curve(n, wins)


# ------------------------------------------------------------------------------------------- music bus
def process_music(sc: mu.Score, raw: dict, cues: dict, n: int, irs: dict) -> dict:
    """Turn the raw instrument stems into the mixed music stem. Returns dict(stem, buses, sends, curves)."""
    st = raw["stems"]
    sec = sc.sections
    S = lambda name: sec[name]
    ducks = sfx_ducks(cues)
    c_mid = mu.duck_curve(n, ducks["mid"])
    c_low = mu.duck_curve(n, ducks["low"])
    c_keys = mu.duck_curve(n, ducks["keys"])
    c_hf = mu.duck_curve(n, ducks["hf"]) * c_mid
    gap = air_gap_curve(n, sc.air_gaps)
    kicks = sc.kicks
    p_pad = pump_curve(n, kicks, -5.0, 0.20)
    p_bass = pump_curve(n, kicks, -3.5, 0.13)
    p_sub = pump_curve(n, kicks, -9.0, 0.19)
    p_arp = pump_curve(n, kicks, -2.5, 0.12)
    buses: dict[str, np.ndarray] = {}

    def gain(name):
        return 1.0

    # --- drums
    buses["kick"] = dsp.hp(st["kick"], 28, 2) * gain("kick")
    buses["clap"] = dsp.hp(st["clap"], 300, 2) * gain("clap") * c_mid[:, None]
    buses["snare"] = st["snare"] * gain("snare") * c_mid[:, None]
    buses["hat"] = dsp.hp(st["hat"], 5200, 2) * gain("hat") * c_hf[:, None]
    buses["shaker"] = dsp.hp(st["shaker"], 3800, 2) * gain("shaker") * c_hf[:, None]
    buses["rim"] = st["rim"] * gain("rim")
    # --- low end
    bass = dsp.lp(st["bass"], 2600, 2)
    buses["bass"] = bass * gain("bass") * (p_bass * c_low)[:, None]
    buses["sub"] = dsp.lp(st["sub"], 130, 2) * gain("sub") * (p_sub * c_low)[:, None]
    buses["heart"] = dsp.lp(st["heart"], 420, 2) * gain("heart")
    # --- pad: section-driven filter automation, trance-gate in the system section, pump + cue ducks
    cut = [(0, 1500), (S("drop-A")[0], 1500), (S("drop-A")[1], 2000), (S("groove-A")[0], 1800), (S("groove-A")[1], 2800),
           (S("build")[0], 2500), (S("build")[1], 8000), (S("counter")[1], 9000), (S("drop-B")[0] + 0.01, 6500),
           (S("drop-B")[1] - 1.0, 6000), (S("drop-B")[1], 700), (S("email")[0] + 4.0, 1100), (S("email")[1] - 0.5, 3200),
           (S("system")[0], 3600), (S("system")[1], 7000), (S("outro")[0], 7000), (cues["duration"], 7000)]
    cut = sorted({t: f for t, f in cut}.items())
    fc = dsp.smooth_curve(cut, n, kind="exp")
    pad = dsp.sweep(st["pad_raw"], "lp", fc, 0.85)
    pad = dsp.hp(pad, 140, 2)
    gate_g = mu.gate_curve(n, sc.gates, floor=0.22) if sc.gates else np.ones(n)
    in_sys = np.zeros(n)
    in_sys[secs(S("system")[0]):secs(S("system")[1]) + secs(0.4)] = 1.0       # (the gated pad's release is still ringing just after the stop)
    gate_mix = 1.0 - in_sys * (1.0 - gate_g)
    buses["pad"] = pad * gain("pad") * (p_pad * c_mid * gate_mix)[:, None]
    # drone (intro): dark, rising
    dr = dsp.sweep(st["drone_raw"], "lp", dsp.smooth_curve([(0, 130), (S("intro")[1], 1900)], n, kind="exp"), 1.4)
    dr = dsp.sat(dr * 1.4, 1.2)
    buses["drone"] = dr * gain("drone") * (c_mid)[:, None]
    # high shimmer layer
    hi = dsp.hp(dsp.lp(st["hi_raw"], 9000, 2), 500, 2)
    buses["hi"] = hi * gain("hi") * (c_mid * p_pad ** 0.5)[:, None]
    # final chord: closing low-pass (the ring-out itself is the macro curve's tail from 40.9 s)
    t_f = S("outro")[0]
    fcf = dsp.smooth_curve([(t_f, 6500), (t_f + 2.0, 3400), (cues["duration"], 900)], n, kind="exp")
    fin = dsp.sweep(st["final_raw"], "lp", fcf, 0.8)
    buses["final"] = dsp.hp(fin, 120, 2) * gain("final")
    # --- arps with ping-pong delay (dotted 8th)
    arp = dsp.hp(dsp.lp(st["arp"], 7200, 2), 200, 2)
    arp_g = (p_arp * c_mid)
    arp_dry = arp * gain("arp") * arp_g[:, None]
    echo_in = dsp.hp(dsp.lp(st["arp_mono"], 7200, 2), 200, 2) * gain("arp") * arp_g
    echo = dsp.pingpong(echo_in, 0.375, feedback=0.40, taps=8, lp_hz=3600.0, hp_hz=260.0)
    for t0, t1 in sc.echo_cuts:                                             # clean stop: the repeats of the last notes die out
        u = np.clip((np.arange(n) / SR - t0) / (t1 - t0), 0.0, 1.0)
        echo = echo * (0.5 + 0.5 * np.cos(np.pi * u))[:, None]
    buses["arp"] = arp_dry + 0.42 * echo
    # --- keys / lead
    keys = dsp.hp(dsp.lp(st["keys"], 3400, 2), 140, 2)
    buses["keys"] = keys * gain("keys") * c_keys[:, None]
    lead = dsp.hp(dsp.lp(st["lead"], 9000, 2), 280, 2)
    lead_echo = dsp.pingpong(lead[:, 0] * gain("lead"), 0.375, feedback=0.35, taps=5, lp_hz=4200.0, hp_hz=300.0, start_side=1)
    buses["lead"] = lead * gain("lead") + 0.3 * lead_echo
    buses["fx"] = st["fx"] * gain("fx")
    # human scene: quiet drum-less pad; its slowly opening filter is the lift into the downbeat (no riser noise)
    h0, h1 = S("human")
    fcs = dsp.smooth_curve([(0, 800), (h0, 800), (h0 + 1.4, 1200), (h1 - 0.6, 2200), (h1 + 0.2, 3600), (cues["duration"], 3600)], n, kind="exp")
    buses["soft"] = dsp.hp(dsp.sweep(st["soft_raw"], "lp", fcs, 0.85), 130, 2) * gain("soft") * c_mid[:, None]

    # --- calibrate every bus to its mix target, then apply the section macro curve
    gains_db = {k: bus_gain_db(k, buses[k]) for k in buses}
    for k in buses:
        buses[k] = buses[k] * db2lin(gains_db[k])

    # --- air gaps cut every dry bus (the reverb tails keep ringing: that is the 'air')
    for k in buses:
        buses[k] = buses[k] * gap[:, None]

    # --- reverb sends / returns
    sends = {"room": np.zeros(n), "plate": np.zeros(n), "hall": np.zeros(n)}
    for k, targets in MUSIC_SENDS.items():
        m = 0.5 * (buses[k][:, 0] + buses[k][:, 1])
        for rv, g in targets.items():
            sends[rv] += m * g
    wet = np.zeros((n, 2))
    for rv in sends:
        wet += reverb_cached(sends[rv], irs[rv]) * REVERB_RETURN[rv]
    dry = sum(buses.values())
    macro = db2lin(dsp.smooth_curve(macro_points(sec, float(cues['duration'])), n))
    gap_wet = 1.0 - (1.0 - db2lin(-12.0)) * (1.0 - gap)            # reverb tail ducked 12 dB while the dry music is cut
    stem = (dry + wet * gap_wet[:, None]) * macro[:, None]
    return {"stem": stem, "buses": buses, "wet": wet, "sends": sends, "gap": gap, "gains_db": gains_db, "macro": macro}


def reverb_cached(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    return dsp.reverb(x, ir)


# ------------------------------------------------------------------------------------------- sfx bus
def process_sfx(rendered: dict, n: int, irs: dict, sfx_gain_db: float = 0.0) -> dict:
    """SFX bus: dry shots (28 Hz high-pass) + shared reverb returns. No bus compression on purpose: a 1.5:1 glue stage was tried and
    cost the UI transients 2-4 dB of cut-through, while the master limiter already catches the few hit peaks."""
    dry = dsp.hp(rendered["dry"], 28, 2)
    wet = np.zeros((n, 2))
    for rv, x in rendered["sends"].items():
        if np.any(x):
            wet += reverb_cached(dsp.hp(x, 120, 1), irs[rv]) * REVERB_RETURN[rv]
    stem = (dry + wet) * db2lin(sfx_gain_db)
    return {"stem": stem, "dry": dry, "wet": wet}


# ------------------------------------------------------------------------------------------- master
def master_chain(x: np.ndarray, n_total: int, target_lufs: float = -14.0, ceiling_db: float = -1.3,
                 eq: dict | None = None, verbose: bool = True):
    """HP -> gentle EQ -> mono bass -> glue compression -> gain to target -> true-peak limiter (the stems already end in a fade)."""
    eq = eq or {}
    y = dsp.hp(x, 28, 2)
    y = dsp.hp(y, 28, 2)
    for f0, q, g in eq.get("peaks", []):
        y = dsp.biquad(y, "peak", f0, q, g)
    y = dsp.biquad(y, "highshelf", eq.get("hs_f", 11000.0), 0.7, eq.get("hs_db", -2.0))
    y = dsp.lp(y, 17000, 2)
    y = dsp.mono_bass(y, 140.0)
    y, gr = dsp.compressor(y, thr_db=-19.0, ratio=1.8, attack_ms=28.0, release_ms=220.0, knee_db=8.0, makeup_db=0.0)
    pre = y.copy()
    gain_db = target_lufs - dsp.lufs_integrated(pre)
    out = None
    for it in range(8):
        g = pre * db2lin(gain_db)
        out, red = dsp.tp_limiter(g, ceiling_db, lookahead_ms=2.0, release_ms=90.0)
        got = dsp.lufs_integrated(out)
        if verbose:
            print(f"   master iter {it}: gain {gain_db:+.2f} dB -> {got:.2f} LUFS, max GR {red.min():.2f} dB")
        if abs(got - target_lufs) < 0.05:
            break
        gain_db += target_lufs - got
    return out, {"gain_db": gain_db, "gr_min": float(red.min()), "gr_p99": float(np.percentile(red, 1.0))}
