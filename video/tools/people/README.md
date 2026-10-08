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

## Provenance

The committed `public/people/*.webp` are the four images exactly as generated on 2026-10-08 (960 × 1280, prompts in `manifest.json`). The
sandbox this film was built in could not reach the host that serves the originals (`www.figma.com`), so they were handed over as chat
attachments — the chat app re-encodes them to lossy WebP (≈ 80–120 KB each), which is why they are not bit-identical to the hosted PNGs.
`handoff-fg.webp` (the fingers in front of the screen) is derived from the hand-off image by `measure_quad.py`.

## Download / convert

```bash
node tools/people/fetch.mjs                 # download the manifest's images → public/people/<id>.webp (needs curl + ffmpeg with libwebp)
node tools/people/fetch.mjs --check         # is the image host reachable from here?
node tools/people/fetch.mjs --from ./photos # convert your own photos (<id>.png|jpg|webp) instead of downloading
FFMPEG=/path/to/ffmpeg node tools/people/fetch.mjs bag handshake
```

The script never touches TLS settings or the proxy. If the host is denied by the environment's network policy it says which
host to allow (Allowed domains, with the package-manager list left ticked).

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
