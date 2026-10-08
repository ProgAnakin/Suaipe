# Publishing the film on LinkedIn

The film is about **Suaipe**, not about its author: no name, no city, no store count, no result figures. Everything it claims is something the app does today.

## Files (after `scripts/render-film.sh`, `npm run cover`, `npm run srt`)

| File | Use |
|---|---|
| `out/suaipe-film.mp4` | The master. 64.5 s, 1080 × 1350 (4:5), 60 fps, H.264 High (CRF 17, ≤ 20 Mbps) + AAC 320k, −14 LUFS. 4:5 takes the most feed space on mobile and desktop. |
| `out/suaipe-film-15s.mp4` | The 15 s cut-down (own arrangement): for a teaser, a story or a reply — same picture quality. |
| `out/suaipe-cover.png` | Custom thumbnail (upload it as the video cover; autoplay shows the first frame, the cover is what people see before/after): "Eight swipes. One perfect match." over the real result screen. |
| `out/suaipe-cover-device.png` | Alternative thumbnail without people (tilted iPad, `npm run cover:device`). |
| `out/suaipe-captions.srt` | Subtitle file (LinkedIn → "Add captions"): accessibility + search. The captions are also burned into the picture, because most people watch muted. |

A lighter copy of the master (same picture, a fraction of the size — handy for chat/e-mail; LinkedIn re-encodes anyway):

```bash
ffmpeg -i out/suaipe-film.mp4 -c:v libx264 -preset slower -crf 21.2 -maxrate 13M -bufsize 26M -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart out/suaipe-film-1080x1350.mp4
```

## Suggested post (English) — the 64.5 s film

> Walk into a retail tech store and the choice is overwhelming: too many gadgets, too little guidance.
> So we turned the idle in-store iPads into a matchmaker.
>
> **Suaipe**: eight swipes → one perfect product match → a unique discount code and a personalised e-mail in the customer's language — while the store captures a GDPR-consented, first-party lead at the source.
>
> And it doesn't stop at the kiosk:
> → **Manager**: the catalogue, the leads and their codes, store by store
> → **Stats**: what sells, per store, from the first swipe to the claimed match
> → **Consultants**: a training library — product guides, the manager's videos, tips and advice — so a new consultant can prepare, or refresh, before the customer arrives
>
> Multi-store, row-level security on every table, MFA on the staff dashboards. The app never replaces the person behind the counter: it gets the customer and the consultant to the right product faster, and the sale still ends with a bag and a handshake.
>
> Built with React, Supabase, Edge Functions and a PWA. Every screen in this film is the real app, captured automatically and animated with code (Remotion); the staff screens show sample data. The in-store hands (hand-off, bag, handshake) are AI-generated illustrations.
>
> #retailtech #productdiscovery #firstpartydata #GDPR #React #Supabase #PWA #buildinpublic

## Short post — for the 15 s cut

> Eight swipes. One perfect match.
> Suaipe turns the idle iPad in a retail store into a product matchmaker: a unique discount code, a personalised e-mail and a GDPR-consented first-party lead — all at the source.
> (Screens are the real app; the in-store hands are AI-generated illustrations.)
>
> #retailtech #productdiscovery #firstpartydata

## One line for the CV · "Featured" description

* **CV line:** Designed and built Suaipe, an iPad-first product-discovery kiosk in production across multiple retail stores — 8-swipe quiz → product match → unique discount code → personalised multilingual e-mail — with GDPR-consented lead capture, per-store analytics and a consultant training app (React, Supabase, Edge Functions, PWA).
* **Featured:** Suaipe turns idle in-store iPads into a product-discovery kiosk. A customer answers eight swipe questions and gets one match, a unique discount code and a personalised e-mail; the store gets first-party, GDPR-consented leads, per-store dashboards, a CRM feed and a training library for its consultants. Film: every screen is the real app (staff screens show sample data).

## Three questions you may get — short, true answers

1. **Why swipes instead of a form?** The customer is standing, one-handed, expecting to browse, and may be interrupted at any moment. Eight swipes feel like flicking through a deck, not a survey — and a customer who stops half-way has still given useful signals. (ADR 004.)
2. **What does the store get besides a discount code?** A lead with the customer's consent stored with it, the product they matched and claimed, and a code the consultant can redeem at the till (`/manager`); per-store funnel and product rankings (`/stats`); and a relay of each lead to a CRM sheet. The consent timestamp travels with every lead.
3. **How do consultants use it, and how is the data protected?** The consultants' app (`/consulente`) is a read-only product library — what the customer sees, the manager's video, tips and advice — for preparing before a shift or refreshing before a customer arrives. Access is role-based per store; staff dashboards use a PIN and MFA; every table has row-level security and fails closed.

## Checklist

- [ ] Upload the MP4, then set the cover (`suaipe-cover.png`) and upload the captions (`suaipe-captions.srt`).
- [ ] Alt text / description: "A store consultant hands an iPad to a customer, who swipes through eight questions and gets one product match, a discount code and a personalised e-mail; the store's manager, stats and consultant-training screens follow, and the sale ends with a bag hand-off and a handshake."
- [ ] Disclose the AI-generated stills (the post copy above says it, and the last frame carries a very small line; if LinkedIn offers an "AI-generated content" label for the video, tick it). Replace them with real in-store photos (`tools/people/README.md`) if you prefer — then the line can go.
- [ ] Check with your employer that the product may be shown publicly. The film uses fictional, unbranded products, a neutral "Store A / Store B", no store, city or client name, and sample data on every staff screen.
- [ ] Post when the target audience is online (retail / SaaS: Tue–Thu morning), reply to early comments in the first hour.
- [ ] Optional first comment: a link to the product page or a way to book a demo.

## Why it is built this way

- **Hook in the first 2 s** — "Too many gadgets." with ten products popping in, then the single match — before anyone scrolls.
- **Silent-first** — every beat has on-screen text; the sound (original music + effects, synthesised in `tools/audio`) is a bonus.
- **Proof, not claims** — the swipes, the typing, the ring, the e-mail and the discount code are the real product; so are the manager's, the stats' and the consultants' screens. The system diagram answers what retailers ask next (multi-store, security).
- **Calm** — one subject per scene, held long enough to read; the camera moves under the content instead of cutting between close-ups.
- **Human, not just UI** — it opens on the hand-off of the tablet (the kiosk wakes up inside the photographed glass, then the camera flies into the real screen) and closes on the bag and the handshake, because the product lives in a shop between two people. The photographs are generated stills, hands only, an unbranded bag; the screens never are.
- **Only what exists** — the consultants' "Files & manuals" tab is still "Coming soon" in the app, so the film shows the guides, the manager's video, insights and advice, and promises nothing else.
