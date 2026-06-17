# Changelog

All notable changes to Suaipe are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [2.0.1] — 2026-06-04 — Promote Suaipe to `main`

`main` was kept on the historical Webi-Match v1.7.2 commit as a safety
fallback while 2.0.0 was being validated on the rebrand branch. This
release fast-forwards `main` to the rebranded code and
preserves the original production tip on a dedicated `webi-match`
branch for rollback.

### Topology
- New branch **`webi-match`** snapshots the pre-rebrand production tip
  (`dab4d2b`, Webi-Match v1.7.2). Treat it as a read-only safety net.
- `main` now contains the Suaipe code — Vercel production deploys from
  this commit.
- Brand assets, palette, logo, and discount-code prefix (`SUP-`)
  unchanged from 2.0.0; this release is the promotion event, not a new
  code change.

### Operator action required (post-merge)
- Redeploy the `on-session-created` Edge Function from `main` so new
  emails carry the `SUP-` prefix.
- Ensure `SENTRY_ORG` / `SENTRY_PROJECT` in Vercel env vars match the
  Sentry project slug (rename Sentry project to `suaipe` if desired).

---

## [2.0.0] — 2026-06-03 — Rebrand to **Suaipe**

Independent product identity, fully decoupled from any prior employer
branding. Everything user-facing has been replaced; runtime behaviour,
data model, security posture and feature set are unchanged.

### Brand identity
- **Name:** Webi-Match → **Suaipe**. Package, manifest, HTML title,
  apple-mobile-web-app-title, OG/Twitter cards, every README and ADR.
- **Palette:** Webidoo orange (`hsl(27,92%,55%)` + `hsl(16,100%,50%)`
  gradient) → **electric blue → cyan** (`hsl(217,91%,60%)` →
  `hsl(188,86%,53%)`) on deep navy. Success/CTA accent is now mint
  (`hsl(168,76%,52%)`). All ~150 colour hardcodes rewritten across the
  attract / welcome / quiz / result / success / manager screens, the
  three animated background components, the confetti palette, the
  shadow-glow utility and the email-template preview. CSS variables in
  `src/index.css` are the single source of truth and cascade through
  every `bg-primary` / `text-primary` / `gradient-primary` usage.
- **Logo:** new `<SuaipeLogo>` inline SVG component (electric-blue → cyan
  gradient on a stylised "S" with soft glow) replaces the legacy
  webidoo-logo.webp in the attract / welcome / kiosk-lock screens. The
  raster asset has been removed.
- **Social preview:** `docs/socialpreview.png` regenerated in the new
  palette.
- **Email/contact domains:** `@webidoo.com` → `@suaipe.app` (sender
  fallback, privacy-notice contact). SECURITY.md disclosure email
  routed to the maintainer's personal address.
- **Email discount-code prefix:** `WEBI-XXXXXXXXNN` → `SUP-XXXXXXXXNN`
  (purely cosmetic — same generation algorithm, same DB shape).

### Migration note
- Existing data referencing the old discount-code prefix (`WEBI-…`) is
  still valid and redeemable; only newly-issued codes use the `SUP-`
  prefix.
- The legacy `src/assets/webidoo-logo.webp` asset has been deleted from
  the bundle.
- `src/assets/webidoo-envelope.png` (already orphaned) cleaned up.

---

For the full pre-rebrand history (1.x — Webi-Match era), see the
[`webi-match`](../../tree/webi-match) branch which preserves the
original `CHANGELOG.md` intact at `dab4d2b` (Webi-Match v1.7.2). It is
kept as a read-only rollback snapshot and intentionally not merged
into `main`.
