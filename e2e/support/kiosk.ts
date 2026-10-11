// Helpers that drive the REAL kiosk (attract → welcome → quiz → result → success) in a browser
// whose backend is the in-memory MockBackend. Labels come from the app's own translation table,
// so the same driver works in every language.
import { expect, type Locator, type Page } from "@playwright/test";
import { MockBackend, installMockBackend } from "./mock-backend";
import { translations, type Lang } from "../../src/i18n/translations";

/** One of the stores bundled in src/data/stores.ts (the production bundle only knows these). */
export const STORE_ID = "milano";

export const VISITOR = { first: "Marco", last: "Rossi", email: "marco.rossi@example.com" } as const;

export interface BootOptions {
  backend?: MockBackend;
  /** store configured on the device (default STORE_ID; `null` = none configured) */
  storeId?: string | null;
  /** language preselected on the device (default "en") */
  lang?: Lang;
  /** extra localStorage entries present before the app first runs */
  storage?: Record<string, string>;
}

export interface Booted {
  backend: MockBackend;
  /** uncaught exceptions + console errors the page produced (see `appErrors`) */
  errors: string[];
  t: (typeof translations)[Lang];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** "🚀 START THE GAME!" → /START THE GAME/i ; "Tap to start →" → /Tap to start/i  (emoji/arrows/punctuation dropped) */
export const labelRe = (s: string) =>
  new RegExp(escapeRe(s.replace(/[^\p{L}\p{N}\s'’-]/gu, "").replace(/\s+/g, " ").trim()).replace(/\\? /g, "\\s+"), "i");

/**
 * Console noise that comes from the sandbox, not from the app: blocked autoplay audio, the
 * service worker being disabled for the test, resources we deliberately do not serve, and the
 * errors the mock backend injects on purpose.
 */
const ENV_NOISE = [
  /AudioContext/i,
  /Service Worker/i,
  /Failed to load resource/i,
  /net::ERR_/i,
  /WebSocket/i,
  // WebKit only: it logs the Chrome-only `interactive-widget` viewport hint as a warning, and reports a
  // request the page abandoned (a navigation while the catalogue was loading) as a page error
  /Viewport argument key "interactive-widget" not recognized/i,
  /^pageerror: .*due to access control checks/i,
  /\[suaipe\] (funnel event|quiz_sessions insert|product_settings fetch|startup Promise\.all|No store_id)/,
];
export const appErrors = (errors: string[]) => errors.filter((e) => !ENV_NOISE.some((re) => re.test(e)));

/** Install the mock backend, isolate the network and open the kiosk at `/`. */
export async function boot(page: Page, opts: BootOptions = {}): Promise<Booted> {
  const context = page.context();
  const backend = await installMockBackend(context, opts.backend ?? new MockBackend());
  const lang = opts.lang ?? "en";
  const storeId = opts.storeId === undefined ? STORE_ID : opts.storeId;

  // nothing but the app and the mock backend may be reached: no fonts, no analytics, no internet
  await context.route(
    (url) => url.hostname !== "127.0.0.1" && url.hostname !== "localhost" && !url.hostname.endsWith(".supabase.co"),
    (route) => route.fulfill({ status: 200, contentType: route.request().resourceType() === "stylesheet" ? "text/css" : "text/plain", body: "" }),
  );

  await context.addInitScript(
    ({ storeId, lang, storage }) => {
      try {
        if (storeId) localStorage.setItem("wb_store_id", storeId);
        localStorage.setItem("wb_lang", lang);
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
      } catch { /* storage unavailable */ }
    },
    { storeId, lang, storage: opts.storage ?? {} },
  );

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  return { backend, errors, t: translations[lang] };
}

// ── screens ─────────────────────────────────────────────────────────────────────────────────────
export const attractCta = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.splash.tap) });
export const firstNameInput = (page: Page, t: Booted["t"]) => page.getByPlaceholder(t.welcome.firstName, { exact: true });
export const lastNameInput = (page: Page, t: Booted["t"]) => page.getByPlaceholder(t.welcome.lastName, { exact: true });
export const emailInput = (page: Page, t: Booted["t"]) => page.getByPlaceholder(t.welcome.emailPlaceholder, { exact: true });
export const consentBox = (page: Page): Locator => page.locator('input[type="checkbox"]').first();
export const startButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.welcome.cta) });
export const readyButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.tutorial.ready) });
export const yesButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.swipe.yes) });
export const noButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.swipe.no) });
export const claimButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.result.cta) });
export const restartButton = (page: Page, t: Booted["t"]) => page.getByRole("button", { name: labelRe(t.success.restart) });

export async function tapToStart(page: Page, t: Booted["t"]) {
  await attractCta(page, t).click();
  await expect(firstNameInput(page, t)).toBeVisible();
}

export async function fillWelcome(
  page: Page,
  t: Booted["t"],
  v: { first: string; last: string; email: string; consent?: boolean } = { ...VISITOR },
) {
  await firstNameInput(page, t).fill(v.first);
  await lastNameInput(page, t).fill(v.last);
  await emailInput(page, t).fill(v.email);
  // the form scrolls the focused field into view smoothly: let it settle before clicking the checkbox
  if (v.consent !== false) await consentBox(page).check({ timeout: 10_000 });
}

/** Press START on the welcome form, dismiss the "how does it work" tutorial if it is shown, and wait for the first card. */
export async function startGame(page: Page, t: Booted["t"]) {
  await startButton(page, t).click();
  // the YES button exists under the tutorial overlay too, so it marks "the quiz is mounted"
  await expect(yesButton(page, t)).toBeVisible({ timeout: 15_000 });
  const ready = readyButton(page, t);
  if (await ready.isVisible()) {
    await ready.click();
    await expect(ready).toBeHidden();
  }
}

/** Answer all 8 cards with the YES/NO buttons. `answers[i]` = true → YES. */
export async function answerAll(page: Page, t: Booted["t"], answers: boolean[] = Array(8).fill(true)) {
  for (const yes of answers) {
    const btn = yes ? yesButton(page, t) : noButton(page, t);
    await btn.click();
    await page.waitForTimeout(450); // the card flies out and the next one arrives
  }
}

/** attract → welcome → quiz → result (stops on the result screen). */
export async function playToResult(page: Page, t: Booted["t"], answers?: boolean[], v?: Parameters<typeof fillWelcome>[2]) {
  await tapToStart(page, t);
  await fillWelcome(page, t, v);
  await startGame(page, t);
  await answerAll(page, t, answers);
  await expect(claimButton(page, t)).toBeVisible({ timeout: 20_000 });
}

/** Everything the screen currently says, as one string (for "no undefined/NaN on screen" checks). */
export const screenText = (page: Page) => page.locator("body").innerText();

/** Words that must never be rendered to a customer. */
export const BROKEN_TEXT = /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|\{\{|\}\}|\$\{/;

/**
 * Make the page believe `ms` more milliseconds have passed — `Date.now()` only. Timers and animation
 * frames keep running in real time, so the UI stays fully usable (unlike a faked clock, which stalls
 * framer-motion's transitions). Install BEFORE the page loads, then call `skewTime`.
 */
export async function installTimeSkew(page: Page) {
  await page.context().addInitScript(() => {
    const real = Date.now.bind(Date);
    (window as unknown as { __skewMs: number }).__skewMs = 0;
    Date.now = () => real() + (window as unknown as { __skewMs: number }).__skewMs;
  });
}
export const skewTime = (page: Page, ms: number) =>
  page.evaluate((ms) => { (window as unknown as { __skewMs: number }).__skewMs += ms; }, ms);
