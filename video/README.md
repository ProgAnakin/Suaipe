# Suaipe film — Remotion project

A 44.5 s, 4:5 (1080×1350) LinkedIn film about the Suaipe kiosk, built with [Remotion](https://www.remotion.dev) from **real captures of the running app**
(every iPad screen, the 8 swipes, the typing and the e-mail are the product itself — nothing is mocked up in Figma), plus programmatic motion graphics,
sound design and music. This folder is isolated from the app: its own `package.json`, its own `node_modules`, never shipped to Vercel.

```
video/
  src/
    timeline.ts        ← single source of truth for timing (seconds, 120 BPM grid)
    SuaipeFilm.tsx     ← master composition: TransitionSeries + captions + grade + soundtrack
    presentations.tsx  ← scene-to-scene choreography (flash-through, rise, whip-pan swap, drop, collapse)
    scenes/            ← Hook, Lock-up, iPad flow (camera, real screens, finger, call-outs, match ring), iPhone e-mail, System, End card
    components/        ← device frames, captions, call-outs, touch, confetti, backdrop, film grade …
    lib/               ← motion helpers, spring-follow camera
  public/
    app/               ← real captures (stills, swipe recordings, typing frames, layout.json)   [tools/capture]
    audio/             ← soundtrack.wav / .mp3 and stems                                         [tools/audio]
    products/, fonts/, logo.png
  audio/cues.json      ← cue sheet the sound design is composed against (generated from timeline.ts)
  tools/capture/       ← Playwright harness that drives the real kiosk with a mocked Supabase
  tools/audio/         ← Python generator for the music + sound effects
  scripts/             ← export-cues, export-srt, sheet (contact sheets for visual QA)
```

## Everyday commands

```bash
npm ci
npm run studio          # interactive preview — every scene is also its own composition (Folder “Scenes”)
npm run typecheck
npm run cues            # timeline.ts  →  audio/cues.json   (after changing any timing)
npm run srt             # captions     →  out/suaipe-captions.srt (upload it with the post for accessibility)
npm run render          # final MP4 (H.264 CRF 14 + AAC 320k, bt709)  →  out/suaipe-film.mp4
npm run render:silent   # same, no audio track
npm run cover           # LinkedIn thumbnail still → out/suaipe-cover.png
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
(<https://www.remotion.pro>). All sound in this film is synthesised in code (`tools/audio`) — no samples, nothing to license.
