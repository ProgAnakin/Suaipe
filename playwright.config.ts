import { defineConfig, devices } from "@playwright/test";

// Standalone Playwright config — starts the Vite preview server and runs the
// kiosk flow specs in /e2e against an iPad-sized WebKit viewport (the engine
// real kiosks use).
//
// WebKit is the default and what CI runs. Where it cannot be installed (some
// Linux containers / cloud sandboxes) the same suite runs on an installed
// Chromium with the iPad viewport + touch emulation:
//
//   E2E_BROWSER=chromium [CHROMIUM_PATH=/path/to/chrome] npm run test:e2e
//
// The pixel-diff specs are WebKit-only (their baselines are WebKit renders), so
// they are skipped in that mode.
const useChromium = process.env.E2E_BROWSER === "chromium";
const browser = useChromium
  ? {
      browserName: "chromium" as const,
      launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
    }
  : {};

// E2E_REDUCED_MOTION=1 runs a project with the iPad's "Reduce Motion" setting on (prefers-reduced-motion:
// reduce) — the app honours it everywhere (MotionConfig reducedMotion="user", the low-effects tier), and a
// kiosk operator can switch it on. It also makes slow, software-rendered browsers (CI WebKit) far faster.
const reducedMotion = process.env.E2E_REDUCED_MOTION === "1" ? ("reduce" as const) : undefined;

const ipadLandscape = { ...devices["iPad Pro 11 landscape"], ...browser, ...(reducedMotion ? { reducedMotion } : {}) };

// `npm run docs:screenshots` (DOCS_SCREENSHOTS=1) takes the README / manifest screenshots from the REAL
// app, in a build whose stores are neutral ("Store A", "Store B") and whose backend is the in-memory mock
// with fictional sample data — never production. It runs its own preview server (built into dist-docs).
const docsMode = !!process.env.DOCS_SCREENSHOTS;
const DOCS_PORT = 4180;
const DOCS_STORES = JSON.stringify([
  { id: "store-a", name: "Suaipe Store A", shortName: "Store A" },
  { id: "store-b", name: "Suaipe Store B", shortName: "Store B" },
]);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  // Visual-regression defaults applied to every toHaveScreenshot() call:
  //   • animations: "disabled"  — pauses CSS animations and sets prefers-
  //     reduced-motion so framer-motion respects the steady state. Combined
  //     with capturing only static-by-design screens, eliminates flake.
  //   • maxDiffPixelRatio: 0.01 — 1% per-pixel tolerance absorbs font sub-
  //     pixel and antialiasing noise across runs.
  expect: {
    // the default budget of `expect(...).toBeVisible()` etc. — stretched with the specs' own timeouts (see T() in
    // e2e/support/kiosk.ts) on a slow machine
    timeout: 5_000 * (Number(process.env.E2E_TIMEOUT_SCALE) || 1),
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },

  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: docsMode
    ? [
        {
          name: "docs-screenshots",
          testMatch: /docs-screenshots/,
          use: { ...devices["iPad Pro 11"], ...browser, baseURL: `http://127.0.0.1:${DOCS_PORT}`, viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 1 },
        },
      ]
    : [
        {
          // Smoke, framing and pixel-diff specs: fast, run on every push.
          name: "ipad-landscape",
          testIgnore: [/(kiosk-(resilience|layout|chaos)|admin-areas|docs-screenshots)/, ...(useChromium ? [/visual-regression/] : [])],
          use: ipadLandscape,
        },
        {
          // The real kiosk against a backend that misbehaves (flaky network, lost responses, hostile
          // input, corrupt device storage…) — ~40 scenarios, a few minutes: its own CI job.
          name: "resilience",
          testMatch: /(kiosk-(resilience|layout|chaos)|admin-areas)/,
          use: ipadLandscape,
        },
      ],

  webServer: docsMode
    ? {
        command:
          "VITE_SUPABASE_URL=https://placeholder.supabase.co " +
          "VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder " +
          `VITE_STORES='${DOCS_STORES}' ` +
          `npx vite build --outDir dist-docs && npx vite preview --outDir dist-docs --host 127.0.0.1 --port ${DOCS_PORT} --strictPort`,
        url: `http://127.0.0.1:${DOCS_PORT}`,
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : {
        // Build once with stub env vars, then preview — mirrors CI build behaviour.
        command:
          "VITE_SUPABASE_URL=https://placeholder.supabase.co " +
          "VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder " +
          "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
