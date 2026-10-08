# Suaipe film soundtrack generator

Original music + sound design for the 44.5 s LinkedIn film (4:5, 120 BPM), synthesised entirely in code and locked to the
cue sheet `audio/cues.json` (the same numbers as `src/timeline.ts`). No samples, no downloads, deterministic.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r tools/audio/requirements.txt
python tools/audio/generate.py --ffmpeg /path/to/ffmpeg      # ~75 s, writes everything below
python tools/audio/generate.py --skip-qa                      # ~50 s, audio only
```

Re-run it whenever `audio/cues.json` changes (`npm run cues` regenerates the cue sheet from `src/timeline.ts`): every sound effect,
every duck and every chord-dependent pitch is derived from the cue data at run time, and the music is anchored to the cue sheet's
sections on its 120 BPM bar grid (a change to the bar structure itself means editing `music.compose`).

| input | output |
|---|---|
| `audio/cues.json` (read-only) | `public/audio/soundtrack.wav` - master, 16-bit / 48 kHz / stereo, 44.500 s, -14 LUFS, <= -1.3 dBTP |
| | `public/audio/soundtrack.mp3` - same master, 320 kbps (libmp3lame), same length (decodes to exactly 44.500 s: it carries the LAME gapless tag; a player that ignores that tag starts 23 ms late - use the WAV for frame-accurate work) |
| | `public/audio/stems/music.wav`, `stems/sfx.wav` - pre-master buses, 24-bit, sum peaks at -1 dBFS, music + sfx = the master chain's input |
| | `audio/qa/` - `report.md`, `spectrogram*.png`, `loudness-and-spectrum.png`, `closing-scenes.png` (last 11 s: spectrogram + momentary loudness + cue markers), `cue-placement.csv` (every cue: target time, accent sample, peak), `sync-measured.csv` (every transient cue: onset detected in the SFX stem vs cue time) |
| | `audio/build/` - scratch (git-ignored) |

Options: `--cues`, `--out-dir`, `--qa-dir`, `--build-dir`, `--ffmpeg` (or `$FFMPEG`), `--target-lufs`, `--ceiling-db`,
`--music-gain-db` / `--sfx-gain-db` (balance trims before the master), `--skip-qa`, `--recalibrate` (see "Frozen gains").
The MP3 decoder can overshoot the WAV's true peak by a fraction of a dB, so after encoding the MP3 is decoded and measured; if it
exceeds the ceiling the limiter is tightened by the overshoot and both files are re-written (WAV and MP3 both end <= -1.3 dBTP).
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
| `sfx.py` | the 50 sound designers (one function per cue `type`), sample-exact placement, reverb sends, per-cue seeds |
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
The closing scenes (hand-off photos) add: `screen-wake` (soft rising two-note glass chime), `bag-rustle` (a close paper-bag hand-off -
pure band-limited noise: crinkle bursts convolved with micro-kernels, a stick-slip rope-handle creak and a low thump; no pitch),
`redeem-ding` (bright two-note glass ding, 3rd -> 5th of the chord), `photo-whoosh` (soft air, far gentler than the other whooshes) and
`handshake` (a soft dry skin / cloth clasp plus a warm glass bloom of the C chord and a few glints - the big chord itself is the music's).
**Seeds:** each cue is seeded from its type and time (`sfx.seed_for`), so adding or moving other cues never re-rolls a sound. The
cues before 33.6 s keep the seeds of the first cue sheet (`sfx.cue_seed`, `ADDED_SINCE_V1`), so the first 33 s of sound design stays
the same sound designs as the version the picture was cut to (only their levels changed, see below).

**Music (music.py / instruments.py).** A 22-bar chord-locked score following the section brief: dark drone + sparse sub heartbeat
(no drums) in the hook; kick, bass, pad and a gentle plucked arpeggio from the 4.0 drop; hats / shaker / backbeat for the typing
groove (thinned out while the keys are typed); fills and a rising filter through the swipes; the counter bar drops the kick at 21.0,
runs an accelerating snare roll and cuts everything for a 0.15 s air gap before the 22.0 hit; a bell lead for drop B; a low-passed
electric-piano breakdown for the e-mail; gated pad + staccato arps for the system diagram, which **stops cleanly** when the diagram is
pushed away (the `whoosh-in` cue, 37.5: events are cut, notes shortened, the arp's echo repeats fade out); then the **human** section - no drums, a soft pad with a
slowly opening filter (the "lift"), a G1 sub, a few felt e-piano chords on the dominant that lean on the C (the fourth is held), air -
and the **outro**: the film's big resolving C chord lands on `outro.from` (a pad stack with a little extra major third, a rolled
e-piano chord, soft-attack bass and sub, a bell; no kick, no cymbal), rings through the Cadd9 bar and fades to silence.
Arps are generated bar by bar from templates and a seeded RNG (varied, never copy-pasted, always chord tones). In the system section
the arp only plays on 16ths that would not *flam* with a UI cue (12-70 ms apart; the picture's cues there are off the music's grid),
so the two interlock.

**Mix (mix.py).** Each music bus has a target level (RMS or peak, `MUSIC_TARGET`). The gains that produced the signed-off first 34 s are
**frozen** (`FROZEN_GAINS_DB`), so changing the end of the arrangement can never re-balance (or change) the music before it; a bus that
is not in that table (the new quiet `soft` bus of the human scene) is calibrated to its target, and `--recalibrate` re-derives all of
them. Kick-triggered pumping on pad / bass / sub; ducking windows are computed from the cue list (typing, ticks, hits, chimes,
the notif-ping, code-ding, redeem-ding, and the bag rustle, under which the music steps back) so the UI sounds sit in clear air; the
soft logo accent at the end ducks nothing, so the ringing chord is never "restarted"; three synthetic reverbs (room / plate / hall) are
shared by send; `macro_points` is the dynamic arc of the film (`HUMAN_DB` = the quiet scene, `OUTRO_BUMP_DB` = the end chord's first
500 ms); both stems fade to exact digital zero by 0.08 s before the end (squared raised cosine from 1.1 s before it). Master: 4th-order HP at 28 Hz,
gentle 300 Hz / 11 kHz EQ, bass mono below 140 Hz, 1.8:1 glue compressor, gain to -14 LUFS (iterated against the limiter),
4x-oversampled look-ahead true-peak limiter at -1.3 dBFS.

**QA (qa.py).** Loudness (ffmpeg ebur128 on the WAV and on the decoded MP3, plus an independent BS.1770 meter), sections, band
energy, mono compatibility, DC, clipping, tail, phone-speaker simulation, sync detection on the rendered SFX stem plus an isolated
check of all 153 cues (plus the same onset measurement for every transient cue, `sync-measured.csv`), where the late cues fall on the
120 BPM grid, SFX cut-through versus the music, harmony audit (cue notes and a chroma check of the music), click scan, the loudness
of the film's big moments (logo hit, 98 % hit, end chord), automatic warnings. Spectrograms come from ffmpeg `showspectrumpic`.

## Tuning cheat-sheet

* a sound is too loud / quiet: `sfx.LEVEL[type]` (dBFS peak before the master), `sfx.BOOST_DB[type]` / `sfx.BOOST_AT[(type, t)]` (extra dB on a
  type / a single cue, synthesis and seeds untouched) or `mix.MUSIC_TARGET[bus]`. Judge the *balance* by the effect-vs-music margin (loudest 350 ms of
  the cue against the music in the same window, above 200 Hz), not by peak level: whooshes and swipes have low crest factors, so a peak that looks
  loud can still be masked. The second pass raised typing, swipes, card-ins, clicks, the iPad -> iPhone whoosh and a few others from about -5..+2 dB
  to about +3..+6 dB over the music (the hook's pops, the chimes and the hits were already at +8..+17 dB).
* more / less room: `sfx.SEND[type]`, `mix.MUSIC_SENDS`, `mix.ir_bank()`
* the arc of the film: `mix.macro_points` (`HUMAN_DB`, `OUTRO_BUMP_DB` for the closing scenes); the section arrangement: `music.compose` (bar-locked to 120 BPM, anchored to the section times of the cue sheet; the SFX are fully data-driven)
* duck depth under typing / ticks / hits: `mix.sfx_ducks`
* a new cue type: add `@sfx("name")` in `sfx.py` returning a `Shot`, a `LEVEL` entry and (optionally) a `SEND` entry
* balance music vs sfx without touching sounds: `--music-gain-db` / `--sfx-gain-db`

Everything uses fixed seeds (`numpy.random.default_rng`), so identical inputs give byte-identical output.
