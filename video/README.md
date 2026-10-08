# Suaipe film — Remotion project

A 44.5 s, 4:5 (1080×1350) LinkedIn film about the Suaipe kiosk, built with [Remotion](https://www.remotion.dev) from **real captures of the running app**
(every iPad screen, the 8 swipes, the typing and the e-mail are the product itself — nothing is mocked up in Figma), plus programmatic motion graphics,
sound design and music. The in-store moments — the consultant handing the tablet to the customer, the bag with the product, the handshake — are
**AI-generated stills** (hands only, no faces) with the real kiosk screen composited into the photographed tablet (see `tools/people/README.md`).
This folder is isolated from the app: its own `package.json`, its own `node_modules`, never shipped to Vercel.

```
video/
  src/
    timeline.ts        ← single source of truth for timing (seconds, 120 BPM grid)
    SuaipeFilm.tsx     ← master composition: TransitionSeries + captions + grade + soundtrack
    presentations.tsx  ← scene-to-scene choreography (flash-through, passthrough, whip-pan swap, drop, photo cut, defocus)
    scenes/            ← Hook, Lock-up, iPad flow (hand-off photo → camera, real screens, finger, call-outs, match ring), iPhone e-mail, System,
                         Human close (bag + handshake), End card
    components/        ← device frames, captions, call-outs, touch, confetti, backdrop, film grade, PhotoStage (photos + screen-in-glass) …
    lib/               ← motion helpers, spring-follow camera, homography (corner-pin of the UI onto a photographed tablet)
    people.ts          ← the in-store photographs: files, size and the tablet's glass quad
  public/
    app/               ← real captures (stills, swipe recordings, typing frames, layout.json)   [tools/capture]
    audio/             ← soundtrack.wav / .mp3 and stems                                         [tools/audio]
    people/            ← AI-generated in-store stills (hands only), webp                         [tools/people]
    products/, fonts/, logo.png
  audio/cues.json      ← cue sheet the sound design is composed against (generated from timeline.ts)
  tools/capture/       ← Playwright harness that drives the real kiosk with a mocked Supabase
  tools/audio/         ← Python generator for the music + sound effects
  tools/people/        ← prompts + hosted URLs of the in-store stills, fetch/convert script
  scripts/             ← export-cues, export-srt, render-film (chunked final render), qa-sheets / sheet (contact sheets), audio-sync
  LINKEDIN.md          ← specs, suggested post copy and upload checklist
```

## Everyday commands

```bash
npm ci
npm run studio          # interactive preview — every scene is also its own composition (Folder “Scenes”)
npm run typecheck
npm run cues            # timeline.ts  →  audio/cues.json   (after changing any timing)
npm run srt             # captions     →  out/suaipe-captions.srt (upload it with the post for accessibility)
npm run render          # final MP4 straight from Remotion (H.264 CRF 17 capped at 20 Mbps + AAC 320k, bt709)  →  out/suaipe-film.mp4
scripts/render-film.sh  # the production route: resumable chunks (stream-copied, single-generation H.264) + soundtrack muxed
npm run render:silent   # same, no audio track
npm run cover           # LinkedIn thumbnail still (hand-off photo with the real result screen in the glass) → out/suaipe-cover.png
npm run cover:device    # alternative thumbnail without people (tilted iPad)                             → out/suaipe-cover-device.png
```

Remotion downloads its own headless Chrome on first use. Where that download is blocked (CI, containers) point it at any installed Chromium:

```bash
REMOTION_BROWSER=/path/to/chromium_headless_shell npm run render
```

The effects (`@remotion/effects`: light leak, grain) run on WebGL2, so renders pass `--gl=angle` (set in the npm scripts and `remotion.config.ts`).

## How the timing works

Everything is measured in **seconds on a 120 BPM grid** (`BEAT = 0.5 s`, `BAR = 2 s`) inside `src/timeline.ts`. Scenes derive their animation from those
numbers, and `npm run cues` exports the same numbers as a cue sheet (`audio/cues.json`) that the sound design is composed against, so picture and
sound stay frame-locked. If you change a time in `timeline.ts`: run `npm run cues`, re-run `python tools/audio/generate.py`, render.

## The in-store photographs

Four stills live in `public/people/` (hand-off, bag, handshake, store). They are 960 × 1280 webp files generated with an AI image model — hands and
forearms only — and the film treats them like footage: slow push-ins, a grade that matches the app's navy/cyan, and the real kiosk UI warped onto the
photographed tablet (`HANDOFF_QUAD` in `src/people.ts`). `tools/people/manifest.json` has the prompts; `node tools/people/fetch.mjs` downloads/converts
them (or converts your own photos with `--from <dir>`). If you regenerate the hand-off image, re-measure `HANDOFF_QUAD`. The in-store scenes are the only
part of the film that is not the product itself — say so when publishing (see `LINKEDIN.md`).

## Regenerating the real-app assets

```bash
# 1. start the kiosk (Vite) with a dummy Supabase URL — the capture mocks the network layer
cd .. && VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=mock npx vite --port 8080 --host 127.0.0.1
# 2. capture (new terminal)
cd video/tools/capture && npm ci && node capture.mjs
```

See `tools/capture/README.md` and `tools/audio/README.md` for details.

## Licence note

Remotion is free for individuals and for-profit companies with up to 3 employees; larger companies need a Remotion company licence
(<https://www.remotion.pro>). All sound in this film is synthesised in code (`tools/audio`) — no samples, nothing to license. The four in-store stills are
AI-generated: check the terms of the image tool/plan you generate with before using them commercially, and disclose them as AI-generated when publishing.
