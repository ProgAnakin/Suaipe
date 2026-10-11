import { test, expect, type Page } from "@playwright/test";
import { AVAILABLE_TAGS } from "../src/data/products";
import { questions } from "../src/data/questions";
import { MockBackend, seedTables } from "./support/mock-backend";
import { STORE_ID, VISITOR, appErrors, boot, claimButton, installTimeSkew, skewTime, type Booted, consentBox, emailInput, fillWelcome, firstNameInput, noButton, playToResult, restartButton, screenText, startButton, startGame, tapToStart, yesButton, attractCta, BROKEN_TEXT, answerAll, T } from "./support/kiosk";

// The REAL kiosk, driven end to end against an in-memory backend that can be told to misbehave.
// Every test documents one way the real world fails — flaky wifi, a half-down backend, a double
// tap, a corrupted device — and what a customer standing in front of the iPad must (not) see.

test.use({ serviceWorkers: "block" });
test.describe.configure({ timeout: T(60_000) });

/** A catalogue with ONE product that is not in the bundled fallback and wins every quiz. */
const DB_ONLY = {
  id: "only-in-db", name: "Only In DB", description: "Lives in the database, not in the bundle", price: "€10,00",
  rating: 4, image_url: "/products/placeholder.png", video_url: null, tags: [...AVAILABLE_TAGS], faq: [], status: "active",
};
const backendWithDbOnlyProduct = () => {
  const tables = seedTables();
  tables.custom_products = [DB_ONLY];
  return new MockBackend(tables);
};

test.describe("journey", () => {
  test("a full visit stores exactly one well-formed lead and leaves nothing of the visitor behind", async ({ page }) => {
    const { backend, errors, t } = await boot(page);
    await playToResult(page, t);
    await expect(page.getByText(VISITOR.email)).toBeVisible();
    expect(BROKEN_TEXT.test(await screenText(page))).toBe(false);

    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });

    const rows = backend.rows("quiz_sessions");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: VISITOR.email, nome: VISITOR.first, cognome: VISITOR.last, store_id: STORE_ID,
      language: "en", email_sent: false,
    });
    expect(Object.keys(rows[0].answers)).toHaveLength(8);
    expect(rows[0].consent_given_at).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(rows[0].product_image).toMatch(/^https:\/\//);
    expect(rows[0].match_percent).toBeGreaterThanOrEqual(45);
    expect(rows[0].match_percent).toBeLessThanOrEqual(98);

    const events = backend.rows("quiz_funnel_events");
    expect(events.map((e) => e.event_type)).toEqual(["quiz_started", "result_shown", "claimed"]);
    expect(new Set(events.map((e) => e.funnel_key)).size).toBe(1);

    // the next customer starts clean: no name / e-mail left in either storage
    await restartButton(page, t).click();
    await expect(attractCta(page, t)).toBeVisible();
    const leftovers = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(leftovers).not.toMatch(/marco|rossi|example\.com/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test("a second visitor after a restart gets a new funnel key", async ({ page }) => {
    const { backend, t } = await boot(page);
    for (const email of ["one@example.com", "two@example.com"]) {
      await playToResult(page, t, undefined, { first: "Ana", last: "Souza", email });
      await claimButton(page, t).click();
      await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
      await restartButton(page, t).click();
      await expect(attractCta(page, t)).toBeVisible();
    }
    expect(backend.rows("quiz_sessions").map((r) => r.email)).toEqual(["one@example.com", "two@example.com"]);
    expect(new Set(backend.rows("quiz_funnel_events").map((e) => e.funnel_key)).size).toBe(2);
  });
});

test.describe("catalogue loading", () => {
  test("the kiosk recommends from the database catalogue, not from the bundled fallback", async ({ page }) => {
    const { backend, t } = await boot(page, { backend: backendWithDbOnlyProduct() });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")[0].matched_product_id).toBe("only-in-db");
  });

  test("a failing catalogue request does not wipe a good cached catalogue", async ({ page }) => {
    const backend = backendWithDbOnlyProduct();
    const { t } = await boot(page, { backend });
    await expect.poll(() => backend.calls("/rest/v1/quiz_cards").length).toBeGreaterThan(0);
    await expect(attractCta(page, t)).toBeVisible();
    // the next load: the products endpoint is down, everything else answers
    backend.fail("/rest/v1/custom_products", { kind: "status", status: 500 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions").at(-1)?.matched_product_id).toBe("only-in-db");
  });

  // A manager renames a product and changes its price while the iPad stays on (never reloaded).
  const RENAMED = { ...DB_ONLY, name: "Renamed By Manager", price: "€99,00" };
  const expectRenamedProductOnResult = async (page: Page, t: Booted["t"]) => {
    await playToResult(page, t);
    await expect(page.getByText("Renamed By Manager")).toBeVisible();
    await expect(page.getByText("€99,00")).toBeVisible();
  };

  test("an iPad that wakes up picks up the manager's edits without a reload", async ({ page }) => {
    const backend = backendWithDbOnlyProduct();
    await installTimeSkew(page);
    const { t } = await boot(page, { backend });
    await expect(attractCta(page, t)).toBeVisible();
    await expect.poll(() => backend.calls("/rest/v1/custom_products").length).toBe(1);
    backend.rows("custom_products")[0] = RENAMED;
    await skewTime(page, 11 * 60_000);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect.poll(() => backend.calls("/rest/v1/custom_products").length, { timeout: T(10_000) }).toBe(2);
    await expectRenamedProductOnResult(page, t);
  });

  test("the next customer after a restart sees the manager's edits", async ({ page }) => {
    const backend = backendWithDbOnlyProduct();
    await installTimeSkew(page);
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    backend.rows("custom_products")[0] = RENAMED;
    await skewTime(page, 2 * 60_000);
    await restartButton(page, t).click();
    await expect(attractCta(page, t)).toBeVisible();
    await expect.poll(() => backend.calls("/rest/v1/custom_products").length, { timeout: T(10_000) }).toBe(2);
    await expectRenamedProductOnResult(page, t);
  });

  test("data that arrives in the middle of a visit waits for the next customer", async ({ page }) => {
    const backend = backendWithDbOnlyProduct();
    await installTimeSkew(page);
    const { t } = await boot(page, { backend });
    await expect(attractCta(page, t)).toBeVisible();
    await expect.poll(() => backend.calls("/rest/v1/quiz_cards").length).toBe(1);
    // the manager rewrites the first question and renames the product…
    backend.rows("quiz_cards")[0].text_en = "A brand new first question?";
    backend.rows("custom_products")[0] = RENAMED;
    // …and the refresh that picks it up answers slowly
    backend.fail("/rest/v1/quiz_cards", { kind: "delay", ms: 9_000 });
    await skewTime(page, 11 * 60_000);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    // a customer starts while that refresh is still in flight
    await tapToStart(page, t);
    await fillWelcome(page, t);
    await startGame(page, t);
    await expect(page.getByText(questions[0].text)).toBeVisible();
    await expect.poll(() => backend.calls("/rest/v1/quiz_cards").length, { timeout: T(10_000) }).toBe(2);
    await page.waitForTimeout(7_000); // the refreshed data has arrived by now — mid-quiz
    await expect(page.getByText(questions[0].text)).toBeVisible(); // the card under the customer did not change
    await expect(page.getByText("A brand new first question?")).toHaveCount(0);
    await answerAll(page, t);
    await expect(claimButton(page, t)).toBeVisible({ timeout: T(20_000) });
    await expect(page.getByText("Only In DB")).toBeVisible(); // this visit was matched against the data it started with
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    // …and the next customer gets the new questions and the new catalogue
    await restartButton(page, t).click();
    await tapToStart(page, t);
    await fillWelcome(page, t, { first: "Ana", last: "Souza", email: "ana.souza@example.com" });
    await startGame(page, t);
    await expect(page.getByText("A brand new first question?")).toBeVisible();
    await answerAll(page, t);
    await expect(page.getByText("Renamed By Manager")).toBeVisible({ timeout: T(20_000) });
  });

  test("an idle kiosk re-reads its data on a timer (the cache is rewritten)", async ({ page }) => {
    const backend = backendWithDbOnlyProduct();
    await page.clock.install(); // controls the 5-minute idle timer; only the data layer is asserted afterwards
    const { t } = await boot(page, { backend });
    await expect(attractCta(page, t)).toBeVisible();
    await expect.poll(() => backend.calls("/rest/v1/custom_products").length).toBe(1);
    backend.rows("custom_products")[0] = RENAMED;
    await page.clock.fastForward(6 * 60_000);
    await expect.poll(() => backend.calls("/rest/v1/custom_products").length, { timeout: T(10_000) }).toBeGreaterThan(1);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("wm_cache_startup_milano") ?? ""), { timeout: T(10_000) })
      .toContain("Renamed By Manager");
  });

  test("when every startup request hangs the welcome form still appears and the quiz still runs", async ({ page }) => {
    const backend = new MockBackend();
    for (const table of ["product_settings", "custom_products", "product_global_status", "quiz_cards"]) {
      backend.fail(`/rest/v1/${table}`, { kind: "hang" });
    }
    const { t, errors } = await boot(page, { backend });
    await tapToStart(page, t);
    await fillWelcome(page, t);
    await startButton(page, t).click();
    // either the quiz starts straight away or after the loading screen's 10 s fallback
    await expect(yesButton(page, t)).toBeVisible({ timeout: T(25_000) });
    expect(appErrors(errors)).toEqual([]);
  });
});

test.describe("claiming the match", () => {
  test("two transient server errors are retried transparently — one lead, one success screen", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/quiz_sessions", { kind: "status", status: 503 }, { method: "POST", times: 2 });
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });

  test("when the backend stays down the customer can try again and the lead is stored once", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/quiz_sessions", { kind: "status", status: 500 }, { method: "POST" });
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect.poll(() => backend.calls("/rest/v1/quiz_sessions", "POST").length, { timeout: T(10_000) }).toBe(3);
    await expect(restartButton(page, t)).toHaveCount(0);
    await expect(claimButton(page, t)).toBeEnabled({ timeout: T(10_000) });
    backend.clearFaults();
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });

  test("a lost response (saved on the server, never acknowledged) does not create a duplicate lead", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/quiz_sessions", { kind: "lost-response" }, { method: "POST", times: 1 });
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });

  test("a request that never answers does not freeze the result screen forever", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/quiz_sessions", { kind: "hang" }, { method: "POST", times: 1 });
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).click();
    // a timeout turns the hang into a failed attempt; the retry then succeeds
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(40_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });

  test("double-tapping the claim button sends one lead", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/quiz_sessions", { kind: "delay", ms: 600 }, { method: "POST" });
    const { t } = await boot(page, { backend });
    await playToResult(page, t);
    await claimButton(page, t).dblclick();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });

  test("going offline on the result screen shows the banner, and the claim works once the network is back", async ({ page, context }) => {
    const { backend, t } = await boot(page);
    await playToResult(page, t);
    await context.setOffline(true);
    await expect(page.getByText(t.welcome.offlineBanner)).toBeVisible();
    if (await claimButton(page, t).isEnabled()) await claimButton(page, t).click();
    await expect(restartButton(page, t)).toHaveCount(0);
    await context.setOffline(false);
    await expect(page.getByText(t.welcome.offlineBanner)).toBeHidden();
    await expect(claimButton(page, t)).toBeEnabled({ timeout: T(10_000) });
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    expect(backend.rows("quiz_sessions")).toHaveLength(1);
  });
});

test.describe("welcome form", () => {
  test("a hanging e-mail cooldown check does not trap the customer on the form", async ({ page }) => {
    const backend = new MockBackend();
    backend.fail("/rest/v1/rpc/check_email_cooldown", { kind: "hang" });
    const { t } = await boot(page, { backend });
    await tapToStart(page, t);
    await fillWelcome(page, t);
    await startButton(page, t).click();
    await expect(yesButton(page, t)).toBeVisible({ timeout: T(25_000) });
  });

  for (const fault of [{ kind: "status", status: 500 }, { kind: "abort" }, { kind: "malformed" }] as const) {
    test(`a failing cooldown check (${fault.kind}) lets the visitor in (the server rate-limits e-mails anyway)`, async ({ page }) => {
      const backend = new MockBackend();
      backend.fail("/rest/v1/rpc/check_email_cooldown", fault);
      const { t } = await boot(page, { backend });
      await tapToStart(page, t);
      await fillWelcome(page, t);
      await startGame(page, t);
    });
  }

  test("an address that is in cooldown is told so and stays on the form", async ({ page }) => {
    const backend = new MockBackend();
    backend.rpc.set("check_email_cooldown", () => [{ in_cooldown: true, hours_remaining: 0.4 }]);
    const { t } = await boot(page, { backend });
    await tapToStart(page, t);
    await fillWelcome(page, t);
    await startButton(page, t).click();
    await expect(page.getByText(t.welcome.cooldownError(1))).toBeVisible();
    await expect(yesButton(page, t)).toHaveCount(0);
    expect(backend.rows("quiz_funnel_events")).toHaveLength(0);
  });

  test("consent is required: without the tick the quiz does not start and nothing is recorded", async ({ page }) => {
    const { backend, t } = await boot(page);
    await tapToStart(page, t);
    await fillWelcome(page, t, { ...VISITOR, consent: false });
    await startButton(page, t).click();
    await expect(page.getByText(t.welcome.consentRequired)).toBeVisible();
    await expect(yesButton(page, t)).toHaveCount(0);
    expect(backend.calls("quiz_funnel_events")).toHaveLength(0);
    await consentBox(page).check({ force: true });
    await startGame(page, t);
  });

  test("empty and malformed fields are rejected with a message each", async ({ page }) => {
    const { t } = await boot(page);
    await tapToStart(page, t);
    await startButton(page, t).click();
    await expect(page.getByText(t.welcome.firstNameError)).toBeVisible();
    await expect(page.getByText(t.welcome.lastNameError)).toBeVisible();
    await emailInput(page, t).fill("not-an-email");
    await emailInput(page, t).blur();
    await expect(page.getByText(t.welcome.emailError)).toBeVisible();
  });

  // What a real keyboard produces: iPadOS "smart punctuation" turns ' into ’, names carry accents,
  // hyphens and (in other scripts) combining marks; the stored name must keep them.
  const NAMES: Array<[string, string, string]> = [
    ["O'Connor", "O'Connor", "straight apostrophe"],
    ["D’Angelo", "D'Angelo", "typographic apostrophe from the iPad keyboard"],
    ["Marie-Claire", "Marie-Claire", "hyphen"],
    ["Zoë José", "Zoë José", "accents"],
    ["Nguyễn", "Nguyễn", "stacked diacritics"],
    ["Café", "Café", "decomposed (NFD) accent"],
    ["Ana  Maria", "Ana Maria", "double space collapses"],
  ];
  for (const [typed, stored, why] of NAMES) {
    test(`name ${JSON.stringify(typed)} is kept (${why})`, async ({ page }) => {
      const { backend, t } = await boot(page);
      await tapToStart(page, t);
      await fillWelcome(page, t, { first: typed, last: "Rossi", email: VISITOR.email });
      await startGame(page, t);
      await answerAll(page, t);
      await expect(claimButton(page, t)).toBeVisible({ timeout: T(20_000) });
      await claimButton(page, t).click();
      await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
      expect(backend.rows("quiz_sessions")[0].nome.normalize("NFC")).toBe(stored.normalize("NFC"));
    });
  }

  test("hostile input never reaches the database as markup, and absurd lengths are capped", async ({ page }) => {
    const { backend, t } = await boot(page);
    await tapToStart(page, t);
    await fillWelcome(page, t, { first: "<script>alert(1)</script>Eve", last: "x".repeat(400), email: VISITOR.email });
    await startGame(page, t);
    await answerAll(page, t);
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
    const row = backend.rows("quiz_sessions")[0];
    expect(row.nome).not.toMatch(/[<>()]/);
    expect(row.cognome.length).toBeLessThanOrEqual(100);
  });

  test("an e-mail address longer than any real one is refused with a message", async ({ page }) => {
    const { backend, t } = await boot(page);
    await tapToStart(page, t);
    await fillWelcome(page, t, { first: "Ana", last: "Souza", email: `${"a".repeat(300)}@example.com` });
    await startButton(page, t).click();
    await expect(page.getByText(t.welcome.emailError)).toBeVisible();
    await page.waitForTimeout(1_000); // had it been accepted, the quiz would be up by now
    await expect(yesButton(page, t)).toHaveCount(0);
    expect(backend.calls("rpc/check_email_cooldown")).toHaveLength(0);
    expect(backend.rows("quiz_funnel_events")).toHaveLength(0);
  });
});

test.describe("device configuration", () => {
  for (const [label, storeId] of [["no store configured", null], ["a stale store id that no longer exists", "store-that-was-deleted"]] as const) {
    test(`${label}: the kiosk says so and refuses to start, instead of letting the customer finish a quiz that cannot be saved`, async ({ page }) => {
      const { backend, t } = await boot(page, { storeId });
      await tapToStart(page, t);
      await expect(page.getByText(t.welcome.noStore)).toBeVisible(); // the badge
      await fillWelcome(page, t);
      await startButton(page, t).click();
      await expect(page.getByText(t.welcome.noStoreHint)).toBeVisible();
      await page.waitForTimeout(1_000);
      await expect(yesButton(page, t)).toHaveCount(0);
      expect(backend.rows("quiz_sessions")).toHaveLength(0);
      expect(backend.calls("rpc/check_email_cooldown")).toHaveLength(0);
    });
  }

  const BAD_CACHES: Array<[string, string]> = [
    ["not JSON at all", "{not json"],
    ["JSON of the wrong shape", JSON.stringify({ ts: Date.now(), data: { customData: "nope" } })],
    ["JSON null", "null"],
    ["an entry without data", JSON.stringify({ ts: Date.now() })],
  ];
  for (const [label, cache] of BAD_CACHES) {
    test(`a corrupt startup cache (${label}) does not crash the kiosk or the quiz`, async ({ page }) => {
      const { backend, errors, t } = await boot(page, {
        storage: { wm_cache_startup_milano: cache, wm_cache_version: "2", wb_lang: "klingon" },
      });
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page.getByTestId("error-boundary")).toHaveCount(0);
      await expect(attractCta(page, t)).toBeVisible();
      await playToResult(page, t);
      await claimButton(page, t).click();
      await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
      expect(backend.rows("quiz_sessions")).toHaveLength(1);
      expect(appErrors(errors)).toEqual([]);
    });
  }
});

test.describe("restarts", () => {
  for (const stage of ["welcome", "quiz", "result"] as const) {
    test(`reloading the page on the ${stage} screen returns to a working attract screen`, async ({ page }) => {
      const { t } = await boot(page);
      if (stage === "welcome") await tapToStart(page, t);
      if (stage === "quiz") { await tapToStart(page, t); await fillWelcome(page, t); await startGame(page, t); await noButton(page, t).click(); }
      if (stage === "result") await playToResult(page, t);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(attractCta(page, t)).toBeVisible();
      await expect(firstNameInput(page, t)).toHaveCount(0);
    });
  }
});
