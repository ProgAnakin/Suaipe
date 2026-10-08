# Suaipe film — Remotion project

A 64.5 s, 4:5 (1080×1350) LinkedIn film about the Suaipe kiosk and everything behind it, built with [Remotion](https://www.remotion.dev) from **real captures of
the running app** (every iPad screen, the 8 swipes, the typing, the e-mail, the manager's and the stats screens and the consultants' training app are the product itself —
nothing is mocked up in Figma), plus programmatic motion graphics, sound design and music. It is a calm product film: it shows the app with room to breathe — a customer
answers eight swipes, gets one match and a personal e-mail; the store gets leads, a CRM and per-store numbers; the consultants get a training library — and ends on a human moment.
The in-store moments (the consultant handing the tablet to the customer, the bag with the product, the handshake) are **AI-generated stills** (hands only, no faces) with the real kiosk
screen composited into the photographed tablet (see `tools/people/README.md`); the end card says so, very small, and the post says it in full. Names, e-mails, codes and numbers on the staff
screens are labelled **sample data**. No author name, no real store, city, client or store count appears anywhere (the kiosk shows a neutral "Store A", the staff screens "Store A" and "Store B").
This folder is isolated from the app: its own `package.json`, its own `node_modules`, never shipped to Vercel.

| time | scene | what it shows |
|---|---|---|
| 0–4 | Hook | "Too many gadgets. One perfect match." |
| 3.6–6.2 | Lock-up | the logo and "Product discovery for physical retail" |
| 5.4–26.6 | iPad flow | the hand-off photo, the camera flying into the screen, welcome (5 languages, GDPR consent), the eight swipes, the scan, the 98 % match, "I want it" |
| 25.6–34.2 | iPhone e-mail | the notification with the real subject line, the personal e-mail and its unique code |
| 33.6–44.2 | Manager & Stats | the manager's lead list with consent on record, one store's dashboard and its product ranking, then the other store's; leads landing in a CRM — real `/manager` and `/stats`, **sample data** |
| 43.6–54.2 | Consultants | the real `/consulente` training app: search any product, a product guide (what the customer sees, the manager's video, insights, the manager's advice) — **sample data** |
| 53.6–57.9 | System | iPad kiosk → Supabase → Edge Function → e-mail and CRM; multi-store, row-level security, MFA |
| 57.5–61.5 | Human close | the bag, "Redeemed in store", the handshake |
| 61–64.5 | End card | the logo, "Built for the whole store." and the four areas of the product (iPad kiosk · Manager · Stats · Consultants) |

```
video/
  BRIEF-v2.md          ← the brief the earlier versions were made to (as received; superseded where this README says otherwise)
  src/
    timeline.ts        ← single source of truth for timing (seconds, 120 BPM grid, 60 fps) and for all burned-in / scene copy
    SuaipeFilm.tsx     ← master composition: TransitionSeries + captions + grade + soundtrack
    Cutdown15.tsx      ← the 15 s cut-down: four excerpts of the master (cutdown.ts), cross-faded
    presentations.tsx  ← scene-to-scene choreography (flash-through, passthrough, whip-pan swap, drop, photo cut, defocus)
    scenes/            ← Hook, Lock-up, iPad flow (hand-off photo → camera, real screens, finger, call-outs, match ring), iPhone e-mail,
                         Store (Manager & Stats), Consultants, System, Human close (bag + handshake), End card
    storeTimeline.ts   ← camera / layout of the Manager & Stats scene (one close-up, content moves under it, the tablet steps back)
    consultTimeline.ts ← camera and scroll of the Consultants scene (one phone, the pages move under it)
    components/        ← device frames, captions, call-outs, chips, CRM card, lead token, touch, confetti, backdrop, film grade, PhotoStage …
    lib/               ← motion vocabulary (EASE, seg, pop, settle, hit, flashEnv …), spring-follow camera, homography
    theme.ts           ← brand tokens, GRID (margins, safe area), TYPE (four sizes + one micro)
    people.ts          ← the in-store photographs: files, size and the tablet's glass quad
  public/
    app/               ← real captures: kiosk stills, swipe recordings, typing frames, the e-mail, the staff and consultant screens [tools/capture]
    audio/             ← soundtrack.wav / .mp3, soundtrack-15s.* and stems                                                        [tools/audio]
    people/            ← AI-generated in-store stills (hands only), webp                                                          [tools/people]
    products/, fonts/, logo.png
  audio/cues.json      ← cue sheets the sound design is composed against (generated from timeline.ts / cutdown.ts): cues.json, cues-15s.json
  qa/                  ← AUDIT.md (phase 1), SCRIPT.md (phase 2, career version — superseded), SOUND.md (phase 4), motion-audit*.json, audio-audit.md
  scripts/             ← export-cues, export-srt, render-film (chunked final render), render-preview + audio-previews (half-resolution previews and the
                         listening package), qa-sheets / sheet (contact sheets), qa/ (audits)
  tools/capture/       ← Playwright harness that drives the real kiosk, /manager, /stats and /consulente with a mocked Supabase
  tools/audio/         ← Python generator for the music + sound effects
  tools/people/        ← prompts + hosted URLs of the in-store stills, fetch/convert script
  LINKEDIN.md          ← specs, post copy and publication checklist
```

## Versions

* **v2** (44.5 s) — the first complete film: hook, lock-up, iPad flow, e-mail, system, human close, end card. The pacing and the look the project owner prefers.
* **v3** (50 s, commit `7a4d486`) — a "B2B career" cut made to `BRIEF-v2.md`: it added the author's name, the Store-value scene and a thesis line. **Superseded.**
* **v4** (64.5 s, this one) — v2's calm pacing and look restored, plus the Manager & Stats scene (with *Sample data*), a new Consultants scene (`/consulente`), a neutral end card
  (no city names, no store count), no author name, and the sound of direction A (`qa/SOUND.md`).

## Everyday commands

```bash
npm ci
npm run studio          # interactive preview — every scene is also its own composition (Folder “Scenes”); SuaipeFilm15 is the cut-down
npm run typecheck
npm run cues            # timeline.ts  →  audio/cues.json, audio/cues-15s.json   (after changing any timing)
npm run srt             # captions     →  out/suaipe-captions.srt (upload it with the post for accessibility)
scripts/render-film.sh  # the production route: resumable chunks (stream-copied, single-generation H.264) + soundtrack muxed  →  out/suaipe-film.mp4
npm run render          # final MP4 straight from Remotion (H.264 CRF 17 capped at 20 Mbps + AAC 320k, bt709)
npm run render:silent   # same, no audio track
npm run cover           # LinkedIn thumbnail still ("Eight swipes. One perfect match." over the result screen)              → out/suaipe-cover.png
npm run cover:device    # alternative thumbnail without people                                                                → out/suaipe-cover-device.png
scripts/render-preview.sh out/pv.mp4 [SuaipeFilm|SuaipeFilm15]    # half-resolution silent preview in resumable chunks (15–25 min for the master)
scripts/audio-previews.sh out/pv.mp4 out/pv15.mp4                  # the listening package (out/audio-ab): the picture muxed with every soundtrack variant
```

Remotion downloads its own headless Chrome on first use. Where that download is blocked (CI, containers) point it at any installed Chromium:

```bash
REMOTION_BROWSER=/path/to/chromium_headless_shell npm run render
```

The effects (`@remotion/effects`: light leak, grain) run on WebGL2, so renders pass `--gl=angle` (set in the npm scripts and `remotion.config.ts`).

## How the timing works

Everything is measured in **seconds on a 120 BPM grid** (`BEAT = 0.5 s`, `BAR = 2 s`) inside `src/timeline.ts`. Scenes derive their animation from those
numbers, and `npm run cues` exports the same numbers as cue sheets (`audio/cues.json`, `audio/cues-15s.json`) that the sound design is composed against, so picture and
sound stay frame-locked. If you change a time in `timeline.ts`: run `npm run cues`, re-run `python tools/audio/generate.py`, render.

Motion has one vocabulary (documented at the top of `src/lib/motion.ts`): arrivals ease out, departures ease in, camera moves are spring-followed or ease-in-out,
a "slam" overshoots once; nothing that the viewer reads moves linearly. The type has four sizes plus one micro size (`TYPE` in `src/theme.ts`, the micro one only for the
disclosure line); nothing the viewer must read sits in the bottom 8 % or the four 110 px corners (the LinkedIn player's controls) — the staff and consultant screens run off the bottom
of the frame under a soft fade so no small type sits under the player's controls.

## The 15 s cut-down

`SuaipeFilm15` re-uses the master in four excerpts (`src/cutdown.ts`): hook + logo (0–4.5), the tablet (7–8), the swipes to the 98 % hit (17–23), the end card (61–64.5).
Joins are 0.25 s cross-fades, a bloom into the tablet and a dip before the end card. Only approved copy appears; every fix to the master carries over.
It has its own arrangement (`audio/cues-15s.json`, `public/audio/soundtrack-15s.wav`).

## The in-store photographs

Four stills live in `public/people/` (hand-off, bag, handshake, store). They are 960 × 1280 webp files generated with an AI image model — hands and
forearms only — and the film treats them like footage: slow push-ins, a grade that matches the app's navy/cyan, and the real kiosk UI warped onto the
photographed tablet (`HANDOFF_QUAD` in `src/people.ts`). `tools/people/manifest.json` has the prompts; `node tools/people/fetch.mjs` downloads/converts
them (or converts your own photos with `--from <dir>`). If you regenerate the hand-off image, re-measure `HANDOFF_QUAD`. The in-store scenes are the only
part of the film that is not the product itself — the last frame says so, very small ("In-store scenes are AI-generated illustrations."), and the post says it in full (see `LINKEDIN.md`).

## Regenerating the real-app assets

```bash
# 1. start the kiosk (Vite) with a dummy Supabase URL — the capture mocks the network layer
cd .. && VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=mock npx vite --port 8080 --host 127.0.0.1
# 2. capture (new terminal)
cd video/tools/capture && npm ci && node capture.mjs && node email.mjs && node admin.mjs && node consult.mjs
```

`admin.mjs` captures the real `/manager` ("Sessions & Codes") and `/stats`, `consult.mjs` the real `/consulente` (a product list and a tall product guide with a manager's video poster), each from an
injected, MFA-verified session answered by a mocked Supabase with fictional sample data; see `tools/capture/README.md` and `tools/audio/README.md` for details.

## Quality checks

```bash
node scripts/qa/text-timing.mjs --md                       # reading time of every line of copy (0.6 s + 0.3 s per word)
python scripts/qa/motion-audit.py out/<preview>.mp4 --ffmpeg <ffmpeg>   # speed continuity at every transition, luminance pops, safe-area detail
python scripts/qa/legibility.py out/qa-stills --md         # caption contrast, and phone-width (360 px) copies of key stills
scripts/qa-sheets.sh out/<preview>.mp4 out/qa 0.25 8 216 40               # contact sheets every 0.25 s
python scripts/qa/audio-audit.py --ffmpeg <ffmpeg> --md    # event density by layer, section map, phone-speaker and AAC re-encode tests
```

## Licence note

Remotion is free for individuals and for-profit companies with up to 3 employees; larger companies need a Remotion company licence
(<https://www.remotion.pro>). All sound in this film is synthesised in code (`tools/audio`) — no samples, nothing to license. The four in-store stills are
AI-generated: check the terms of the image tool/plan you generate with before using them commercially, and disclose them as AI-generated when publishing.
