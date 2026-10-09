# Sound-effect catalogue

`out/audio-ab/sfx-catalogue.wav` plays **every sound effect of the film once, on its own**, at the film's own level (the same gain the stems and the master apply, so the sounds are as loud against each other
as they are in the film). Each sound is followed by 0.9 s of silence; the families are separated by a longer pause. Use the time to find the sound you want to talk about, then tell me
*fine · change it · remove it* — the **type** column is its name in the cue sheet, the last column says where the film uses it.

Regenerate with `python tools/audio/catalogue.py --ffmpeg $FFMPEG`.

## Taps, selections and confirmations

*what the viewer does or chooses: a tap, a language, a tick in a box, a swipe (NO falls, YES rises), a label popping in*

| time in file | type | class | used | first use in the film | what it is for |
|---|---|---|---|---|---|
| 0:01.00 | `tap` | A | 5× | 8.00 s (tap) | finger taps TAP TO START (ripple, button flash) |
| 0:02.90 | `chip-tick` | A | 6× | 8.80 s (select) | the language highlight hops across the flags: left to right |
| 0:04.80 | `check-tick` | A | 4× | 12.00 s (check) | the consent box is ticked |
| 0:06.70 | `lock-click` | A | 3× | 12.25 s (lock) | GDPR padlock closes |
| 0:08.60 | `confirm` | A | 1× | 13.35 s (confirm) | positive confirmation after START THE GAME |
| 0:10.50 | `callout-in` | A | 6× | 8.70 s (callout) | "5 languages" label pops in |
| 0:12.40 | `chip-pop` | A | 10× | 38.60 s (chip) | "Store A" chip pops in |
| 0:14.30 | `swipe-no` | A | 6× | 15.38 s (swipe) | card 1 swiped NO (left) |
| 0:16.30 | `swipe-yes` | A | 4× | 17.38 s (swipe) | card 3 swiped YES (right) |
| 0:18.20 | `dot-tick` | T | 8× | 15.50 s (dot) | progress dot 1 lights up |
| 0:20.10 | `field-tick` | T | 3× | 9.88 s (field-focus) | the first-name field takes focus |
| 0:22.00 | `sample-tick` | T | 2× | 34.00 s (sample) | "Sample data" chip appears |
## Typing and small texture

*the small sounds of things appearing: keystrokes, the scan counter, the gadget cards, the letters of the name, captions and their underline, the question cards, the data packets, the headline words*

| time in file | type | class | used | first use in the film | what it is for |
|---|---|---|---|---|---|
| 0:25.10 | `key` | T | 33× | 10.10 s (key) | keystroke "M" |
| 0:27.00 | `count-tick` | T | 13× | 20.70 s (count) | scan counter steps (5 %) |
| 0:28.90 | `tile-pop` | T | 10× | 0.10 s (tile-pop) | gadget card 1 of 10 pops in |
| 0:30.80 | `letter-tick` | T | 12× | 4.10 s (letter) | wordmark letter S pops in |
| 0:32.70 | `caption-pop` | T | 12× | 6.10 s (caption) | caption 1: "Turns idle in-store iPads into a touchpoint." |
| 0:34.60 | `underline` | T | 12× | 6.69 s (caption-line) | caption 1: the highlighted phrase underlines itself |
| 0:36.50 | `card-in` | T | 8× | 14.70 s (card-in) | question card 1 of 8 enters |
| 0:38.40 | `packet` | T | 4× | 54.35 s (packet) | data starts flowing on connector 1 |
| 0:40.30 | `word-hit` | A | 6× | 0.12 s (word) | "Too" lands |
## Movements

*air that follows the picture: a page, a camera move, a scroll, a lead flying to the CRM, a line drawing itself, a sheen sweeping across*

| time in file | type | class | used | first use in the film | what it is for |
|---|---|---|---|---|---|
| 0:43.40 | `whoosh-up` | A | 2× | 5.40 s (photo-open) | the hand-off photograph opens |
| 0:45.50 | `whoosh-down` | A | 3× | 53.20 s (pull) | the phone steps back as the diagram arrives |
| 0:47.40 | `whoosh-swap` | A | 2× | 25.60 s (transition) | iPad leaves left, iPhone arrives right |
| 0:49.50 | `whoosh-in` | A | 1× | 57.50 s (transition) | the diagram is pushed back as the bag hand-off photo fades in |
| 0:51.40 | `whoosh-out` | T | 1× | 2.00 s (tiles-away) | the other cards fly outward: air |
| 0:53.50 | `whoosh-pullback` | A | 2× | 22.10 s (dock) | the ring docks into the result screen, the camera pulls back |
| 0:55.60 | `zoom-whoosh` | A | 4× | 6.85 s (zoom) | camera flies into the tablet screen |
| 0:57.50 | `reveal-whoosh` | A | 1× | 20.00 s (reveal) | the scan screen opens |
| 0:59.50 | `photo-whoosh` | A | 2× | 57.50 s (photo-cut) | cut to the bag photograph |
| 1:01.40 | `swoosh-open` | A | 1× | 27.60 s (mail-open) | the banner grows into the e-mail |
| 1:03.30 | `page-swoosh` | A | 5× | 47.10 s (page-push) | list to guide |
| 1:05.20 | `scroll-soft` | T | 4× | 29.60 s (scroll) | the e-mail scrolls to the discount code |
| 1:07.80 | `lead-fly` | A | 2× | 40.60 s (lead-fly) | a lead lifts out of the tablet and flies to the CRM |
| 1:09.70 | `line-draw` | T | 7× | 4.75 s (line) | the underline draws itself |
| 1:11.60 | `notif-drop` | A | 1× | 26.90 s (notif-drop) | the banner drops in |
| 1:13.50 | `shimmer` | T | 5× | 4.20 s (shimmer) | the sheen across the logo mark |
| 1:15.90 | `tagline-air` | T | 3× | 4.30 s (tagline) | "Product discovery for physical retail" opens from the centre |
## Arrivals and confirmations

*something arrives or is accepted: the kiosk wakes, the tablet changes hands, success, the notification, the code, the redeemed chip, a lead lands, a node or a tile lights*

| time in file | type | class | used | first use in the film | what it is for |
|---|---|---|---|---|---|
| 1:19.00 | `screen-wake` | A | 1× | 5.90 s (screen-wake) | the kiosk screen lights up inside the photographed glass: soft rising two-note chime |
| 1:20.90 | `device-settle` | A | 1× | 6.35 s (device-settle) | soft low thump as the tablet changes hands |
| 1:22.80 | `success-chime` | H | 1× | 24.35 s (success) | pleasant two-note success |
| 1:25.70 | `notif-ping` | H | 1× | 27.00 s (notif-ping) | glassy two-note notification ding |
| 1:28.30 | `code-ding` | H | 1× | 32.20 s (code) | bright bell as the discount code lights up |
| 1:31.90 | `redeem-ding` | H | 1× | 58.25 s (redeem) | the 'redeemed in store' chip pops: bright glassy two-note ding |
| 1:34.30 | `crm-land` | A | 2× | 41.30 s (lead-land) | the lead lands as a CRM row |
| 1:36.20 | `node-on` | A | 5× | 54.00 s (node) | node "iPad kiosk" pops in |
| 1:38.10 | `tile-on` | A | 3× | 55.80 s (tile) | tile "Manager" rises |
| 1:40.00 | `confetti-pop` | T | 2× | 22.02 s (music cue) | the confetti bursts from the ring (centre): a soft pat and a shower of glints, not a bang |
## The film's big moments

*the few sounds that carry the story: the chosen product, the logo and the first half of the motif, the 98 %, the bag, the handshake, the motif on the logo, the risers and glints*

| time in file | type | class | used | first use in the film | what it is for |
|---|---|---|---|---|---|
| 1:43.10 | `lock-on` | S | 1× | 2.00 s (lock-on) | ★ product chosen: a soft pitched ping + low thump |
| 1:45.80 | `logo-hit` | S | 1× | 4.00 s (logo-hit) | ★ sub boom + glassy C chord (with a low-mid body for phones) + air; the pulse begins after it |
| 1:51.50 | `motif-q` | S | 1× | 4.50 s (music cue) | motif part 1: G4 - A4, left hanging over the C |
| 1:54.60 | `counter-hit` | S | 1× | 22.00 s (scan-hit) | ★ the 98 % bloom: a bright glass C chord and a sub swell; the first, smaller peak |
| 2:00.00 | `bag-rustle` | A | 1× | 58.00 s (rustle) | paper bag changes hands: soft paper rustle + rope-handle creak + a very low, warm thump (real, tactile, quiet) |
| 2:01.80 | `handshake` | S | 1× | 60.00 s (clasp) | ★ the hands meet on the downbeat: a dry skin / cloth clasp (nothing bright) + the big warm resolved C chord (the music's) |
| 2:06.10 | `motif` | S | 1× | 61.00 s (end-hit) | ★ the sonic motif complete: G4 - A4 - C5 - E5, on the logo, over the held chord |
| 2:10.80 | `sparkle-up` | T | 1× | 2.50 s (twinkles) | the nine twinkles around the hero, as one rising run |
| 2:13.20 | `sparkle` | T | 1× | 63.40 s (twinkles) | the glints over the end card, as one fading run |
| 2:16.70 | `riser-a` | A | 1× | 0.00 s (music cue) | tension riser, ends exactly at lock-on |
| 2:19.90 | `riser-b` | A | 1× | 3.00 s (flash) | swell landing on the logo hit (the picture flashes into the logo) |
| 2:22.10 | `scan-riser` | A | 1× | 20.30 s (music cue) | a tonal riser under the scan ring; it thins to an inhale in the 0.25 s of air before the hit |

### Classes

S signature (the few big moments, levelled by hand with the music) · H highlight (an arrival or a confirmation) · A action (something the viewer does or reads) · T texture (small pops, keys, ticks)
· movements (whooshes) and whispers (underlines, outlines, the field waking up) are levelled as classes too: see `CLASS_OF` in `tools/audio/sfx.py`.
