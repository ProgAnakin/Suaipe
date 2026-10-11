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

const ipadLandscape = {
  ...devices["iPad Pro 11 landscape"],
  ...(useChromium
    ? {
        browserName: "chromium" as const,
        launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
      }
    : {}),
};

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

  projects: [
    {
      // Smoke, framing and pixel-diff specs: fast, run on every push.
      name: "ipad-landscape",
      testIgnore: [/(kiosk-(resilience|layout)|admin-areas)/, ...(useChromium ? [/visual-regression/] : [])],
      use: ipadLandscape,
    },
    {
      // The real kiosk against a backend that misbehaves (flaky network, lost responses, hostile
      // input, corrupt device storage…) — ~40 scenarios, a few minutes: its own CI job.
      name: "resilience",
      testMatch: /(kiosk-(resilience|layout)|admin-areas)/,
      use: ipadLandscape,
    },
  ],

  webServer: {
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
