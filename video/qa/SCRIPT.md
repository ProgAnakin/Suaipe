# Script — Suaipe film v3 · BRIEF v2, phase 2

Proposal only: nothing has been implemented. Phase 3 starts after the choices in section 10.
All on-screen copy is English. Times are seconds on the 120 BPM grid (beat 0.5 s, bar 2.0 s; `B12.3` = bar 12, beat 3 = 23.0 s).

---

## 0. What this script is built from

**Facts you gave** (section 3 of the brief, your reply):

| fact | how it is used |
|---|---|
| Name: Costanzo Annichini | signature card |
| The products in the app are fictional, unbranded replicas of products you already sell | product packshots/names may stay on screen; no real brand appears |
| No real photos of the store (you do not want trouble with your workplace) | the in-store scenes stay AI-generated and are **labelled as illustrations** (small line in the film + in the post) |
| Real metrics live in the app's `/manager` | not available to me and employer data anyway → **no result figure anywhere in the film**; the dashboards are shown as UI with clearly labelled sample data |
| The point: from an idea and observation you create more value for retail — CRM, data, several effects — with an idea that looks simple and creates more contact with the public *because* it is simple | this is the film's thesis (section 1); there is no "hire me" line because you did not supply one |

**Blank / not used:** current title, target title, positioning line (you left it blank = I propose three, section 8), explicit CTA, extra subtitle languages.

**Facts policy.** A number or claim may appear only if (a) you supplied it or (b) it is a product fact visible in the repository (8 quiz cards, 1 match, 1 unique code, per-store dashboards, consent stored with each lead, a relay to a CRM sheet). Result figures (conversion, leads, time saved) are excluded. Removed from the current film: **"under two minutes"** (no source), **"2FA on staff dashboards"** (only `/manager` and `/stats` have MFA), **"Live in 4 retail stores" and the four city chips**, **"Suaipe Milano"** in the e-mail ticket (re-captured with a neutral store name), the `REACT · SUPABASE · PWA` line.

**Assumption to confirm (⛔ 4):** you answered about products only, and you do not want trouble at work → I treat store names, cities and the store *count* as **not cleared**. The film says "multi-store" at most.

---

## 1. The idea, and what changes

> **A simple idea, built from what you see on the shop floor, gives retail more contact with its customers — and the data that comes with it.**

The film now argues that in four moves: (1) the store rarely learns who walked in; (2) a question and eight swipes get a customer to *play* instead of filling in a form; (3) the store gets a consented lead, a per-store view and a CRM row; (4) the sale is still closed by a person. The name comes last.

| | today (v2.3, 44.5 s) | v3 (46 s) |
|---|---|---|
| keep | lock-up, hand-off photo + fly-in, real-drag swipes, counter / 98 % beat, e-mail code zoom, bag + handshake close, defocus into the end card | same assets, re-timed |
| shorten | typing (2.0 → 1.4 s), tutorial, e-mail scroll, success screen, swipe caption (5.8 → 3.0 s) | |
| cut | tile-wall hook lines, "5 languages" call-out, system-diagram scene, store count/cities, tech line, "under two minutes" | |
| new | hook (store + a moving light), **store-value block** (3 beats), **signature card**, tiny AI-illustration line, "sample data" labels | |

Total length 46.0 s = 23 bars (+1.5 s on the 44.5 s master, inside the ±5 s you set).

---

## 2. Three hooks (pick one)

First frame (0.00 s) carries the message in all three.

### H1 — "Too many gadgets. Too few hands."
* **On screen:** "Too many gadgets." (0.1–2.2 s) → "Too few hands." (1.6–3.7 s).
* **Visual:** today's wall of ten product cards over the store photo; at "hands" the wall freezes, then the flash into the lock-up. Pays off later with the hands (hand-off, bag, handshake).
* **Why it works for B2B-sales readers:** names a staffing/time limit every store manager recognises, in 5 words; cheapest to build (reuses the hook).
* **Weakness:** still reads as a shopper's problem; "few hands" is a generalisation.

### H2 — "A customer walks in. The store rarely learns who." ★ recommended
* **On screen:** "A customer walks in." (0.0–3.0 s), "The store rarely learns who." (1.0–3.7 s).
* **Visual:** the store photo, sharp (not blurred), slow push-in. A soft cyan light — the customer; no faces needed — walks the aisle from the left edge, reaches the counter at 1.0 s, pulses once at 2.0 s and fades out: the unknown. A 0.25 s air gap at 3.75 s, then the flash.
* **Why it works:** it states, in the first 2 s and in the vocabulary of CRM and first-party data, the exact problem the rest of the film solves; it is your thesis in problem form. It is the only option where *contact* is the subject.
* **Weakness / risk:** "rarely" is a premise, not a statistic (defensible: a store without an identification step does not learn who visited; say "I observed…" in an interview, not "studies show"); needs one new animation (low risk).

### H3 — "Nobody fills in a form. Everybody swipes."
* **On screen:** "Nobody fills in a form." (0.0–2.6 s) → "Everybody swipes." (1.6–3.7 s).
* **Visual:** opens on the hand-off photo (dark tablet in two hands); the screen wakes on "swipes" with the first card.
* **Why it works:** the insight of the whole project in 6 words (friction vs play); best thumbnail (human + tablet).
* **Weakness:** the problem is implied, not shown; "nobody/everybody" are rhetorical absolutes; reorders the film (photo before the lock-up) → biggest rebuild.

**Recommendation: H2.** Reading check (rule 0.6 s + 0.3 s/word): H1 3 w/2.1 s, 3 w/2.1 s ✓ · H2 4 w/3.0 s, 5 w/2.7 s ✓ · H3 5 w/2.6 s, 2 w/2.1 s ✓.

---

## 3. Structure (master, 46.0 s)

| # | block | time | bars | what it must do |
|---|---|---|---|---|
| 1 | Hook | 0.0–4.0 | 1–2 | the store's problem, readable muted in 2 s |
| 2 | Idea | 4.0–6.0 | 3 | logo + one-line promise |
| 3 | Experience | 6.0–23.0 | 4–12 | hand-off → form with consent → 8 swipes → 98 % → "I want it" |
| 4 | Customer value | 23.0–30.0 | 12–15 | personal e-mail + unique code |
| 5 | **Store value** (new) | 30.0–38.0 | 16–19 | consented lead → per-store view → CRM row |
| 6 | Human close | 38.0–42.0 | 20–21 | bag + handshake: "people close the sale" |
| 7 | **Signature** (new) | 42.0–46.0 | 22–23 | name + thesis line, last 1.5 s still |

---

## 4. All on-screen copy (master) and reading time

Rule: on-screen time ≥ 0.6 s + 0.3 s per word, ≤ 7 words per line, no "!", no empty buzzwords. Longest line here is 5 words.

| id | block | text | words | on screen | needed | verdict |
|---|---|---|---|---|---|---|
| T1 | Hook | A customer walks in. | 4 | 0.0–3.0 s (3.0) | 1.8 s | ok |
| T2 | Hook | The store rarely learns who. | 5 | 1.0–3.7 s (2.7) | 2.1 s | ok |
| T3 | Idea | One question changes that. | 4 | 4.5–6.4 s (1.9) | 1.8 s | ok (tight) |
| T4 | Experience | A game, not a form. | 5 | 6.6–9.4 s (2.8) | 2.1 s | ok |
| C1 | Experience (call-out) | GDPR consent, captured at the source | 6 | 10.0–12.4 s (2.4) | 2.4 s | ok (tight) |
| T5 | Experience | Eight swipes. One match. | 4 | 14.2–17.2 s (3.0) | 1.8 s | ok |
| T6 | Customer value | A personal email. A reason to return. | 7 | 25.2–28.8 s (3.6) | 2.7 s | ok |
| V1 | Store value | Every claimed match becomes a lead. | 6 | 30.2–32.8 s (2.6) | 2.4 s | ok (tight) |
| V2 | Store value | See what sells, store by store. | 6 | 32.8–35.4 s (2.6) | 2.4 s | ok (tight) |
| V3 | Store value | Leads land in the CRM. | 5 | 35.4–37.8 s (2.4) | 2.1 s | ok |
| C2 | Human (chip) | Redeemed in store | 3 | 38.4–40.0 s (1.6) | 1.5 s | ok (tight) |
| T7 | Human | Technology opens the conversation. / People close the sale. | 8 (4 + 4) | 38.2–41.8 s (3.6) | 3.0 s | ok |
| S1 | Signature | Costanzo Annichini | 2 | 42.0–46.0 s (4.0) | 1.2 s | ok |
| S2 | Signature | Simple ideas create contact. / Contact creates data. | 7 (4 + 3) | 42.6–45.6 s (3.0) | 2.7 s | ok |
| S3 | Signature (tiny) | In-store scenes are AI-generated illustrations. | 5 | 43.4–45.8 s (2.4) | 2.1 s | ok |

Every line passes; five are tight (spare < 0.25 s) and will be given real hold in phase 3 by shortening animation, not by adding words.
Truth check of each line: T1/T2 premise (see H2); T3/T4/T5 product design; C1 `consent_given_at` is stored with each session; T6 personalised e-mail + a code redeemable in store; V1 a lead row exists only after the customer claims the match; V2 the dashboards are per store and rank products; V3 the relay writes each lead to a CRM sheet; C2 `mark_code_redeemed`; T7 your argument; S2 your thesis; S3 disclosure.

---

## 5. Beat sheet (master, 120 BPM)

`★` = one of the five "signature" sounds allowed by the brief (4 used). Picture and sound are one row on purpose.

| time | bar.beat | block | picture | sound |
|---|---|---|---|---|
| 0.00 | 1.1 | Hook | store photo, slow push; T1 already on screen; the light enters from the left | drone + sparse sub heartbeat, no drums |
| 1.00 | 1.3 | Hook | T2 rises; the light reaches the counter | heartbeat accent |
| 2.00 | 2.1 | Hook | the light pulses once and fades; photo dims 15 % | suspended chord; one soft "air" for the fade |
| 3.50 | 2.4 | Hook | text at full contrast; light gathers at centre | tonal riser peaks |
| 3.75 | — | Hook | hold | **air gap** (0.25 s of near-silence) |
| 4.00 | 3.1 | Idea | flash-through → logo + ring; wordmark assembles 4.15–4.6 | ★ **logo hit** + sonic motif, first half |
| 4.50 | 3.2 | Idea | T3 under the wordmark | shimmer |
| 5.50 | 3.4 | Idea | lock-up parts toward the centre | soft whoosh-in |
| 6.00 | 4.1 | Experience | **cut on the beat** to the hand-off photo | room tone starts |
| 6.50 | 4.2 | Experience | screen wakes; T4 rises | screen-wake chime |
| 7.00–7.55 | 4.3–4.4 | Experience | fly-in → match-cut to the flat iPad | zoom whoosh |
| 8.00 | 5.1 | Experience | tap TAP TO START; welcome form | tap |
| 8.50–9.90 | 5.2–5.4 | Experience | name, surname, e-mail typed fast | **one** soft typing gesture (not 33 clicks) |
| 10.00 | 6.1 | Experience | consent ticked; C1 appears (to 12.4) | consent click |
| 12.00 | 7.1 | Experience | tap START THE GAME | tap |
| 12.25–13.25 | 7.2–7.4 | Experience | tutorial card | — |
| 13.50 | 7.4 | Experience | tap I'M READY | tap |
| 14.00 | 8.1 | Experience | card 1 enters; T5 (14.2–17.2) | groove enters, light |
| 14.25–18.25 | 8.1–10.1 | Experience | eight real swipes | "yes" rises/opens and pans right; "no" falls/closes and pans left |
| 18.50 | 10.2 | Experience | scanning ring 0 % | one tonal riser (replaces 13 ticks) |
| 19.75 | 10.4 | Experience | ring at 98 % | **air gap** 0.25 s |
| 20.00 | 11.1 | Match | **98 % hit**, confetti, product card | ★ **98 % hit** (full chord stack) — or held back if the sound direction keeps the biggest moment for the end |
| 22.00 | 12.1 | Match | tap I WANT IT → success | success chime |
| 23.00 | 12.3 | Transition | whip: iPad leaves left, iPhone arrives | whoosh-swap (pan L → R) |
| 24.50 | 13.2 | Customer value | notification "Your match is ready" | notification ping |
| 25.00 | 13.3 | Customer value | e-mail opens; T6 (25.2–28.8) | e-piano breakdown |
| 26.75–27.75 | 14.2–14.4 | Customer value | scroll → zoom to the code ticket | — |
| 28.00 | 15.1 | Customer value | code revealed, sweep | code ding |
| 29.00 | 15.3 | Customer value | phone drops away | soft whoosh-down |
| 30.00 | 16.1 | Store value | manager view with sample leads slides in; V1; consent badges pop in on rows | firm steady pulse; ticks **grouped** per cluster |
| 32.50 | 17.2 | Store value | funnel + product ranking; V2 | — |
| 35.25 | 18.3 | Store value | one lead flies into a CRM row; V3 | one soft "land" pluck |
| 37.75 | 19.4 | Store value | photo cut (≤ 0.25 s) | soft whoosh-in; pulse stops cleanly |
| 38.00 | 20.1 | Human | bag hand-off photo; T7 from 38.2 | bag rustle; room tone up |
| 38.50 | 20.2 | Human | chip C2 "Redeemed in store" + code | redeem ding |
| 40.00 | 21.1 | Human | **cut on the beat** to the handshake; clasp bloom | ★ **handshake**: dry clasp + warm resolved chord, no cymbal |
| 41.00 | 21.3 | Human | defocus begins | — |
| 42.00 | 22.1 | Signature | S1 over the defocused handshake | ★ **sonic motif completes** on the held chord |
| 42.60 | 22.2 | Signature | S2 | — |
| 43.40 | 22.4 | Signature | S3 (tiny) | one sparkle |
| 44.00–45.50 | 23.1–23.4 | Signature | nothing moves | chord rings out, fades |
| 46.00 | 24.1 | — | end | silence |

---

## 6. Sound script (the sound-direction choice comes in phase 4)

| block | target feeling | music state | the effects that matter | budget |
|---|---|---|---|---|
| Hook | unease, curiosity | drone + sub heartbeat, harmony left open, no drums | the light's fade (air); the 0.25 s gap before the hit | 2–3 |
| Idea | recognition, relief | first resolution; motif half | logo hit ★, shimmer | 3 |
| Experience | play, momentum | light groove, controlled build; swipes lead the rhythm | taps; **distinct swipe yes / no**; one tonal scan riser; 98 % ★ | ~24 |
| Customer value | warm, personal | low-passed e-piano breakdown | notification ping; code ding | 3–4 |
| Store value | competent, steady | firm regular pulse, staccato arps, confident harmony | grouped ticks; one "land" pluck | 4–5 |
| Human | warm, human | pad + felt piano, no drums, room tone, "lift" into 40.0 | bag rustle; redeem ding; handshake clasp ★ | 3 |
| Signature | quiet pride, closure | resolved chord holds; motif completes | motif ★; one sparkle | 2 |

**Event budget:** ≈ 45–60 events (today 153, of which 108 are "texture"), none above 4 per second except grouped gestures, four ★ sounds. Practical changes: typing, counter ticks and tile pops become *gestures*; the whooshes keep their +3…+6 dB margin over the music; the 3 sub-heavy hits get upper harmonics so they survive a phone speaker. Room tone of a shop under the photos (hand-off and close) rhymes the start and the end.

---

## 7. Cut-down (15.0 s = 7.5 bars): hook → swipes → match → signature

| time | bar.beat | picture | sound |
|---|---|---|---|
| 0.00 | 1.1 | store photo, light walks; K1 "Walk-ins leave unknown." (0.0–2.0 s) | drone + heartbeat |
| 1.75 | — | — | air gap |
| 2.00 | 2.1 | flash → logo, 0.8 s only | ★ logo hit + motif half |
| 3.00 | 2.3 | hand-off photo → fly-in (compressed to 1.0 s) | whoosh |
| 4.00 | 3.1 | tap → first card; K2 "Eight swipes. One match." (4.2–8.0) | groove enters |
| 4.25–7.75 | 3.1–4.4 | five real swipes (the dots read 8) | yes / no gestures |
| 8.00 | 5.1 | scan ring | riser |
| 9.75 | — | 98 % | air gap |
| 10.00 | 6.1 | **98 % hit**, product card | ★ hit |
| 12.00 | 7.1 | K3 "Costanzo Annichini"; K4 "Simple ideas create contact. / Contact creates data." (12.2–15.0) | ★ motif completes on a resolved chord |
| 13.00–15.00 | 7.3–8.3 | still | chord rings; ≥ 1 s tail to silence |

Cut-down copy check: K1 3 w/2.0 s ✓ (1.5) · K2 4 w/3.8 s ✓ (1.8) · K3 2 w/3.0 s ✓ (1.2) · K4 7 w/2.8 s ✓ (2.7, tight).
No e-mail, store-value or human block: it is the "idea → play → match → who made it" cut for comments and stories.

---

## 8. Signature: three positioning / closing lines

| option | line | note |
|---|---|---|
| P1 | "I sell on the floor. I build what it needs." (10 w, two lines) | personal, the seller-who-builds duality; first-person |
| P2 | "From the shop floor to first-party data." (7 w) | domain-forward; keywords for retail-tech readers |
| P3 ★ | "Simple ideas create contact. Contact creates data." (7 w, two lines) | your thesis in your own rhythm; no jargon but "data" |

Recommend **P3 on the card**, P1 as the first line of the post, P2 as a subtitle in the post. No job title appears (you gave none); if you want one, give it and I add it under the name. The tiny disclosure line sits under it: "In-store scenes are AI-generated illustrations."

---

## 9. Implementation notes and risks (phase 3 preview)

* **New captures (largest risk).** `/manager` "Sessions & Codes" and `/stats` (funnel, product ranking) must be captured through `tools/capture` with a mocked Supabase and *sample* data, labelled "sample data", with a neutral store name; PIN / MFA have to be bypassed by the harness. If that proves infeasible I will say so rather than draw a mock-up (your brief forbids mock-ups of app screens); the fallback would be a clearly labelled illustrative graphic, which needs your OK.
* **E-mail capture:** regenerate with a neutral store name (removes "Suaipe Milano").
* **Timeline:** `timeline.ts` is rewritten to the sheet above; everything stays on the 120 BPM grid; audio cues regenerate from it.
* **Hook light:** one new Remotion animation (a glow following a path over the photo); no new image generation.
* **Reused unchanged:** the five photos and the real-drag swipe recordings (their lengths, 0.4–0.8 s, are why the swipes block cannot be shorter than ~4.4 s).
* **Cut-down:** a second composition (`Root.tsx`) reusing the scenes with its own timeline and cue sheet.

---

## 10. Decisions needed (⛔ checkpoint)

1. **Hook:** H1, **H2 (recommended)** or H3.
2. **Signature line:** P1, P2 or **P3 (recommended)**; and whether to show a job title / an explicit CTA (default: none).
3. **Retire the System scene** (jargon: Edge Function, RLS, 2FA) and replace it with the Store-value block — a whole-scene removal, so it needs your yes. The stack and the security facts move to the post.
4. **Stores, cities and the store count stay out of the film** ("multi-store" only) — confirm.
5. **Tiny AI-illustration line in the film** + the same in the post — confirm.
6. **Length 46.0 s** (+1.5 s) — confirm.
7. Anything in the copy you want to change (every line is in section 4).
