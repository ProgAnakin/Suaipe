import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MockBackend, seedTables, type Row } from "./support/mock-backend";
import { answerAll, attractCta, boot, claimButton, consentBox, fillWelcome, restartButton, startGame, tapToStart, yesButton } from "./support/kiosk";
import { signInAs } from "./support/staff";

// Takes the screenshots used by README.md, docs/ and the PWA manifest from the REAL app —
// `npm run docs:screenshots`. The build has neutral stores ("Store A" / "Store B", see
// playwright.config.ts) and the backend is the in-memory mock with FICTIONAL sample data
// (example.com addresses, invented gadget brands): nothing here comes from production.

const DOCS = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
const PUBLIC = fileURLToPath(new URL("../public/screenshots/", import.meta.url));

test.use({ serviceWorkers: "block" });
test.describe.configure({ timeout: 240_000, mode: "serial" });

// ── sample data ──────────────────────────────────────────────────────────────────────────────
const EN_PRODUCTS: Record<string, { name: string; description: string }> = {
  "aurae-pulse-pro": { name: "Aurae Pulse Pro – True Wireless Earbuds", description: "True wireless earbuds with adaptive active noise cancellation, 11 mm dynamic drivers and a transparency mode. Crisp audio for music and calls, up to 30 hours with the case and fast USB-C charging." },
  "lunaring-halo": { name: "Lunaring Halo – Smart Ring", description: "Titanium smart ring that tracks heart rate, SpO2, skin temperature and sleep stages around the clock. Calculates a daily recovery score, 10 ATM water resistance and up to 6 days of battery." },
  "brevia-gopress": { name: "Brevia GoPress – Portable Espresso Maker", description: "Portable espresso machine with 20 bar of pressure and built-in water heating in under 3 minutes. Works with capsules or ground coffee, with a 7,800 mAh battery for more cups away from home." },
  "vibewave-open": { name: "Vibewave Open – Open-Ear Earbuds", description: "Open-ear earbuds that leave your ears free, with 32 GB of internal memory and IPX8 certification. Stream music and podcasts while staying aware of your surroundings: ideal for running, cycling and swimming." },
  "pulsar-recover-x": { name: "Pulsar Recover X – Massage Gun", description: "Percussive massage gun with a silent brushless motor, 5 intensity levels and 4 interchangeable heads. Eases muscle tension, improves circulation and speeds up post-workout recovery." },
  "voltik-snapcell": { name: "Voltik SnapCell – Magnetic Power Bank", description: "Ultra-slim 5,000 mAh magnetic power bank with instant wireless charging and a 20 W USB-C PD port. Snaps onto your phone and charges while you use it, with an LED charge indicator." },
  "aeris-glow": { name: "Aeris Glow – High-Speed Hair Dryer", description: "High-speed hair dryer with a 110,000 RPM brushless motor and negative ions to reduce frizz. Smart heat control prevents damage; ultralight and quiet, with 3 magnetic attachments." },
  "echobox-riff": { name: "Echobox Riff – Retro Bluetooth Speaker", description: "Portable metal Bluetooth speaker with retro design, built-in FM radio and rich stereo sound. Shock-resistant, quick pairing and up to 10 hours of playback: music with character everywhere." },
  "nimbus-sip": { name: "Nimbus Sip – Smart Bottle", description: "Insulated stainless-steel smart bottle with a light hydration reminder and sip tracking via app. Keeps drinks cold for 24 hours or hot for 12, with a leak-proof cap and a touch sensor on the base." },
  "lumio-air": { name: "Lumio Air – Portable Mini Projector", description: "Full HD portable mini projector with autofocus, keystone correction and a smart system with built-in streaming apps. Internal battery and speakers, projects up to 120\" anywhere." },
};
const EN_CARDS = [
  "Is sport part of your daily routine?",
  "Does music follow you everywhere you go?",
  "Do you love gadgets that simplify and speed up your day?",
  "Do you give yourself a moment of wellness and self-care every day?",
  "Do you like having your devices with you even when traveling?",
  "Are you drawn to smart devices and the latest technology?",
  "Does design matter to you, not just how things work?",
  "Are muscle recovery and quality sleep important to you?",
];
/** YES on productivity, wellness and travel only: the one combination that matches a single product fully (Brevia GoPress, 98 %). */
const HERO_ANSWERS = [false, false, true, true, true, false, false, false];
const PEOPLE = [
  ["Marco", "Rossi"], ["Ana", "Souza"], ["Liam", "Byrne"], ["Chiara", "Conti"], ["João", "Almeida"], ["Sofia", "Marques"],
  ["Niamh", "Doyle"], ["Luca", "Bianchi"], ["Beatriz", "Lima"], ["Conor", "Walsh"], ["Giulia", "Romano"], ["Pedro", "Costa"],
  ["Aoife", "Murphy"], ["Matteo", "Ferrari"], ["Inês", "Pereira"], ["Sean", "Gallagher"], ["Elena", "Greco"], ["Tiago", "Ribeiro"],
];
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function demoTables(): Record<string, Row[]> {
  const t = seedTables();
  t.custom_products = t.custom_products.map((p) => ({ ...p, ...EN_PRODUCTS[p.id as string] }));
  t.quiz_cards = t.quiz_cards.map((c, i) => ({ ...c, text_en: EN_CARDS[i] }));
  return t;
}

function demoLeads(n: number): Row[] {
  let seed = 20261011;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const hex = (len: number) => Array.from({ length: len }, () => Math.floor(rand() * 16).toString(16)).join("").toUpperCase();
  const ids = Object.keys(EN_PRODUCTS);
  const weights = [0.2, 0.15, 0.13, 0.11, 0.1, 0.09, 0.08, 0.06, 0.05, 0.03];
  const pick = () => { const r = rand(); let acc = 0; for (let i = 0; i < ids.length; i++) { acc += weights[i]; if (r < acc) return ids[i]; } return ids[0]; };
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const [first, last] = PEOPLE[i % PEOPLE.length];
    const created = new Date(now - (i * 1.36 + rand() * 1.1) * 3_600_000 - 4 * 60_000);
    const old = now - created.getTime() > 30 * 3_600_000;
    const product = pick();
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      email: `${slug(first)}.${slug(last)}${i >= PEOPLE.length ? i : ""}@example.com`,
      nome: first, cognome: last,
      matched_product_id: product, product_name: EN_PRODUCTS[product].name,
      match_percent: Math.min(98, 58 + Math.floor(rand() * 41)),
      email_sent: true, discount_code: `SUP-${hex(8)}10`,
      created_at: created.toISOString(), store_id: rand() < 0.56 ? "store-a" : "store-b",
      code_redeemed: old ? rand() < 0.42 : rand() < 0.08, code_redeemed_at: null,
    };
  });
}

function demoGuides(): Row[] {
  const g = (id: string, d: string, i1: string, i2: string, advice: string) => ({
    product_id: id, product_name: EN_PRODUCTS[id].name, description_it: d, description_en: d,
    insight_1_it: i1, insight_1_en: i1, insight_2_it: i2, insight_2_en: i2, manager_advice_it: advice, manager_advice_en: advice,
    manager_advice_audio_url: null, video_url: "", updated_at: new Date().toISOString(), updated_by: null,
  });
  return [
    g("brevia-gopress", EN_PRODUCTS["brevia-gopress"].description,
      "Customers who travel or work from different places respond to \"a real espresso, anywhere\".",
      "It is the only gadget in the range you can demonstrate with a taste: offer to pull a shot at the counter.",
      "Start with the 3-minute heating: it answers the first objection before it is raised. Mention capsule and ground-coffee compatibility together."),
    g("aurae-pulse-pro", EN_PRODUCTS["aurae-pulse-pro"].description,
      "Noise cancellation is what people ask about first — let them try it with the store music playing.",
      "30 hours with the case settles the battery question for commuters.",
      "Hand over the earbuds before you talk about specs; let the customer's ears do the selling."),
  ];
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────
async function settle(page: Page, ms = 1_800) { await page.waitForTimeout(ms); }
/**
 * Writes docs/screenshots/<name>.<ext>. The kiosk screens are JPEG (large soft gradients: ~10x smaller than
 * PNG at the same look); the staff screens are PNG (small, and their text stays crisp).
 * `alsoPublic` also copies the file into public/screenshots (the PWA manifest's install-UI screenshots).
 */
async function shot(page: Page, name: string, { jpeg = false, clip, alsoPublic = false }: { jpeg?: boolean; clip?: { x: number; y: number; width: number; height: number }; alsoPublic?: boolean } = {}) {
  fs.mkdirSync(DOCS, { recursive: true });
  const file = `${name}.${jpeg ? "jpg" : "png"}`;
  await page.screenshot({ path: `${DOCS}${file}`, clip, ...(jpeg ? { type: "jpeg" as const, quality: 90 } : {}) });
  if (alsoPublic) { fs.mkdirSync(PUBLIC, { recursive: true }); fs.copyFileSync(`${DOCS}${file}`, `${PUBLIC}${file}`); }
}

/** The staff pages are one centred column; the README shows just that column. */
const COLUMN = { x: 263, y: 0, width: 840, height: 1024 };

test("kiosk: attract → welcome → quiz → result → success", async ({ page }) => {
  const backend = new MockBackend(demoTables());
  // a fixed random seed: the same tie-break, the same confetti, the same screenshot every time
  await page.context().addInitScript(() => {
    let s = 20261011 >>> 0;
    Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const { t } = await boot(page, { backend, storeId: "store-a", lang: "en" });

  await expect(attractCta(page, t)).toBeVisible();
  await settle(page, 2_600);
  await shot(page, "attract", { jpeg: true, alsoPublic: true });

  await tapToStart(page, t);
  await fillWelcome(page, t, { first: "Marco", last: "Rossi", email: "marco.rossi@example.com" });
  await expect(consentBox(page)).toBeChecked();
  await settle(page, 1_200);
  await shot(page, "welcome", { jpeg: true });

  await startGame(page, t);
  await answerAll(page, t, HERO_ANSWERS.slice(0, 4));
  // a card in the middle of a swipe to the right: the YES stamp is showing
  const card = page.locator("[aria-roledescription='quiz card']").first();
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 - 12, { steps: 12 });
  await settle(page, 300);
  await shot(page, "quiz", { jpeg: true, alsoPublic: true });
  await page.mouse.up();
  await settle(page, 700);
  await answerAll(page, t, HERO_ANSWERS.slice(4));

  await expect(claimButton(page, t)).toBeVisible({ timeout: 20_000 });
  await settle(page, 3_600);
  await shot(page, "result", { jpeg: true, alsoPublic: true });

  await claimButton(page, t).click();
  await expect(restartButton(page, t)).toBeVisible({ timeout: 15_000 });
  await settle(page, 2_800);
  await shot(page, "success", { jpeg: true });
  expect(backend.rows("quiz_sessions")).toHaveLength(1);
  void yesButton;
});

test("manager: sessions & codes", async ({ page }) => {
  const tables = demoTables();
  tables.quiz_sessions = demoLeads(118);
  const backend = new MockBackend(tables);
  await signInAs(page, backend, "manager");
  await boot(page, { backend, storeId: "store-a", lang: "en" });
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto("/manager", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Sessions & Codes/ }).click();
  await expect(page.getByRole("button", { name: /^All \(118\)/ })).toBeVisible({ timeout: 20_000 });
  await settle(page, 1_200);
  await shot(page, "manager", { clip: COLUMN });
  // the manifest's "wide" install screenshot is the whole desktop window
  fs.mkdirSync(PUBLIC, { recursive: true });
  await page.screenshot({ path: `${PUBLIC}manager.png` });
});

test("stats: the dashboard", async ({ page }) => {
  const tables = demoTables();
  tables.quiz_sessions = demoLeads(118);
  const ev = (store: string, type: string, n: number) => Array.from({ length: n }, () => ({ funnel_key: crypto.randomUUID(), event_type: type, store_id: store, created_at: new Date().toISOString() }));
  tables.quiz_funnel_events = [...ev("store-a", "quiz_started", 140), ...ev("store-a", "result_shown", 104), ...ev("store-a", "claimed", 66), ...ev("store-b", "quiz_started", 101), ...ev("store-b", "result_shown", 72), ...ev("store-b", "claimed", 52)];
  const backend = new MockBackend(tables);
  await signInAs(page, backend, "manager");
  await boot(page, { backend, storeId: "store-a", lang: "en" });
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto("/stats", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("TOTAL SESSIONS")).toBeVisible({ timeout: 20_000 });
  await settle(page, 1_800);
  await shot(page, "stats", { clip: COLUMN });
});

test("consultants: a product guide", async ({ page }) => {
  const tables = demoTables();
  tables.product_guides = demoGuides();
  const backend = new MockBackend(tables);
  await signInAs(page, backend, "consulente");
  await boot(page, { backend, storeId: "store-a", lang: "en" });
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto("/consulente", { waitUntil: "domcontentloaded" });
  await page.getByText("Brevia GoPress", { exact: false }).first().click({ timeout: 20_000 });
  await expect(page.getByText(/espresso, anywhere/)).toBeVisible({ timeout: 10_000 });
  await settle(page, 1_000);
  await shot(page, "consulente", { clip: COLUMN });
});
