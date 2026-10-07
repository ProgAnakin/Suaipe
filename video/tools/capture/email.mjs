// Renders the REAL match e-mail: buildEmail() is lifted out of the Edge Function source
// (supabase/functions/on-session-created/index.ts) and run on sample data, then screenshotted full-page the way an
// e-mail client shows it (phone width, DPR 3). Five hard-coded Italian phrases in that template are swapped for
// English at render time only — the repo is untouched. Nothing is read from or written to the network or /tmp:
// the page, the packshot and the fonts are all served from memory / node_modules through request interception.
//
// Output: <OUT_DIR>/still/email-full.webp, and an `email` entry (pixel size, anchors) merged into <OUT_DIR>/layout.json.
import fs from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";
import * as L from "./lib.mjs";
import * as LAY from "./layout.mjs";

const DPR_EMAIL = 3;
const HOST = "email.local";

// ── build the HTML from the real template ──────────────────────────────────────────────────────────
let src = fs.readFileSync(path.join(L.REPO_ROOT, "supabase/functions/on-session-created/index.ts"), "utf8");
src = src.replace(/^import .*$/gm, "");
const cut = src.indexOf("\nserve(async (req) => {");
if (cut < 0) throw new Error("serve() block not found in the edge function — email.mjs needs updating");
src = src.slice(0, cut);

const swaps = [
  ["Ciao <span", "Hi <span"],
  ["${i18n.compatibility} verificata su 8 categorie", "${i18n.compatibility} verified across 8 categories"],
  ["Inviato a <strong", "Sent to <strong"],
  ["<title>Il tuo match Suaipe</title>", "<title>Your Suaipe match</title>"],
  ['return "MATCH PERFETTO";', 'return "PERFECT MATCH";'],
];
for (const [a, b] of swaps) {
  if (!src.includes(a)) throw new Error("swap target missing in the edge function: " + a);
  src = src.replace(a, b);
}
src += "\nmodule.exports = { buildEmail, escHtml };";

const js = transformSync(src, { loader: "ts", format: "cjs" }).code;
const mod = { exports: {} };
const { warn, error } = console; // the template logs a "WEBHOOK_SECRET is NOT set" notice at load time
console.warn = console.error = () => {};
try { new Function("module", "exports", "Deno", js)(mod, mod.exports, { env: { get: () => undefined } }); }
finally { console.warn = warn; console.error = error; }
const { buildEmail, escHtml } = mod.exports;

const faq = [
  ["Does it heat the water by itself?", "Yes, the internal heater brings the water up to temperature in under 3 minutes: you only need water and coffee."],
  ["How many cups per charge?", "The 7,800mAh battery makes several espressos in a row before needing a USB-C recharge."],
  ["What coffee can I use?", "Nespresso-compatible capsules or ground coffee with the included filter: total freedom wherever you are."],
].map(([q, a]) => ({ q: escHtml(q), a: escHtml(a) }));

const html = buildEmail(
  {
    language: "en", nome: "Marco", cognome: "Rossi", match_percent: 98,
    product_name: "Brevia GoPress – Portable Espresso Maker", product_price: "€119,00",
    product_image: "https://suaipe.vercel.app/products/brevia-gopress.png", product_video: "",
    email: "marco.rossi@example.com",
  },
  "SUP-7F3A9C2E10",
  faq,
  {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, your match is {{pct}}%",
    header_title: "We found your match!",
    header_subtitle: 'Our algorithm analysed your answers and picked the <strong style="color:#f0f4ff;">perfect gadget for your lifestyle</strong>.',
    footer_store_name: "Suaipe Milano",
  },
).replace("https://suaipe.vercel.app/products/brevia-gopress.png", `https://${HOST}/product.png`);

const packshot = L.USE_CLEAN_BREVIA ? L.CLEAN_BREVIA : path.join(L.REPO_ROOT, "public/products/brevia-gopress.png");

// ── fonts (served through the interceptor) ──────────────────────────────────────────────────────────
const face = (w) => `@font-face{font-family:'Space Grotesk';font-weight:${w};font-display:block;src:url("https://${HOST}/font/sg/${w}.woff2") format('woff2');}`;
const emojiCss = fs.readFileSync(path.join(L.FONTS_EMOJI, "index.css"), "utf8")
  .replace(/font-family: 'Noto Color Emoji'/g, "font-family: 'Space Grotesk'")
  .replace(/font-weight: 400;/g, "font-weight: 100 900;")
  .replace(/url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g,
    `url("https://${HOST}/font/emoji/$1") format('woff2')`);

// ── render ───────────────────────────────────────────────────────────────────────────────────────────
const browser = await L.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR_EMAIL, locale: "en-US" });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    if (u.pathname === "/email.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    if (u.pathname === "/product.png") return route.fulfill({ contentType: "image/png", path: packshot });
    const m = u.pathname.match(/^\/font\/(sg|emoji)\/(.+)$/);
    if (!m) return route.abort();
    const file = m[1] === "sg"
      ? path.join(L.FONTS_SG, "files", `space-grotesk-latin-${m[2].replace(".woff2", "")}-normal.woff2`)
      : path.join(L.FONTS_EMOJI, "files", m[2]);
    // Space Grotesk stops at 700, so the template's weight-800/900 faces fail to load and those few headline words fall
    // back to Arial — exactly what the first render of this e-mail (the one the film was designed around) looked like.
    if (!fs.existsSync(file)) return route.abort();
    return route.fulfill({ contentType: "font/woff2", body: fs.readFileSync(file) });
  });
  await page.goto(`https://${HOST}/email.html`, { waitUntil: "load" });
  await page.addStyleTag({ content: [400, 500, 600, 700, 800, 900].map(face).join("\n") + "\n" + emojiCss });
  await L.fontsReady(page);
  await page.waitForTimeout(500);
  const natural = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.setViewportSize({ width: natural, height: 900 });
  await page.waitForTimeout(400);
  const cssHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const size = { width: natural, height: cssHeight };

  const anchors = await LAY.measure(page, {
    title: { css: "h1", desc: "'Hi Marco, We found your match!' headline" },
    productImage: { css: "img", desc: "product image (552 x 230 slot)" },
    discountHeading: { css: "p", text: "^your exclusive discount code$", desc: "'YOUR EXCLUSIVE DISCOUNT CODE'" },
    ticketCode: { css: "p", text: "^SUP-7F3A9C2E10$", flags: "", desc: "the discount code SUP-7F3A9C2E10" },
    redeemHeading: { css: "p", text: "^how to redeem your discount$", desc: "'HOW TO REDEEM YOUR DISCOUNT'" },
  }, size);
  const ticketRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) => /SUP-7F3A9C2E10/.test(p.textContent));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });

  const buf = await page.screenshot({ fullPage: true, type: "png" });
  const outFile = path.join(L.OUT_DIR, "still", "email-full.webp");
  const r = await L.writeWebp(buf, outFile, { quality: 90 });
  console.log(`email-full: ${r.width}x${r.height} px  (${natural}x${cssHeight} CSS px @${DPR_EMAIL}x)  ${(r.bytes / 1024).toFixed(0)} KB  packshot=${path.basename(packshot)}`);

  // merge into layout.json (capture.mjs preserves this key, so the two scripts can run in either order)
  const layoutFile = path.join(L.OUT_DIR, "layout.json");
  const doc = fs.existsSync(layoutFile) ? JSON.parse(fs.readFileSync(layoutFile, "utf8")) : {};
  doc.email = {
    file: "still/email-full.webp",
    cssSize: size, deviceScaleFactor: DPR_EMAIL, imagePx: { width: r.width, height: r.height },
    ticket: ticketRect,
    anchors,
    source: "buildEmail() from supabase/functions/on-session-created/index.ts; 5 Italian phrases swapped for English; sample data Marco Rossi / SUP-7F3A9C2E10 / 98 %",
    packshot: path.basename(packshot),
    note: "anchors are CSS px inside the e-mail page (norm = divided by cssSize); multiply by deviceScaleFactor for image px",
  };
  L.writeJson(layoutFile, doc);
} finally {
  await browser.close();
}
