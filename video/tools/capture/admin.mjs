// Captures the two staff screens of the film's "Store value" scene from the REAL app: /manager ("Sessions & Codes") and /stats
// (funnel, ranking, sessions). The browser carries an injected, already MFA-verified (aal2) session, and every Supabase call is
// answered with SAMPLE data: fictional people on example.com, two fictional stores ("Store A", "Store B"), round demo numbers.
// Nothing here comes from production; the film labels these screens "Sample data".
//
//   node admin.mjs            writes ../../public/app/still/{stats-top,stats-funnel,stats-store,manager-sessions}.webp + admin-layout.json
//   node admin.mjs --probe    prints what is on the pages (selectors, text) so the capture can be adjusted
import path from "node:path";
import * as L from "./lib.mjs";

const PROBE = process.argv.includes("--probe");
const HOST = "mock.supabase.co";

// ── sample data ─────────────────────────────────────────────────────────────────────────────────────
const PEOPLE = [
  ["Marco", "Rossi"], ["Ana", "Souza"], ["Liam", "Byrne"], ["Chiara", "Conti"], ["João", "Almeida"], ["Sofia", "Marques"],
  ["Niamh", "Doyle"], ["Luca", "Bianchi"], ["Beatriz", "Lima"], ["Conor", "Walsh"], ["Giulia", "Romano"], ["Pedro", "Costa"],
  ["Aoife", "Murphy"], ["Matteo", "Ferrari"], ["Inês", "Pereira"], ["Sean", "Gallagher"], ["Elena", "Greco"], ["Tiago", "Ribeiro"],
];
const rand = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))(20261008);
const SLUG = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("").toUpperCase();
const NOW = Date.now();
const PRODUCTS = L.CATALOG.map((p) => p.id);
// a plausible mix: a few products win most of the time
const WEIGHTS = [0.2, 0.15, 0.13, 0.11, 0.1, 0.09, 0.08, 0.06, 0.05, 0.03];
const pick = () => {
  let r = rand(), acc = 0;
  for (let i = 0; i < PRODUCTS.length; i++) { acc += WEIGHTS[i] ?? 0.03; if (r < acc) return PRODUCTS[i]; }
  return PRODUCTS[0];
};
const SESSIONS = Array.from({ length: 118 }, (_, i) => {
  const [nome, cognome] = PEOPLE[i === 0 ? 0 : 1 + ((i - 1) % (PEOPLE.length - 1))]; // "Marco Rossi" only once, at the top
  const ageH = i * 1.36 + rand() * 1.1; // newest first, spread over ~7 days
  const created = new Date(NOW - ageH * 3600_000);
  const old = ageH > 30;
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    email: `${SLUG(nome)}.${SLUG(cognome)}${i >= PEOPLE.length ? i : ""}@example.com`,
    nome, cognome,
    matched_product_id: pick(),
    match_percent: Math.min(98, 58 + Math.floor(rand() * 41)),
    email_sent: true,
    discount_code: `SUP-${hex(8)}10`,
    created_at: created.toISOString(),
    store_id: rand() < 0.56 ? "store-a" : "store-b",
    code_redeemed: old ? rand() < 0.42 : rand() < 0.08,
    code_redeemed_at: null,
  };
});
// the newest lead is the one the film has just watched being created: same person, product, match and code as the kiosk run and the e-mail
Object.assign(SESSIONS[0], {
  nome: "Marco", cognome: "Rossi", email: "marco.rossi@example.com",
  matched_product_id: L.HERO.id, match_percent: L.HERO.percent, discount_code: "SUP-7F3A9C2E10",
  store_id: "store-a", created_at: new Date(NOW - 4 * 60_000).toISOString(), code_redeemed: false,
});
const FUNNEL = { quiz_started: 241, result_shown: 176, claimed: SESSIONS.length };

// ── the Supabase stand-in for the admin pages ─────────────────────────────────────────────────────────
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
const jwt = (payload) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2FtcGxl`;
};
function adminSession() {
  const exp = Math.floor(NOW / 1000) + 24 * 3600;
  const iat = Math.floor(NOW / 1000) - 60;
  const user = {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "manager@example.com",
    app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date(NOW - 90 * 86400_000).toISOString(),
    factors: [{ id: "22222222-2222-4222-8222-222222222222", friendly_name: "Authenticator", factor_type: "totp", status: "verified", created_at: new Date(NOW - 80 * 86400_000).toISOString(), updated_at: new Date(NOW - 80 * 86400_000).toISOString() }],
  };
  const access_token = jwt({ aud: "authenticated", exp, iat, sub: user.id, email: user.email, role: "authenticated", aal: "aal2", amr: [{ method: "password", timestamp: iat }, { method: "totp", timestamp: iat }], session_id: "33333333-3333-4333-8333-333333333333" });
  return { access_token, token_type: "bearer", expires_in: 24 * 3600, expires_at: exp, refresh_token: "sample-refresh-token", user };
}

const respond = (route, body, extra = {}) => route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json", ...extra }, body: JSON.stringify(body) });

async function admin(route) {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

  if (p.endsWith("/rest/v1/rpc/get_my_store_role")) return respond(route, [{ role: "manager", store_id: null }]);

  if (p.endsWith("/rest/v1/quiz_funnel_events")) {
    const m = (url.searchParams.get("event_type") || "").match(/^eq\.(.+)$/);
    const n = m ? FUNNEL[m[1]] ?? 0 : 0;
    return route.fulfill({ status: 200, headers: { ...CORS, "content-range": `*/${n}` }, body: req.method() === "HEAD" ? "" : "[]" });
  }

  if (p.endsWith("/rest/v1/quiz_sessions") && req.method() !== "POST") {
    let rows = SESSIONS.slice();
    const eq = (k) => (url.searchParams.get(k) || "").match(/^eq\.(.+)$/)?.[1];
    if (eq("store_id")) rows = rows.filter((r) => r.store_id === eq("store_id"));
    if (eq("matched_product_id")) rows = rows.filter((r) => r.matched_product_id === eq("matched_product_id"));
    const total = rows.length;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 1000);
    const page = rows.slice(offset, offset + limit);
    const prefer = req.headers()["prefer"] || "";
    const extra = /count=exact/.test(prefer) ? { "content-range": `${page.length ? offset : "*"}${page.length ? `-${offset + page.length - 1}` : ""}/${total}` } : {};
    return respond(route, req.method() === "HEAD" ? [] : page, extra);
  }
  return route.fallback();
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────────────
await L.assertAppIsUp();
const browser = await L.launch();
const out = L.ensureDir(path.join(L.OUT_DIR, "still"));
const layout = {};
try {
  const { ctx, page } = await L.makeSession(browser);
  await ctx.addInitScript((session) => {
    try { sessionStorage.setItem("sb-mock-auth-token", JSON.stringify(session)); } catch (e) { /* ignore */ }
  }, adminSession());
  await ctx.route(`https://${HOST}/**`, admin); // registered last = consulted first; anything it does not know falls back to lib.mjs

  if (PROBE) {
    page.on("console", (m) => console.log("[console]", m.type(), m.text().slice(0, 200)));
    page.on("requestfailed", (r) => console.log("[requestfailed]", r.url().slice(0, 120)));
  }
  const waitText = async (re, what) => {
    try {
      await page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText) && !/Loading…/.test(document.body.innerText), re, { timeout: 20000 });
    } catch (e) {
      console.log(`--- timed out waiting for ${what} at ${page.url()} ---\n` + (await page.evaluate(() => document.body.innerText)).slice(0, 1500));
      throw e;
    }
  };

  const shot = async (name, opts = {}) => {
    await L.fontsReady(page);
    await L.hideCaret(page);
    await L.sleep(opts.settle ?? 900);
    const buf = await page.screenshot({ type: "png" });
    await L.writeWebp(buf, path.join(out, `${name}.webp`), { quality: 90 });
    L.log("still ", name);
  };

  // ── /stats ──
  await page.goto(`${L.APP_URL}/stats`, { waitUntil: "load" });
  await waitText("sessions", "the stats dashboard");
  await L.sleep(1800); // chart entrance animations
  if (PROBE) {
    console.log("--- /stats text ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 2500));
  }
  await shot("stats-top", { settle: 1200 });
  // the drop-off funnel (started -> result shown -> claimed), scrolled to the top of the view
  await page.getByText("Drop-off funnel").first().scrollIntoViewIfNeeded();
  await page.evaluate(() => { const h = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /Drop-off funnel/.test(e.textContent || "")); if (h) window.scrollTo(0, window.scrollY + h.getBoundingClientRect().top - 140); });
  await L.sleep(1600);
  await shot("stats-funnel", { settle: 800 });

  // the same dashboard filtered to one store (the "store by store" view)
  await page.goto(`${L.APP_URL}/stats?store=store-a`, { waitUntil: "load" });
  await waitText("sessions", "the filtered dashboard");
  await L.sleep(1800);
  await shot("stats-store", { settle: 1000 });

  // ── /manager → Sessions & Codes ──
  await page.goto(`${L.APP_URL}/manager`, { waitUntil: "load" });
  await waitText("[\\s\\S]{200}", "the manager dashboard");
  await L.sleep(1500);
  if (PROBE) {
    console.log("--- /manager text ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 2500));
    console.log("--- buttons ---\n" + (await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim().replace(/\s+/g, " ")).filter(Boolean).join(" | "))));
  }
  const tab = page.getByRole("button", { name: /sessions/i }).first();
  await tab.click({ timeout: 8000 });
  await page.waitForFunction(() => /@example\.com/.test(document.body.innerText), null, { timeout: 20000 });
  await L.sleep(1600);
  await shot("manager-sessions", { settle: 900 });
  layout.managerRows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("*")].filter((e) => e.children.length > 3 && /@example\.com/.test(e.innerText || "") && e.getBoundingClientRect().height > 50 && e.getBoundingClientRect().height < 160);
    const seen = [];
    for (const e of rows) {
      const r = e.getBoundingClientRect();
      if (seen.some((s) => Math.abs(s.y - r.y) < 6 && Math.abs(s.h - r.height) < 6)) continue;
      seen.push({ x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return seen.slice(0, 12);
  });
  L.writeJson(path.join(L.OUT_DIR, "admin-layout.json"), { viewport: L.VIEWPORT, dpr: L.DPR, ...layout, note: "DOM rects in CSS px of the 1024 x 1366 viewport; the stills are 2x" });
  L.log("admin captured ✓");
} finally {
  await browser.close();
}
