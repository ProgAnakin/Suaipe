// Shared harness: runs the REAL Suaipe kiosk (the repo's Vite dev server) in headless Chromium with the
// Supabase network layer mocked, so every screen is rendered by the app's own code. Nothing under
// <repo>/src is ever touched: anything that must be hidden or frozen is done with CSS / DOM calls
// injected at capture time only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { transformSync } from "esbuild";
import sharp from "sharp";

const require = createRequire(import.meta.url);

// ── paths & configuration (every one of them can be overridden with an env var) ───────────────────
export const HERE = path.dirname(fileURLToPath(import.meta.url)); //   <repo>/video/tools/capture
export const VIDEO_ROOT = path.resolve(HERE, "../.."); //              <repo>/video
export const REPO_ROOT = path.resolve(VIDEO_ROOT, ".."); //            <repo>   (the kiosk app)

export const APP_URL = (process.env.APP_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
export const OUT_DIR = path.resolve(process.env.OUT_DIR || path.join(HERE, "../../public/app"));
export const PRODUCTS_OUT = path.resolve(process.env.PRODUCTS_OUT || path.join(HERE, "../../public/products"));
export const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
export const SEED = Number(process.env.SEED ?? 20260607);

/** Repaired Brevia GoPress packshot (the repo PNG has a baked-in checkerboard in the glass rim). */
export const CLEAN_BREVIA = path.join(HERE, "assets", "brevia-gopress.clean.png");
/** Serve the repaired packshot to the kiosk (default on). CLEAN_BREVIA_IN_APP=0 shows the repo asset as-is. */
export const USE_CLEAN_BREVIA = process.env.CLEAN_BREVIA_IN_APP !== "0" && fs.existsSync(CLEAN_BREVIA);

export const VIEWPORT = { width: 1024, height: 1366 }; // iPad Pro 12.9" portrait, CSS px
export const DPR = 2;

const MOCK_HOST = "mock.supabase.co";
const APP_HOST = new URL(APP_URL).host;

export const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pad = (n, w = 3) => String(n).padStart(w, "0");
export const rel = (p) => path.relative(path.join(VIDEO_ROOT, "public"), p).split(path.sep).join("/");

// ── catalogue: the repo's bundled products, with the hero product's copy in English ───────────────
function loadProducts() {
  const src = fs.readFileSync(path.join(REPO_ROOT, "src/data/products.ts"), "utf8");
  const js = transformSync(src, { loader: "ts", format: "cjs" }).code;
  const m = { exports: {} };
  new Function("module", "exports", js)(m, m.exports);
  return m.exports.products;
}

const EN = {
  "brevia-gopress": {
    name: "Brevia GoPress – Portable Espresso Maker",
    description:
      "Portable espresso machine with 20 bar of pressure and built-in water heating in under 3 minutes. Works with capsules or ground coffee, with a 7,800mAh battery for more cups away from home.",
  },
};

/** English product names for the staff screens (the bundled catalogue is Italian). Same fictional, unbranded products. */
const EN_NAMES = {
  "brevia-gopress": "Brevia GoPress – Portable Espresso Maker",
  "lunaring-halo": "Lunaring Halo – Smart Ring",
  "vibewave-open": "Vibewave Open – Open-Ear Earbuds",
  "pulsar-recover-x": "Pulsar Recover X – Massage Gun",
  "voltik-snapcell": "Voltik SnapCell – Magnetic Power Bank",
  "aeris-glow": "Aeris Glow – High-Speed Hair Dryer",
  "echobox-riff": "Echobox Riff – Retro Bluetooth Speaker",
  "nimbus-sip": "Nimbus Sip – Smart Bottle",
  "lumio-air": "Lumio Air – Portable Mini Projector",
};
const RAW_PRODUCTS = loadProducts();

export const CATALOG = RAW_PRODUCTS.map((p) => ({
  id: p.id,
  name: EN_NAMES[p.id] || (EN[p.id] || p).name,
  description: (EN[p.id] || p).description,
  price: p.price,
  rating: p.rating,
  image_url: p.image,
  video_url: null,
  tags: p.tags,
  faq: p.faq,
  status: "active",
}));

/** The 8 quiz cards in sort_order, with the film's English copy. */
export const CARD_TEXT = [
  ["🏋️", "sport", "Is sport part of your daily routine?"],
  ["🎵", "audio", "Does music follow you everywhere you go?"],
  ["⚡", "productivity", "Do you love gadgets that simplify and speed up your day?"],
  ["🌿", "wellness", "Do you give yourself a moment of wellness and self-care every day?"],
  ["✈️", "travel", "Do you like having your devices with you even when traveling?"],
  ["💡", "tech", "Are you drawn to smart devices and the latest technology?"],
  ["✨", "style", "Does design matter to you, not just how things work?"],
  ["🌙", "recovery", "Are muscle recovery and quality sleep important to you?"],
];
export const CARDS = CARD_TEXT.map(([emoji, tag, en], i) => ({
  id: i + 1, emoji, image_url: null, tag, sort_order: i + 1, active: true,
  text_it: en, text_en: en, text_pt: null, text_es: null, text_fr: null,
}));

/**
 * The film's answers. Swipe LEFT = NO, RIGHT = YES. YES on productivity(3) + wellness(4) + travel(5) is the
 * only combination that fully matches one product (Brevia GoPress, 98 %).
 */
export const SWIPE_DIRS = [-1, -1, +1, +1, +1, -1, -1, -1];
export const HERO = { id: "brevia-gopress", percent: 98 };

// ── fonts: Space Grotesk + colour emoji, served from disk (the sandbox cannot reach Google) ───────
export const FONTS_SG = path.dirname(require.resolve("@fontsource/space-grotesk/package.json"));
export const FONTS_EMOJI = path.dirname(require.resolve("@fontsource/noto-color-emoji/package.json"));

function googleCss() {
  const sg = [400, 500, 600, 700]
    .map((w) => `@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:${w};font-display:block;` +
      `src:url(https://fonts.gstatic.com/local/sg/${w}.woff2) format('woff2');}`)
    .join("\n");
  // The emoji font is declared under the 'Space Grotesk' family so emoji glyphs fall back inside it.
  const emoji = fs.readFileSync(path.join(FONTS_EMOJI, "index.css"), "utf8")
    .replace(/font-family: 'Noto Color Emoji'/g, "font-family: 'Space Grotesk'")
    .replace(/font-weight: 400;/g, "font-weight: 100 900;")
    .replace(/url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g,
      "url(https://fonts.gstatic.com/local/emoji/$1) format('woff2')");
  return sg + "\n" + emoji;
}

// ── network mock ───────────────────────────────────────────────────────────────────────────────────
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
  "access-control-expose-headers": "*",
};
const json = (route, body, status = 200) =>
  route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });

async function handleSupabase(route, req, url) {
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  const p = url.pathname;
  if (p.endsWith("/custom_products")) return json(route, CATALOG);
  if (p.endsWith("/quiz_cards")) return json(route, CARDS);
  if (p.endsWith("/rpc/check_email_cooldown")) return json(route, [{ in_cooldown: false, hours_remaining: 0 }]);
  if (req.method() === "POST") return route.fulfill({ status: 201, headers: CORS, body: "" });
  return json(route, []);
}

export async function launch() {
  return chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-gpu", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });
}

/** A fresh kiosk session: store = "Store A" (neutral, see STORES_STUB), English UI, seeded Math.random, Supabase + fonts mocked. */
export async function makeSession(browser, { dpr = DPR, width = VIEWPORT.width, height = VIEWPORT.height } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr, locale: "en-US", timezoneId: "Europe/Rome",
  });
  await ctx.addInitScript((seed) => {
    try { localStorage.setItem("wb_store_id", "store-a"); } catch (e) { /* ignore */ }
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }); // device tier "high" => full confetti
    let s = seed >>> 0; // mulberry32: every random tie-break / slot-machine value is reproducible
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Freeze / thaw gate. A screenshot takes 0.3-1 s, during which the kiosk's animations keep moving, so the frame that
    // is encoded is not the one that was chosen. __capFreeze() stops every requestAnimationFrame-driven loop (framer-motion,
    // the count-up) and pauses all running CSS / Web Animations; __capThaw() resumes them and seeks the paused
    // animations forward by the time spent frozen, so the app's timeline is not disturbed. Callable from Node
    // (page.evaluate) and from inside waitForFunction predicates (zero latency).
    const realRaf = window.requestAnimationFrame.bind(window);
    const gate = { paused: false, queue: [], anims: [], t0: 0, timer: 0 };
    window.requestAnimationFrame = (cb) => realRaf((t) => { if (gate.paused) gate.queue.push(cb); else cb(t); });
    // interval ticks (the tutorial's 1.8 s NO/YES toggle, the attract's 2.5 s message) are dropped while frozen, so React
    // state cannot change under a screenshot
    const realSetInterval = window.setInterval.bind(window);
    window.setInterval = (fn, ms, ...args) => realSetInterval((...a) => { if (!gate.paused) fn(...a); }, ms, ...args);
    window.__capFreeze = () => {
      if (gate.paused) return true;
      gate.paused = true;
      gate.t0 = performance.now();
      gate.anims = [];
      for (const a of document.getAnimations()) {
        if (a.playState === "running") { try { a.pause(); gate.anims.push(a); } catch (e) { /* ignore */ } }
      }
      gate.timer = setTimeout(() => window.__capThaw(), 8000); // safety net: never leave the page frozen
      return true;
    };
    window.__capThaw = () => {
      if (!gate.paused) return true;
      clearTimeout(gate.timer);
      const dt = performance.now() - gate.t0;
      for (const a of gate.anims) {
        try {
          const rate = a.playbackRate || 1;
          const t = Number(a.currentTime) + dt * rate;
          // an animation that would have ended while frozen is finished, not play()ed: play() on a finished animation rewinds it to 0
          if (rate > 0 && a.effect && t >= a.effect.getComputedTiming().endTime) a.finish();
          else { a.currentTime = t; a.play(); }
        } catch (e) { /* ignore */ }
      }
      gate.anims = [];
      gate.paused = false;
      for (const cb of gate.queue.splice(0)) realRaf(cb);
      return true;
    };
  }, SEED);
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.host === APP_HOST) {
      // the film never shows real store or city names: the module that lists the stores is replaced, at capture time only
      if (url.pathname === "/src/data/stores.ts") return route.fulfill({ contentType: "text/javascript", body: STORES_STUB });
      if (url.pathname === "/src/data/products.ts") {
        // the staff screens read product names from the bundled (Italian) catalogue: serve it with the English names
        const res = await route.fetch();
        let body = await res.text();
        for (const p of RAW_PRODUCTS) if (EN_NAMES[p.id]) body = body.split(`name: ${JSON.stringify(p.name)}`).join(`name: ${JSON.stringify(EN_NAMES[p.id])}`);
        return route.fulfill({ response: res, body });
      }
      if (USE_CLEAN_BREVIA && url.pathname === "/products/brevia-gopress.png") {
        return route.fulfill({ path: CLEAN_BREVIA, contentType: "image/png" });
      }
      return route.continue();
    }
    if (url.host === MOCK_HOST) return handleSupabase(route, req, url);
    if (url.host === "fonts.googleapis.com") return route.fulfill({ contentType: "text/css", body: googleCss() });
    if (url.host === "fonts.gstatic.com") {
      const m = url.pathname.match(/^\/local\/(sg|emoji)\/(.+)$/);
      if (!m) return route.abort();
      const file = m[1] === "sg"
        ? path.join(FONTS_SG, "files", `space-grotesk-latin-${m[2].replace(".woff2", "")}-normal.woff2`)
        : path.join(FONTS_EMOJI, "files", m[2]);
      return route.fulfill({ headers: { ...CORS, "content-type": "font/woff2" }, body: fs.readFileSync(file) });
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  return { ctx, page };
}

/**
 * Stand-in for src/data/stores.ts served to the capture browser: two neutral, fictional stores. The film must not show the
 * employer's store or city names or their number, but the app needs a configured store to run (and the admin pages list them).
 */
const STORES_STUB = `
export const STORES = [
  { id: "store-a", name: "Suaipe Store A", shortName: "Store A" },
  { id: "store-b", name: "Suaipe Store B", shortName: "Store B" },
];
export const STORE_LS_KEY = "wb_store_id";
export function getStoredStoreId() { try { return localStorage.getItem(STORE_LS_KEY); } catch { return null; } }
export function setStoredStoreId(id) { try { localStorage.setItem(STORE_LS_KEY, id); } catch {} }
export function getStoreById(id) { return STORES.find((s) => s.id === id); }
`;

export async function assertAppIsUp() {
  try {
    const res = await fetch(APP_URL, { method: "HEAD" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(
      `The kiosk is not reachable at ${APP_URL} (${e.message}).\n` +
      `Start it from the repo root first, e.g.\n` +
      `  VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=mock npx vite --port 8080 --host 127.0.0.1`,
    );
  }
}

// Every emoji / flag the kiosk draws. The emoji font is split into unicode-range slices that load lazily, so
// they are requested up-front: a screenshot must never catch a glyph that is still falling back.
const EMOJI_USED = "🎯🎁💡✨🏋️🎵⚡🌿✈️🌙🎉🚀📍🔒🎥📖💰🎦❓🏷️🔄🤔⏳⚠✶✕✓🇮🇹🇬🇧🇧🇷🇪🇸🇫🇷";

/** Wait for the web fonts (Space Grotesk + emoji) so text metrics are final. */
export async function fontsReady(page) {
  await page.evaluate(async (emoji) => {
    await document.fonts.ready;
    await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px "Space Grotesk"`, "Aa0€%")));
    await Promise.all([...emoji.matchAll(/./gu)].map((m) => document.fonts.load('16px "Space Grotesk"', m[0])));
    await document.fonts.ready;
  }, EMOJI_USED);
}

// ── exact-moment captures ─────────────────────────────────────────────────────────────────────────
export const freezeAll = (page) => page.evaluate(() => window.__capFreeze());
export const thawAll = (page) => page.evaluate(() => window.__capThaw());

/** Hide the text caret once for the whole session (Playwright's per-shot `caret: "hide"` forces a full style recalc). */
export const hideCaret = (page) => page.addStyleTag({ content: "* { caret-color: transparent !important; }" });

// ── ambient-animation control ──────────────────────────────────────────────────────────────────────
// The kiosk backgrounds (stars, embers, orbs, icon silhouettes) are infinite CSS / Web-Animations loops.
// Captured ~1 s apart they would flicker like noise when played back at 30 fps, so for drag-scrub frames and
// the welcome typing crops they are paused and, for scrubs, stepped on a 30 fps clock instead.
export async function freezeAmbient(page) {
  return page.evaluate(() => {
    const list = [];
    for (const a of document.getAnimations()) {
      let t;
      try { t = a.effect && a.effect.getComputedTiming(); } catch (e) { continue; }
      if (t && t.iterations === Infinity) { a.pause(); list.push(a); }
    }
    window.__capAmbient = { list, base: list.map((a) => Number(a.currentTime) || 0) };
    return list.length;
  });
}
/** Move every frozen ambient loop to base + ms (a deterministic, continuous clock). */
export async function stepAmbient(page, ms) {
  await page.evaluate((ms) => {
    const s = window.__capAmbient;
    if (!s) return;
    s.list.forEach((a, i) => { a.currentTime = s.base[i] + ms; });
  }, ms);
}
export async function releaseAmbient(page) {
  await page.evaluate(() => {
    const s = window.__capAmbient;
    if (s) s.list.forEach((a) => { try { a.play(); } catch (e) { /* animation was cancelled */ } });
    window.__capAmbient = null;
  });
}

// ── image output ───────────────────────────────────────────────────────────────────────────────────
export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); return p; }

/** Write via a dot-temp file + rename, so a Remotion render that is reading public/ never sees a half-written asset. */
export function writeFileAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
export const writeJson = (file, obj) => writeFileAtomic(file, JSON.stringify(obj, null, 2) + "\n");

/**
 * Encode a screenshot buffer to WebP and write it. `width` resizes (never enlarges); `lossless` for crops.
 * Returns { file, width, height, bytes }.
 */
export async function writeWebp(buf, file, { quality = 90, width, lossless = false, effort = 6 } = {}) {
  let img = sharp(buf).removeAlpha();
  if (width) img = img.resize({ width, withoutEnlargement: true });
  const { data, info } = await img
    .webp(lossless ? { lossless: true, effort } : { quality, effort, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  writeFileAtomic(file, data);
  return { file, width: info.width, height: info.height, bytes: data.length };
}

/** Bounded queue so PNG buffers are encoded in the background without piling up in memory. */
export function makeEncoder(maxInFlight = 2) {
  const inflight = new Set();
  const results = [];
  return {
    async push(task) {
      while (inflight.size >= maxInFlight) await Promise.race(inflight);
      const p = task().then((r) => { results.push(r); }).finally(() => inflight.delete(p));
      inflight.add(p);
    },
    async drain() { await Promise.all(inflight); return results; },
    results,
  };
}

export { sharp };
