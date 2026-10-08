# ADR 007 — The product film is built with Remotion from real captures, in an isolated `video/` project

**Status:** Accepted — 2026-10

## Context

Suaipe is shown on LinkedIn and to prospective retail partners. The film has to show the **real** kiosk — every screen, the swipe interaction, the e-mail — not a re-drawn mock-up, and it has to be reproducible: the UI keeps changing, and a film that can only be re-made by hand in an editor goes stale.

Options considered: screen-recording an iPad and cutting it in an NLE (CapCut / Premiere); AI-generated footage (Veo / Kling / Higgsfield); a design tool (Figma / Canva) with exported motion; programmatic video with Remotion.

## Decision

Build the film as a **Remotion** project in `video/`, fed by **automated captures of the real app** (`video/tools/capture`: Playwright drives the real Vite build with the Supabase layer mocked), with picture and sound locked to one timeline (`video/src/timeline.ts`, 120 BPM grid) and a **synthesised, original soundtrack** (`video/tools/audio`).

`video/` is deliberately isolated: its own `package.json`, lockfile and `node_modules`; it is never imported by `src/`, never part of the Vite build and never deployed by Vercel. CI for the app is unaffected.

## Rationale

- **Authenticity.** Screens come from the product's own code (and the real e-mail template), so they cannot drift from what customers see. The two interactions that matter most — the card swipes — are real drag recordings, not animations.
- **Repeatability.** UI change → `node tools/capture/capture.mjs` → `npm run render`. Timing changes → edit `timeline.ts` → regenerate the cue sheet and soundtrack.
- **Quality control.** Frame-exact rendering, deterministic effects (seeded particles, closed-form physics) and a numerically verified master (loudness, true peak, sync) instead of "looks fine in the editor".
- **Rights.** All sound is synthesised in code and every screen is the product's own. The only third-party-generated imagery is the four in-store stills (see the addendum) — nothing to license beyond Remotion itself, but those stills must be disclosed as AI-generated when the film is published.

## Consequences

- A second toolchain to maintain (Remotion, Playwright, Python for audio), but outside the app's dependency graph. Remotion needs React 19 for its transitions package; that is isolated to `video/`.
- Remotion is free for individuals and companies with up to 3 employees; a larger operating company needs a Remotion licence (see `video/README.md`).
- Generated binaries (captures ≈ MBs, `soundtrack.*`) are committed so a fresh clone can render; `out/` is git-ignored.
- **Revisit if** the film is redone in a different format (16:9 / 9:16): scenes are laid out for 1080×1350 and would need a responsive pass.

## Addendum (2026-10) — the in-store, human close

The app is used by two people standing in a shop, and a film made only of screens hides that. The film therefore opens on a consultant handing a tablet to a customer (the kiosk wakes up inside the photographed glass, then the camera flies into it) and closes on the bag with the product changing hands and a handshake, before the end card.

- **Photographs.** Four stills (hand-off, bag, handshake, store backdrop) were **AI-generated** — hands and forearms only, no faces, an unbranded bag — and are committed as `video/public/people/*.webp`. Prompts, models and hosted URLs are in `video/tools/people/manifest.json`; the hosted URLs expire after 7 days, so the committed files are the source of truth. They can be replaced by real in-store photos without code changes (`tools/people/fetch.mjs --from`).
- **Authenticity is kept where it matters.** The screen inside the photographed tablet is the real kiosk capture, warped onto the glass with a homography (`src/lib/homography.ts`) and matched pixel for pixel to the flat iPad scene, so the fly-into-the-screen is a true match-cut, not a dissolve to a mock-up. The "Code redeemed in store" chip refers to the real `mark_code_redeemed` flow.
- **Disclosure.** The post says the in-store hands are AI-generated and the screens are the real app (`video/LINKEDIN.md`).
- **Trade-off.** The film now depends on four binary images (a few hundred KB) and on a tablet quad (`HANDOFF_QUAD`, measured by `tools/people/measure_quad.py`) that must be re-measured if the hand-off image is regenerated.
