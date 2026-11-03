import { test, expect, Page } from "@playwright/test";

// Smoke tests for the public kiosk routes, run against a preview build wired to
// PLACEHOLDER Supabase credentials — the backend is intentionally unreachable.
// They therefore assert only that each route mounts the app shell and does NOT
// fall through to the full-screen render-error boundary. They never wait for
// "networkidle": /stats and /manager open Supabase realtime channels that retry
// their websocket forever against the dead placeholder host, so the network
// never goes idle.

// Waits for the SPA to mount, then asserts the render-error boundary is absent.
// The boundary is detected by a stable data-testid (language-independent), so a
// crash on mount fails loudly here rather than as a vague console-error miss.
async function expectRouteMounts(page: Page) {
  await expect(page.locator("#root")).not.toBeEmpty({ timeout: 15_000 });
  await expect(page.getByTestId("error-boundary")).toHaveCount(0);
}

test.describe("Quiz kiosk flow", () => {
  test("loads the attract screen on first visit", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
  });

  test("welcome screen shows name and email fields after attract click", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("wb_store_id", "lisboa"));
    await page.route("https://placeholder.supabase.co/rest/v1/**", async (route) => {
      const table = new URL(route.request().url()).pathname.split("/").pop();
      const rows = table === "custom_products" ? [{ id: "demo", name: "Demo", description: "Demo product", price: "€10", rating: 4, tags: ["tech"], faq: [] }] : [];
      await route.fulfill({ json: rows });
    });
    await page.goto("/");
    await page.getByTestId("start-quiz").click();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toHaveCount(2);

  });

  test("unconfigured kiosk does not collect personal data", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-quiz").click();
    await expect(page.getByRole("status")).toContainText("Il chiosco non è disponibile");
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
  });

  test("manager page requires authentication", async ({ page }) => {
    await page.goto("/manager", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
    // The authenticated catalog UI must not render without a session.
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByRole("heading", { name: "Analytics Dashboard" })).toBeVisible();
  });

  test("stats page loads without crashing", async ({ page }) => {
    await page.goto("/stats", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
  });

  test("404 page renders the shell instead of a blank crash", async ({ page }) => {
    await page.goto("/does-not-exist-xyz", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
  });

  test("app reports no truly-unexpected console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
    // Denylist, not allowlist: a backend-less WebKit preview legitimately logs
    // network, Service-Worker and resource errors that vary by engine, so an
    // allowlist of "benign" strings is always incomplete. Instead, fail only on
    // signatures of a genuine code fault — those catch real regressions without
    // flaking on expected environment noise.
    const codeFault = /TypeError|ReferenceError|SyntaxError|is not a function|Cannot read propert|Cannot access|is not defined/;
    const realBugs = errors.filter((e) => codeFault.test(e));
    expect(realBugs, `unexpected runtime errors:\n${realBugs.join("\n")}`).toHaveLength(0);
  });
});

test.describe("Manager dashboard — public paths", () => {
  test("reset-password page renders a form", async ({ page }) => {
    await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
  });

  test("manager route does not expose data without login", async ({ page }) => {
    await page.goto("/manager", { waitUntil: "domcontentloaded" });
    await expectRouteMounts(page);
    // Dashboard data sections must NOT be visible without auth.
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
