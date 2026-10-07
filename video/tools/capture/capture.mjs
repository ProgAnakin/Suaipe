// Drives the REAL kiosk through the whole customer journey and writes, under OUT_DIR:
//   still/   WebP screenshots of every screen (2048x2732) + the result "plate" (ring + number + confetti hidden)
//   swipe/   48 real drag-scrub frames for each of the 8 quiz cards (1536 wide)
//   typing/  cropped real typing frames of the welcome form + checkbox / button crops + manifest.json
//   layout.json   DOM-measured geometry of every screen
// The e-mail render (still/email-full.webp), the product packshots and the global manifest.json come from
// email.mjs, products.mjs and manifest.mjs.   See README.md.
//
//   ONLY=stills,swipes,typing,layout   run a subset (the journey is always walked; only the saving is skipped)
//   SWIPES=1,4                         capture only these swipe numbers
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";
import * as LAY from "./layout.mjs";

const { OUT_DIR, VIEWPORT, DPR, log, sleep, pad } = L;

const ONLY = new Set((process.env.ONLY || "stills,swipes,typing,layout").split(",").map((s) => s.trim()).filter(Boolean));
const want = (k) => ONLY.has(k);
const SWIPE_SET = new Set((process.env.SWIPES || "1,2,3,4,5,6,7,8").split(",").map(Number));

const STILL = path.join(OUT_DIR, "still");
const SWIPE = path.join(OUT_DIR, "swipe");
const TYPING = path.join(OUT_DIR, "typing");

// swipe-scrub parameters. Frame 0 is the card at rest (pointer not pressed); frames 1..47 follow the pointer path
//   offset(i) = dir * (8 + (MAX_OFF - 8) * (i / 47) ^ 1.6)           (the card follows at ~0.55x: dragElastic)
// MAX_OFF is chosen so the last frame shows the card (rotated 18 deg, glow included) completely off-screen.
const FRAMES = 48;
const MAX_OFF = 1500;
const AMBIENT_FPS = 30;

const TYPE_TEXT = { first: "Marco", last: "Rossi", email: "marco.rossi@example.com" };
const SUCCESS_MID_MS = 1100; //     success-mid  = 1.1 s after the success screen mounted
const SUCCESS_FINAL_MS = 3400; //   success      = 3.4 s after (every entrance animation has finished)
const TYPING_MARGIN = 8; // CSS px around the three inputs (focus ring is 2 px)

const written = []; // { kind, file, width, height, bytes }
const note = (kind, r) => { written.push({ kind, ...r }); return r; };
const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function main() {
  await L.assertAppIsUp();
  for (const d of [STILL, SWIPE, TYPING]) L.ensureDir(d);

  const browser = await L.launch();
  const { page } = await L.makeSession(browser);
  const enc = L.makeEncoder(2);
  const layout = {};
  const deviations = [];

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────
  const fontsSettled = () => page.evaluate(() => document.fonts.ready);

  /**
   * Full-viewport still. The page is frozen (rAF gate + paused animations) for the duration of the screenshot so the
   * encoded frame is exactly the moment that was chosen; `frozen: true` means the caller froze it already (and thaws).
   */
  async function still(name, { frozen = false } = {}) {
    if (!want("stills")) return;
    await fontsSettled();
    if (!frozen) await L.freezeAll(page);
    let buf;
    try {
      buf = await page.screenshot({ type: "png", caret: "initial" }); // caret is hidden by a session-wide stylesheet
    } finally {
      if (!frozen) await L.thawAll(page);
    }
    const r = await L.writeWebp(buf, path.join(STILL, `${name}.webp`), { quality: 90, width: 2048 });
    note("still", r);
    log(`still  ${name.padEnd(14)} ${r.width}x${r.height}  ${kb(r.bytes)}`);
  }

  /** Crop of the viewport (CSS px rect) -> lossless WebP in typing/. Returns the raw PNG for comparisons. */
  async function crop(name, rect) {
    const buf = await page.screenshot({ type: "png", caret: "initial", clip: rect });
    if (want("typing")) {
      const r = await L.writeWebp(buf, path.join(TYPING, `${name}.webp`), { lossless: true });
      note("typing", r);
    }
    return buf;
  }

  const expandRect = (rects, margin) => {
    const x0 = Math.min(...rects.map((r) => r.x)), y0 = Math.min(...rects.map((r) => r.y));
    const x1 = Math.max(...rects.map((r) => r.x + r.width)), y1 = Math.max(...rects.map((r) => r.y + r.height));
    const x = Math.max(0, Math.floor(x0 - margin)), y = Math.max(0, Math.floor(y0 - margin));
    return {
      x, y,
      width: Math.min(VIEWPORT.width, Math.ceil(x1 + margin)) - x,
      height: Math.min(VIEWPORT.height, Math.ceil(y1 + margin)) - y,
    };
  };
  const imgRect = (r) => ({ x: r.x * DPR, y: r.y * DPR, width: r.width * DPR, height: r.height * DPR });
  const cssRectOf = (m) => ({ x: m.css.x, y: m.css.y, width: m.css.width, height: m.css.height });

  // ── 1. attract ──────────────────────────────────────────────────────────────────────────────────
  await page.goto(L.APP_URL, { waitUntil: "load" });
  const tap = page.getByText(/tap to start/i).first();
  await tap.waitFor();
  await L.fontsReady(page);
  await L.hideCaret(page);
  await page.waitForTimeout(1900); // entrance animations (~1.3 s) are done; the first cycling message is still on (flips at 2.5 s)
  await still("attract");
  if (want("layout")) layout.attract = await LAY.measure(page, LAY.SPEC_ATTRACT);
  log("attract ✓");

  // ── 2. welcome ──────────────────────────────────────────────────────────────────────────────────
  await tap.click();
  const inFirst = page.getByPlaceholder("First name");
  const inLast = page.getByPlaceholder("Last name");
  const inEmail = page.getByPlaceholder("Your email");
  const cbox = page.locator('input[type="checkbox"]');
  await inFirst.waitFor();
  await page.waitForTimeout(1700); // splash exit + welcome entrance (slide 0.4 s, form spring 0.7 s) settled
  const frozen = await L.freezeAmbient(page); // backgrounds stay identical in welcome-empty / typing crops / welcome-filled
  log(`welcome: froze ${frozen} ambient animations`);
  await still("welcome-empty");
  const W = await LAY.measure(page, LAY.SPEC_WELCOME);
  if (want("layout")) layout.welcome = W;

  const typingMeta = { frames: {}, crops: {} };
  const formCrop = expandRect([cssRectOf(W.firstName), cssRectOf(W.lastName), cssRectOf(W.email)], TYPING_MARGIN);
  const checkboxCrop = expandRect([cssRectOf(W.checkboxRow)], 4);
  const startCrop = expandRect([cssRectOf(W.startButton)], 12);
  const startIdle = await crop("start-button-idle", startCrop); // idle (empty form) — kept only if it differs from the valid one

  const scrollOk = () => page.evaluate(() => {
    const root = document.querySelector("div.h-dvh");
    return window.scrollY === 0 && document.documentElement.scrollTop === 0 && (!root || root.scrollTop === 0);
  });

  /** Click a field, then type it one character at a time, saving a crop after every keystroke. */
  async function typeField(loc, text, prefix) {
    await loc.click();
    await page.waitForTimeout(380); // focus ring + the app's 300 ms scrollIntoView timer have run
    const names = [];
    const shoot = async (i) => {
      const name = `${prefix}-${pad(i, 2)}`;
      await crop(name, formCrop);
      names.push(`${name}.webp`);
    };
    await shoot(0);
    for (let i = 0; i < text.length; i++) {
      await page.keyboard.type(text[i]);
      await page.waitForTimeout(110);
      await shoot(i + 1);
    }
    return names;
  }

  // The app shows "Please enter a valid email address." under the field while an address is incomplete; that line
  // pushes the vertically-centred form up by 14 px mid-typing, which would make a fixed crop impossible. Hide it.
  await page.addStyleTag({ content: "div.w-full.space-y-3 > p.text-destructive { display: none !important; }" });

  if (want("typing")) {
    typingMeta.frames.first = { text: TYPE_TEXT.first, frames: await typeField(inFirst, TYPE_TEXT.first, "first") };
    typingMeta.frames.last = { text: TYPE_TEXT.last, frames: await typeField(inLast, TYPE_TEXT.last, "last") };
    typingMeta.frames.email = {
      text: TYPE_TEXT.email,
      note: "authentic: the field is red (border, ring, ✕ icon) while the address is incomplete and green once valid (from char 22)",
      frames: await typeField(inEmail, TYPE_TEXT.email, "email"),
    };
    // calm variant: same keystrokes, but the red 'invalid' styling is suppressed (neutral/blue until the address is valid)
    await inEmail.fill("");
    const calm = await page.addStyleTag({
      content: [
        "input[type='email'].border-destructive { border-color: hsl(var(--border)) !important; }",
        "input[type='email'].focus\\:ring-destructive:focus { --tw-ring-color: hsl(var(--ring)) !important; }",
        "input[type='email'] + span.text-destructive { display: none !important; }",
      ].join("\n"),
    });
    typingMeta.frames.emailCalm = {
      text: TYPE_TEXT.email,
      note: "same keystrokes as 'email' but the red invalid styling is suppressed with injected CSS (neutral border + blue ring until valid, then green)",
      frames: await typeField(inEmail, TYPE_TEXT.email, "email-calm"),
    };
    await calm.evaluate((el) => el.remove());
  } else {
    await inFirst.fill(TYPE_TEXT.first);
    await inLast.fill(TYPE_TEXT.last);
    await inEmail.fill(TYPE_TEXT.email);
  }
  if (!(await scrollOk())) deviations.push("welcome page scrolled while typing (crop may be off)");

  // the form is valid now, nothing ticked yet
  await page.waitForTimeout(250);
  const W2 = await LAY.measure(page, { email: LAY.SPEC_WELCOME.email, checkboxRow: LAY.SPEC_WELCOME.checkboxRow, startButton: LAY.SPEC_WELCOME.startButton });
  const dy = Math.max(Math.abs(W2.email.css.y - W.email.css.y), Math.abs(W2.startButton.css.y - W.startButton.css.y));
  if (dy > 0.5) deviations.push(`form moved ${dy.toFixed(1)} px between empty and valid state`);
  await crop("checkbox-unchecked", checkboxCrop);
  await cbox.check();
  await page.waitForTimeout(300);
  await crop("checkbox-checked", checkboxCrop);
  const startValid = await crop("start-button", startCrop);
  const sameButton = await samePixels(startIdle, startValid);
  typingMeta.startButtonDiffersWhenValid = !sameButton;
  if (want("typing")) {
    if (!sameButton) {
      typingMeta.startButtonFiles = ["start-button-idle.webp", "start-button.webp"];
    } else {
      fs.rmSync(path.join(TYPING, "start-button-idle.webp"), { force: true });
      const i = written.findIndex((w) => w.file.endsWith("start-button-idle.webp"));
      if (i >= 0) written.splice(i, 1);
      typingMeta.startButtonFiles = ["start-button.webp"];
    }
    log(`typing: START button ${sameButton ? "identical" : "DIFFERENT"} in empty vs valid state`);
  }
  await page.waitForTimeout(500);
  await still("welcome-filled");
  await L.releaseAmbient(page);
  log("welcome ✓");

  if (want("typing")) {
    const names = (o) => o.frames.length;
    typingMeta.dpr = DPR;
    typingMeta.viewport = VIEWPORT;
    typingMeta.crops = {
      fields: { desc: "first-name + last-name + email inputs (+8 px margin): every first-*/last-*/email-* frame", css: formCrop, image: imgRect(formCrop) },
      checkbox: { desc: "GDPR checkbox row, full form width: checkbox-unchecked / checkbox-checked", css: checkboxCrop, image: imgRect(checkboxCrop) },
      startButton: { desc: "START THE GAME! button (+12 px margin)", css: startCrop, image: imgRect(startCrop) },
    };
    typingMeta.inputsCss = {
      firstName: cssRectOf(W.firstName), lastName: cssRectOf(W.lastName), email: cssRectOf(W.email),
      relativeToFieldsCrop: Object.fromEntries(
        [["firstName", W.firstName], ["lastName", W.lastName], ["email", W.email]].map(([k, m]) => [k, {
          x: m.css.x - formCrop.x, y: m.css.y - formCrop.y, width: m.css.width, height: m.css.height,
        }]),
      ),
    };
    typingMeta.counts = { first: names(typingMeta.frames.first), last: names(typingMeta.frames.last), email: names(typingMeta.frames.email), emailCalm: names(typingMeta.frames.emailCalm) };
    typingMeta.states = {
      first: "frame 0 = first-name focused & empty; frame n = after n characters. Last/email still empty.",
      last: "first name already 'Marco' (green border); last-name focused; frame n = after n characters of 'Rossi'.",
      email: "first + last filled; email focused; frame n = after n characters.",
      checkbox: "form valid (all three fields green); unchecked then checked.",
    };
    typingMeta.notes = [
      "The app inserts 'Please enter a valid email address.' under the field while the address is incomplete, shifting the centred form by 14 px; it is hidden by injected CSS so every frame shares one crop rectangle.",
      "Caret hidden. Backgrounds are frozen (all infinite CSS/WAAPI animations paused) so the crops match still/welcome-empty.webp exactly outside the fields.",
    ];
    L.writeJson(path.join(TYPING, "manifest.json"), typingMeta);
  }

  // ── 3. quiz tutorial ────────────────────────────────────────────────────────────────────────────
  await page.getByText(/start the game/i).click();
  await page.getByText(/ready/i).first().waitFor({ timeout: 15000 });
  await waitTutorialMoment(page); // freezes the page in the same tick the demo card is crisp
  await still("quiz-tutorial", { frozen: true });
  if (want("layout")) layout.quizTutorial = await LAY.measure(page, LAY.SPEC_TUTORIAL);
  await L.thawAll(page);
  log("tutorial ✓");
  await page.getByText(/ready/i).first().click();
  await page.waitForTimeout(900);

  // ── 4. the eight cards ──────────────────────────────────────────────────────────────────────────
  const swipeTrace = {};
  const YES = new Set(L.SWIPE_DIRS.flatMap((d, i) => (d > 0 ? [i + 1] : [])));

  for (let n = 1; n <= 8; n++) {
    const dir = L.SWIPE_DIRS[n - 1];
    await waitCard(page, n);
    await page.waitForTimeout(n === 1 ? 700 : 500); // progress bar (0.4 s) + dots (0.3 s) settled
    await still(`card-${n}`);

    if (n === 1 && want("layout")) {
      layout.quizCard = await LAY.measure(page, LAY.SPEC_QUIZ);
      layout.quizCard.stamps = await LAY.measureStamps(page);
    }

    if (want("swipes") && SWIPE_SET.has(n)) {
      swipeTrace[n] = await scrub(page, n, dir, enc);
    } else {
      await page.getByRole("button", { name: YES.has(n) ? /^\W*YES\W*$/ : /^\W*NO\W*$/ }).first().click();
    }
    log(`card ${n} ✓  (${dir < 0 ? "NO / left" : "YES / right"})`);
  }
  await enc.drain();
  if (want("layout")) {
    layout.quizCard.swipe = {
      frames: FRAMES, maxPointerOffsetCss: MAX_OFF, pointerPath: "offset(i) = dir * (8 + (maxOff - 8) * (i/47)^1.6), i = 1..47; frame 0 = rest",
      directions: Object.fromEntries(L.SWIPE_DIRS.map((d, i) => [i + 1, d < 0 ? "left/NO" : "right/YES"])),
      trace: swipeTrace,
      traceNote: "x,y = card translation (CSS px); rotateDeg; scale (framer whileDrag 1.015 once dragging); stamp + tint opacities read from the DOM per frame",
    };
  }

  // ── 5. result ───────────────────────────────────────────────────────────────────────────────────
  await page.getByText(/I want it/i).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => {
    const svg = document.querySelector("svg[viewBox='0 0 120 120']");
    if (!svg) return false;
    const off = parseFloat(getComputedStyle(svg.querySelectorAll("circle")[1]).strokeDashoffset);
    const num = [...document.querySelectorAll("span")].find((s) => s.className.includes("text-5xl") && /^\d+\s*%$/.test(s.textContent.trim()));
    return !!num && /^98\s*%$/.test(num.textContent.trim()) && Math.abs(off - 7.037) < 0.06;
  }, null, { timeout: 25000, polling: 100 });
  await page.waitForTimeout(900);
  const hero = await page.evaluate(() => document.querySelector("h3")?.textContent || "");
  if (!/Brevia GoPress/.test(hero)) throw new Error(`matched the wrong product: "${hero}" (expected Brevia GoPress)`);
  await page.addStyleTag({ content: "[data-cap-hide] { visibility: hidden !important; }" });
  // wait for a moment when plenty of confetti is mid-air (bursts are staggered on a ~3 s cycle); the predicate freezes the page
  const confetti = await page.waitForFunction((min) => {
    const bursts = [...document.querySelectorAll("div.pointer-events-none.absolute")].filter((d) => /%/.test(d.style.left) && /%/.test(d.style.top));
    let vis = 0;
    for (const b of bursts) for (const p of b.children) if (parseFloat(getComputedStyle(p).opacity) > 0.35) vis++;
    if (vis < min) return false;
    window.__capFreeze();
    return vis;
  }, 80, { timeout: 20000, polling: "raf" }).then((h) => h.jsonValue()).catch(() => 0);
  if (!confetti) await L.freezeAll(page);
  await still("result", { frozen: true });
  log(`result: ${confetti || "few"} confetti particles in the frame`);
  if (want("layout")) {
    layout.result = await LAY.measure(page, LAY.SPEC_RESULT);
    layout.result.ring = await LAY.measureRing(page);
    layout.result.animation = RESULT_ANIMATION;
  }

  // result-plate: the SAME frozen frame with the ring (+ its halo, number and label) and the confetti hidden
  const hidden = await page.evaluate(() => {
    const svg = document.querySelector("svg[viewBox='0 0 120 120']");
    svg.parentElement.setAttribute("data-cap-hide", "ring");
    const bursts = [...document.querySelectorAll("div.pointer-events-none.absolute")].filter((d) => /%/.test(d.style.left) && /%/.test(d.style.top));
    const parents = new Set(bursts.map((b) => b.parentElement));
    parents.forEach((p) => p.setAttribute("data-cap-hide", "confetti"));
    return { confettiLayers: parents.size, bursts: bursts.length };
  });
  await page.waitForTimeout(250); // style recalc + paint (not tied to the frozen rAF loop)
  await still("result-plate", { frozen: true });
  log(`result-plate: hid ring wrapper + ${hidden.bursts} confetti bursts`);
  await page.evaluate(() => document.querySelectorAll("[data-cap-hide]").forEach((e) => e.removeAttribute("data-cap-hide")));
  await L.thawAll(page);
  if (want("layout")) {
    layout.result.plate = {
      file: "still/result-plate.webp",
      hidden: ["the whole ring wrapper (track + progress circle + pulse ring + halo + percentage number + 'MATCH' label)", `the confetti layer (${hidden.bursts} firework bursts)`],
      identicalToResult: "taken from the same frozen frame as still/result.webp, so everything else (background glow, stars, product card incl. its static '98% match' badge, chips, e-mail row, button) is pixel-identical",
      note: "the vector ring should be drawn at layout.result.ring.centre with radiusCss / strokeWidthCss",
    };
  }
  log("result ✓");

  // ── 6. success ──────────────────────────────────────────────────────────────────────────────────
  // The mount time is taken inside the page (MutationObserver), and both stills are frozen at an exact app-time after it,
  // so they do not depend on Playwright round-trips or on how long the previous screenshot took.
  await page.evaluate(() => {
    window.__successMount = null;
    const mo = new MutationObserver(() => {
      if ([...document.querySelectorAll("h2")].some((h) => /^Perfect, /.test(h.textContent))) { window.__successMount = performance.now(); mo.disconnect(); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByText(/I want it/i).click();
  await page.waitForFunction(() => window.__successMount !== null, null, { timeout: 20000 });
  const freezeAt = (ms) => page.waitForFunction((ms) => {
    if (performance.now() - window.__successMount < ms) return false;
    window.__capFreeze();
    return true;
  }, ms, { polling: "raf", timeout: 30000 });
  await freezeAt(SUCCESS_MID_MS); // the entrance animations run on a 1.6 s script: title, product, recipient in, tiles still assembling, planes in flight
  await still("success-mid", { frozen: true });
  await L.thawAll(page);
  await freezeAt(SUCCESS_FINAL_MS); // everything has finished (button, spam note, © line)
  await still("success", { frozen: true });
  if (want("layout")) layout.success = await LAY.measure(page, LAY.SPEC_SUCCESS);
  await L.thawAll(page);
  log("success ✓");

  await browser.close();
  await enc.drain();

  // ── layout.json ─────────────────────────────────────────────────────────────────────────────────
  if (want("layout")) {
    const doc = {
      meta: {
        generatedBy: "video/tools/capture/capture.mjs",
        appUrl: L.APP_URL,
        viewportCss: VIEWPORT, deviceScaleFactor: DPR, imagePx: { width: VIEWPORT.width * DPR, height: VIEWPORT.height * DPR },
        units: "every entry has css {x,y,width,height,right,bottom,cx,cy} in CSS px (viewport coordinates) and norm = the same divided by the viewport (0..1)",
        locale: "en-US (English UI), store = Milano", seed: L.SEED,
        heroProduct: L.HERO,
        cleanBreviaPackshot: L.USE_CLEAN_BREVIA,
        note: "Boxes are getBoundingClientRect() values taken once each screen had settled; transformed elements (rotated stamps, scaled chips) report their visual bounding box.",
      },
      ...layout,
    };
    const file = path.join(OUT_DIR, "layout.json");
    // keep what the follow-up scripts merged into the previous layout.json (email.mjs, extra-stills.mjs --install)
    try {
      const prev = JSON.parse(fs.readFileSync(file, "utf8"));
      if (prev.email) doc.email = prev.email;
      if (prev.result?.ring?.labels) {
        doc.result.ring.labels = prev.result.ring.labels;
        doc.result.ring.labelFlipAfterMs = prev.result.ring.labelFlipAfterMs;
      }
      if (prev.result?.midStill) doc.result.midStill = prev.result.midStill;
      if (prev.quizTutorial?.stills) doc.quizTutorial.stills = prev.quizTutorial.stills;
    } catch { /* first run */ }
    L.writeJson(file, doc);
    log("wrote layout.json");
  }

  const total = written.reduce((s, w) => s + w.bytes, 0);
  log(`done: ${written.length} images, ${(total / 1048576).toFixed(2)} MB`);
  if (deviations.length) console.log("DEVIATIONS:\n - " + deviations.join("\n - "));
}

// ── step helpers ──────────────────────────────────────────────────────────────────────────────────

/** Compare two PNG buffers pixel by pixel (tiny tolerance for compositing noise). */
async function samePixels(a, b) {
  const [ra, rb] = await Promise.all([a, b].map((x) => L.sharp(x).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) return false;
  let bad = 0;
  for (let i = 0; i < ra.data.length; i++) if (Math.abs(ra.data[i] - rb.data[i]) > 3) bad++;
  return bad / ra.data.length < 0.0005;
}

/**
 * Tutorial still. The overlay must have fully entered (button + header boxes unchanged and fully opaque for 1 s, none of
 * their entrance animations running); then +1.5 s; then the clean "NO" moment is caught — NO chip fully lit, YES chip fully
 * dimmed, label entered, demo card crisp and 7-16 px into its flight — and the page is frozen in that very tick.
 */
async function waitTutorialMoment(page) {
  const read = () => page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => /ready/i.test(b.textContent));
    const overlay = btn && btn.closest("div.z-50");
    const header = [...document.querySelectorAll("p")].find((p) => /how does it work/i.test(p.textContent));
    if (!btn || !overlay || !header) return null;
    const op = (e) => parseFloat(getComputedStyle(e).opacity);
    const box = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 100) / 100).join(","); };
    const running = [overlay, header, btn].flatMap((e) => e.getAnimations())
      .filter((a) => { try { return a.effect.getComputedTiming().iterations !== Infinity && a.playState === "running"; } catch (e) { return false; } }).length;
    return { box: box(btn) + "|" + box(header), solid: op(overlay) > 0.9999 && op(btn) > 0.9999 && op(header) > 0.9999 && running === 0 };
  });
  let prev = null, stable = 0;
  const t0 = Date.now();
  while (stable < 10) {
    if (Date.now() - t0 > 25000) throw new Error("tutorial overlay never settled");
    const s = await read();
    stable = s && s.solid && prev === s.box ? stable + 1 : 0;
    prev = s && s.box;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => {
    const label = [...document.querySelectorAll("p")].find((p) => /swipe for no/i.test(p.textContent));
    const demo = document.querySelector("div.h-48.w-40 > div");
    const noSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(1)");
    const yesSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(3)");
    if (!label || !demo || !noSide || !yesSide) return false;
    const op = (e) => parseFloat(getComputedStyle(e).opacity);
    const sc = (e) => { const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); return Math.hypot(m.a, m.b); };
    if (op(label) < 0.999 || op(demo) < 0.999 || op(noSide) < 0.999 || op(yesSide) > 0.23 || sc(noSide) < 1.049 || sc(yesSide) > 0.951) return false;
    const m = new DOMMatrixReadOnly(getComputedStyle(demo).transform);
    const dx = -m.m41; // positive = travelled left, towards NO
    if (!(Math.hypot(m.a, m.b) > 0.999 && dx > 7 && dx < 16)) return false;
    window.__capFreeze(); // stop everything right now: the screenshot that follows takes 0.3-2 s
    return true;
  }, null, { polling: "raf", timeout: 30000 });
}

/** Wait until card n is the only card on screen (previous one fully gone). */
async function waitCard(page, n) {
  const text = L.CARDS[n - 1].text_en;
  await page.waitForFunction((txt) => {
    const cs = document.querySelectorAll("[aria-roledescription='quiz card']");
    return cs.length === 1 && cs[0].getAttribute("aria-label") === txt;
  }, text, { timeout: 20000 });
}

/**
 * Real drag: framer-motion's own pan handler is driven by the mouse; the card, rotation, glow, tint and
 * NO/YES stamp are whatever the app renders for that pointer offset. Returns the per-frame DOM trace.
 */
async function scrub(page, n, dir, enc) {
  const box = await page.locator("[aria-roledescription='quiz card']").boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const trace = [];
  const frozen = await L.freezeAmbient(page);
  const save = async (i, off) => {
    const buf = await page.screenshot({ type: "jpeg", quality: 100, caret: "initial" }); // ~0.45 s vs ~2.2 s for PNG
    const file = path.join(SWIPE, `swipe-${n}-${pad(i)}.webp`);
    await enc.push(async () => note("swipe", await L.writeWebp(buf, file, { quality: 88, width: 1536 })));
    const st = await LAY.readDragState(page);
    trace.push({ frame: i, pointerOffset: Math.round(off * 100) / 100, ...st });
  };

  await page.mouse.move(cx, cy);
  await page.waitForTimeout(120);
  await L.stepAmbient(page, 0);
  await save(0, 0); // card at rest
  await page.mouse.down();
  await page.mouse.move(cx + dir * 8, cy, { steps: 3 }); // cross the drag-start threshold
  for (let i = 1; i < FRAMES; i++) {
    const p = i / (FRAMES - 1);
    const off = dir * (8 + (MAX_OFF - 8) * Math.pow(p, 1.6));
    await page.mouse.move(cx + off, cy);
    await page.waitForTimeout(30);
    await L.stepAmbient(page, (i * 1000) / AMBIENT_FPS);
    await save(i, off);
    if (i % 4 === 3) await page.keyboard.press("Shift"); // keydown counts as activity for the 45 s inactivity reset
  }
  await page.mouse.up();
  await L.releaseAmbient(page);
  log(`swipe ${n}: ${FRAMES} frames (${frozen} ambient animations stepped at ${AMBIENT_FPS} fps)`);
  return trace;
}

// What the source says about the result-screen timing (src/components/MatchResult.tsx) — for the vector ring.
const RESULT_ANIMATION = {
  source: "src/components/MatchResult.tsx (read from code, not measured)",
  mount: "screen enters with opacity 0→1, scale 0.94→1, y 32→0 over 0.4 s [0.16,1,0.3,1]; content column y 40→0 over 0.5 s",
  ringWrapper: "scale 0→1 spring, delay 0.2 s, stiffness 180, damping 22",
  timeline: [
    { tMs: 0, what: "scanning: number flickers random 1..99 and label reads 'scanning...' (muted grey, no gradient)" },
    { tMs: 900, what: "slot-machine phase starts (900 ms of random numbers, slowing after 70%)" },
    { tMs: 1800, what: "ring + count-up start together: 'match' label appears, number turns to the brand gradient, halo + pulse ring start" },
    { tMs: 3600, what: "ring complete (98 %), number = 98" },
  ],
  ring: { durationMs: 1800, ease: "cubic-bezier(0.16, 1, 0.3, 1)", from: 0, to: "matchPercent", strokeDashoffset: "circumference * (1 - value/100)" },
  number: { durationMs: 1800, ease: "1 - (1 - t)^3 (cubic ease-out), rounded", from: 0, to: 98 },
  badgeOnProductImage: "'98% match' badge pops in (spring 280/18) when scanning ends and counts with the number — static 98 % in the plate",
  heroPercent: L.HERO.percent,
};

main().catch((e) => { console.error(e); process.exit(1); });
