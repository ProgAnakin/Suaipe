import { defineConfig, devices } from "@playwright/test";

const chromiumFallback = process.env.PLAYWRIGHT_BROWSER === "chromium";

// Standalone Playwright config — starts the Vite preview server and runs the
// kiosk flow specs in /e2e against an iPad-sized WebKit viewport (the engine
// real kiosks use).
export default defineConfig({
  testDir: "./e2e",
  // Existing screenshots belong to WebKit; never compare them to another engine.
  testIgnore: chromiumFallback ? "**/visual-regression.spec.ts" : undefined,
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
    video: chromiumFallback ? "off" : "retain-on-failure",
  },

  projects: [
    {
      name: chromiumFallback ? "chromium-ipad-viewport" : "ipad-landscape",
      use: {
        ...devices["iPad Pro 11 landscape"],
        browserName: chromiumFallback ? "chromium" : "webkit",
        ...(chromiumFallback ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium" } } : {}),
      },
    },
  ],

  webServer: {
    // Build once with stub env vars, then preview — mirrors CI build behaviour.
    command:
      "VITE_ENABLE_MARKETING=true VITE_DEMO_MODE=false VITE_ALLOW_REAL_CUSTOMER_DATA=true VITE_SUPABASE_URL=https://placeholder.supabase.co " +
      "VITE_SUPABASE_PUBLISHABLE_KEY=fixture-public-key " +
      "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
