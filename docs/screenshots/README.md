# Screenshots

The images in this folder are **generated from the real app**, not drawn or mocked up. One command
retakes all of them:

```bash
npm run docs:screenshots
```

It builds the app with neutral stores (`Store A`, `Store B` — see `VITE_STORES` in
[`.env.example`](../../.env.example)), serves it, and drives it with Playwright
([`e2e/docs-screenshots.spec.ts`](../../e2e/docs-screenshots.spec.ts)) against the in-memory test backend
([`e2e/support/mock-backend.ts`](../../e2e/support/mock-backend.ts)). Everything on screen is **fictional
sample data**: `example.com` addresses, invented gadget brands, round demo numbers. Nothing comes from a
real database, and no real customer, store or city appears.

| file | what it shows | size |
|---|---|---|
| `attract.jpg` | the idle attract screen | 1024 × 1366 |
| `welcome.jpg` | language, name, e-mail and the GDPR consent | 1024 × 1366 |
| `quiz.jpg` | a swipe card (question 5 of 8) | 1024 × 1366 |
| `result.jpg` | the match: 98 %, one product, the claim button | 1024 × 1366 |
| `success.jpg` | the confirmation after the claim | 1024 × 1366 |
| `manager.png` | `/manager` → Sessions & Codes (the README crop) | 840 × 1024 |
| `stats.png` | `/stats`: KPIs, claim rate, product ranking | 840 × 1024 |
| `consulente.png` | `/consulente`: a product guide for the sales staff | 840 × 1024 |

`public/screenshots/` holds the four images the PWA manifest offers in the browser's install dialog
(`attract`, `quiz`, `result` and the full-window `manager`); the same command refreshes them.

## When to retake them

After any change to the look of a screen or to its copy. The command needs a Chromium
(`E2E_BROWSER=chromium CHROMIUM_PATH=/path/to/chrome npm run docs:screenshots` where Playwright's own
browsers are not installed). Commit the new files with the change that caused them.

## Rules

- **Never commit a screenshot of a real customer, e-mail address, store or discount code.** The command
  above is the way to avoid that: it cannot reach production.
- Kiosk screens are JPEG (large soft gradients — about ten times smaller than PNG), staff screens are PNG.
- Keep the file names: the README and the manifest refer to them.
