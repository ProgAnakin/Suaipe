# Suaipe film – capture & asset tool

Produces every real-app asset the Remotion film needs, from the **real kiosk** running in headless Chromium
(iPad Pro 12.9" portrait: 1024 × 1366 CSS px, device scale factor 2 → 2048 × 2732 px) with the Supabase network
layer mocked. Nothing under `<repo>/src` is touched: anything that has to be hidden or frozen is done with CSS / DOM
calls injected at capture time only.

This folder is self-contained (own `package.json` + lockfile + `node_modules`, git-ignored) and independent of the
Remotion project in `video/` and of the app's own `node_modules`.

## Run

```bash
# 1. the kiosk (repo root) – any Supabase URL/key works, every request is mocked
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=mock \
  npx vite --port 8080 --host 127.0.0.1

# 2. this folder
cd video/tools/capture
npm ci
node capture.mjs      # stills + swipe frames + typing crops + layout.json      (~7 min)
node email.mjs        # still/email-full.webp (+ `email` entry in layout.json)  (~15 s)
node admin.mjs        # still/{manager-sessions,stats-page-a,stats-page-b}.webp + admin-layout.json (~40 s)
node extra-stills.mjs --install   # + still/quiz-tutorial-yes, still/result-mid, ring label styles in layout.json (~2 min)
node products.mjs     # ../../public/products/<id>.webp                          (~15 s)
node manifest.mjs     # public/app/manifest.json (files, pixel sizes, bytes, totals)
# or: npm run all
```

Needs Node ≥ 20 and a Chromium. `CHROMIUM_PATH` points at a binary (default `/opt/pw-browsers/chromium` when it
exists, otherwise Playwright's own: `npx playwright-core install chromium`). `playwright-core` is pinned to 1.56.1.

| env var | default | meaning |
|---|---|---|
| `APP_URL` | `http://127.0.0.1:8080` | where the kiosk runs |
| `OUT_DIR` | `../../public/app` (relative to the scripts) | output root of `capture.mjs` / `email.mjs` / `manifest.mjs` |
| `PRODUCTS_OUT` | `../../public/products` | output of `products.mjs` |
| `CHROMIUM_PATH` | see above | Chromium executable |
| `SEED` | `20260607` | seed of the in-page `Math.random` (tie-breaks, slot-machine digits) |
| `ONLY` | `stills,swipes,typing,layout` | subset to *save* (the journey is always walked) |
| `SWIPES` | `1,2,3,4,5,6,7,8` | which swipes to capture as frames (the others are answered with the buttons) |
| `CLEAN_BREVIA_IN_APP` | on | `0` = show the repo's original Brevia packshot in the app and e-mail instead of the repaired one |
| `PRODUCT_MARGIN` | `0.03` | margin kept around the trimmed packshots (see `products.mjs`) |

## Output (`video/public/app`, paths in `manifest.json` are relative to `video/public`)

```
still/     attract welcome-empty welcome-filled quiz-tutorial card-1..8 result result-plate success-mid success   WebP q90, 2048 x 2732
           quiz-tutorial-yes result-mid                                                                       (extra-stills.mjs, same format)
           email-full                                                                                        WebP q90, 1455 x 7746 (485 x 2582 CSS px @3x)
           manager-sessions                                                                                   (admin.mjs) WebP q90, 2048 x 2732
           stats-page-a stats-page-b                                                                          (admin.mjs) WebP q88, 2048 x 10228 (the whole /stats dashboard of Store A / Store B)
swipe/     swipe-<n>-000..047                                  n = 1..8, WebP q88, 1536 x 2049
typing/    first-00..05  last-00..05  email-00..23  email-calm-00..23  checkbox-unchecked  checkbox-checked
           start-button  manifest.json                         lossless WebP crops (+ crop rectangles, frame lists)
layout.json    DOM-measured geometry of every screen (CSS px + 0..1 of the viewport)
admin-layout.json  row rectangles of the manager list (CSS px of the 1024 x 1366 viewport) – where the film pins its call-outs
manifest.json  every file with pixel size + bytes, totals
../products/<product-id>.webp                                  alpha WebP q90, long side <= 900
```

### The journey (what `capture.mjs` does, in order)

1. **attract** – load, wait for the entrance animations (first cycling message still on screen) → `attract`.
2. **welcome** – tap "Tap to start"; all infinite background animations are paused (so the stills and the typing crops share
   one identical background) → `welcome-empty`; fields are focused one after another and typed **one character at a time**
   with `keyboard.type`, a lossless crop after every keystroke (`first-*`, `last-*`, `email-*`; then the e-mail field is
   cleared and typed again with the red "invalid" styling suppressed → `email-calm-*`); GDPR checkbox crops before/after
   ticking; START button crop; → `welcome-filled`.
3. **quiz tutorial** – judged settled when the overlay, header and button are fully opaque with unchanged boxes for 1 s and none
   of their entrance animations is running; then +1.5 s; then the clean "NO" moment is caught (NO chip fully lit, YES chip
   fully dimmed, label entered, demo card crisp and 7–16 px into its flight) and the page is frozen in that tick → `quiz-tutorial`.
4. **8 cards** – for each: wait until it is the only card on screen, `card-n` still, then a **real drag-scrub** (below).
   Answers: 1 NO, 2 NO, 3 YES, 4 YES, 5 YES, 6 NO, 7 NO, 8 NO → Brevia GoPress, 98 % (the run aborts if anything else matches).
5. **result** – waits for the ring to finish (98 %) and for a moment with ≥ 80 confetti particles in the air, freezes the
   page and takes `result`; from the *same frozen frame* it hides the ring wrapper (track, progress arc, halo, number,
   "MATCH" label) and the confetti layer → `result-plate`.
6. **success** – tap "I want it!" → `success-mid` (1.25 s after the screen mounted) and `success` (3.4 s).

### Follow-up scripts

* `email.mjs` – the real e-mail (see below). Merges an `email` block into `layout.json`.
* `extra-stills.mjs [--install] [--force]` – walks the journey once more (buttons only) and produces `quiz-tutorial` (verified
  settled, NO phase), `quiz-tutorial-yes` (YES phase), `result-mid` (ring fully in, label still "SCANNING…", slot-machine digits
  running) and the ring label / number styles of both states (`layout.json → result.ring.labels`, `result.midStill`,
  `quizTutorial.stills`). Without `--install` everything stays in `out/extra-stills` (git-ignored); `--install` copies the stills
  into `OUT_DIR/still` (an existing file is kept unless `--force`) and merges the data into `layout.json`. Run it **after**
  `capture.mjs`; `capture.mjs` carries those `layout.json` keys over when it is re-run.
* `products.mjs` – trims each packshot to its visible bounding box (+3 % margin) and writes alpha WebP (long side ≤ 900).
* `manifest.mjs` – the global manifest.

### Swipe frames (`swipe/swipe-<n>-000..047.webp`)

Real framer-motion drag driven by the mouse; the card, rotation, glow, tint and NO/YES stamp are whatever the app renders
for that pointer offset. Frame 0 is the card **at rest** (pointer not pressed, scale 1); frames 1–47 follow

```
offset(i) = dir * (8 + (1500 - 8) * (i / 47) ^ 1.6)          dir = -1 (NO / left), +1 (YES / right); card x ≈ 0.55 * offset
```

(the same path/easing for all eight swipes). Notes for compositing: from frame 1 the card is in the app's drag state
(framer `whileDrag` scale 1.015, so 000 → 001 has a 1.5 % scale step); rotation saturates at ±18° around frame 22, the
stamp opacity at frame ~17; the last frame has the card (glow included) completely off-screen. The ghost-card stack
behind the card is part of the real UI and stays. The infinite background loops (stars, embers) are paused and then
stepped on a 30 fps clock between frames instead of being sampled ~1 s apart, so the backdrop moves continuously rather
than flickering. `layout.json → quizCard.swipe.trace` holds the per-frame card x/rotation/scale and stamp/tint opacities
read from the DOM.

### Typing frames

All `first-*` / `last-*` / `email-*` frames share one crop rectangle (`typing/manifest.json → crops.fields`, CSS px and image
px) = the three inputs + 8 px; frame *n* is the state after *n* characters (0 = focused and empty). The crop is
pixel-aligned with `still/welcome-empty.webp`, so it can be laid over it at `crop.css.x/y`. The app shows "Please enter a
valid email address." under the field while an address is incomplete, which moves the vertically-centred form up by 14 px;
that line is hidden by injected CSS so a fixed crop works. `email-*` is authentic (red border / ring / ✕ while invalid,
green from the 22nd character); `email-calm-*` is the same keystrokes with neutral styling until it turns green.
The START button looks the same empty and valid (the app never disables it) → a single `start-button.webp`.

### layout.json

`meta` + one block per screen (`attract`, `welcome`, `quizTutorial`, `quizCard`, `result`, `success`, `email`). Every element
has `css {x, y, width, height, right, bottom, cx, cy}` (viewport px, `getBoundingClientRect` of the settled screen) and `norm`
(the same ÷ 1024 / 1366), plus its text or a description. Special blocks: `quizCard.stamps` (NO/YES stamp: un-rotated box,
rotated bounding box, angle), `quizCard.swipe.trace`, `result.ring` (centre, radius, stroke width, colours, dash geometry,
number / label computed styles, gradient stops) and `result.animation` (timing of the count-up, from the source).

### Why some things are done the way they are

* **Freeze gate** (`lib.mjs`): a PNG screenshot takes 0.3–2 s, during which the kiosk keeps animating, so the encoded frame
  was never the frame that was chosen. An init script wraps `requestAnimationFrame` and exposes `__capFreeze()` /
  `__capThaw()`: freezing stops every rAF loop (framer-motion, the count-up) and pauses all running CSS / Web Animations;
  thawing resumes them and seeks the paused animations forward by the frozen time, so the app's own timeline is unharmed.
  Every still is taken frozen; the tutorial / result moments are frozen *inside* the `waitForFunction` predicate.
* **Seeded `Math.random`**, fixed viewport / DPR / locale (`en-US`) / a neutral stand-in store ("Store A": the real store list is swapped for a two-store
  stub at capture time, so no real shop name or city ever reaches the film), network mocked, fonts served from
  `@fontsource` (the sandbox cannot reach Google Fonts), emoji font preloaded – so every run walks the same journey.
* **Repaired Brevia packshot**: `assets/brevia-gopress.clean.png` replaces the repo's PNG (checkerboard baked into the glass
  rim) both inside the app (request interception) and for the e-mail / product WebP. `CLEAN_BREVIA_IN_APP=0` turns it off.
* Swipe frames are grabbed as JPEG q100 (4–5× faster than PNG here) and re-encoded to WebP at 1536 px.
* The kiosk resets itself after 45 s without input; a Shift key press every 4th frame counts as activity.
* All outputs are written atomically (dot-temp file + rename), so a running Remotion render never reads half a file.
* `e-mail`: `email.mjs` lifts `buildEmail()` out of `supabase/functions/on-session-created/index.ts` and renders it with sample
  data (Marco Rossi, `SUP-7F3A9C2E10`, 98 %); five hard-coded Italian phrases are swapped for English at render time only.
  Space Grotesk stops at weight 700, so the template's 800/900 headline words render in Arial – as they did in the first
  render of this e-mail.

### The staff screens (`admin.mjs`)

The "Store value" scene shows what the manager gets, so those two screens come from the **real app** too: `/manager` →
*Sessions & Codes* and `/stats?store=<id>` (KPIs, ranking, drop-off funnel, sessions) as one tall page per store, so the film can scroll
through it the way a person would. `admin-layout.json` carries the rectangles the film pins its call-outs to (lead cards, ranking card).

* The browser carries an injected, already **MFA-verified** (`aal2`) session in `sessionStorage` (`sb-mock-auth-token`, the key the
  app's Supabase client uses), so the real login / TOTP gates are passed without touching them; every Supabase call is answered by
  the mock. Nothing here comes from production.
* **Sample data only**: 118 fictional people on `example.com`, two fictional stores ("Store A", "Store B"), round demo numbers
  (241 quizzes started → 176 results shown → 118 claimed). The film labels these screens *Sample data*.
* The newest row is **the lead the film has just watched being created** – Marco Rossi, the hero product, 98 %, `SUP-7F3A9C2E10`,
  Store A – so the picture is continuous from the kiosk, through the e-mail, to the manager's list.
* Product names are the English ones used in the kiosk (`products.ts` is swapped at capture time, like `stores.ts`).
* `node admin.mjs --probe` prints the pages' text, buttons and console errors, for when the app's UI changes.
