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
- **Rights.** All sound is synthesised in code and all images are the product's own — nothing to license beyond Remotion itself.

## Consequences

- A second toolchain to maintain (Remotion, Playwright, Python for audio), but outside the app's dependency graph. Remotion needs React 19 for its transitions package; that is isolated to `video/`.
- Remotion is free for individuals and companies with up to 3 employees; a larger operating company needs a Remotion licence (see `video/README.md`).
- Generated binaries (captures ≈ MBs, `soundtrack.*`) are committed so a fresh clone can render; `out/` is git-ignored.
- **Revisit if** the film is redone in a different format (16:9 / 9:16): scenes are laid out for 1080×1350 and would need a responsive pass.
