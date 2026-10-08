# Audit — Suaipe film (master 44.5 s, 4:5, 60 fps) · BRIEF v2, phase 1

> **Historical (phase 1 of BRIEF v2).** Written for the 44.5 s film. The current film is **v4** (64.5 s, `README.md`): it restores v2's pacing and adds the Manager & Stats and Consultants scenes; the P0/P1 findings below were resolved there (no cities or store count, sample data labelled, a quieter sound).

Audited file: `out/suaipe-film.mp4` (the build with the real 960 × 1280 photos and the re-balanced effects; 81 MB, −14.0 LUFS).
Nothing in the code was changed for this audit. Measurements are reproducible:

| what | how |
|---|---|
| contact sheets every 0.25 s (9 sheets) | `scripts/qa-sheets.sh out/suaipe-film.mp4 out/qa-audit/sheets 0.25 5 270 20` |
| full-resolution stills at start / middle / end of the 6 transitions + 6 peaks | `out/qa-audit/stills/` (ffmpeg, times in section 4) |
| reading-time test | `node scripts/qa/text-timing.mjs [--md]` (captions come straight from `src/timeline.ts`) |
| motion, pops, safe area | `python scripts/qa/motion-audit.py out/suaipe-film.mp4` → `qa/motion-audit.json` (dense optical flow, 270 px copy) |
| audio | `python scripts/qa/audio-audit.py` → `qa/audio-audit.md` (full tables there) |

What is *my judgement* rather than a measurement is marked as such (scores, "reads as…").

---

## 0. Verdict

The craft is high — real captures, a photographed hand-off that dives into the real screen, real-drag swipes, a clean 98 % moment,
a human close — but **the film argues for the product, and the brief now asks it to argue for the person who built it**. Concretely:

* it never says who made it (the end card sells the stack and the stores; there is no name, role or call to action);
* its first 2 s frame a *shopper's* problem ("Too many gadgets."), not a seller's, and the very first frame is empty;
* the one block that should carry business value (34–37.6 s) is jargon (Edge Function, RLS, 2FA), and one of its claims is broader than the truth;
* six pieces of copy are on screen for less than the reading time they need;
* one numeric claim ("under two minutes") and several permission-dependent items (store names, cities, products) are not backed by anything in section 3 of the brief.

Keep: the hand-off photo → fly-in, the swipes, the counter/98 % beat, the e-mail code zoom, the human close, the frame-locked sound.

### Top 10 (details and timecodes in section 1)

1. **P0** End card has no author: no name, positioning or CTA; the tech stack is the last line (41–44.5 s).
2. **P0** "A match in under two minutes." (22.3–25.4 s) — a number nobody supplied.
3. **P0** Store/city/employer-dependent content on screen without the "yes" of section 3: "Live in 4 retail stores" + four city chips (41.8–44 s), "Suaipe Milano" in the e-mail ticket (31.5–33 s), the retailer's product packshots (hook tiles, result card, e-mail).
4. **P1** First 2 s: shopper-side problem, nothing that says "selling in a store"; first frame (0.00 s) is an empty dark frame.
5. **P1** Business value is missing from 34–37.6 s (jargon); "2FA on staff dashboards" is broader than the product (MFA exists on `/manager` and `/stats`, not on `/consulente`).
6. **P1** Reading time: 6 items fail 0.6 s + 0.3 s/word, 8 more are tight (section 3).
7. **P1** Pacing: 8.0–14.6 s (6.6 s, 15 % of the film) is form filling; the swipe caption stays 5.8 s while the hero interaction is shown small.
8. **P2** Three abrupt moments: a 1-frame flash-in at 20.00 s (the "scanning" screen opens with a full-frame glow), lock-up → photo in 2 frames at 5.42 s, diagram → bag with 0.3 s of ghosted labels at 37.5 s.
9. **P1** Sound register: 153 events (70 % "texture"), 8 seconds above 4 events/s, 23 in one second; the effects themselves were masked by the music until today's re-balance.
10. **P1** Phone legibility and safe area: quiz questions, e-mail body and diagram sub-labels are unreadable at 360 px; the diagram's bottom tile row (y 1138–1306) sits in the player's covered strip; "×4 stores" reads as "+4".

---

## 1. Problems

Severity: **P0** wrong/unsafe to publish or defeats the goal · **P1** clear weakness · **P2** polish.

| # | time | scene | category | sev | finding | proposed fix |
|---|---|---|---|---|---|---|
| 1 | 41.0–44.5 | End card | narrative | P0 | Product lock-up + "Live in 4 retail stores" + cities + `REACT · SUPABASE · PWA`. No name, no role, no CTA: the last impression is the stack. | Replace with a signature card (name, positioning, CTA from section 3); stack moves to the post. |
| 2 | 22.3–25.4 | Match | veracity | P0 | Caption "A match in **under two minutes**." — not measured, not in section 3. | Remove, or replace with a claim that is true by construction ("Eight swipes. One match." is). |
| 3 | 41.8–44.0, 31.5–33.0, 0–4, 20–25, 26–34 | End, e-mail, hook, result | veracity / permission | P0 | Cities (Rio de Janeiro, Lisbon, Dublin, Milan), "Suaipe Milano" in the discount ticket, and ten product packshots/names (Brevia GoPress, Lunaring Halo …) are the employer's retail context. Section 3 has no authorisation yet. | Wait for the answer; if "no", use neutral copy ("in store"), blur/replace names, mask the ticket header. |
| 4 | 0.00–2.0 | Hook | narrative | P1 | "Too many gadgets." = the *customer's* problem; the blurred store behind it is barely legible; frame 0.00 s is an empty dark frame with a ghost tile. | New hook from the seller's side (see phase 2); first frame must already carry the message. |
| 5 | 34.0–37.6 | System | narrative / veracity | P1 | Business value is absent: 5 nodes + 3 tiles in jargon. Caption says "2FA on staff dashboards" — `CLAUDE.md`: `/manager` PIN + MFA, `/stats` TOTP MFA, `/consulente` login + role only. | Say what the manager gets (consented lead, per-store funnel, measurable conversion); if security stays, say "MFA on manager and stats". |
| 6 | see §3 | various | legibility | P1 | 6 texts under the reading minimum (caption 1, lock-up tagline, GDPR call-out, "Code redeemed" chip, city chips, tech line). | Re-time / shorten (phase 3). |
| 7 | 8.0–14.6 | Welcome, typing, GDPR | pacing | P1 | 6.6 s of form filling; the GDPR call-out (a real selling point) shows 1.2 s. | Compress typing, keep consent visible ≥ 2 s. |
| 8 | 14.6–20.4 | Swipes | pacing / composition | P1 | Caption "Eight swipes. One match." holds 5.8 s (needs 1.8); the card is ~40 % of the frame width, question text ≈ 20 px at 1080. | Shorten the caption, push the camera in on the card. |
| 9 | 20.00 | Swipes → scan | fluidity | P2 | Mean luma jump 38/255 in one frame, the largest single-frame change outside the two planned flashes: the last card is replaced by the "0 % scanning" screen, which opens with a full-frame glow. Probably intended (it carries `reveal-whoosh`) but it reads as a pop. | Let the glow bloom over 4–6 frames, or bridge with a whip. |
| 10 | 5.40–5.43 | Lock-up → hand-off | fluidity | P2 | Graphic → photo flips in 2 frames (luma jump 8.8, speed step 1.41 px/frame = 67 % of the transition's peak). Reads as a cut, not the planned dissolve. | Overlap 6–8 frames or carry the lock-up glow into the photo. |
| 11 | 37.50–37.9 | System → human | fluidity | P2 | Photo appears in 1 frame (luma jump 7.5) and 0.3 s of ghosted diagram labels sit on the bag. | Fade labels faster than the photo arrives, or cut on the whoosh. |
| 12 | 6.95–7.08 | Hand-off fly-in | fluidity | P2 | Photo → flat iPad resolves in 9 frames, luma jumps up to 17.5/frame — a hair too fast to read as a match-cut. | Stretch the last third of the zoom by ~6 frames. |
| 13 | 9.0–10.3, 31.5–33.0 | iPad chips zoom, e-mail zoom | composition | P2 | Zooms crop the wordmark ("UAIPE") into the bottom-left corner and the phone's edges into the corners. | Re-aim the camera targets. |
| 14 | 33.6–37.9 | System | safe area | P1 | Tile row `top: 1138, height: 168` (`SystemScene.tsx`) ⇒ y 1138–1306; the player covers ≈ y > 1242. Sub-labels (≈ y 1250–1290) fall inside. | Move the diagram up ≥ 80 px or shrink it. |
| 15 | 34.0–37.5 | System | typography | P2 | "×4 stores" chip reads as "+4 stores" at phone size; sub-labels illegible at 360 px. | Spell it "4 stores"; drop sub-labels or enlarge. |
| 16 | 43.3–44.5 | End card | legibility | P1 | `REACT · SUPABASE · PWA` is 0.9 s on screen, dim, ~18 px, invisible at 360 px. | Move to the post, or give it real weight. |
| 17 | whole film | typography | consistency | P2 | At least 20 distinct font sizes: 17 literal `fontSize` values (16 … 150 px) plus size props (hook headlines 100/112, captions 46/60, wordmarks). Brief asks for ≤ 4 in the film. | Define a 4-size scale in `theme.ts` (phase 3). |
| 18 | 22.0, 26–34 | Result, e-mail | veracity | P2 | Demo data visible: "98 % match" (the algorithm's cap), "★ 4.8", "€119,00", "Marco Rossi". Numbers could be read as results. | Keep as UI, add a small "sample data" label or soften the ratings. |
| 19 | whole film | audio | register | P1 | See section 8: 153 events, 108 textures; 23 events in 11–12 s; party-music arc (drop A, drop B, snare roll, confetti sound). | Phase 4 plan. |
| 20 | 6.35, 4.0, 22.0 | audio | translation | P2 | On a phone speaker `device-settle` loses 9.4 dB, `logo-hit` 7.3 dB, `counter-hit` 4.2 dB (sub-heavy). | Add upper harmonics to the three hits. |

---

## 2. Scores (1–10, my judgement)

| scene | time | message clarity | fluidity | finish | B2B-hiring fit | note |
|---|---|---|---|---|---|---|
| Hook | 0–4.0 | 6 | 8 | 8 | 4 | well made, wrong protagonist (the shopper); payoff line readable < 1 s |
| Lock-up | 3.6–5.4 | 7 | 8 | 9 | 5 | beautiful logo moment; the category line gets 0.4 s at full opacity |
| Hand-off | 5.4–7.5 | 8 | 7 | 9 | 8 | the best opening idea: human + retail + real screen; the entry is a near-cut |
| Welcome / typing / GDPR | 7.5–14.6 | 5 | 7 | 7 | 5 | the GDPR proof point is shown too briefly; 6.6 s is long |
| Swipes | 14.6–20 | 8 | 9 | 8 | 6 | real drag, great rhythm; small card, unreadable question text on a phone |
| Counter / match / success | 20–25.6 | 7 | 8 | 9 | 6 | strongest beat; hard cut at 20.0; unsupported "two minutes" |
| iPhone e-mail | 25.6–33.6 | 7 | 8 | 8 | 7 | good "what the customer gets"; text tiny until the code zoom |
| System diagram | 33.6–37.5 | 4 | 7 | 8 | 4 | tech showcase, not business value; overstated 2FA; bottom row unsafe |
| Human close | 37.5–41 | 9 | 8 | 9 | 9 | the film's best argument ("the sale is still human") |
| End card | 41–44.5 | 5 | 8 | 8 | 3 | polished, but about the product and the stack, not the person |

---

## 3. Reading test — `scripts/qa/text-timing.mjs`

Rule: on-screen time ≥ 0.6 s + 0.3 s per word. "hold" = the part at full opacity (a word needs `0.04 s × index + 0.42 s` to arrive; the fade-out starts 0.3 s before the end). **FAIL** = on-screen time below the rule; *tight* = on-screen time passes but the hold does not.

| kind | text | words | on screen | needed | hold | verdict |
|---|---|---|---|---|---|---|
| caption | Turns idle in-store iPads into a touchpoint. | 7 | 1.80 s | 2.70 s | 0.84 s | **FAIL** |
| caption | Eight swipes. One match. | 4 | 5.80 s | 1.80 s | 4.96 s | ok (too long) |
| caption | A match in under two minutes. | 6 | 3.10 s | 2.40 s | 2.18 s | tight |
| caption | A personalised email with a unique code. | 7 | 3.60 s | 2.70 s | 2.64 s | tight |
| caption | Multi-store. 2FA on staff dashboards. Row-level security on every table. | 10 | 3.60 s | 3.60 s | 2.52 s | tight |
| caption | Technology that keeps the in-store moment human. | 7 | 3.20 s | 2.70 s | 2.24 s | tight |
| hook | Too many gadgets. | 3 | 2.23 s | 1.50 s | 1.17 s | tight |
| hook | One perfect match. | 3 | 1.60 s | 1.50 s | 0.90 s | tight |
| lock-up | Product discovery for physical retail | 5 | 1.35 s | 2.10 s | 0.40 s | **FAIL** |
| call-out | 5 languages | 2 | 1.30 s | 1.20 s | 0.80 s | tight |
| call-out | GDPR consent, captured at the source | 5 | 1.20 s | 2.10 s | 0.80 s | **FAIL** |
| chip | Code redeemed in store (+ code) | 4 | 0.95 s | 1.80 s | 0.60 s | **FAIL** |
| end | Live in 4 retail stores | 5 | 2.10 s | 2.10 s | 1.60 s | tight |
| end | the four city chips (all visible) | 5 | 1.70 s | 2.10 s | 0.70 s | **FAIL** |
| end | REACT · SUPABASE · PWA | 3 | 0.90 s | 1.50 s | 0.40 s | **FAIL** |

6 fail, 8 tight, 1 ok. Limits of the test: the end-card/hook/lock-up windows are read off the scene code; the in-UI text of the captured screens (form, e-mail, cards) is real product UI and was not counted.

---

## 4. Transition fluidity — `scripts/qa/motion-audit.py`

Dense optical flow on a 270 px copy of the master, numbers in px/frame of the 1080 px canvas. "before" = 6 frames before the transition starts, "after" = 6 frames after it ends; "snap" = the biggest one-frame change of the global picture speed inside the window ±0.4 s, relative to the peak.

| transition | presentation | start–end | speed before | speed after | peak | biggest 1-frame step | snap | luma pop in transition |
|---|---|---|---|---|---|---|---|---|
| hook → lock-up | `flashThrough` | 3.6–4.0 | 0.21 | 4.94 | 6.20 | 4.24 @4.017 | 0.63 | 21.5 @3.73 (the flash — intended) |
| lock-up → hand-off | `passthrough` | 5.4–6.2 | 0.05 | 1.33 | 1.60 | 1.41 @5.400 | **0.67** | 8.8 @5.40 |
| iPad → iPhone | `swapSlide` | 25.6–26.6 | 1.00 | 0.07 | 4.65 | 2.73 @26.117 | 0.53 | 5.6 @25.90 (whip) |
| iPhone → system | `dropOut` | 33.6–34.2 | 0.47 | 0.22 | 4.79 | 0.94 @34.133 | 0.18 | 3.4 |
| system → human | `photoCut` | 37.5–37.9 | 0.31 | 1.06 | 3.18 | 1.21 @37.500 | 0.33 | 7.5 @37.50 |
| human → end | `defocus` | 41.0–41.5 | 0.26 | 0.49 | 4.46 | 1.62 @41.117 | 0.33 | 4.2 |

Reading it: the film's handovers are mostly *hold → motion* with the energy carried by a flash, a whip or a defocus, not by continuing a vector. That is a valid style, but it is what the brief calls a discontinuity: only `iPhone → system` and the two photo transitions after the first are gentle (snap ≤ 0.33). The first-order problems are the **5.40 near-cut** and the **37.50 appearance**; the whip at 26.1 and the flash at 4.0 are doing their job.

Luminance pops over the whole film (robust z-score ≥ 8): 2.00 (lock-on flash), 3.73–4.00 (flash), 5.42 (see #10), 6.95–7.08 (fly-in resolve, #12), 18.50 and 19.00 (card swipes), **19.98–20.02 (38.0 — the scan screen's flash-in, #9)**, 22.00–22.10 (the 98 % hit — intended), 33.02–33.17 (the e-mail zoom-out, sustained, not a pop), 37.52 (#11).

Static scan of the code for un-eased motion: the project never calls `interpolate()`; all motion goes through `lib/motion.ts` (`EASE`, `seg`, `pop`, `settle`). 26 of 51 `prog()` calls are eased in place; the rest drive effect progress (sheens, rings, sparks). Two are plain linear scales: `ScreenContent.tsx:73` (a 2.2 % slow push over 3 s) and the end-card ring/sheen. The six `TransitionSeries` timings are `linearTiming`, with the easing applied inside each presentation. No violation of "no linear position/scale/rotation" worth a fix.

Still frames for every transition (start / middle / end) are in `out/qa-audit/stills/strip_*.png`; the two to look at are `strip_lockup-handoff.png` (the middle frame is already the finished photo) and `strip_system-human.png` (ghosted labels on the bag).

---

## 5. The first 2 seconds, muted

* **0.00 s** — dark blurred store, one ghost tile at the left edge, no text. A viewer (or LinkedIn's autoplay poster) gets nothing.
* **0.25 s** — "Too many" and three tiles.
* **0.50–2.0 s** — "Too many gadgets." over a wall of ten product cards.
* What a stranger understands by 2 s: *a shopper is overwhelmed by gadgets*. What they do **not** get: that this is about **selling in a physical store**, who the vendor is, or that a solution exists. "In-store" first appears at 5.4 s (the photo), as a caption at 6.2 s.

## 6. Safe area (bottom 8 % = y > 1242; corners 110 × 110 px)

Edge density sampled every 0.25 s (`qa/motion-audit.json`): 57 of 178 samples touch the strips, but most are photographic content (counter, hands) or UI that is not essential. The ones that matter: **33.6–37.5 s system tiles** (y 1138–1306, labels and "2FA" chips in the covered strip), **9.0–10.3 s** wordmark cropped into the bottom-left corner, **22.25–22.5 s** confetti reaching the bottom edge, **31.5–33.0 s** e-mail zoom crops into three corners. The captions (y ≈ 60–200) and the end card (y 400–1100) are inside the safe area.

## 7. Phone legibility (frames reduced to 360 px wide — `out/qa-audit/phone/sheet.png`)

Readable: "Too many gadgets.", wordmark, lock-up tagline (barely), all captions, "98 %", diagram titles, "Live in 4 retail stores", city chips. **Not readable:** the quiz question text, the e-mail body, diagram sub-labels, the `REACT · SUPABASE · PWA` line (invisible). The "×" in "×4 stores" reads as "+".

---

## 8. Audio — full tables in `qa/audio-audit.md`

1. **Density.** 153 events in 44.5 s (3.44/s): **signature 5, support 40, texture 108**. Seconds above 4 events/s: 0–1 (14), 2–3 (6), 10–11 (10), **11–12 (23)**, 20–21 (6), 21–22 (9), 34–35 (6), 35–36 (5). Most repeated: `key` ×33, `count-tick` ×13, `tile-pop` ×10, `card-in` ×8. The layer taxonomy is mine (signature = lock-on, logo-hit, counter-hit, handshake, end logo-hit-soft; support = actions and transitions; texture = ticks/pops/chips/sparkles), defined in `scripts/qa/audio-audit.py`.
2. **Emotional map today** (from the cue sheet's section briefs): intro *dark, tense, suspended* → drop A *confident, bright, driving* → groove *playful, light, tapping* → build *rising, urgent, kinetic* → counter *breathless, accelerating* → drop B *celebratory, big, festive* → e-mail *intimate, soft, calm* → system *mechanical, precise* → human *warm, quiet, tender* → outro *resolved, glowing, spacious*. The first half is a product-launch/party arc; only the last 7 s read as the human story the post tells.
3. **Timbre inventory** (by cue type, approximate): glass/bell 17 types / 32 events; thump–knock–click 11 / 82; soft pluck 2 / 9; noise whoosh/riser/air 18 / 28; foley 2 / 2. 54 % of events are the same family (tuned-sine ticks), and `key` alone is 22 %.
4. **Phone-speaker test (HP 350 Hz + LP 10 kHz).** Types that lose > 3 dB: `device-settle` −9.4, `logo-hit` −7.3, `counter-hit` −4.2, `confetti-pop` −4.1, `screen-wake` −4.0, `tap` −3.5, `whoosh-pullback` −3.4. Music keeps −2.7 to −7.4 dB per section (the intro loses the most: it is sub/drone).
5. **Re-encode test.** Master WAV −14.0 LUFS / −1.4 dBTP → AAC 192k −14.1 / −1.2 → **AAC 128k −14.1 / −1.1 dBTP** → AAC 96k −14.1 / −1.1. The true-peak target (≤ −1) holds after re-encoding but with 0.1 dB of margin; a −1.6 dBFS ceiling would give 0.5 dB.
6. **Balance (fixed today, commit `7f041e2`).** Before the fix, typing, swipes, card-ins, clicks and the iPad → iPhone whoosh sat at −5…+2 dB against the music (loudest 350 ms of each cue, > 200 Hz); they now sit at +3…+6 dB. The user's impression that "the video has no sound effects" was correct for most interaction sounds.

---

## 9. Veracity — every claim and number on screen

| on screen | source | status |
|---|---|---|
| "Eight swipes. One match." | 8 quiz cards, 1 recommended product (`CLAUDE.md`) | true |
| "A match in under two minutes." | none | **unsupported** (P0) |
| "98 % match", "★ 4.8", "€119,00", "Marco Rossi", `SUP-7F3A9C2E10` | demo data; the algorithm clamps match % to [45, 98] | UI sample data, not results; label it |
| "A personalised email with a unique code." | `on-session-created` edge function | true |
| "Multi-store." / "×4 stores" / "Live in 4 retail stores" / four cities | `CLAUDE.md`: 4 stores, ids `rio-de-janeiro`, `lisboa`, `dublino`, `milano` | true; **needs employer authorisation** (section 3) |
| "2FA on staff dashboards" | `/manager` MFA, `/stats` TOTP; `/consulente` login only | **overstated** |
| "Row-level security on every table" | `CLAUDE.md` ("RLS fail-closed on every table") | true |
| "GDPR consent, captured at the source" | `consent_given_at` stored with each session | true |
| "Code redeemed in store" | `mark_code_redeemed` RPC | true |
| "Technology that keeps the in-store moment human." | positioning statement | claim of intent, defensible |
| `REACT · SUPABASE · PWA` | stack | true |
| in-store hands, tablet, bag, handshake | AI-generated stills, hands only | disclosed in the post copy, not in the film |

Nothing else in the film is a number about results. There are no client logos, quotes or metrics.

---

## 10. Open questions for the checkpoint

Section 3 of the brief is still empty. Without it the film can only use: the product, the technology, the 4-store fact marked "pending authorisation", and no author. Needed from you:

1. Name as it should appear · current title · target title · positioning line (or "propose 3").
2. Any **real, verifiable** numbers (sessions, leads, opt-in rate, redeemed codes, minutes) — or "none", in which case the film shows no result figures.
3. May the film show the stores / city names / the retailer's products? (yes / no / only some).
4. Real hands photographed in the store (no faces, no brands): yes/no, and where the files are.
5. Final call to action.
6. Extra subtitle languages.
