# Sound direction — film v3 · BRIEF v2, phase 4

Status: **proposal — waiting for your choice of direction (A or B).** Nothing in `tools/audio` has been changed yet.
`public/audio/soundtrack.*` is still the old 44.5 s mix and is not used by any preview.

---

## 1. The decision I need from you

| | **A · Minimal pulse** *(my recommendation)* | **B · Confident build** |
|---|---|---|
| in one line | a soft pulse, warm pads and felt keys; one big moment, at the end | today's groove, lighter and cleaner; two peaks, the biggest at the end |
| drums | none, only a half-time sub pulse | light kick + soft clap, no snare roll, no confetti sound |
| 98 % match | a bright bloom (glass chord + sub swell) | a clean, moderate drop |
| biggest moment | handshake chord → the name (44.0 → 46.0) | 98 % hit **and** handshake → the name |
| energy with sound on | calm, premium, re-watchable | more momentum, closer to a product launch |

Answer with **A** or **B** (or "A, with B's 98 % accent"). Phase 4 then follows section 9; I stop again for your listening feedback
before the final render.

---

## 2. Three words of atmosphere (for the track *and* for the post)

**Observant · Composed · Warm.**

* *Observant* — the film starts from something noticed on the shop floor: the sound listens before it speaks (hook: drone, one soft pulse, air).
* *Composed* — confident, not euphoric: few elements, each with room around it; nothing that sounds like a game show or a festival drop.
* *Warm* — the ending is people, not interface: room tone, felt keys, a dry clasp, a chord that resolves.

The post copy uses the same three: "I noticed it on the floor. I built what it needed. The sale is still made by a person."

---

## 3. Where the sound is today (numbers from `qa/AUDIT.md`, section 8, and the new cue sheet)

* **Density.** The old film: 153 events in 44.5 s (3.44/s), **108 of them "texture"**; 23 events in one second (11–12 s). The *new* 50 s structure with the old
  sound language would be 133 events (2.66/s: signature 5 · support 42 · texture 86); seconds above 4 events/s: 8–9 s (10), **9–10 s (25: typing)**,
  19–20 s (11), 38–39 s (6), 39–40 s (5). Most repeated: `key` ×33, `count-tick` ×11, `caption-pop` ×8, `card-in` ×8.
* **Character.** A 22-bar product-launch arc — drop A, build, snare roll, drop B, confetti — then a warm last 7 s. The post is reflective;
  only the end sounds like it.
* **Timbre.** 54 % of events are the same family (tuned-sine ticks); `key` alone is 22 %.
* **Phone speaker (HP 350 Hz + LP 10 kHz).** `device-settle` −9.4 dB, `logo-hit` −7.3, `counter-hit` −4.2, `confetti-pop` −4.1, `screen-wake` −4.0, `tap` −3.5.
* **AAC 128k.** −14.1 LUFS / **−1.1 dBTP**: the ≤ −1 target holds with 0.1 dB of margin → the limiter ceiling moves to −1.6 dBFS (0.5 dB of margin).
* **Human scenes.** The bag and the handshake have no room around them: the sound is synthetic and dry.

---

## 4. The two directions

### A · Minimal pulse *(recommended)*

* **Instrumentation.** A warm, slowly breathing pad; felt electric piano playing sparse chord tones in half-time; a soft sine sub that beats like a pulse (one thump per half bar);
  a glass bell for the motif; room tone under the photographs. No snare, no hats, no clap, no snare roll, no confetti sound; risers are tonal, never noise-and-drums.
* **Drums.** None. The "groove" is the sub pulse plus the *swipe gestures themselves*: each swipe is a tuned phrase (see 7), so the eight cards play a short rhythmic line.
  The store-value section adds one quiet off-beat tick under the pulse: steady means competent.
* **Where the biggest moment is.** At the end: the handshake (44.0) blooms into the film's one big resolved chord, and the motif completes on the name (46.0).
  The 98 % hit is the first, smaller peak: a bright glass bloom and a sub swell (about two thirds of the end's weight).
* **How it ends.** The chord rings under the held frame, the last motif note holds, everything fades to digital silence at 50.0 with ≥ 1.5 s of tail.

### B · Confident build

* **Instrumentation.** Today's palette, thinned: tight kick at low velocity, soft clap on 2 and 4 in the experience, a plucked arpeggio with fewer notes, round bass, warm pad, a bell lead only at the 98 %.
  The build uses a tonal riser and a filter opening instead of the accelerating snare roll; no confetti sound.
* **Drums.** Light: kick on every beat from the lock-up, claps from the quiz, shaker instead of hats; the store-value section carries the steadiest pattern (kick + rim); the human section has none.
* **Where the biggest moment is.** Two peaks: a moderate 98 % drop, then the handshake → the name, which is clearly the larger.
* **How it ends.** Same as A: held chord, completed motif, long tail to silence.

### Block by block

| block | A · Minimal pulse | B · Confident build |
|---|---|---|
| Hook 0–4 | drone, one sub pulse, the light's soft ping, 0.25 s of near-silence before the hit | same |
| Idea 4–6 | ★ logo hit (sub + glass chord), motif **part 1** (G–A, a question), then the pulse begins | ★ logo hit, motif part 1, kick enters at low velocity |
| Experience 6–23 | pad + keys; swipes are the rhythm; one tonal scan riser; **98 % bloom** (secondary peak) | kick + clap groove, tonal riser, **98 % drop** (peak 1) |
| Customer value 23–30 | filtered e-piano, pulse only | same |
| Store value 30–38 | pulse + one quiet off-beat tick, confident harmony | firm kick + rim pattern |
| System 38–42 | staccato plucks in a gated pad (as today, less busy) | same, a little more drive |
| Human 42–46 | pad + felt keys, room tone, dry bag rustle, ★ **clasp + resolved chord** at 44.0 | same |
| Signature 46–50 | ★ motif **complete** on Cadd9, one sparkle, long tail | same |

---

## 5. My recommendation: A

1. It is the only one that sounds like the post reads: *observant, composed, warm*. B sounds like a product launch — good, but a launch is not the story.
2. The film's real climax is semantic (the handshake, then the name), not the game's 98 %. A keeps the biggest moment for it; B splits attention between two.
3. The eight swipes already make a rhythm. Under them a kick and a clap compete; a sub pulse and tuned yes/no phrases do not.
4. It cuts the most events, leaves the most room for the motif and keeps the AAC true-peak margin comfortable.
5. Risk: with sound on, the experience may feel less "driven". Mitigations: the pulse, the bright 98 % bloom, and the A/B files (section 8) so you can hear a "B-flavoured"
   98 % before committing; I can graft B's drop onto A at no cost.

---

## 6. The sonic motif — "contact" (3–4 notes)

* **Notes.** G4 – A4 – C5 – E5 (sol-la-do-mi): a rising line inside the C6 sound of the film's key (Am / G / C → Cadd9).
* **Rhythm.** short · short · medium · long — 0.25 s, 0.25 s, 0.5 s, then the last note rings (≥ 1.5 s).
* **Timbre.** glass bell (the film's own bell voice, 1 : 2.76 : 5.4 partials) doubled by felt electric piano, soft attack, no vibrato; velocity grows slightly to the last note.
* **Where it appears.**
  * *Lock-up (4.0):* **part 1 only** — G4 → A4, over the C of the logo hit: a question left hanging.
  * *98 % (20.0):* optional echo of part 1, very quiet (only in A if you want a callback).
  * *Signature (46.0):* the **complete** line, G4 at 46.0 (the name starts), A4 46.25, C5 46.5, E5 46.75 held on Cadd9 — the circle closes.
  * *15 s cut-down:* the same complete line at 11.5 s (the name), the chord rings to the end.
* **Reuse.** The motif is documented here so it can open and close future films and posts (same notes, same bell, same rhythm; vary only the key's octave).

---

## 7. Effects: hierarchy and budget

| layer | rule | sounds in this film |
|---|---|---|
| **Signature ★** (max 5) | the only ones with sub, long tail and chord | hook light ping (2.0) · logo hit (4.0) · 98 % (20.0) · clasp (44.0) · the name's motif (46.0) |
| **Support** | confirms a visible action; short, tied to the chord; one per action | taps (4), swipes yes/no (8), success chime, notification, code ding, redeem ding, whooshes, bag rustle |
| **Texture** | grouped into one gesture or removed | typing → **one** soft continuous texture · the 11 counter ticks → **one** tonal riser · tile pops → one cascade · nodes + packets → **one** run · captions → silent |

**Budget.** 133 → about **57 events** (target 55–70), none above 4/s outside a grouped gesture: typing −32, counter ticks −10, caption pops −8, card-ins −7,
packets/nodes −8, tiles −4, swooshes −2. Seconds above 4 events/s: none.

**Swipe yes / no, readable with eyes closed.**
*Yes* = a short **rising** two-note glass phrase that opens (tuned to the bar's chord), panned **toward the card's direction** (right), a little air on the tail.
*No* = a short **falling** muted pluck with a soft closing noise, panned **left**. Different contour, different timbre, different side.
All pans keep mono compatibility ≥ −3 dB; whooshes and lateral elements follow the picture (iPad leaves left, iPhone arrives right).

**Phone-speaker rule.** Every signature sound gets upper harmonics (the three sub-heavy hits lose 4–9 dB on a phone today), and every support sound sits ≥ +3 dB over the music in its 350 ms window (above 200 Hz).

---

## 8. Human scenes: room, foley, hand-over from interface to world

* **Room tone.** A synthesised shop: large-room air, a faint diffuse murmur (filtered, modulated noise — no intelligible words), a distant soft reflection. Level: felt, not heard (about −38 LUFS short-term).
  It enters with the hand-off photograph (5.7–7.9) and returns under the bag and the handshake (41.5–46) — the start and the end of the film rhyme.
* **Foley.** `bag-rustle` and the clasp stay close, dry and believable; nothing bright or "magic" on the handshake itself — the warmth comes from the music.
* **Interface → world.** When the camera flies into the tablet (7.0–7.6) the room tone ducks while the screen's UI sounds take over; on leaving the tablet (23.0) the reverse.

---

## 9. What happens after your choice

1. `npm run cues` → the cue sheet becomes the **grouped** sheet (about 57 events), harmony re-planned for the 25 bars (Am G C G · Am F C G · Am F C G · Am F C G · Am F C G · Am G C Cadd9 · Cadd9).
2. `music.compose` rewritten for the chosen direction on the same 120 BPM grid (half-time *feel* allowed); `python tools/audio/generate.py --recalibrate`; limiter ceiling −1.6 dBFS.
3. New designers in `sfx.py`: typing texture, scan riser, node run, tile bloom, swipe yes/no with pan, room tone, the motif; the three sub-heavy hits get upper harmonics.
4. The 15 s cut-down: its own musical arrangement (starts on a downbeat, the motif at the name, ≥ 1.5 s tail), generated by the same pipeline from a mapped cue sheet.
5. QA: density chart before/after, mono compatibility, AAC 128k re-encode, `sync-measured.csv`, `closing-scenes.png`, README of the audio tool.
6. For you to listen: `out/audio-ab/` (20 s of swipes → match in A **and** B), two alternative mixes of the master (music −2 dB; effects −3 dB), and this guide.

Targets: −14 LUFS (±1), true peak ≤ −1 dBTP **after AAC 128k**, mono ≥ −3 dB, frame-accurate sync, effect-vs-music margin ≥ +3 dB on phone, no energy above 8 kHz that tires, every section enjoyable "starting there", and the film stays 100 % understandable on mute.

---

## 10. Listening guide (one page) — for when the A/B files exist

**Phone speaker** (the way most people will hear it)
1. Can you tell a *yes* swipe from a *no* swipe with your eyes closed?
2. Is the 98 % moment clearly the first peak — and the handshake clearly bigger?
3. Do you hear the notification and the code ding as "something arrived" rather than "an app"?
4. Is anything harsh or shrill when the volume is high?

**Earbuds (AirPods or similar)**
5. Do you feel the shop under the photographs (hand-off, bag, handshake) without being able to point at it?
6. Do the first and last 5 seconds rhyme (room tone, hanging motif → complete motif)?
7. Does the name arrive on a sound, or after it?

**Laptop speakers**
8. Does anything vanish (sub) or poke out (high glass)?
9. Is any single sound irritating the **second** time you watch?
10. Does the ending give a sense of conclusion, and does the silence after it feel clean (≥ 1.5 s of tail)?

Tell me, per question: *fine · change it · remove it*. That is all I need for the final render.

---

## 11. Before / after (filled in after phase 4)

| | before (new structure, old sound language) | after |
|---|---|---|
| events | 133 (2.66/s) | — (target 55–70) |
| signature / support / texture | 5 / 42 / 86 | — (≤ 5 / — / grouped) |
| seconds above 4 events/s | 8–9 s, 9–10 s, 19–20 s, 38–39 s, 39–40 s | — (none) |
| AAC 128k true peak | −1.1 dBTP | — (≤ −1.6 dBFS ceiling → ≥ 0.5 dB margin) |
