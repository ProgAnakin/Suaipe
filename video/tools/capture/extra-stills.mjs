// Extra stills + ring-label styles for the film (follow-up to the first capture):
//
//   still/quiz-tutorial.webp       tutorial overlay FULLY settled and crisp, "swipe for NO" phase (+ quiz-tutorial-yes.webp, YES phase)
//   still/result-mid.webp          result screen with the ring fully in and still SCANNING (slot-machine digits running)
//   layout: result.ring.labels     the ring's label texts ('SCANNING...' while counting, 'MATCH' when done) with font size,
//                                  letter-spacing, colour ... plus the number's style in both states
//
// How the stills are made deterministic:
//   * the tutorial is judged settled when the overlay, header and button are fully opaque, their boxes have not moved for
//     1 s and none of their entrance animations is still running; then +1.5 s; then the script waits for the clean moment of
//     the NO (resp. YES) cycle (chip fully lit, other chip fully dimmed, label entered, demo card crisp and 7-16 px into its
//     flight);
//   * at that exact moment the page is FROZEN (requestAnimationFrame, setInterval and every running CSS / Web-Animations
//     animation are gated by a tiny init script), because a 2x PNG screenshot takes 2-4 s in this sandbox and the kiosk's
//     animations would otherwise move under it; the DOM state is re-read afterwards to prove nothing changed;
//   * result-mid: literally 0.6 s after the last swipe the app is still cross-fading from the quiz to the result screen (a blank
//     navy frame), so the still is taken at the first moment the result screen is fully faded in, the ring wrapper has finished
//     its spring and the label still reads 'scanning...' with random digits running (ring appears in the DOM ~0.72 s after the
//     last swipe click, fully visible ~1.8 s after it).
//
//   node extra-stills.mjs               writes everything under STAGE_DIR (default tools/capture/out/extra-stills, git-ignored)
//   node extra-stills.mjs --install     ... and copies the stills into OUT_DIR/still/ (default video/public/app/still/), never
//                                       replacing a file capture.mjs already made (add --force to replace), and merges the label
//                                       data into OUT_DIR/layout.json (or writes OUT_DIR/ring-labels.json when layout.json does
//                                       not exist yet). Idempotent: run it AFTER capture.mjs, which regenerates layout.json from
//                                       scratch.
// Needs the kiosk dev server (see lib.mjs: APP_URL) and nothing else.
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";

const INSTALL = process.argv.includes("--install");
const FORCE = process.argv.includes("--force");
const STAGE = path.resolve(process.env.STAGE_DIR || path.join(L.HERE, "out", "extra-stills"));
const STILL = L.ensureDir(path.join(STAGE, "still"));
const VERIFY = L.ensureDir(path.join(STAGE, "verify"));
const { VIEWPORT, DPR, log } = L;

const norm = (r) => ({ x: r.x / VIEWPORT.width, y: r.y / VIEWPORT.height, width: r.width / VIEWPORT.width, height: r.height / VIEWPORT.height, cx: r.cx / VIEWPORT.width, cy: r.cy / VIEWPORT.height });
const r3 = (v) => Math.round(v * 1000) / 1000;
const rectJson = (r) => ({
  css: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, r3(v)])),
  norm: Object.fromEntries(Object.entries(norm(r)).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
});

/** Everything the tutorial's 'settled' decision is based on, read from the live DOM. */
const readTutorial = (page) => page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /ready/i.test(b.textContent));
  const overlay = btn && btn.closest("div.z-50");
  const header = [...document.querySelectorAll("p")].find((p) => /how does it work/i.test(p.textContent));
  const label = [...document.querySelectorAll("p")].find((p) => /swipe for (no|yes)/i.test(p.textContent));
  const noSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(1)");
  const yesSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(3)");
  const demo = document.querySelector("div.h-48.w-40 > div");
  if (!btn || !overlay || !header || !label || !noSide || !yesSide) return null;
  const op = (e) => parseFloat(getComputedStyle(e).opacity);
  const box = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 100) / 100); };
  // entrance animations of the overlay itself, its header and its button (the demo card / chips / label keep
  // animating by design: they loop every 1.8 s, so they are judged separately by waitPhaseMoment)
  const finiteRunning = [overlay, header, btn].flatMap((e) => e.getAnimations()).filter((a) => {
    try { return a.effect.getComputedTiming().iterations !== Infinity && a.playState === "running"; } catch (e) { return false; }
  }).length;
  let dx = null, scale = null;
  if (demo) { const m = new DOMMatrixReadOnly(getComputedStyle(demo).transform); dx = m.m41; scale = Math.hypot(m.a, m.b); }
  const chipScale = (e) => { const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); return Math.hypot(m.a, m.b); };
  return {
    btnBox: box(btn), headerBox: box(header), overlayOp: op(overlay), btnOp: op(btn), headerOp: op(header), labelOp: op(label),
    label: label.textContent.trim(), noOp: op(noSide), yesOp: op(yesSide), noScale: chipScale(noSide), yesScale: chipScale(yesSide),
    demoOp: demo ? op(demo) : null, demoDx: dx, demoScale: scale, finiteRunning,
  };
});

/** Overlay fully entered: button / header boxes unchanged and opacity 1 for N consecutive polls, no finite animation running. */
async function waitOverlayStable(page, polls = 10, every = 100, timeout = 20000) {
  const t0 = Date.now();
  let prev = null, ok = 0;
  while (Date.now() - t0 < timeout) {
    const s = await readTutorial(page);
    if (s) {
      const same = prev && JSON.stringify(prev.btnBox) === JSON.stringify(s.btnBox) && JSON.stringify(prev.headerBox) === JSON.stringify(s.headerBox);
      const solid = s.overlayOp > 0.9999 && s.btnOp > 0.9999 && s.headerOp > 0.9999 && s.finiteRunning === 0;
      ok = same && solid ? ok + 1 : 0;
      prev = s;
      if (ok >= polls) return { waitedMs: Date.now() - t0, state: s };
    }
    await page.waitForTimeout(every);
  }
  throw new Error("tutorial overlay never settled");
}

/** A moment where the active side's chip is fully on, the other fully dimmed, the label has entered and the demo card is crisp near the start of its flight. */
async function waitPhaseMoment(page, phase) {
  const sign = phase === "no" ? -1 : 1;
  await page.waitForFunction(({ phase, sign }) => {
    const label = [...document.querySelectorAll("p")].find((p) => new RegExp(`swipe for ${phase}`, "i").test(p.textContent));
    const demo = document.querySelector("div.h-48.w-40 > div");
    const noSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(1)");
    const yesSide = document.querySelector("div.max-w-sm.justify-between > div:nth-child(3)");
    const btn = [...document.querySelectorAll("button")].find((b) => /ready/i.test(b.textContent));
    if (!label || !demo || !noSide || !yesSide || !btn) return false;
    const op = (e) => parseFloat(getComputedStyle(e).opacity);
    const sc = (e) => { const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); return Math.hypot(m.a, m.b); };
    const on = phase === "no" ? noSide : yesSide, off = phase === "no" ? yesSide : noSide;
    if (op(label) < 0.999 || op(demo) < 0.999 || op(on) < 0.999 || op(off) > 0.23 || sc(on) < 1.049 || sc(off) > 0.951) return false;
    const m = new DOMMatrixReadOnly(getComputedStyle(demo).transform);
    const dx = sign * m.m41; // positive = travelled in the swipe direction
    if (!(Math.hypot(m.a, m.b) > 0.999 && dx > 7 && dx < 16)) return false;
    window.__gate.freeze(); // stop the page right here: the screenshot below sees exactly this state
    return true;
  }, { phase, sign }, { polling: "raf", timeout: 30000 });
}

/** CSS-px crop of a PNG screenshot buffer (image px = css px * DPR) saved as PNG for visual verification. */
async function saveCrop(buf, name, css) {
  const f = path.join(VERIFY, name + ".png");
  await L.sharp(buf).extract({ left: Math.round(css.x * DPR), top: Math.round(css.y * DPR), width: Math.round(css.width * DPR), height: Math.round(css.height * DPR) }).toFile(f);
  return f;
}

/** Ring label + number: texts and computed styles, read from the live DOM in whatever state the result screen is in. */
const readRing = (page) => page.evaluate(() => {
  const svg = document.querySelector("svg[viewBox='0 0 120 120']");
  if (!svg) return null;
  const wrapper = svg.parentElement;
  const numEl = [...wrapper.querySelectorAll("span")].find((s) => /^\d+\s*%$/.test(s.textContent.trim()));
  const labEl = numEl && numEl.nextElementSibling;
  if (!numEl || !labEl) return null;
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
  const hex = (rgb) => { const m = rgb.match(/rgba?\(([^)]+)\)/); if (!m) return rgb; const p = m[1].split(",").map((s) => parseFloat(s)); return "#" + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") + (p.length > 3 && p[3] < 1 ? ` @${p[3]}` : ""); };
  const pick = (cs, keys) => Object.fromEntries(keys.map((k) => [k, cs[k]]));
  const ls = getComputedStyle(labEl), ns = getComputedStyle(numEl);
  const fs = parseFloat(ls.fontSize), lsp = parseFloat(ls.letterSpacing);
  const root = getComputedStyle(document.documentElement);
  const progress = svg.querySelectorAll("circle")[1];
  const off = parseFloat(getComputedStyle(progress).strokeDashoffset), circ = 2 * Math.PI * progress.r.baseVal.value;
  return {
    number: { text: numEl.textContent.trim(), rect: rect(numEl), classes: numEl.className,
      style: pick(ns, ["fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing", "fontVariantNumeric", "color", "backgroundImage", "webkitTextFillColor"]),
      colourHex: hex(ns.color) },
    label: { raw: labEl.textContent, shownAs: labEl.innerText, rect: rect(labEl), classes: labEl.className,
      style: pick(ls, ["fontSize", "fontWeight", "fontFamily", "letterSpacing", "textTransform", "lineHeight", "color", "marginTop", "opacity"]),
      colourHex: hex(ls.color), fontSizePx: fs, letterSpacingPx: lsp, letterSpacingEm: Math.round((lsp / fs) * 1000) / 1000,
      cssVar: { mutedForeground: root.getPropertyValue("--muted-foreground").trim() } },
    ringSvg: rect(svg), ringFraction: Math.round((1 - off / circ) * 10000) / 10000,
  };
});

async function main() {
  await L.assertAppIsUp();
  const browser = await L.launch();
  const { ctx, page } = await L.makeSession(browser);
  // Time gate: lets us freeze the page at an exact moment (requestAnimationFrame, setInterval and every running
  // CSS / Web-Animations animation), so the 2-3 s a 2x PNG screenshot takes in this sandbox cannot smear the state.
  await ctx.addInitScript(() => {
    const realRaf = window.requestAnimationFrame.bind(window);
    const realCaf = window.cancelAnimationFrame.bind(window);
    const realSetInterval = window.setInterval.bind(window);
    let frozen = false;
    let paused = [];
    const queued = new Map();
    window.requestAnimationFrame = (cb) => {
      const id = realRaf((t) => { if (frozen) queued.set(id, cb); else cb(t); });
      return id;
    };
    window.cancelAnimationFrame = (id) => { queued.delete(id); realCaf(id); };
    window.setInterval = (fn, ms, ...args) => realSetInterval((...a) => { if (!frozen) fn(...a); }, ms, ...args);
    window.__gate = {
      freeze() {
        frozen = true;
        paused = document.getAnimations().filter((a) => a.playState === "running");
        paused.forEach((a) => a.pause());
        return paused.length;
      },
      release() {
        frozen = false;
        paused.forEach((a) => { try { a.play(); } catch (e) { /* cancelled */ } });
        paused = [];
        const items = [...queued.values()];
        queued.clear();
        items.forEach((cb) => realRaf((t) => cb(t)));
      },
    };
    window.addEventListener("click", (e) => { window.__lastClickT = e.timeStamp; }, true);
  });
  const report = { tutorial: {}, result: {} };
  const still = async (name, buf) => {
    const r = await L.writeWebp(buf, path.join(STILL, `${name}.webp`), { quality: 90, width: 2048 });
    log(`still ${name.padEnd(20)} ${r.width}x${r.height} ${(r.bytes / 1024).toFixed(0)} KB`);
    return r;
  };

  // ── attract -> welcome (filled) ──────────────────────────────────────────────────────────────
  await page.goto(L.APP_URL, { waitUntil: "load" });
  const tap = page.getByText(/tap to start/i).first();
  await tap.waitFor();
  await L.fontsReady(page);
  await page.waitForTimeout(1900);
  await tap.click();
  const inFirst = page.getByPlaceholder("First name");
  await inFirst.waitFor();
  await page.waitForTimeout(1700);
  await inFirst.fill("Marco");
  await page.getByPlaceholder("Last name").fill("Rossi");
  await page.getByPlaceholder("Your email").fill("marco.rossi@example.com");
  await page.locator('input[type="checkbox"]').check();
  await page.waitForTimeout(600);

  // ── tutorial: settle, then +1.5 s, then wait for the clean NO moment ─────────────────────────
  await page.getByText(/start the game/i).click();
  await page.getByText(/ready/i).first().waitFor({ timeout: 15000 });
  await L.fontsReady(page);
  const stable = await waitOverlayStable(page);
  log(`tutorial overlay stable after ${stable.waitedMs} ms (button ${JSON.stringify(stable.state.btnBox)})`);
  await page.waitForTimeout(1500);
  report.tutorial.settle = { overlayStableAfterMs: stable.waitedMs, extraWaitMs: 1500, stableButtonBoxCss: stable.state.btnBox };

  for (const phase of ["no", "yes"]) {
    await waitPhaseMoment(page, phase); // freezes the page on success
    const before = await readTutorial(page);
    const buf = await page.screenshot({ type: "png", caret: "hide" });
    const after = await readTutorial(page);
    const same = after.label === before.label && after.demoDx === before.demoDx && after.noOp === before.noOp && after.yesOp === before.yesOp;
    log(`tutorial ${phase}: frozen at demo dx ${before.demoDx.toFixed(1)} px, label "${before.label}", state unchanged during the screenshot: ${same}`);
    if (!same) throw new Error("page was not frozen");
    const name = phase === "no" ? "quiz-tutorial" : "quiz-tutorial-yes";
    const w = await still(name, buf);
    // crops at native 2x for the visual sharpness check
    await saveCrop(buf, `${name}-header-chips`, { x: 200, y: 480, width: 624, height: 330 });
    await saveCrop(buf, `${name}-label-button`, { x: 280, y: 790, width: 464, height: 180 });
    await L.sharp(buf).resize({ width: 1024 }).png().toFile(path.join(VERIFY, `${name}-overview.png`));
    report.tutorial[name] = { file: `still/${name}.webp`, image: { width: w.width, height: w.height }, domAtCapture: after };
    await page.evaluate(() => window.__gate.release());
  }

  // ── the eight cards (same real flow as capture.mjs) ──────────────────────────────────────────
  await page.getByText(/ready/i).first().click();
  await page.waitForTimeout(900);
  const YES = new Set(L.SWIPE_DIRS.flatMap((d, i) => (d > 0 ? [i + 1] : [])));
  let tSwipe = 0;
  for (let n = 1; n <= 8; n++) {
    const text = L.CARDS[n - 1].text_en;
    await page.waitForFunction((txt) => {
      const cs = document.querySelectorAll("[aria-roledescription='quiz card']");
      return cs.length === 1 && cs[0].getAttribute("aria-label") === txt;
    }, text, { timeout: 20000 });
    await page.waitForTimeout(n === 1 ? 700 : 500);
    const btn = page.getByRole("button", { name: YES.has(n) ? /^\W*YES\W*$/ : /^\W*NO\W*$/ }).first();
    if (n === 8) {
      await page.evaluate(() => {
        new MutationObserver((_, ob) => {
          if (document.querySelector("svg[viewBox='0 0 120 120']")) { window.__ringInDomMs = performance.now() - window.__lastClickT; ob.disconnect(); }
        }).observe(document.body, { childList: true, subtree: true });
      });
    }
    await btn.click();
    tSwipe = Date.now();
    log(`card ${n} answered ${YES.has(n) ? "YES" : "NO"}`);
  }

  // ── result-mid: ring fully in, still SCANNING, slot-machine digits running (frozen for the screenshot) ─────────
  await page.waitForFunction(() => {
    const svg = document.querySelector("svg[viewBox='0 0 120 120']");
    if (!svg) return false;
    for (let e = svg; e && e !== document.body; e = e.parentElement) if (parseFloat(getComputedStyle(e).opacity) < 0.999) return false;
    const sc = new DOMMatrixReadOnly(getComputedStyle(svg.parentElement).transform);
    if (Math.hypot(sc.a, sc.b) < 0.999) return false;
    const num = [...svg.parentElement.querySelectorAll("span")].find((x) => /^\d+\s*%$/.test(x.textContent.trim()));
    const lab = num && num.nextElementSibling;
    if (!(num && /scanning/i.test(lab.textContent) && parseInt(num.textContent, 10) >= 10)) return false;
    window.__gate.freeze();
    return true;
  }, null, { timeout: 15000, polling: "raf" });
  const midState = await page.evaluate(() => ({ msSinceLastSwipeClick: Math.round(performance.now() - window.__lastClickT), ringInDomMsAfterClick: Math.round(window.__ringInDomMs) }));
  const midBuf = await page.screenshot({ type: "png", caret: "hide" });
  const scanRing = await readRing(page);
  await page.evaluate(() => window.__gate.release());
  const wMid = await still("result-mid", midBuf);
  await L.sharp(midBuf).resize({ width: 1024 }).png().toFile(path.join(VERIFY, "result-mid-overview.png"));
  await saveCrop(midBuf, "result-mid-ring", { x: 330, y: 200, width: 364, height: 300 });
  report.result.mid = { file: "still/result-mid.webp", image: { width: wMid.width, height: wMid.height }, domAtCapture: midState, ring: scanRing };
  log(`result-mid: frozen ${midState.msSinceLastSwipeClick} ms after the last click (ring entered the DOM at +${midState.ringInDomMsAfterClick} ms): label "${scanRing.label.shownAs}", number "${scanRing.number.text}"`);

  // ── match state (done) ───────────────────────────────────────────────────────────────────────
  await page.waitForFunction(() => {
    const svg = document.querySelector("svg[viewBox='0 0 120 120']");
    if (!svg) return false;
    const off = parseFloat(getComputedStyle(svg.querySelectorAll("circle")[1]).strokeDashoffset);
    const num = [...svg.parentElement.querySelectorAll("span")].find((s) => /^\d+\s*%$/.test(s.textContent.trim()));
    return !!num && /^98\s*%$/.test(num.textContent.trim()) && Math.abs(off - 7.037) < 0.06;
  }, null, { timeout: 25000, polling: 100 });
  await page.waitForTimeout(900);
  const matchRing = await readRing(page);
  log(`match: label "${matchRing.label.shownAs}" number "${matchRing.number.text}"`);

  // ── ring-labels.json ─────────────────────────────────────────────────────────────────────────
  const entry = (ring, whenCounting) => ({
    when: whenCounting,
    label: {
      text: ring.label.raw, shownAs: ring.label.shownAs, textTransform: ring.label.style.textTransform,
      fontSizePx: ring.label.fontSizePx, fontWeight: Number(ring.label.style.fontWeight), letterSpacingPx: ring.label.letterSpacingPx, letterSpacingEm: ring.label.letterSpacingEm,
      color: ring.label.style.color, colourHex: ring.label.colourHex, fontFamily: ring.label.style.fontFamily, lineHeight: ring.label.style.lineHeight, marginTopPx: parseFloat(ring.label.style.marginTop),
      tailwind: ring.label.classes, rect: rectJson(ring.label.rect),
    },
    number: {
      text: ring.number.text, fontSizePx: parseFloat(ring.number.style.fontSize), fontWeight: Number(ring.number.style.fontWeight), lineHeight: ring.number.style.lineHeight,
      color: ring.number.style.color, colourHex: ring.number.colourHex, backgroundImage: ring.number.style.backgroundImage, textFillColor: ring.number.style.webkitTextFillColor,
      fontVariantNumeric: ring.number.style.fontVariantNumeric, tailwind: ring.number.classes, rect: rectJson(ring.number.rect),
    },
    ringSvg: rectJson(ring.ringSvg), ringFraction: ring.ringFraction,
  });
  const doc = {
    meta: {
      generatedBy: "video/tools/capture/extra-stills.mjs (reuses lib.mjs)", appUrl: L.APP_URL,
      viewportCss: VIEWPORT, deviceScaleFactor: DPR,
      note: "Merge under result.ring.labels of public/app/layout.json. Values are getComputedStyle() / getBoundingClientRect() of the live kiosk (en-US, Space Grotesk). 'shownAs' is what the user sees (text-transform: uppercase).",
    },
    result: {
      ring: {
        labels: {
          scanning: entry(scanRing, "from mount until the ring starts to fill (0-1.8 s after the screen appears): '0%' for 0.9 s, then random 1..99 digits for 0.9 s (see still/result-mid.webp)"),
          match: entry(matchRing, "from 1.8 s after mount: count-up 0->98 over 1.8 s, label flips to MATCH, number turns to the brand gradient"),
        },
        labelFlipAfterMs: 1800,
      },
    },
    capture: report,
  };
  fs.writeFileSync(path.join(STAGE, "ring-labels.json"), JSON.stringify(doc, null, 2) + "\n");
  log(`wrote ${path.join(STAGE, "ring-labels.json")}`);
  await browser.close();
  if (INSTALL) install(doc);
}

/** Copy the stills into OUT_DIR/still and merge the label data into OUT_DIR/layout.json (atomic writes). */
function install(doc) {
  const atomic = (file, data) => { const tmp = `${file}.tmp-${process.pid}`; fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); };
  const dest = L.ensureDir(path.join(L.OUT_DIR, "still"));
  const installed = new Set();
  for (const f of fs.readdirSync(STILL).filter((x) => x.endsWith(".webp"))) {
    if (fs.existsSync(path.join(dest, f)) && !FORCE) { log(`kept existing still/${f} (use --force to replace)`); continue; }
    atomic(path.join(dest, f), fs.readFileSync(path.join(STILL, f)));
    installed.add(path.basename(f, ".webp"));
    log(`installed still/${f}`);
  }
  const layoutFile = path.join(L.OUT_DIR, "layout.json");
  // describe a tutorial still only when THIS run's file is the one in place (a kept capture.mjs still has other capture data)
  const stills = Object.fromEntries(["quiz-tutorial", "quiz-tutorial-yes"].filter((n) => installed.has(n)).map((n) => [n, doc.capture.tutorial[n]]));
  if (fs.existsSync(layoutFile)) {
    const layout = JSON.parse(fs.readFileSync(layoutFile, "utf8"));
    layout.result = layout.result || {};
    layout.result.ring = layout.result.ring || {};
    layout.result.ring.labels = doc.result.ring.labels;
    layout.result.ring.labelFlipAfterMs = doc.result.ring.labelFlipAfterMs;
    layout.result.midStill = { file: "still/result-mid.webp", note: "ring fully in, label 'SCANNING...', slot-machine digits running", capture: doc.capture.result.mid.domAtCapture };
    layout.quizTutorial = layout.quizTutorial || {};
    layout.quizTutorial.stills = { settle: doc.capture.tutorial.settle, ...stills };
    atomic(layoutFile, JSON.stringify(layout, null, 2) + "\n");
    log(`merged ring labels + tutorial still info into ${layoutFile}`);
  } else {
    atomic(path.join(L.OUT_DIR, "ring-labels.json"), JSON.stringify(doc, null, 2) + "\n");
    log(`layout.json does not exist yet -> wrote ${path.join(L.OUT_DIR, "ring-labels.json")} (re-run with --install after capture.mjs to merge)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
