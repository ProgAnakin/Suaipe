# Suaipe film soundtrack generator

Original music + sound design for the 44.5 s LinkedIn film (4:5, 120 BPM), synthesised entirely in code and locked to the
cue sheet `audio/cues.json` (the same numbers as `src/timeline.ts`). No samples, no downloads, deterministic.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r tools/audio/requirements.txt
python tools/audio/generate.py --ffmpeg /path/to/ffmpeg      # ~50 s, writes everything below
python tools/audio/generate.py --skip-qa                      # ~30 s, audio only
```

Re-run it whenever `audio/cues.json` changes (`npm run cues` regenerates the cue sheet from `src/timeline.ts`): every sound effect,
every duck and every chord-dependent pitch is derived from the cue data at run time, and the music is anchored to the cue sheet's
sections on its 120 BPM bar grid (a change to the bar structure itself means editing `music.compose`).

| input | output |
|---|---|
| `audio/cues.json` (read-only) | `public/audio/soundtrack.wav` - master, 16-bit / 48 kHz / stereo, 44.500 s, -14 LUFS, <= -1.3 dBTP |
| | `public/audio/soundtrack.mp3` - same master, 320 kbps (libmp3lame), same length (decodes to exactly 44.500 s: it carries the LAME gapless tag; a player that ignores that tag starts 23 ms late - use the WAV for frame-accurate work) |
| | `public/audio/stems/music.wav`, `stems/sfx.wav` - pre-master buses, 24-bit, sum peaks at -1 dBFS, music + sfx = the master chain's input |
| | `audio/qa/` - `report.md`, `spectrogram*.png`, `loudness-and-spectrum.png`, `cue-placement.csv` (every cue: target time, accent sample, peak) |
| | `audio/build/` - scratch (git-ignored) |

Options: `--cues`, `--out-dir`, `--qa-dir`, `--build-dir`, `--ffmpeg` (or `$FFMPEG`), `--target-lufs`, `--ceiling-db`,
`--music-gain-db` / `--sfx-gain-db` (balance trims before the master), `--skip-qa`.
Re-balance without re-synthesising: `python tools/audio/generate.py --from-stems --music-gain-db -2 --sfx-gain-db 1`
sums `public/audio/stems/*.wav`, runs the same master chain and writes `public/audio/soundtrack_remix.wav/.mp3`.
ffmpeg needs `libmp3lame`, `ebur128` with `peak=true` and `showspectrumpic`.

## Files

| file | what |
|---|---|
| `generate.py` | CLI + pipeline: cues -> music -> sfx -> stems -> master -> wav / mp3 -> QA |
| `dsp.py` | filters (RBJ biquads, swept filters), PolyBLEP saw, noise, saturation, synthetic-IR convolution reverb, ping-pong delay, compressor, look-ahead true-peak limiter, BS.1770 loudness |
| `theory.py` | chord map from the cue sheet (`Harmony.at(t)`), chord tones / consonant extensions, pentatonic runs |
| `synth.py` | glass / bell, pluck, thump, noise-sweep voices shared by sfx and music |
| `sfx.py` | the 45 sound designers (one function per cue `type`), sample-exact placement, reverb sends |
| `instruments.py` | music voices: kick, clap, snare, hats, bass, pads, plucks, e-piano, bell lead, textures |
| `music.py` | the composition (`compose`) and instrument rendering (`render_music`) |
| `mix.py` | bus processing, sidechain pumping, cue-driven ducking, reverbs, macro dynamics, master chain |
| `qa.py` | measurements and `report.md` |

## How it is built

**Sound design (sfx.py).** Every cue `type` has one designer returning a stereo one-shot plus the *sample index of its accent*.
The placer starts the sound at `round(target * 48000) - accent`, where `target` is the cue time (transients), the `accent` field
(swipes: the card registers, the whoosh peaks there), the end of the riser (`riser-a` ends on the lock-on, `riser-b` on the logo hit)
or the whoosh's own peak (whooshes start at their cue and peak where the picture moves). All sounds have a >= 1 ms rounded attack
and a >= 3 ms release, so nothing clicks. Palette: glassy inharmonic bells (partials 1 : 2.76 : 5.4 : 8.9 with their own decays) for
tiles / chips / chimes, soft plucks for nodes, tuned sine thumps with saturation (harmonics at 120-800 Hz so phones can hear them)
for knocks, taps and impacts, band-passed noise sweeps for whooshes and risers, and a tuned sub + glass chord + air for the three
hits. Pitched sounds take their notes from the chord of the bar they land in (`theory.py`); the QA report audits every one.

**Music (music.py / instruments.py).** A 22-bar chord-locked score following the section brief: dark drone + sparse sub heartbeat
(no drums) in the hook; kick, bass, pad and a gentle plucked arpeggio from the 4.0 drop; hats / shaker / backbeat for the typing
groove (thinned out while the keys are typed); fills and a rising filter through the swipes; the counter bar drops the kick at 21.0,
runs an accelerating snare roll and cuts everything for a 0.15 s air gap before the 22.0 hit; a bell lead for drop B; a low-passed
electric-piano breakdown for the e-mail; gated pad + staccato arps for the system diagram; the final C chord at 40.0 that
rings out into the Cadd9 and fades to silence. Arps are generated bar by bar from templates and a seeded RNG (varied, never copy-pasted,
always chord tones).

**Mix (mix.py).** Each music bus is calibrated to a target level (RMS or peak, `MUSIC_TARGET`) so the balance survives arrangement
changes; kick-triggered pumping on pad / bass / sub; ducking windows are computed from the cue list (typing, ticks, hits, chimes,
the notif-ping and code-ding) so the UI sounds sit in clear air; three synthetic reverbs (room / plate / hall) are shared by send;
`macro_points` is the dynamic arc of the film; both stems fade to exact digital zero over the last 1.1 s. Master: 4th-order HP at 28 Hz,
gentle 300 Hz / 11 kHz EQ, bass mono below 140 Hz, 1.8:1 glue compressor, gain to -14 LUFS (iterated against the limiter),
4x-oversampled look-ahead true-peak limiter at -1.3 dBFS.

**QA (qa.py).** Loudness (ffmpeg ebur128 on the WAV and on the decoded MP3, plus an independent BS.1770 meter), sections, band
energy, mono compatibility, DC, clipping, tail, phone-speaker simulation, sync detection on the rendered SFX stem plus an isolated
check of all 146 cues, SFX cut-through versus the music, harmony audit (cue notes and a chroma check of the music), click scan,
automatic warnings. Spectrograms come from ffmpeg `showspectrumpic`.

## Tuning cheat-sheet

* a sound is too loud / quiet: `sfx.LEVEL[type]` (dBFS peak before the master) or `mix.MUSIC_TARGET[bus]`
* more / less room: `sfx.SEND[type]`, `mix.MUSIC_SENDS`, `mix.ir_bank()`
* the arc of the film: `mix.macro_points`; the section arrangement: `music.compose` (bar-locked to 120 BPM, anchored to the section times of the cue sheet; the SFX are fully data-driven)
* duck depth under typing / ticks / hits: `mix.sfx_ducks`
* a new cue type: add `@sfx("name")` in `sfx.py` returning a `Shot`, a `LEVEL` entry and (optionally) a `SEND` entry
* balance music vs sfx without touching sounds: `--music-gain-db` / `--sfx-gain-db`

Everything uses fixed seeds (`numpy.random.default_rng`), so identical inputs give byte-identical output.
