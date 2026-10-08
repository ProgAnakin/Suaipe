# In-store photographs ("people")

The human moments of the film — a consultant handing the tablet to a customer, the bag with the product changing hands, the
handshake that ends the sale, and the blurred store behind the hook — are **AI-generated stills**: hands and forearms only,
no faces, no recognisable people, an unbranded bag. Every *screen* in the film is still the real app: the kiosk UI is
composited into the photographed tablet with a homography (`src/lib/homography.ts`, `src/components/PhotoStage.tsx`) and the
camera flies into that glass to meet the flat iPad scene pixel for pixel (`src/scenes/ipad/HandoffLayer.tsx`).

| id | where it is used | size |
|---|---|---|
| `handoff` | opening (the tablet changes hands, the screen wakes up) and the cover | 960 × 1280 |
| `bag` | the bag with the product is handed over + the "Code redeemed in store" chip | 960 × 1280 |
| `handshake` | the closing handshake, then defocused behind the end card | 960 × 1280 |
| `store` | blurred backdrop of the hook | 960 × 1280 |

`manifest.json` keeps the prompt, the model and the hosted URL of every image. The hosted URLs **expire 7 days after
generation**; once `public/people/*.webp` is committed those files are the source of truth and nothing here is needed to
render the film.

## Current status — provisional images

The committed `public/people/*.webp` are the 192 × 256 hosted previews (`previews/`), cleaned of JPEG blocking and upscaled 4× with
EDSR (`upscale.py`). They hold up in the film — the stills are graded, grained and always moving — but an upscaler cannot add detail
that was never in the preview, so the hands are softer than the real files will be. The full-resolution originals are hosted on
`www.figma.com`, which the sandbox's network policy denied when the film was made. To upgrade: allow that host (environment settings →
Network access → Allowed domains), run `node tools/people/fetch.mjs`, re-run `measure_quad.py` on the hand-off (the glass does not
move, but the finger cut-out is made from the pixels), and re-render the chunks that contain photographs (0, 1 and 5 in
`scripts/render-film.sh`; the others are unaffected). The hosted links expire 7 days after generation (2026-10-15).

## Download / convert

```bash
node tools/people/fetch.mjs                 # download the manifest's images → public/people/<id>.webp (needs curl + ffmpeg with libwebp)
node tools/people/fetch.mjs --check         # is the image host reachable from here?
node tools/people/fetch.mjs --from ./photos # convert your own photos (<id>.png|jpg|webp) instead of downloading
FFMPEG=/path/to/ffmpeg node tools/people/fetch.mjs bag handshake
```

The script never touches TLS settings or the proxy. If the host is denied by the environment's network policy it says which
host to allow (Allowed domains, with the package-manager list left ticked).

`upscale.py` is the fallback that produced the provisional files (needs `opencv-contrib-python-headless` and the 38 MB `EDSR_x4.pb`,
see its header).

## After replacing an image

1. **Re-measure the glass** of the tablet in `handoff` — `python3 tools/people/measure_quad.py public/people/handoff.webp --fg
   public/people/handoff-fg.webp --debug /tmp/quad.png` (numpy + scipy + Pillow; look at the overlay) — and update `HANDOFF_QUAD` in
   `src/people.ts` (photo pixels, TL → TR → BR → BL). The kiosk screen is warped onto that quad, the zoom into the screen is matched
   to it, and `handoff-fg.webp` puts the fingers that hold the tablet back in front of the lit screen.
2. Check the camera focus points (`HandoffLayer.tsx`, `HumanScene.tsx`) and the clasp / chip positions in the **HumanClose**
   composition (Remotion Studio → Scenes).
3. Keep the framing: 3:4 portrait, hands low-centre, empty (blurred) space in the top third where captions sit.
4. If the size is not 960 × 1280, change `PHOTO` in `src/people.ts` too.

## Real photos instead

Nothing ties the film to AI imagery: shoot the same three frames in a store (with the written consent of everyone who
appears, and no faces if you want to keep the same look), export 3:4 JPEG/PNG and run `fetch.mjs --from <folder>`. Photos of
a real store would also remove the need to disclose AI imagery in the post (see `../../LINKEDIN.md`).
