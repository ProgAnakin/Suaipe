## 1. Event density (events per second, by layer)

153 events in 44.5 s = 3.44/s on average. Signature 5, support 40, texture 108.

| second | sig | sup | tex | total | |
|---|---|---|---|---|---|
| 0-1 | 0 | 1 | 13 | 14 | **> 4/s** |
| 2-3 | 1 | 1 | 4 | 6 | **> 4/s** |
| 4-5 | 1 | 0 | 2 | 3 |  |
| 8-9 | 0 | 2 | 2 | 4 |  |
| 10-11 | 0 | 0 | 10 | 10 | **> 4/s** |
| 11-12 | 0 | 0 | 23 | 23 | **> 4/s** |
| 12-13 | 0 | 1 | 2 | 3 |  |
| 16-17 | 0 | 1 | 1 | 2 |  |
| 20-21 | 0 | 2 | 4 | 6 | **> 4/s** |
| 21-22 | 0 | 0 | 9 | 9 | **> 4/s** |
| 24-25 | 0 | 2 | 0 | 2 |  |
| 28-29 | 0 | 0 | 0 | 0 |  |
| 32-33 | 0 | 1 | 0 | 1 |  |
| 34-35 | 0 | 0 | 6 | 6 | **> 4/s** |
| 35-36 | 0 | 0 | 5 | 5 | **> 4/s** |
| 36-37 | 0 | 2 | 2 | 4 |  |
| 40-41 | 1 | 0 | 0 | 1 |  |
| 44-45 | 0 | 0 | 0 | 0 |  |

Seconds above 4 events/s: 8 of 45 (0, 2, 10, 11, 20, 21, 34, 35). Peak 23/s at 11-12 s.

Most repeated types: key ×33, count-tick ×13, tile-pop ×10, card-in ×8, word-hit ×6, caption-pop ×6.

## 2. Sections (cue sheet)

| section | from | to | what it is |
|---|---|---|---|
| intro | 0 | 4 | No drums. Dark, tense, rising: low pad drone, filtered noise swell, sparse sub heartbeat, risers. Ticks from the sfx layer carry the rhythm. |
| drop-A | 4 | 8 | Logo hit at 4.0: kick + sub bass + pad chord + gentle plucked arp enter. Confident, clean, modern tech-product feel. |
| groove-A | 8 | 14 | Steady groove while the user types: hats on off-beats, soft shaker, bass pattern, arp gets busier. Leave space for the key clicks. |
| build | 14 | 20 | Energy climbs through the 8 swipes (they land on the beat from 17.5 on): add snare/clap fills, rising filter, tighter arps. |
| counter | 20 | 22 | Riser: kick drops out at 21.0, snare roll accelerating into 22.0, everything cuts for a beat of air right before the hit. |
| drop-B | 22 | 26 | Biggest moment: full chord stack + lead melody + open hats + kick. Celebratory but tasteful. |
| email | 26 | 34 | Breakdown: low-pass the groove, warm keys + pad, soft pulse; light percussion. The notif-ping and code-ding sit on top. |
| system | 34 | 37.6 | Rhythmic, techy: staccato arps / gated pad pulsing with the nodes (they come faster now: 5 nodes in 1.4 s, tiles at 35.8-36.2, locks 36.55 / 36.95); the groove stops cleanly at 37.5 when the diagram is pushed away. |
| human | 37.6 | 40 | Warm, human, quiet: the groove is gone. Soft pad + felt/e-piano chords on G (V) leaning towards C, a little air, maybe a single gentle bell on the redeem-ding. Paper-bag rustle at 38.0 is a real, close, tactile sound: keep the music out of its way. Build a gentle lift into the downbeat at 40.0 (no drums, no riser clichés). |
| outro | 40 | 44.5 | The handshake lands on the downbeat of bar 21 (40.0): THIS is the song's big resolving C chord (full, warm, the biggest moment of the film besides the 98 % hit). Let it ring through bar 22 (Cadd9 at 42.0); the logo-hit-soft at 41.0 is only a secondary accent on top of the held chord; chips at 42.2-42.95; sparkle 43.4; fade the tail to true silence by 44.5. |

## 3. Timbre inventory (by cue type)

| family | cue types | events |
|---|---|---|
| glass / bell | 17: check-tick, chip-pop, code-ding, confirm, counter-hit, lock-on, logo-hit, logo-hit-soft, notif-ping, redeem-ding, screen-wake, shimmer, sparkle, sparkle-up, success-chime, tile-on, tile-pop | 32 |
| thump / knock / click (tuned sine + saturation) | 11: callout-in, caption-pop, card-in, chip-tick, confetti-pop, count-tick, device-settle, key, lock-click, tap, word-hit | 82 |
| soft pluck | 2: node-on, packet | 9 |
| noise whoosh / riser / air | 18: page-swoosh, photo-whoosh, reveal-whoosh, riser-a, riser-b, riser-count, scroll-soft, swipe-no, swipe-yes, swoosh-open, tagline-air, whoosh-down, whoosh-in, whoosh-out, whoosh-pullback, whoosh-swap, whoosh-up, zoom-whoosh | 28 |
| foley (noise texture) | 2: bag-rustle, handshake | 2 |

## 4. Phone-speaker translation (HP 350 Hz + LP 10 kHz)

Energy kept by each effect type (dB, 0 = nothing lost); only types that lose more than 3 dB:

| type | n | median change | worst |
|---|---|---|---|
| device-settle | 1 | -9.4 dB | -9.4 dB |
| logo-hit | 1 | -7.3 dB | -7.3 dB |
| counter-hit | 1 | -4.2 dB | -4.2 dB |
| confetti-pop | 1 | -4.1 dB | -4.1 dB |
| screen-wake | 1 | -4.0 dB | -4.0 dB |
| tap | 4 | -3.5 dB | -5.8 dB |
| whoosh-pullback | 1 | -3.4 dB | -3.4 dB |

Music stem, per section (loudest 1 s window kept after the filter / before):

| section | music energy kept |
|---|---|
| intro 0-4 s | -7.4 dB |
| drop-A 4-8 s | -3.4 dB |
| groove-A 8-14 s | -5.3 dB |
| build 14-20 s | -3.8 dB |
| counter 20-22 s | -4.6 dB |
| drop-B 22-26 s | -3.4 dB |
| email 26-34 s | -4.6 dB |
| system 34-37.6 s | -3.5 dB |
| human 37.6-40 s | -2.7 dB |
| outro 40-44.5 s | -2.9 dB |

## 5. Re-encode test (what a platform serves)

| file | integrated | LRA | true peak |
|---|---|---|---|
| master WAV | -14.0 LUFS | 4.6 LU | -1.4 dBTP |
| AAC 192k (native encoder) | -14.1 LUFS | 4.5 LU | -1.2 dBTP |
| AAC 128k (native encoder) | -14.1 LUFS | 4.5 LU | -1.1 dBTP |
| AAC 96k (native encoder) | -14.1 LUFS | 4.5 LU | -1.1 dBTP |

