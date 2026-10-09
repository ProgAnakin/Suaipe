# Sound × picture — the re-analysis of film v4

Status: **built, waiting for your listening.** This is the audit of the sound against the picture that you asked for after hearing `film-A.mp4` (in your words, the sounds of the language selection were gone: the selection is on
screen, the sound is not) and the redesign that followed: **every event of the picture now has a sound of its own**, levelled by loudness class so the whole stays balanced.

Files for the ear: `out/audio-ab/` (section 7). Map of every event and its sound: [`SOUND-MAP.md`](SOUND-MAP.md). Every effect on its own: [`SFX-CATALOGUE.md`](SFX-CATALOGUE.md).

---

## 1. What you heard, and why

You were right, and it was two mistakes of mine, not one.

1. **A bug in my grouping.** To keep the first cut "calm" I had folded sequences into single gestures. The five language chips (IT → EN → PT → ES → FR at 8.8 – 9.6 s) became one gesture that carried five times but
   had notes for only two of them (`store-ticks`: `zip(times, targets)` quietly stopped at the shorter list): only the first two ticks, two very high glass notes, were ever rendered. The hook had the same bug:
   ten gadget cards pop in at 0.1 – 0.78 s, the gesture (`tile-bloom`) had three notes. Nothing in the old QA could see it, because it measured the cues that existed, never the events that did not.
2. **A wrong idea.** I had treated "calm" as "fewer sounds". The first cut had **65 effects for 250 things happening on the screen**: the 33 keystrokes were one texture, and the tutorial's NO and YES, the question cards, the
   progress dots, the scan counter, the letters of the name, the captions and their underlines, the chips of the end card, the lines of the system diagram, the "Sample data" chips, most camera moves and scrolls had no
   sound at all. Calm should come from level, balance and a consistent family of sounds — not from deleting the sound of a thing you can see.

## 2. How I looked for what was missing

Three independent looks, none of them the cue sheet:

| | what | where |
|---|---|---|
| **the code** | every audible thing the scenes do, read from `src/timeline.ts` and the constants the scenes keep to themselves (the particle seeds, the typing frames, the caption words): **250 picture events**, each with a time, a kind, a loudness class and how much the eye notices it | `scripts/lib/picture-events.mjs` → `audio/picture-events.json` (`npm run events`) |
| **the frames** | the rendered picture, reduced to grey, differenced frame by frame: 241 moments where something appears or changes suddenly. The ones my code list did not explain were camera moves, scrolls and the **underlines that draw themselves under each caption** (12 events I had not listed) | `scripts/qa/visual-onsets.py` |
| **the audio** | for every event, in the *rendered* SFX and music stems: is a sound there, does it start there, how far above the music is it (best octave band, as in `tools/audio/qa.py`, and the A-weighted level) | `scripts/qa/av-coverage.py` |

An event is **silent** when nothing renders at it, **masked** when it is under its class's floor against the music by both measures, **ok** otherwise; a sound that piles up with others is flagged **loud**. Eight events are
silent *by design* and say why (four out-of-focus extra cards inside the cascade of the ten main ones, the second and third ring of the success pulse, the dots' row fading in, the handshake dissolving into the logo —
the motif on the logo is the sound of that move). The 22 events the audit still flags *loud* are small sounds that coincide with a bigger one — a card entering as the previous swipe registers, the end card's letters
over the held chord: a layered moment, measured on the mixed stem, not a sound louder than its class.

## 3. The first cut, audited

242 events are meant to have a sound. In the first cut **98 of them (40 %) had no audible sound of their own**: 55 had no cue at all, 63 had one that was silent or under the music (some of both).

| scene | events | no cue at all | masked or silent | **without a sound of its own** |
|---|---|---|---|---|
| hook | 22 | 1 | 0 | 1 *(the audit sees the energy of the riser; the code shows 7 of the 10 pops missing)* |
| lock-up | 10 | 6 | 0 | 6 (the letters, the underline) |
| iPad flow | 102 | 21 | 18 | 29 (language ticks, caption pops, the scan's counter, cards, the tutorial's NO / YES, callouts) |
| iPhone e-mail | 7 | 1 | 3 | 4 (the banner dropping in, the scroll, the sheen) |
| Manager & Stats | 18 | 2 | 11 | 11 (the camera moves, the page push, the CRM card, the flying leads) |
| Consultants | 10 | 2 | 7 | 8 (the lean-in, the pushes, the scrolls) |
| system | 21 | 1 | 4 | 4 (connectors, chips) |
| human close | 5 | 0 | 1 | 1 |
| end card | 16 | 10 | 0 | 10 (the six letters, the four chips, the underline) |
| captions | 24 | 11 | 17 | 22 |
| transitions | 7 | 0 | 2 | 2 |
| **total** | **242** | **55** | **63** | **98** |

## 4. What I changed

1. **One list for everything the picture does** (`audio/picture-events.json`), and the cue sheet is *built from it* (`scripts/export-cues.mjs`): 246 cues, each carrying the event it answers. A new scene or a new
   timing in `timeline.ts` cannot silently lose its sound any more; `npm run events` / `npm run cues` rebuild both.
2. **Every event has its sound**, in the film's own family (glass, felt, air, in the key of the bar): 61 cue types, **eight of them new sounds** — `letter-tick` (the letters of the name, a little pentatonic run),
   `dot-tick` (the progress dots, one step higher each, so the eight dots count the eight swipes), `field-tick` (a form field waking up), `notif-drop` (the banner), `lead-fly` (a lead flying to the CRM),
   `line-draw` (a line drawing itself), `sample-tick` (the amber "Sample data" chip), `underline` (the pitched pen under a caption's highlighted phrase). The restored ones — `chip-tick` for the five languages
   (now five distinct ticks, panned left to right with the highlight), 33 individual `key` taps, `card-in`, `count-tick`, `caption-pop`, `chip-pop`, `check-tick`, `node-on`, `packet`, `tile-pop`, `word-hit` — were
   levelled again for the new mix.
3. **A gesture can no longer drop events.** `_gesture_notes` extends its notes instead of truncating and asserts one note per time, so that class of bug cannot come back; and the audit flags what it did to the first cut
   (three of the five language ticks come out silent in it; for the hook it only sees the riser's energy, which is why the assert matters).
4. **Levels by class, not by luck.** Every interface sound is set so that its own loudest 40 ms (the loudest 150 ms for a whoosh) has the loudness of its class — the energy mean of the A- and the K-weighted signal, so a
   low "thock" and a glass tick of the same class are equally present on a phone speaker and on earbuds:

   | class | what | level (dBFS, before the bus) |
   |---|---|---|
   | S signature | logo hit, 98 %, handshake, the motif, the chosen product | hand-set with the music (as before) |
   | H highlight | success, notification, code, "redeemed" | −17 |
   | A action | taps, selections, swipes, locks, call-outs, chips, nodes, tiles, leads landing | −20.5 |
   | W movement | whooshes, swooshes, scrolls | −19.5 |
   | T texture | keystrokes (−1), cards, pops, counter ticks, letters, dots, captions, packets | −25 |
   | t whisper | a field waking, a line drawing, the "Sample data" chip, the caption underline | −27.5 |

5. **The music makes room, by class** (`mix.sfx_ducks_a`): a run of keystrokes takes 3.5 dB of the pad and the felt piano; each action dips the felt piano 3 dB for 0.2 s and breathes the pad 1.5 dB; a movement takes
   2 dB of the pad while it sweeps; the highlights, the hits and the motif keep their deeper ducks.
6. **A closed loop for the balance.** `av-coverage.py` finds what is still under the music; `scripts/qa/auto-trim.py` writes the few dB it needs into `audio/trims.json` (15 trims, +1.7 to +4.0 dB, mostly the
   quietest whispers in the busiest bars); the exporter applies them; repeat until nothing is masked (three passes). A trim is **capped at +4 dB**: past it a sound would stop being its class, so the *music* makes
   room instead — a deeper dip of the felt piano under every caption underline, the pad stepping 3.5 dB aside for a whoosh that carries a scene change, and the system diagram's bed 2.5 dB lower under its own nodes and tiles.
7. **The tutorial teaches the sounds.** The app's own tutorial shows a NO swipe and then a YES swipe: they now play the NO phrase (falling, left) and the YES phrase (rising, right) quietly, so the eight swipes that
   follow are already understood with the eyes closed.

## 5. The result

| | first cut (65 effects) | **complete (246 effects)** |
|---|---|---|
| picture events with a sound of their own | 144 of 242 | **242 of 242** |
| masked or silent | 63 | **0** |
| effects | 65 (1.0/s) | 246 (3.8/s) — 190 of them texture: keys, ticks, pops |
| most in one second | 3 | 23 (the typing, 0.04 s apart, each a soft click) |
| the effects layer against the music (A-weighted, 100 ms windows; median / 90th percentile) | −30.6 / −20.9 dB against −27.7 / −25.1 | **−27.8 / −19.6 dB against −28.1 / −25.5** |
| loudest 100 ms of the effects layer | −13.2 dB (the end chord) | −13.3 dB (the end card: the logo's sheen and the six letters over the held chord); next the success chime, the notification and the kiosk waking, −14.5 to −14.7 |
| integrated loudness, true peak | −14.0 LUFS, −1.6 dBTP | **−14.0 LUFS, −1.7 dBTP** (−1.4 dBTP after AAC 128 k) |
| mono compatibility, energy above 8 kHz | −0.48 dB, 0.08 % | −0.60 dB, 0.13 % |
| sync, cue to sound | median 0.85 ms, worst 3.9 ms (43 cues measured) | median 0.8 ms, worst 6.5 ms (135 cues; the worst are low thumps whose onset is slow to read) — the muxed MP4 adds 0 |
| harmony | no violations | no violations (161 pitched cues: 247 chord tones, 56 extensions, 1 passing note, 0 chromatic) |

What the numbers say about the balance: the effects layer now sits **at the music's level** (median −27.8 against −28.1 dB) instead of 3 dB under it, which is what lets a keystroke or a tick be heard at all, and its
peaks are the moments that are meant to peak. Because the film is normalised to −14 LUFS and the effects now carry more of that loudness, the music bed is lower in absolute terms than in the first cut; the two
alternative mixes (section 7) move the balance 3 dB one way or 2 dB the other if you want it different.

## 6. What the measurements cannot tell me

How it **sounds**. Everything above is measured: presence against the music, hierarchy between classes, sync, harmony, loudness. Whether 33 keystrokes in 1.9 s feel natural or busy, whether the underline's little
glide under every caption is charm or noise, whether the effects layer at the music's level is right for a LinkedIn feed — that is yours to hear. Three families are the most disposable, in this order, if the whole feels
busy: **the caption underline** (`underline`, 12 times), **the "whispers"** (`field-tick`, `line-draw`, `sample-tick`) and the **letter ticks** (`letter-tick`, 12 times). Each is one name in the cue sheet.

## 7. To listen (`out/audio-ab/`, half-resolution pictures with the sound in sync)

| file | what |
|---|---|
| `film-complete.mp4` | the 64.5 s film with the complete sound — **start here** |
| `ab-8-28s-before.mp4` / `ab-8-28s-after.mp4` | the same 20 s (8 – 28 s: the language selection, the typing, the consent, the tutorial, the eight swipes, the 98 %, the success, the e-mail's arrival), first with the earlier sound, then with the complete one |
| `film-complete-effects-minus3.mp4` | the complete sound with the effects 3 dB lower (if it feels too present) |
| `film-complete-effects-plus2.mp4` | the effects 2 dB higher (if you want every tick clearer) |
| `cut-15s-complete.mp4` | the 15 s cut with the complete sound (its own arrangement) |
| `sfx-catalogue.wav` / `.mp3` | every sound on its own, at the film's level: the table `SFX-CATALOGUE.md` has the time of each |

Questions that matter (*fine · change it · remove it*):
1. The language selection (8.8 – 9.6 s, `ab-8-28s-after.mp4`): five distinct ticks sweeping left to right — right?
2. The typing (10.1 – 11.9 s): natural, or too much? (Type `key` in the catalogue.)
3. The tutorial (13.5 – 14.5 s): does the falling NO and the rising YES teach the swipes?
4. The eight swipes (15.5 – 20 s): a swipe, a card and a dot per second — a rhythm or a clutter?
5. The captions (12 of them): the little pop and the underline — keep both, one or none?
6. The Manager & Stats and Consultants scenes (34 – 54 s): enough sound to feel alive, or still too sparse / too busy?
7. The end card: the six letters and four chips, then the glints — a signature or too much?
8. Overall: effects at the music's level (default), 3 dB lower or 2 dB higher?

## 8. Reproduce

```bash
npm run events                  # src/timeline.ts → audio/picture-events.json (250 events)
npm run cues                    # → audio/cues.json (246 cues) and audio/cues-15s.json, with audio/trims.json applied
python tools/audio/generate.py --ffmpeg $FFMPEG                        # the master + QA;  the 15 s cut: see tools/audio/README.md
python scripts/qa/av-coverage.py --md --json out/av.json               # the audit: silent / masked / loud, by tier, scene and kind
python scripts/qa/auto-trim.py out/av.json                             # raise what is still masked, then npm run cues and generate again
python scripts/qa/sound-map.py                                         # qa/SOUND-MAP.md
python tools/audio/catalogue.py --ffmpeg $FFMPEG                       # the catalogue of every effect
python scripts/qa/visual-onsets.py out/pv7.mp4 --ffmpeg $FFMPEG        # the picture-derived cross-check
```
