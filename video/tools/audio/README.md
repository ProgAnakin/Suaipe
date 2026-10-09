# Suaipe film soundtrack generator

Original music + sound design for the 64.5 s LinkedIn film (4:5, 120 BPM) and its 15 s cut-down, synthesised entirely in code and locked to
the cue sheets `audio/cues.json` / `audio/cues-15s.json` (derived from `src/timeline.ts` by `npm run cues`). No samples, no downloads, deterministic.

The chosen direction is **A · "Minimal pulse"** (`qa/SOUND.md`): no drums, a soft sub pulse, a warm pad, felt electric piano, a glass bell for the
motif, the room tone of a shop. Direction **B · "Confident build"** (light kick + soft clap) is built from the same bed for A/B listening files only.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r tools/audio/requirements.txt
python tools/audio/generate.py --ffmpeg /path/to/ffmpeg      # direction A, the 64.5 s master: about 75 s, writes everything below
python tools/audio/generate.py --skip-qa                      # about 50 s, audio only

# the 15 s cut-down (its own arrangement, from its own cue sheet)
python tools/audio/generate.py --cues audio/cues-15s.json --name soundtrack-15s --qa-dir audio/qa-15s --build-dir audio/build15
# direction B, for the A/B listening files
python tools/audio/generate.py --direction b --name soundtrack-B --out-dir out/audio-b --build-dir out/audio-b/build --skip-qa
```

Re-run it whenever `audio/cues*.json` changes (`npm run cues` regenerates them from `src/timeline.ts`): every sound effect, every duck and every
chord-dependent pitch is derived from the cue data at run time, and the music follows the cue sheet's **sections** and **chord segments** (never bar numbers),
so the same composer writes the master and the cut-down.

| input | output |
|---|---|
| `audio/cues.json` (read-only) | `public/audio/soundtrack.wav` - master, 16-bit / 48 kHz / stereo, 64.500 s, -14 LUFS, true peak -1.6 dBTP (-1.3 after an AAC 128k re-encode) |
| | `public/audio/soundtrack.mp3` - same master, 320 kbps (libmp3lame), same length (it carries the LAME gapless tag; a player that ignores that tag starts 23 ms late - use the WAV for frame-accurate work) |
| | `public/audio/stems/music.wav`, `stems/sfx.wav` - pre-master buses, 24-bit, sum peaks at -1 dBFS, music + sfx = the master chain's input |
| | `audio/qa/` - `report.md`, `spectrogram*.png`, `loudness-and-spectrum.png`, `closing-scenes.png` (the last scenes: spectrogram + momentary loudness + cue markers), `cue-placement.csv`, `sync-measured.csv` (every transient cue: target time, measured onset, error in ms) |
| `audio/cues-15s.json` | `public/audio/soundtrack-15s.wav/.mp3`, `stems-soundtrack-15s/`, `audio/qa-15s/` |
| | `audio/build*/` - scratch (git-ignored) |

Options: `--cues`, `--out-dir`, `--qa-dir`, `--build-dir`, `--ffmpeg` (or `$FFMPEG`), `--target-lufs`, `--ceiling-db` (default -1.6: it leaves about 0.3-0.5 dB after an AAC 128k re-encode),
`--direction a|b`, `--name`, `--music-gain-db` / `--sfx-gain-db` (balance trims before the master), `--skip-qa`, `--recalibrate` (only matters for the older arrangement),
`--from-stems` + `--remix-name` (re-balance and re-master the exported stems without synthesis: `--from-stems --music-gain-db -2 --remix-name soundtrack_music-2.wav`).
The MP3 decoder can overshoot the WAV's true peak by a fraction of a dB, so after encoding the MP3 is decoded and measured; if it exceeds the ceiling the limiter is tightened
by the overshoot and both files are re-written. ffmpeg needs `libmp3lame`, `ebur128` with `peak=true` and `showspectrumpic`.

## Files

| file | what |
|---|---|
| `generate.py` | CLI + pipeline: cues -> music -> sfx -> stems -> master -> wav / mp3 -> QA |
| `dsp.py` | filters (RBJ biquads, swept filters), PolyBLEP saw, noise, saturation, synthetic-IR convolution reverb, ping-pong delay, compressor, look-ahead true-peak limiter, BS.1770 loudness |
| `theory.py` | chord map from the cue sheet (`Harmony.at(t)`), chord tones / consonant extensions, pentatonic runs |
| `synth.py` | glass / bell, pluck, thump, noise-sweep voices shared by sfx and music |
| `sfx.py` | the sound designers (one function per cue `type`), sample-exact placement, reverb sends, per-cue seeds, `LEVEL` / `BOOST_DB` / `BOOST_AT` |
| `instruments.py` | music voices: pulse, pads, felt e-piano, plucks, bell lead, textures (and, for direction B, kick / clap / shaker) |
| `music_a.py` | `compose_a`: the direction A (and B) arrangement, driven by sections and chord segments |
| `music.py` | the `Score` container, instrument rendering (`render_music`) and the older 44.5 s arrangement (`compose`, kept for reference) |
| `mix.py` | bus processing (`process_music_a`), cue-driven ducking (`sfx_ducks_a`), reverbs, macro dynamics, master chain |
| `qa.py` | measurements and `report.md` (duration-aware) |
| `catalogue.py` | every effect once, on its own, at the film's level (`out/audio-ab/sfx-catalogue.wav`, `qa/SFX-CATALOGUE.md`) |

## How it is built

**Sound design (sfx.py).** Every cue `type` has one designer returning a stereo one-shot plus the *sample index of its accent*. The placer starts the sound at
`round(target * 48000) - accent`, where `target` is the cue time (transients), the `accent` field (swipes: the card registers, the whoosh peaks there), the end of the
riser (`scan-riser`, `riser-a`, `riser-b`) or the whoosh's own peak. All sounds have a >= 1 ms rounded attack and a >= 3 ms release, so nothing clicks. Palette: glassy inharmonic
bells (partials 1 : 2.76 : 5.4 : 8.9 with their own decays) for chimes, dings and the motif, soft plucks for nodes, tuned sine thumps with saturation (harmonics at 120-800 Hz so phones can
hear them) for taps, knocks and impacts, band-passed noise sweeps for whooshes and risers, and a tuned sub + glass chord + air for the three hits.
Pitched sounds take their notes from the chord of the bar they land in (`theory.py`); the QA report audits every one.

**Every event of the picture has its sound** (`qa/SOUND-AUDIT.md`): the cue sheet is built from `audio/picture-events.json` (`scripts/lib/picture-events.mjs`), one cue per event, each carrying
the event it answers (`event`, `eventT`) and its class (`tier`). 246 cues for 250 events; the typing is 33 individual `key` taps, the language selection five `chip-tick`s panned left to right with the
highlight, the eight dots eight `dot-tick`s one step higher each. The older *grouped gestures* (`typing-texture`, `store-ticks`, `node-run`, `tile-bloom`) are still defined but unused; their helper now
refuses to drop an event (`_gesture_notes` extends its notes and asserts one note per time: the first cut's bug was a gesture that carried five times and two notes). *Swipe yes / no* are tuned
phrases with a pan: yes = a rising glass two-note phrase to the right, no = a falling muted pluck to the left (the tutorial plays both, quietly, before the eight swipes). *The motif* "contact"
(G4 - A4 - C5 - E5; `motif-q` is its first half, `motif` the whole line) is a glass bell doubled by felt piano. The scenes of the real world add: `screen-wake` (soft rising two-note glass chime),
`bag-rustle` (a close paper-bag hand-off - pure band-limited noise, no pitch), `redeem-ding`, `photo-whoosh` (soft air) and `handshake` (a soft dry skin / cloth clasp plus a warm glass bloom of the C chord -
the big chord itself is the music's). The small ones that complete the picture: `letter-tick`, `dot-tick`, `field-tick`, `notif-drop`, `lead-fly`, `line-draw`, `sample-tick`, `underline`.

**Levels by class** (`sfx.CLASS_DB` / `sfx.CLASS_OF`): every interface sound is set so that its own loudest 40 ms (150 ms for a sound that swells) has the loudness of its class - the energy mean of the
A- and the K-weighted signal, so a low "thock" and a glass tick of the same class are equally present on a phone speaker and on earbuds. The hits, risers, the motif and the beds keep their hand-set `LEVEL`.
A cue may carry `gain_db` (a tutorial demonstration is quieter), and `audio/trims.json` adds the few dB the balance audit asked for (`scripts/qa/auto-trim.py`, capped at +4 dB: past it the music makes room).
**Seeds:** each cue is seeded from its type and time (`sfx.seed_for`), so adding or moving other cues never re-rolls a sound.

**Music (music_a.py / instruments.py).** `compose_a` reads the sections and chord segments of the cue sheet and writes a `Score` (notes per instrument, `pulses`, `pad_cut`,
`macro`, `gates`, `air_gaps`). Hook: a dark drone, a faint heartbeat, the harmony left open, 0.25 s of near-silence before the hit. Idea / hand-off: a pad, the sub pulse in
half-time (one thump per second), the room tone. Form / swipes: pad + sparse felt piano; the swipes themselves are the rhythm. Scan: a tonal riser and an air gap before the 98 %. Match: a rolled felt
chord and a glass shimmer. E-mail and Consultants: a low-passed felt piano, the pulse on beat 1 only. Store: a firmer pulse and one quiet off-beat tick. System: a gated pad and staccato plucks that
**stop cleanly** (the pulse stops at 57.5). Human: no pulse, a soft pad and felt keys on G leaning towards C. Resolve: the film's one big resolved C chord at the handshake (a pad stack with a
little extra major third, a rolled e-piano chord, soft-attack bass and sub, a bell; no kick, no cymbal) and the complete motif on the logo; Cadd9 rings and fades to digital silence.
The 15 s cut starts on a downbeat and ends on the same resolved chord with the complete motif. Arps and keys are generated from templates and a seeded RNG (varied, never copy-pasted,
always chord tones).

**Mix (mix.py).** Every music bus is calibrated to a target level (`MUSIC_TARGET`; direction A always recalibrates, `FROZEN_GAINS_DB` only belongs to the older 44.5 s arrangement). The pad breathes
with the pulse (a soft, slow dip on every thump); ducking windows are computed from the cue list (`sfx_ducks_a`, by class: a run of keystrokes, every action, every movement, the chimes, notification and dings, the bag rustle under
which the music steps back, the caption underlines, the motif) so the UI sounds sit in clear air; three synthetic reverbs (room / plate / hall) are shared by send; `macro_points` is the dynamic arc of the film
(`HUMAN_DB` = the quiet scene, `OUTRO_BUMP_DB` = the end chord's first 500 ms); both stems fade to exact digital zero by 0.08 s before the end. Master: 4th-order HP at 28 Hz, gentle 300 Hz / 11 kHz EQ, bass mono below 140 Hz,
1.8:1 glue compressor, gain to -14 LUFS (iterated against the limiter), 4x-oversampled look-ahead true-peak limiter at the ceiling (-1.6 dBFS).

**QA (qa.py).** Loudness (ffmpeg ebur128 on the WAV and on the decoded MP3, plus an independent BS.1770 meter), sections, band energy, mono compatibility, DC, clipping, head and tail, phone-speaker simulation,
sync detection on the rendered SFX stem plus an isolated check of every cue (`sync-measured.csv`), SFX cut-through versus the music, harmony audit (cue notes and a chroma check of the music), click scan, the loudness of
the film's big moments (logo hit, 98 % hit, end chord), automatic warnings. Spectrograms come from ffmpeg `showspectrumpic`. Two more checks live in `scripts/qa/audio-audit.py`: the event density per
second (signature / support / texture) and the re-encode test (AAC 192k / 128k / 96k: loudness and true peak).

## Tuning cheat-sheet

* a sound is too loud / quiet: change its class in `sfx.CLASS_OF` (or its offset), or `gain_db` on its cue in `scripts/export-cues.mjs`; the hand-set ones (the hits, risers, the motif) in `sfx.LEVEL[type]`.
  Judge the *balance* with `scripts/qa/av-coverage.py` (every picture event: silent / masked / loud against the music around it) and the profile of the effects layer, not by peak level: whooshes and swipes have low
  crest factors, so a peak that looks loud can still be masked. `mix.MUSIC_TARGET[bus]` moves the music.
* more / less room: `sfx.SEND[type]`, `mix.MUSIC_SENDS`, `mix.ir_bank()`
* the arc of the film: `mix.macro_points` (`HUMAN_DB`, `OUTRO_BUMP_DB`); the arrangement: `music_a.compose_a` (a section's brief is in the cue sheet, `scripts/export-cues.mjs`)
* duck depth under typing / ticks / hits: `mix.sfx_ducks_a`
* a new cue type: add `@sfx("name")` in `sfx.py` returning a `Shot`, a `LEVEL` entry, a `CLASS_OF` entry and (optionally) a `SEND` entry; the picture event it answers goes into `scripts/lib/picture-events.mjs`, the mapping into `scripts/export-cues.mjs`
* balance music vs sfx without touching sounds: `--music-gain-db` / `--sfx-gain-db`, or `--from-stems`

Everything uses fixed seeds (`numpy.random.default_rng`), so identical inputs give byte-identical output.
