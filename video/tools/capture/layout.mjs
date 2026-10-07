// DOM-measured geometry of every screen, taken from the REAL kiosk at the capture viewport.
// Every entry carries CSS px (viewport coordinates, 1024x1366) and the same numbers normalised by the
// viewport (0..1), plus the element's text or a descriptive key, so Remotion can place tap ripples,
// callouts and a vector ring exactly over the screenshots.
import { VIEWPORT } from "./lib.mjs";

const r2 = (n) => Math.round(n * 100) / 100;
const r5 = (n) => Math.round(n * 100000) / 100000;

/** In-page rect -> { css: {...}, norm: {...} } (norm = css divided by `size`, the viewport by default). */
function withNorm(rect, size) {
  if (!rect) return rect;
  const css = {};
  for (const k of ["x", "y", "width", "height", "right", "bottom", "cx", "cy"]) css[k] = r2(rect[k]);
  const norm = {
    x: r5(rect.x / size.width), y: r5(rect.y / size.height),
    width: r5(rect.width / size.width), height: r5(rect.height / size.height),
    right: r5(rect.right / size.width), bottom: r5(rect.bottom / size.height),
    cx: r5(rect.cx / size.width), cy: r5(rect.cy / size.height),
  };
  return { css, norm };
}

function normaliseDeep(v, size = VIEWPORT) {
  if (Array.isArray(v)) return v.map((x) => normaliseDeep(x, size));
  if (v && typeof v === "object") {
    if (v.__rect) { const { __rect, ...rest } = v; return { ...rest, ...withNorm(__rect, size) }; }
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = normaliseDeep(val, size);
    return out;
  }
  return v;
}

/**
 * Runs inside the page. `spec` maps a key to a descriptor:
 *   css      selector (default "*")          text   regex source matched against the element's text
 *   flags    regex flags (default "i")       nth    pick the n-th match (default 0)
 *   all      return every match (array, or object when keyBy is given)
 *   keyBy    selector (inside each match) whose text becomes the key        closest / parent  re-target
 *   style    computed-style properties to include        desc   free-text description
 */
function resolveInPage(spec) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  };
  const one = (el, d) => {
    let t = el;
    if (d.closest) t = t.closest(d.closest) || t;
    for (let i = 0; i < (d.parent || 0); i++) t = t.parentElement || t;
    const out = { tag: t.tagName.toLowerCase(), text: norm(t.textContent).slice(0, 90), __rect: rectOf(t) };
    if (d.desc) out.desc = d.desc;
    if (d.style) {
      const cs = getComputedStyle(t);
      out.style = {};
      for (const k of d.style) out.style[k] = cs[k];
    }
    return out;
  };
  const matches = (d) => {
    let els = [...document.querySelectorAll(d.css || "*")];
    if (d.text) {
      const re = new RegExp(d.text, d.flags ?? "i");
      els = els.filter((e) => re.test(norm(e.textContent)));
      if (d.innermost) els = els.filter((e) => ![...e.children].some((c) => re.test(norm(c.textContent))));
    }
    return els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  };
  const result = {};
  for (const [key, d] of Object.entries(spec)) {
    const els = matches(d);
    if (!els.length) { result[key] = null; continue; }
    if (d.all) {
      if (d.keyBy) {
        const obj = {};
        els.forEach((e, i) => {
          const k = norm((e.querySelector(d.keyBy) || e).textContent) || String(i);
          obj[k] = one(e, d);
        });
        result[key] = obj;
      } else result[key] = els.map((e) => one(e, d));
    } else result[key] = one(els[d.nth || 0], d);
  }
  return result;
}

export async function measure(page, spec, size = VIEWPORT) {
  const raw = await page.evaluate(resolveInPage, spec);
  return normaliseDeep(raw, size);
}

// ── element registries per screen ──────────────────────────────────────────────────────────────────
const BTN_STYLE = ["borderRadius", "fontSize", "fontWeight", "letterSpacing", "color", "backgroundImage", "boxShadow"];

export const SPEC_ATTRACT = {
  tapButton: { css: "button", text: "^tap to start", desc: "TAP TO START — primary CTA (gradient pill, breathing glow)", style: BTN_STYLE },
  languageSelector: { css: "button", text: "choose language", desc: "language selector button (flag + 'Choose language' + chevron; opens the language modal)", style: ["borderRadius", "fontSize", "backgroundColor", "borderColor"] },
  logo: { css: "img[alt='Suaipe']", desc: "Suaipe brand mark, 112 px, blue glow halo" },
  wordmark: { css: "h1", text: "^suaipe$", desc: "SUAIPE wordmark (gradient text, 96 px line box)", style: ["fontSize", "fontWeight", "letterSpacing", "backgroundImage"] },
  headline: { css: "p", text: "find your ideal tech gadget", desc: "headline" },
  subline: { css: "p", text: "in just 8 swipes", desc: "sub-headline" },
  cyclingMessage: { css: "div[class*='h-[72px]']", desc: "cycling emoji + message slot (changes every 2.5 s)" },
  featureStrip: { css: "div.text-xs", text: "^8 swipes\\s*.\\s*2 min\\s*.\\s*perfect match", desc: "'8 swipes · 2 min · perfect match ✓' strip" },
};

export const SPEC_WELCOME = {
  langSelector: { css: "div.absolute.top-4.right-4", desc: "language chip row (top-right)" },
  langChips: { css: "div.absolute.top-4.right-4 button", all: true, keyBy: "span:last-child", desc: "language chip", style: ["borderRadius", "fontSize", "fontWeight", "backgroundColor", "color"] },
  logo: { css: "img[alt='Suaipe']", desc: "Suaipe brand mark, 96 px (6 taps = staff overlay)" },
  title: { css: "h1", text: "^suaipe$", desc: "SUAIPE title" },
  tagline: { css: "p", text: "find your perfect gadget", desc: "tagline" },
  subtitle: { css: "p", text: "answer 8 quick questions", desc: "subtitle" },
  form: { css: "div.w-full.space-y-3", desc: "form column (max-w-md, 448 px)" },
  firstName: { css: "input[placeholder='First name']", desc: "first-name input", style: ["borderRadius", "fontSize", "backgroundColor", "borderColor", "color"] },
  lastName: { css: "input[placeholder='Last name']", desc: "last-name input", style: ["borderRadius", "fontSize", "backgroundColor", "borderColor", "color"] },
  email: { css: "input[type='email']", desc: "email input", style: ["borderRadius", "fontSize", "backgroundColor", "borderColor", "color"] },
  checkboxRow: { css: "input[type='checkbox']", closest: "div.flex-col.items-start", desc: "GDPR checkbox row (full form width)" },
  checkbox: { css: "input[type='checkbox']", desc: "GDPR checkbox (16 px)" },
  consentLabel: { css: "label", text: "privacy notice", desc: "'I accept the privacy notice' label" },
  readLink: { css: "button", text: "^read$", desc: "'Read' privacy link" },
  startButton: { css: "button", text: "start the game", desc: "START THE GAME! button (gradient + glow)", style: BTN_STYLE },
  privacyLine: { css: "div.text-xs", text: "secure data", desc: "'🔒 Secure data · GDPR compliant'" },
  noSpam: { css: "p", text: "no spam", desc: "'No spam. Unsubscribe anytime.'" },
  storeBadge: { css: "button", text: "milano", desc: "store badge (bottom-left; tap = staff PIN overlay)" },
};

export const SPEC_TUTORIAL = {
  header: { css: "p", text: "^how does it work", desc: "'HOW DOES IT WORK?' header" },
  swipeHintArea: { css: "div.max-w-sm.justify-between", desc: "swipe hint area: NO side | demo card | YES side" },
  noSide: { css: "div.max-w-sm.justify-between > div:nth-child(1)", desc: "NO chip + left arrow (scale 1.05 while active)" },
  demoCard: { css: "div.h-48.w-40", desc: "demo card slot (card flies out left for NO / right for YES)" },
  yesSide: { css: "div.max-w-sm.justify-between > div:nth-child(3)", desc: "YES chip + right arrow" },
  stepLabel: { css: "p", text: "^(← )?swipe for (no|yes)", desc: "'← Swipe for NO' / 'Swipe for YES →' label (alternates every 1.8 s)" },
  readyButton: { css: "button", text: "ready", desc: "I'm ready! button (gradient + glow)", style: BTN_STYLE },
};

export const SPEC_QUIZ = {
  progressBlock: { css: "div.max-w-sm.flex-col.gap-2", desc: "progress block (label, %, bar, dots)" },
  progressLabel: { css: "span", text: "^question \\d+ of \\d+$", desc: "'Question n of 8'" },
  progressPercent: { css: "span.text-primary.font-bold", text: "%$", desc: "progress percentage" },
  progressBar: { css: "div.h-2.w-full.overflow-hidden.rounded-full", desc: "progress bar track (8 px high; fill = gradient)" },
  progressDots: { css: "div.justify-center.gap-1\\.5", desc: "8 progress dots (active one is 20 px wide)" },
  cardContainer: { css: "div[class*='h-[600px]']", desc: "card slot 360x600 (ghost stack + stamps live here)" },
  card: { css: "[aria-roledescription='quiz card']", desc: "swipe card at rest (rotates around its centre; drag x ≈ 0.55 × pointer offset)", style: ["borderRadius", "backgroundImage", "boxShadow", "transformOrigin"] },
  cardHeader: { css: "[aria-roledescription='quiz card'] div.justify-between", desc: "category label + step counter row" },
  cardEmoji: { css: "[aria-roledescription='quiz card'] span.select-none", desc: "emoji (116 px)" },
  cardQuestion: { css: "[aria-roledescription='quiz card'] h2", desc: "question text", style: ["fontSize", "fontWeight", "color"] },
  ghostCards: { css: "div[class*='h-[600px]'] > div.absolute.inset-0", all: true, desc: "two ghost cards peeking below (scaled 0.92 / 0.84)" },
  noButton: { css: "button", text: "^no$", desc: "NO button (red outline)", style: ["borderRadius", "borderColor", "color", "backgroundColor", "boxShadow"] },
  yesButton: { css: "button", text: "^yes$", desc: "YES button (mint outline)", style: ["borderRadius", "borderColor", "color", "backgroundColor", "boxShadow"] },
  buttonsRow: { css: "div.bottom-10", desc: "NO | CHOOSE YOUR DESTINY | YES row" },
  centerLabel: { css: "p", text: "choose your destiny", desc: "centre label between the buttons" },
};

export const SPEC_RESULT = {
  greeting: { css: "p", text: "your ideal gadget is", desc: "'Marco, your ideal gadget is...'" },
  perfectMatch: { css: "h2", text: "perfect match", desc: "'🎉 PERFECT MATCH!' label", style: ["fontSize", "fontWeight", "letterSpacing", "color"] },
  productCard: { css: "div.gradient-card.shadow-card.rounded-3xl", desc: "product card (image + name + description + price + stars)" },
  productImage: { css: "div[class*='h-52']", desc: "product image area (h-52, object-cover)" },
  matchBadge: { css: "div.rounded-full", text: "\\d+% match", innermost: true, desc: "'98% match' badge on the product image (static in the plate)", style: ["fontSize", "fontWeight", "backgroundColor", "color"] },
  productName: { css: "h3", desc: "product name" },
  productDescription: { css: "p.line-clamp-2", desc: "product description (2 lines)" },
  price: { css: "span.text-gradient", text: "€", desc: "price (gradient text)" },
  stars: { css: "span[class*='gap-0.5']", desc: "rating stars + 4.8" },
  chipsRow: { css: "div.flex.w-full.gap-2", desc: "three chips row: Video 30s | Manual | VIP Discount" },
  chips: { css: "div.flex.w-full.gap-2 > div", all: true, keyBy: "span:last-child", desc: "benefit chip" },
  emailRowWithHint: { css: "div.cursor-default", parent: 1, desc: "e-mail reminder card + hint line" },
  emailRow: { css: "div.cursor-default.select-none", desc: "'Your match will be sent to:' e-mail row (5 taps = staff email change)" },
  emailAddress: { css: "p.truncate", desc: "customer's e-mail address" },
  emailHint: { css: "p", text: "incorrect email", desc: "'Incorrect email? Ask a store consultant…'" },
  claimButton: { css: "button", text: "i want it", desc: "'🎁 I want it!' button (gradient + glow)", style: BTN_STYLE },
  emailSubtitle: { css: "p", text: "receive the video", desc: "footer sentence" },
};

export const SPEC_SUCCESS = {
  envelopeBox: { css: "div[style*='width: 220px'][style*='height: 180px']", desc: "envelope slot 220x180 (pulse rings + planes are drawn around it)" },
  envelope: { css: "svg[viewBox='0 0 148 112']", desc: "envelope icon 148x112 (blue glow)" },
  title: { css: "h2", text: "^perfect", desc: "'Perfect, Marco Rossi!'", style: ["fontSize", "fontWeight", "color"] },
  productName: { css: "p.text-gradient", desc: "product name (gradient text)" },
  productOnWay: { css: "p", text: "exclusive package is on its way", desc: "'Your exclusive package is on its way to:'" },
  recipientCard: { css: "div[class*='border-primary/40']", desc: "recipient card (gradient header 'RECIPIENT' + mono e-mail)" },
  recipientHeader: { css: "div.gradient-primary.px-4.py-2", desc: "'RECIPIENT' gradient header" },
  recipientEmail: { css: "p.font-mono", desc: "recipient e-mail (mono 14 px)" },
  tilesGrid: { css: "div.grid.grid-cols-2", desc: "2x2 info tiles grid" },
  tiles: { css: "div.grid.grid-cols-2 > div", all: true, keyBy: "span.font-bold", desc: "info tile (emoji + title + description); the discount tile is highlighted" },
  spamNote: { css: "p", text: "can't find the email", desc: "spam-folder note" },
  playAgainButton: { css: "button", text: "play again", desc: "'🔄 Play Again' button (gradient + glow)", style: BTN_STYLE },
  copyright: { css: "p", text: "^©", desc: "© line" },
};

// ── special measurements ───────────────────────────────────────────────────────────────────────────

/** NO / YES drag stamps: fixed in the card slot, only their opacity follows the drag. */
export async function measureStamps(page) {
  const raw = await page.evaluate(() => {
    const out = {};
    const rectOf = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    for (const [key, sel] of [["no", "div.pointer-events-none.absolute.left-4.top-10"], ["yes", "div.pointer-events-none.absolute.right-4.top-10"]]) {
      const el = document.querySelector(sel);
      if (!el) { out[key] = null; continue; }
      const cs = getComputedStyle(el);
      const m = new DOMMatrixReadOnly(cs.transform);
      const aabb = el.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      out[key] = {
        text: el.textContent.replace(/\s+/g, " ").trim(),
        desc: key === "no" ? "NO stamp (✕ NO), red, top-left of the card slot" : "YES stamp (YES ✓), mint, top-right of the card slot",
        rotationDeg: Math.round(Math.atan2(m.b, m.a) * 18000 / Math.PI) / 100,
        unrotated: { __rect: rectOf({ x: aabb.x + aabb.width / 2 - w / 2, y: aabb.y + aabb.height / 2 - h / 2, width: w, height: h, right: aabb.x + aabb.width / 2 + w / 2, bottom: aabb.y + aabb.height / 2 + h / 2 }) },
        boundingBoxRotated: { __rect: rectOf(aabb) },
        style: { borderRadius: cs.borderRadius, borderWidth: cs.borderTopWidth, borderColor: cs.borderTopColor, backgroundColor: cs.backgroundColor, opacityAtRest: cs.opacity },
        glyph: { fontSize: getComputedStyle(el.querySelector("span")).fontSize, fontWeight: getComputedStyle(el.querySelector("span")).fontWeight },
        // SwipeCard.tsx: noOpacity = useTransform(x, [-160, -50, 0], [1, 0.3, 0]); yesOpacity = useTransform(x, [0, 50, 160], [0, 0.3, 1])
        opacityRule: key === "no"
          ? "piecewise-linear in card x: 0 at x=0, 0.3 at x=-50, 1 at x<=-160 (card x ≈ 0.55 × pointer offset). The stamp never moves, only its opacity."
          : "piecewise-linear in card x: 0 at x=0, 0.3 at x=+50, 1 at x>=+160 (card x ≈ 0.55 × pointer offset). The stamp never moves, only its opacity.",
      };
    }
    return out;
  });
  return normaliseDeep(raw);
}

/** Per-frame state of the dragged card (read from the DOM while the real framer-motion drag runs). */
export async function readDragState(page) {
  return page.evaluate(() => {
    const card = document.querySelector("[aria-roledescription='quiz card']");
    if (!card) return null;
    const cs = getComputedStyle(card);
    const m = new DOMMatrixReadOnly(cs.transform);
    const no = document.querySelector("div.pointer-events-none.absolute.left-4.top-10");
    const yes = document.querySelector("div.pointer-events-none.absolute.right-4.top-10");
    const tints = [...card.querySelectorAll("div.pointer-events-none.absolute.inset-0")].filter((e) => getComputedStyle(e).zIndex === "25");
    const f = (n) => Math.round(n * 1000) / 1000;
    return {
      x: f(m.m41), y: f(m.m42),
      rotateDeg: f(Math.atan2(m.b, m.a) * 180 / Math.PI),
      scale: f(Math.hypot(m.a, m.b)),
      noOpacity: no ? f(parseFloat(getComputedStyle(no).opacity)) : null,
      yesOpacity: yes ? f(parseFloat(getComputedStyle(yes).opacity)) : null,
      noTint: tints[0] ? f(parseFloat(getComputedStyle(tints[0]).opacity)) : null,
      yesTint: tints[1] ? f(parseFloat(getComputedStyle(tints[1]).opacity)) : null,
    };
  });
}

/** The animated match ring: geometry + paint, derived from the real SVG and computed styles. */
export async function measureRing(page) {
  const raw = await page.evaluate(() => {
    const rectOf = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    const hex = (rgb) => {
      const m = rgb.match(/rgba?\(([^)]+)\)/);
      if (!m) return rgb;
      const [r, g, b] = m[1].split(",").map((s) => Math.round(parseFloat(s)));
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    };
    const svg = document.querySelector("svg[viewBox='0 0 120 120']");
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    const k = box.width / 120; // viewBox units -> CSS px
    const [track, progress, pulse] = [...svg.querySelectorAll("circle")];
    const ps = getComputedStyle(progress), ts = getComputedStyle(track);
    const r = progress.r.baseVal.value, sw = parseFloat(ps.strokeWidth);
    const circumference = 2 * Math.PI * r;
    const off = parseFloat(ps.strokeDashoffset);
    const wrapper = svg.parentElement;
    const halo = [...wrapper.children].find((c) => c !== svg && c.tagName === "DIV" && getComputedStyle(c).position === "absolute" && c.children.length === 0);
    const numEl = [...wrapper.querySelectorAll("span")].find((s) => /^\d+\s*%$/.test(s.textContent.trim()));
    const labEl = numEl && numEl.nextElementSibling;
    const ns = numEl && getComputedStyle(numEl), ls = labEl && getComputedStyle(labEl);
    const pick = (s, ks) => Object.fromEntries(ks.map((key) => [key, s[key]]));
    const root = getComputedStyle(document.documentElement);
    const gradient = root.getPropertyValue("--gradient-primary").trim();
    const gradComputed = ns ? ns.backgroundImage : null;
    const stops = gradComputed ? [...gradComputed.matchAll(/rgb\([^)]+\)/g)].map((m) => m[0]) : [];
    return {
      wrapper: { __rect: rectOf(wrapper.getBoundingClientRect()) },
      svgBox: { __rect: rectOf(box) },
      centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      viewBoxUnitToCssPx: k,
      radiusCss: r * k,
      strokeWidthCss: sw * k,
      outerRadiusCss: (r + sw / 2) * k,
      innerRadiusCss: (r - sw / 2) * k,
      authoredUnits: { viewBox: "0 0 120 120", cx: 60, cy: 60, r, strokeWidth: sw, size: 160 },
      progress: {
        stroke: ps.stroke, strokeHex: hex(ps.stroke), linecap: ps.strokeLinecap,
        dasharray: ps.strokeDasharray, circumferenceUnits: circumference, dashoffsetUnitsNow: off,
        fractionNow: Math.round((1 - off / circumference) * 10000) / 10000,
        transform: progress.getAttribute("transform"), start: "12 o'clock, clockwise (rotate(-90) on a circle that starts at 3 o'clock)",
        filter: ps.filter, filterNote: "drop-shadow is authored in viewBox units: blur 8 units ≈ " + Math.round(8 * k * 100) / 100 + " CSS px",
        colourRule: "ring colour by match %: >=90 #5eead4 (mint), >=80 #22d3ee, >=65 #3b82f6, else #6366f1 — solid stroke, NOT a gradient",
      },
      track: { stroke: ts.stroke, strokeHex: hex(ts.stroke), opacity: ts.opacity, strokeWidthCss: parseFloat(ts.strokeWidth) * k },
      pulseRing: pulse ? { r: "56 → 59 units", opacity: "0.2 → 0 → 0.2", durationS: 2.5, strokeWidthUnits: 2, note: "infinite, easeInOut, only after scanning" } : null,
      halo: halo ? { __rect: rectOf(halo.getBoundingClientRect()), baseSizeCss: halo.offsetWidth, scale: "1 → 1.08 → 1", opacity: "0.6 → 0.2 → 0.6", durationS: 2.5, background: "radial-gradient(circle, ring colour @13% alpha 0%, transparent 70%)" } : null,
      number: numEl ? {
        text: numEl.textContent.replace(/\s+/g, ""), __rect: rectOf(numEl.getBoundingClientRect()),
        style: pick(ns, ["fontSize", "fontWeight", "fontFamily", "color", "lineHeight", "letterSpacing", "fontVariantNumeric", "backgroundImage", "webkitTextFillColor"]),
        gradient: { css: gradient, computed: gradComputed, stopsRgb: stops, stopsHex: stops.map(hex), angleDeg: 135, clippedToText: true },
        classes: numEl.className,
      } : null,
      label: labEl ? {
        text: labEl.textContent, shownAs: labEl.textContent.toUpperCase(), __rect: rectOf(labEl.getBoundingClientRect()),
        style: pick(ls, ["fontSize", "fontWeight", "color", "letterSpacing", "textTransform", "marginTop", "lineHeight", "fontFamily"]),
        colourHex: hex(ls.color),
      } : null,
    };
  });
  return normaliseDeep(raw);
}
