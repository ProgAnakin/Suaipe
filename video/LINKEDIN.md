# Publishing the film on LinkedIn

## Files (after `npm run render`, `npm run cover`, `npm run srt`)

| File | Use |
|---|---|
| `out/suaipe-film.mp4` | The master. 1080 × 1350 (4:5), 60 fps, H.264 High (CRF 17, ≤ 20 Mbps) + AAC 320k, −14 LUFS. ≈ 74 MB. 4:5 takes the most feed space on mobile and desktop. |
| `out/suaipe-cover.png` | Custom thumbnail (upload it as the video cover; autoplay shows the first frame, the cover is what people see before/after): the consultant handing the tablet over, the real "perfect match" screen in the glass. |
| `out/suaipe-cover-device.png` | Alternative thumbnail without people (tilted iPad, `npm run cover:device`). |
| `out/suaipe-captions.srt` | Subtitle file (LinkedIn → "Add captions"): accessibility + search. The captions are also burned into the picture, because most people watch muted. |

A lighter copy of the master (same picture, ≈ 26 MB — handy for chat/e-mail; LinkedIn re-encodes anyway):

```bash
ffmpeg -i out/suaipe-film.mp4 -c:v libx264 -preset slower -crf 20.5 -maxrate 14M -bufsize 28M -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart out/suaipe-film-1080x1350.mp4
```

## Suggested post (English)

> Walk into a retail tech store and the choice is overwhelming — too many gadgets, too little guidance.
> We turned the idle in-store iPads into a matchmaker.
>
> **Suaipe**: 8 swipes → 1 perfect product match → a unique discount code and a personalised email — while the store captures a GDPR-consented first-party lead, right at the source.
>
> Live in 4 retail stores (Rio de Janeiro, Lisbon, Dublin, Milan). Multi-store, 2FA on staff dashboards, row-level security on every table.
>
> The app never replaces the person behind the counter: it gets the customer and the consultant to the right product faster — and the sale still ends with a bag and a handshake.
>
> Built solo with React, Supabase, Edge Functions and a PWA.
> Every screen in this film is the real app — captured automatically and animated with code (Remotion). The in-store hands (hand-off, bag, handshake) are AI-generated stills.
>
> #retailtech #productdiscovery #firstpartydata #GDPR #React #Supabase #PWA #buildinpublic

## Checklist

- [ ] Upload the MP4, then set the cover (`suaipe-cover.png`) and upload the captions (`suaipe-captions.srt`).
- [ ] Alt text / description: "A store consultant hands an iPad to a customer, who swipes through 8 questions and gets one product match, a discount code and a personalised email; the sale ends with a bag hand-off and a handshake."
- [ ] Disclose the AI-generated stills (the post copy above already says it; if LinkedIn offers an "AI-generated content" label for the video, tick it). Replace them with real in-store photos (`tools/people/README.md`) if you prefer — then the line can go.
- [ ] Post when the target audience is online (retail / SaaS: Tue–Thu morning), reply to early comments in the first hour.
- [ ] Optional first comment: link to the product page or a way to book a demo.

## Why it is built this way

- **Hook in the first 2 s** — "Too many gadgets." with ten products popping in, then the single match — before anyone scrolls.
- **Silent-first** — every beat has on-screen text; the sound (original music + effects, synthesised in `tools/audio`) is a bonus.
- **Proof, not claims** — the swipes, the typing, the ring, the e-mail and the discount code are the real product; the system diagram answers what retailers ask next (multi-store, security).
- **Human, not just UI** — it opens on the hand-off of the tablet (the kiosk wakes up inside the photographed glass, then the camera flies into the real screen) and closes on the bag and the handshake, because the product lives in a shop between two people. The photographs are generated stills, hands only, an unbranded bag; the screens never are.
