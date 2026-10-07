# Publishing the film on LinkedIn

## Files (after `npm run render`, `npm run cover`, `npm run srt`)

| File | Use |
|---|---|
| `out/suaipe-film.mp4` | The video. 1080 × 1350 (4:5), 60 fps, H.264 High + AAC 48 kHz. 4:5 takes the most feed space on mobile and desktop. |
| `out/suaipe-cover.png` | Custom thumbnail (upload it as the video cover; autoplay shows the first frame, the cover is what people see before/after). |
| `out/suaipe-captions.srt` | Subtitle file (LinkedIn → "Add captions"): accessibility + search. The captions are also burned into the picture, because most people watch muted. |

## Suggested post (English)

> Walk into most retail tech stores and half of the shoppers leave undecided.
> We turned the idle in-store iPads into a matchmaker.
>
> **Suaipe**: 8 swipes → 1 perfect product match → a unique discount code and a personalised email — while the store captures a GDPR-consented first-party lead, right at the source.
>
> Live in 4 retail stores (Rio de Janeiro, Lisbon, Dublin, Milan). Multi-store, 2FA on staff dashboards, row-level security on every table.
>
> Built solo with React, Supabase, Edge Functions and a PWA.
> Every screen in this film is the real app — captured automatically and animated with code (Remotion).
>
> #retailtech #productdiscovery #firstpartydata #GDPR #React #Supabase #PWA #buildinpublic

## Checklist

- [ ] Upload the MP4, then set the cover (`suaipe-cover.png`) and upload the captions (`suaipe-captions.srt`).
- [ ] Alt text / description: "Customer swipes through 8 questions on an in-store iPad and gets one product match, a discount code and a personalised email."
- [ ] Post when the target audience is online (retail / SaaS: Tue–Thu morning), reply to early comments in the first hour.
- [ ] Optional first comment: link to the product page or a way to book a demo.

## Why it is built this way

- **Hook in the first 2 s** — "Too many gadgets." with ten products popping in, then the single match — before anyone scrolls.
- **Silent-first** — every beat has on-screen text; the sound (original music + effects, synthesised in `tools/audio`) is a bonus.
- **Proof, not claims** — the swipes, the typing, the ring, the e-mail and the discount code are the real product; the system diagram closes with what retailers ask next (multi-store, security).
