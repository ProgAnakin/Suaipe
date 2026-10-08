# Script — Suaipe film v3 · BRIEF v2, phase 2 (approved with changes)

> **Superseded.** This is the script of the 50 s "B2B career" cut (v3, commit `7a4d486`), which carried the author's name. The current film is **v4** (`README.md`): the calm v2 structure plus the Manager & Stats and Consultants scenes, with no name — its copy lives in `src/timeline.ts`.

Status: **approved 2026-10-08** with the changes in section 0. Phase 3 (implementation) follows this document.
All on-screen copy is English. Times are seconds on the 120 BPM grid (beat 0.5 s, bar 2.0 s; `B12.3` = bar 12, beat 3 = 23.0 s).

---

## 0. Decisions taken and facts

| # | decision |
|---|---|
| 1 | Hook **H2** — "A customer walks in. The store rarely learns who." |
| 2 | Signature line **P3** — "Simple ideas create contact. Contact creates data." plus a *slightly indicative* call to action (default: "Let's talk retail.") |
| 3 | **Add** a scene, **remove none**: the system-diagram scene stays; a new *Store value* scene is added. The old end card becomes the *Signature* (same slot) |
| 4 | Stores, cities (fictional) and the store count stay out of the film: "multi-store" only |
| 5 | The AI-illustration line stays in the film, **very small, almost invisible**, and fully visible in the post |
| 6 | Length **50.0 s** = 25 bars (the brief suggested 40–46 s; this is your call) |
| 7 | All copy approved as written (section 4) |

**Facts supplied:** name *Costanzo Annichini*; the products in the app are fictional, unbranded replicas of products you sell; no real store photos (you do not want trouble at work) → the in-store scenes stay AI-generated and are labelled as illustrations; the real metrics are in `/manager` and belong to the store → **no result figure anywhere in the film**, dashboards are shown with labelled sample data; the thesis: *a simple idea, born from observation, gives retail more contact and more data (CRM and more), precisely because it is simple.*

**Facts policy.** A number or claim appears only if you supplied it or it is a product fact visible in the repository (8 quiz cards, 1 match, 1 unique code, per-store dashboards, consent stored with each lead, a relay to a CRM sheet, MFA on `/manager` and `/stats`, row-level security on every table). Not in the film any more: "under two minutes", "2FA on staff dashboards" (the System caption now says what is true), "Live in 4 retail stores", the four city chips, "Suaipe Milano" in the e-mail ticket (re-captured with a neutral store name), the `REACT · SUPABASE · PWA` line. Not used because not supplied: current/target job title.

---

## 1. The idea, and what changes

> **A simple idea, built from what you see on the shop floor, gives retail more contact with its customers — and the data that comes with it.**

Argument in four moves: (1) the store rarely learns who walked in; (2) a question and eight swipes make the customer *play* instead of filling in a form; (3) the store gets a consented lead, a per-store view, a CRM row — and it is built properly; (4) the sale is still closed by a person. The name comes last.

| | today (44.5 s) | v3 (50 s) |
|---|---|---|
| keep | lock-up, hand-off photo + fly-in, real-drag swipes, counter / 98 % beat, e-mail code zoom, **system diagram**, bag + handshake close, defocus into the closing card | same assets, re-timed |
| shorten | typing (2.0 → 1.4 s), tutorial, e-mail scroll, success screen, swipe caption (5.8 → 3.0 s) | |
| fix | system caption (true MFA statement), "×4 stores" chip → "multi-store", "2FA" chips → "MFA", bottom tile row out of the player's covered strip | |
| new | hook (store photo + a moving light), **Store-value scene**, **Signature** (name, thesis, CTA), tiny illustration line, "sample data" labels | |

---

## 2. Hook — H2 (chosen)

* **On screen:** "A customer walks in." (0.0–3.0 s), "The store rarely learns who." (1.0–3.7 s). Both are on screen/legible by the first frame.
* **Visual:** the store photo, sharp (not blurred), slow push-in. A soft cyan light — the customer; no faces — walks the aisle from the left edge, reaches the counter at 1.0 s, pulses once at 2.0 s and fades out: the unknown. A 0.25 s air gap at 3.75 s, then the flash into the lock-up.
* **Why it works:** it states the problem the rest of the film solves, in the first 2 s, in the vocabulary of CRM and first-party data; it is your thesis in problem form.
* **Caveat:** "rarely" is a premise, not a statistic. In an interview: "that is what I see on the floor", not "studies show".
* Not chosen: H1 "Too many gadgets. Too few hands." (kept as the fallback), H3 "Nobody fills in a form. Everybody swipes." (its idea survives as T4, "A game, not a form.").

---

## 3. Structure (master, 50.0 s)

| # | block | time | bars | what it must do |
|---|---|---|---|---|
| 1 | Hook | 0.0–4.0 | 1–2 | the store's problem, readable muted in 2 s |
| 2 | Idea | 4.0–6.0 | 3 | logo + one-line promise |
| 3 | Experience | 6.0–23.0 | 4–12 | hand-off → form with consent → 8 swipes → 98 % → "I want it" |
| 4 | Customer value | 23.0–30.0 | 12–15 | personal e-mail + unique code |
| 5 | **Store value** (new) | 30.0–38.0 | 16–19 | consented lead → per-store view → CRM row |
| 6 | System (kept) | 38.0–42.0 | 20–21 | how it is built: multi-store, row-level security, MFA where it matters |
| 7 | Human close | 42.0–46.0 | 22–23 | bag + handshake: "people close the sale" |
| 8 | **Signature** | 46.0–50.0 | 24–25 | name, thesis, soft CTA; the last 1.5 s still |

---

## 4. All on-screen copy and reading time

Rule: on-screen time ≥ 0.6 s + 0.3 s per word, ≤ 7 words per line, no "!", no empty buzzwords. Longest line here is 6 words.

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
| V4 | System | Multi-store. Row-level security on every table. | 6 | 38.0–41.6 s (3.6) | 2.4 s | ok |
| T7 | Human | Technology opens the conversation. / People close the sale. | 8 (4 + 4) | 42.2–45.8 s (3.6) | 3.0 s | ok |
| C2 | Human (chip) | Redeemed in store | 3 | 42.4–44.0 s (1.6) | 1.5 s | ok (tight) |
| S1 | Signature | Costanzo Annichini | 2 | 46.0–50.0 s (4.0) | 1.2 s | ok |
| S2 | Signature | Simple ideas create contact. / Contact creates data. | 7 (4 + 3) | 46.6–49.4 s (2.8) | 2.7 s | ok (tight) |
| S4 | Signature (CTA) | Let's talk retail. | 3 | 47.8–49.9 s (2.1) | 1.5 s | ok |
| S3 | Signature (tiny, near-invisible by choice) | In-store scenes are AI-generated illustrations. | 5 | 47.2–49.8 s | exempt | — |

Every line passes; six are tight (spare < 0.25 s) and get their hold in phase 3 by shortening animation, not by adding words. S3 is exempt from the reading rule on purpose (your decision 5); it is set at 14–16 px, ~40 % opacity, and the post carries the real disclosure.
Truth check: T1/T2 premise (see section 2); T3/T4/T5 product design; C1 `consent_given_at` is stored with each session; T6 personalised e-mail + a code redeemable in store; V1 a lead row exists only after the customer claims the match; V2 per-store dashboards with product ranking; V3 the relay writes each lead to a CRM sheet; V4 row-level security on every table, MFA on `/manager` and `/stats` (the diagram's chips sit on exactly those two tiles); C2 `mark_code_redeemed`; T7 your argument; S2 your thesis.
CTA alternatives if you prefer another wording (all soft): "Curious how? Let's talk." · "Open to the conversation." · "Say hello."

---

## 5. Beat sheet (master, 120 BPM)

`★` = one of the five "signature" sounds allowed by the brief (four used). Picture and sound share a row on purpose.

| time | bar.beat | block | picture | sound |
|---|---|---|---|---|
| 0.00 | 1.1 | Hook | store photo, slow push; T1 already on screen; the light enters from the left | drone + sparse sub heartbeat, no drums |
| 1.00 | 1.3 | Hook | T2 rises; the light reaches the counter | heartbeat accent |
| 2.00 | 2.1 | Hook | the light pulses once and fades; photo dims 15 % | suspended chord; one soft "air" for the fade |
| 3.50 | 2.4 | Hook | text at full contrast; light gathers at centre | tonal riser peaks |
| 3.75 | — | Hook | hold | **air gap** (0.25 s near-silence) |
| 4.00 | 3.1 | Idea | flash-through → logo + ring; wordmark assembles 4.15–4.6 | ★ **logo hit** + sonic motif, first half |
| 4.50 | 3.2 | Idea | T3 under the wordmark | shimmer |
| 5.50 | 3.4 | Idea | lock-up parts toward the centre | soft whoosh-in |
| 6.00 | 4.1 | Experience | **cut on the beat** to the hand-off photo | room tone starts |
| 6.50 | 4.2 | Experience | screen wakes; T4 rises | screen-wake chime |
| 7.00–7.55 | 4.3–4.4 | Experience | fly-in → match-cut to the flat iPad | zoom whoosh |
| 8.00 | 5.1 | Experience | tap TAP TO START; welcome form | tap |
| 8.50–9.90 | 5.2–5.4 | Experience | name, surname, e-mail typed fast | **one** soft typing gesture |
| 10.00 | 6.1 | Experience | consent ticked; C1 appears (to 12.4) | consent click |
| 12.00 | 7.1 | Experience | tap START THE GAME | tap |
| 12.25–13.25 | 7.2–7.4 | Experience | tutorial card | — |
| 13.50 | 7.4 | Experience | tap I'M READY | tap |
| 14.00 | 8.1 | Experience | card 1 enters; T5 (14.2–17.2) | groove enters, light |
| 14.25–18.25 | 8.1–10.1 | Experience | eight real swipes | "yes" rises/opens, pans right; "no" falls/closes, pans left |
| 18.50 | 10.2 | Experience | scanning ring 0 % | one tonal riser (replaces 13 ticks) |
| 19.75 | 10.4 | Experience | ring at 98 % | **air gap** 0.25 s |
| 20.00 | 11.1 | Match | **98 % hit**, confetti, product card | ★ **98 % hit** (or held back if the sound direction keeps the biggest moment for the end) |
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
| 37.75 | 19.4 | Store value → System | dashboard pushes back as the first node arrives | soft whoosh-in; pulse continues |
| 38.00–39.40 | 20.1–20.4 | System | five nodes + data packets build (as today, +4.0 s) | staccato arps + gated pad; node plucks as a run |
| 39.80–40.20 | 20.4–21.1 | System | three dashboard tiles; "MFA" chips on Manager and Stats only | tile bloom as **one** gesture |
| 40.55, 40.95 | 21.2, 21.3 | System | "RLS" and "MFA" chips pop | two soft clicks |
| 41.50 | 21.4 | System → Human | photo cut (0.5 s) | pulse stops cleanly |
| 42.00 | 22.1 | Human | bag hand-off photo; T7 from 42.2; room tone up | bag rustle |
| 42.50 | 22.2 | Human | chip C2 "Redeemed in store" + code | redeem ding |
| 44.00 | 23.1 | Human | **cut on the beat** to the handshake; clasp bloom | ★ **handshake**: dry clasp + warm resolved chord, no cymbal |
| 45.00 | 23.3 | Human | defocus begins | — |
| 46.00 | 24.1 | Signature | S1 over the defocused handshake | ★ **sonic motif completes** on the held chord |
| 46.60 | 24.2 | Signature | S2 | — |
| 47.20 | 24.3 | Signature | S3 (tiny) | one sparkle |
| 47.80 | 24.4 | Signature | S4 (CTA) | — |
| 48.50–49.50 | 25.2–25.4 | Signature | nothing moves | chord rings out, fades |
| 50.00 | 26.1 | — | end | silence |

---

## 6. Sound script (the sound-direction choice comes in phase 4)

| block | target feeling | music state | the effects that matter | budget |
|---|---|---|---|---|
| Hook | unease, curiosity | drone + sub heartbeat, harmony left open, no drums | the light's fade (air); the 0.25 s gap before the hit | 2–3 |
| Idea | recognition, relief | first resolution; motif half | logo hit ★, shimmer | 3 |
| Experience | play, momentum | light groove, controlled build; swipes lead the rhythm | taps; **distinct swipe yes / no**; one tonal scan riser; 98 % ★ | ~24 |
| Customer value | warm, personal | low-passed e-piano breakdown | notification ping; code ding | 3–4 |
| Store value | competent, steady | firm regular pulse, confident harmony | grouped ticks; one "land" pluck | 4–5 |
| System | precise, calm | staccato arps + gated pad (as today), less busy | node pluck run; tile bloom; two clicks | 6–7 |
| Human | warm, human | pad + felt piano, no drums, room tone, "lift" into 44.0 | bag rustle; redeem ding; handshake clasp ★ | 3 |
| Signature | quiet pride, closure | resolved chord holds; motif completes | motif ★; one sparkle | 2 |

**Event budget:** ≈ 55–70 events (today 153, of which 108 are "texture"), none above 4 per second except grouped gestures, four ★ sounds. Typing, counter ticks, tile pops and node plucks become *gestures*; whooshes keep their +3…+6 dB margin over the music; the three sub-heavy hits get upper harmonics so they survive a phone speaker. A shop room tone under the photos (hand-off and close) rhymes start and end.

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
| 12.00 | 7.1 | K3 "Costanzo Annichini"; K4 "Simple ideas create contact. / Contact creates data." (12.0–14.8); K5 "Let's talk retail." (13.2–15.0) | ★ motif completes on a resolved chord |
| 13.00–15.00 | 7.3–8.3 | still | chord rings; ≥ 1 s tail to silence |

Copy check: K1 3 w/2.0 s ✓ (1.5) · K2 4 w/3.8 s ✓ (1.8) · K3 2 w/3.0 s ✓ (1.2) · K4 7 w/2.8 s ✓ (2.7, tight) · K5 3 w/1.8 s ✓ (1.5).
No e-mail, store-value, system or human block: it is the "idea → play → match → who made it" cut for comments and stories.

---

## 8. Signature card

Name (S1) over the defocused handshake; the thesis (S2) under it; a soft CTA (S4); the near-invisible illustration line (S3) at the very bottom of the safe area. No job title (not supplied). Alternative closing lines kept for the post: "From the shop floor to first-party data." · "I sell on the floor. I build what it needs."

---

## 9. Phase 3 plan (increments, one commit each) and risks

1. `timeline.ts` rewritten to the sheet above (50 s, 8 blocks), cue sheet regenerated; empty Store-value and Signature scenes so the film still renders end to end.
2. Motion vocabulary in `lib/motion.ts` (documented), 4-size type scale + margins/safe area in `theme.ts`.
3. New hook (H2).
4. Idea + Experience re-timed (no language call-out, faster typing, 2.4 s consent call-out, shorter tutorial; fix the 5.4 near-cut, the 20.00 flash, the 7.0 fly-in resolve).
5. Customer value: neutral store name in the e-mail capture, caption, shorter scroll.
6. Captures for Store value (`/manager` Sessions & Codes, `/stats`) with sample data. **Largest risk**: the capture harness has to get past PIN / MFA. If it cannot, I say so before drawing anything; a clearly labelled illustrative graphic would need your OK (your brief forbids app-screen mock-ups).
7. Store-value scene.
8. System scene: true caption, "multi-store" chip, "MFA" chips, bottom row inside the safe area, re-timed to 38.0–42.0.
9. Human close re-timed, chip text.
10. Signature scene.
11. Transition continuity, QA loop (`scripts/qa/*`), sheets and stills.
12. Cover, then the 15 s composition.

Then phase 4 (sound): `SOUND.md` with two directions → your choice → implementation → A/B files → your listening feedback → final render, `LINKEDIN.md`, README/ADR.
