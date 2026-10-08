# Suaipe film — Remotion project

A 50 s, 4:5 (1080×1350) LinkedIn film about the Suaipe kiosk, built with [Remotion](https://www.remotion.dev) from **real captures of the running app**
(every iPad screen, the 8 swipes, the typing, the e-mail and the two staff screens are the product itself — nothing is mocked up in Figma), plus
programmatic motion graphics, sound design and music. It is the "B2B career" version (BRIEF v2, `BRIEF-v2.md`): a short argument about retail —
*a simple idea, born from watching the shop floor, gives a store more contact with its customers and the data that comes with it* — that ends on the person
who built it. The in-store moments (the consultant handing the tablet to the customer, the bag with the product, the handshake) are **AI-generated stills**
(hands only, no faces) with the real kiosk screen composited into the photographed tablet (see `tools/people/README.md`); the film says so, very small, on
its last frame, and the post says it in full. Names, e-mails, codes and numbers on the staff screens are labelled **sample data**.
This folder is isolated from the app: its own `package.json`, its own `node_modules`, never shipped to Vercel.

The film has eight blocks (`qa/SCRIPT.md`, approved script):

| time | block | what it does |
|---|---|---|
| 0–4 | Hook | "A customer walks in. The store rarely learns who." |
| 4–6 | Idea | logo + "One question changes that." |
| 6–23 | Experience | the hand-off, the form with GDPR consent, eight swipes, the 98 % match, "I want it" |
| 23–30 | Customer value | the personal e-mail and the code |
| 30–38 | **Store value** | the manager's lead list, a per-store ranking, leads landing in a CRM (real `/manager` and `/stats` screens, sample data) |
| 38–42 | System | multi-store, row-level security, MFA where it matters |
| 42–46 | Human close | the bag, "Redeemed in store", the handshake |
| 46–50 | **Signature** | name, "Simple ideas create contact. Contact creates data.", "Let's talk retail." |

```
video/
  BRIEF-v2.md          ← the brief this version was made to (as received)
  src/
    timeline.ts        ← single source of truth for timing (seconds, 120 BPM grid, 25 bars) and for all burned-in / scene copy
    SuaipeFilm.tsx     ← master composition: TransitionSeries + captions + grade + soundtrack
    Cutdown15.tsx      ← the 15 s cut-down: four excerpts of the master (cutdown.ts), cross-faded
    presentations.tsx  ← scene-to-scene choreography (flash-through, passthrough, whip-pan swap, drop, photo cut, defocus)
    scenes/            ← Hook, Lock-up, iPad flow (hand-off photo → camera, real screens, finger, call-outs, match ring), iPhone e-mail,
                         Store value, System, Human close (bag + handshake), Signature
    storeTimeline.ts   ← camera / layout of the Store-value scene (one close-up, content moves under it, the tablet steps back)
    components/        ← device frames, captions, call-outs, chips, CRM card, lead token, touch, confetti, backdrop, film grade, PhotoStage …
    lib/               ← motion vocabulary (EASE, seg, pop, settle, hit, flashEnv …), spring-follow camera, homography
    theme.ts           ← brand tokens, GRID (margins, safe area), TYPE (four sizes + one micro)
    people.ts          ← the in-store photographs: files, size and the tablet's glass quad
  public/
    app/               ← real captures: kiosk stills, swipe recordings, typing frames, the e-mail, the staff screens   [tools/capture]
    audio/             ← soundtrack.wav / .mp3 and stems                                                              [tools/audio]
    people/            ← AI-generated in-store stills (hands only), webp                                              [tools/people]
    products/, fonts/, logo.png
  audio/cues.json      ← cue sheet the sound design is composed against (generated from timeline.ts)
  qa/                  ← AUDIT.md (phase 1), SCRIPT.md (phase 2), SOUND.md (phase 4), motion-audit*.json, audio-audit.md
  scripts/             ← export-cues, export-srt, render-film (chunked final render), qa-sheets / sheet (contact sheets), qa/ (audits)
  tools/capture/       ← Playwright harness that drives the real kiosk and the real /manager and /stats with a mocked Supabase
  tools/audio/         ← Python generator for the music + sound effects
  tools/people/        ← prompts + hosted URLs of the in-store stills, fetch/convert script
  LINKEDIN.md          ← specs, post copy and publication checklist
```

## Everyday commands

```bash
npm ci
npm run studio          # interactive preview — every scene is also its own composition (Folder “Scenes”); SuaipeFilm15 is the cut-down
npm run typecheck
npm run cues            # timeline.ts  →  audio/cues.json   (after changing any timing)
npm run srt             # captions     →  out/suaipe-captions.srt (upload it with the post for accessibility)
npm run render          # final MP4 straight from Remotion (H.264 CRF 17 capped at 20 Mbps + AAC 320k, bt709)  →  out/suaipe-film.mp4
scripts/render-film.sh  # the production route: resumable chunks (stream-copied, single-generation H.264) + soundtrack muxed
npm run render:silent   # same, no audio track
npm run cover           # LinkedIn thumbnail still (hand-off photo with the real result screen, "The store rarely learns who.") → out/suaipe-cover.png
npm run cover:device    # alternative thumbnail without people ("Simple ideas create contact.")                        → out/suaipe-cover-device.png
```

Remotion downloads its own headless Chrome on first use. Where that download is blocked (CI, containers) point it at any installed Chromium:

```bash
REMOTION_BROWSER=/path/to/chromium_headless_shell npm run render
```

The effects (`@remotion/effects`: light leak, grain) run on WebGL2, so renders pass `--gl=angle` (set in the npm scripts and `remotion.config.ts`).

## How the timing works

Everything is measured in **seconds on a 120 BPM grid** (`BEAT = 0.5 s`, `BAR = 2 s`, 25 bars) inside `src/timeline.ts`. Scenes derive their animation from those
numbers, and `npm run cues` exports the same numbers as a cue sheet (`audio/cues.json`) that the sound design is composed against, so picture and
sound stay frame-locked. If you change a time in `timeline.ts`: run `npm run cues`, re-run `python tools/audio/generate.py`, render.

Motion has one vocabulary (documented at the top of `src/lib/motion.ts`): arrivals ease out, departures ease in, camera moves are spring-followed or ease-in-out,
a "slam" overshoots once; nothing that the viewer reads moves linearly. The type has four sizes plus one micro size (`TYPE` in `src/theme.ts`); nothing the
viewer must read sits in the bottom 8 % or the four 110 px corners (the LinkedIn player's controls).

## The 15 s cut-down

`SuaipeFilm15` re-uses the master in four excerpts (`src/cutdown.ts`): hook + logo (0–4.5), the tablet (7–8), five swipes to the 98 % hit (15.5–21), the signature
(45.5–49.5). Each is shifted by a whole number of beats, so the master's beat grid and cue sheet still line up; joins are 0.25 s cross-fades, a bloom into the
tablet and a dip before the name. Only approved copy appears; every fix to the master carries over. It has its own arrangement (phase 4).

## The in-store photographs

Four stills live in `public/people/` (hand-off, bag, handshake, store). They are 960 × 1280 webp files generated with an AI image model — hands and
forearms only — and the film treats them like footage: slow push-ins, a grade that matches the app's navy/cyan, and the real kiosk UI warped onto the
photographed tablet (`HANDOFF_QUAD` in `src/people.ts`). `tools/people/manifest.json` has the prompts; `node tools/people/fetch.mjs` downloads/converts
them (or converts your own photos with `--from <dir>`). If you regenerate the hand-off image, re-measure `HANDOFF_QUAD`. The in-store scenes are the only
part of the film that is not the product itself — the last frame says so, very small, and the post says it in full (see `LINKEDIN.md`). No real store, city,
shop name or client appears anywhere: the kiosk shows a neutral "Store A", the staff screens "Store A" and "Store B".

## Regenerating the real-app assets

```bash
# 1. start the kiosk (Vite) with a dummy Supabase URL — the capture mocks the network layer
cd .. && VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=mock npx vite --port 8080 --host 127.0.0.1
# 2. capture (new terminal)
cd video/tools/capture && npm ci && node capture.mjs && node email.mjs && node admin.mjs
```

`admin.mjs` captures the real `/manager` ("Sessions & Codes") and `/stats` from an injected, MFA-verified session answered by a mocked Supabase with
fictional sample data; see `tools/capture/README.md` and `tools/audio/README.md` for details.

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
