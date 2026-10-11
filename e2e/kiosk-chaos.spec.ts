import { test, expect, type Page } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";
import {
  VISITOR, answerAll, appErrors, attractCta, boot, claimButton, fillWelcome, restartButton, startGame, tapToStart,
} from "./support/kiosk";

// Brute force: a seeded random sequence of everything a customer (or a child, or a cat) can do to
// an iPad — tap anything, drag half a card, mash the keys, type nonsense, rotate the tablet, lose
// the wifi for a second — and the kiosk must never crash, never leave an error screen, and still
// be able to serve the next customer afterwards. A failure prints the seed and the action log, so
// it replays exactly.

test.use({ serviceWorkers: "block" });
test.describe.configure({ timeout: 180_000 });

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZES = [[1024, 1366], [1366, 1024], [834, 1194], [1133, 744], [390, 844]] as const;
const KEYS = ["Enter", "Escape", "ArrowLeft", "ArrowRight", "Tab", "Space", "Backspace", "Shift"];
const GIBBERISH = ["", "a", "Marco", "'; DROP TABLE quiz_sessions;--", "😀😀😀", "‮evil", "x".repeat(400), "O’Connor", "<b>bold</b>", "   ", "a@b.co", "no-at-sign", "ünïcödé"];

async function act(page: Page, pick: () => number, log: string[]) {
  const r = pick();
  const buttons = page.locator("button:visible");
  const nButtons = await buttons.count().catch(() => 0);
  const quiet = { timeout: 1_200 };
  try {
    if (r < 0.34 && nButtons) { // tap a random button
      const i = Math.floor(pick() * nButtons);
      log.push(`tap button #${i}`);
      await buttons.nth(i).click(quiet);
    } else if (r < 0.5) { // drag the card: a swipe, half a swipe, a cancelled one, in any direction
      const card = page.locator("[aria-roledescription='quiz card']").first();
      const box = await card.boundingBox({ timeout: 500 }).catch(() => null);
      if (box) {
        const [dx, dy] = [(pick() - 0.5) * 700, (pick() - 0.5) * 300];
        log.push(`drag card (${Math.round(dx)}, ${Math.round(dy)})`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + dx / 2, box.y + box.height / 2 + dy / 2, { steps: 4 });
        if (pick() < 0.8) await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 4 });
        await page.mouse.up();
      } else log.push("drag: no card");
    } else if (r < 0.62) { // keys
      const key = KEYS[Math.floor(pick() * KEYS.length)];
      log.push(`key ${key}`);
      await page.keyboard.press(key);
    } else if (r < 0.74) { // type nonsense into a field
      const input = page.locator("input:visible").first();
      if (await input.count()) {
        const text = GIBBERISH[Math.floor(pick() * GIBBERISH.length)];
        log.push(`type ${JSON.stringify(text.slice(0, 20))}`);
        await input.fill(text, quiet);
      }
    } else if (r < 0.82) { // double / triple tap somewhere on the screen
      const vp = page.viewportSize()!;
      const [x, y] = [pick() * vp.width, pick() * vp.height];
      log.push(`triple tap (${Math.round(x)}, ${Math.round(y)})`);
      await page.mouse.click(x, y, { clickCount: 3, delay: 20 });
    } else if (r < 0.88) { // rotate / resize the tablet
      const [w, h] = SIZES[Math.floor(pick() * SIZES.length)];
      log.push(`resize ${w}x${h}`);
      await page.setViewportSize({ width: w, height: h });
    } else if (r < 0.93) { // lose the wifi for a moment
      log.push("offline blip");
      await page.context().setOffline(true);
      await page.waitForTimeout(200 + pick() * 600);
      await page.context().setOffline(false);
    } else if (r < 0.97) { // wheel / scroll
      log.push("wheel");
      await page.mouse.wheel(0, (pick() - 0.5) * 800);
    } else { // pause
      const ms = 100 + Math.floor(pick() * 700);
      log.push(`wait ${ms}ms`);
      await page.waitForTimeout(ms);
    }
  } catch (e) {
    // the target moved or vanished mid-action: that is the point of the exercise, not a failure
    log.push(`(action gave up: ${String(e).split("\n")[0].slice(0, 80)})`);
  }
}

for (const seed of [11, 22, 33, 44, 55, 66]) {
  test(`chaos seed ${seed}: 90 random actions, then the next customer is served normally`, async ({ page }) => {
    const backend = new MockBackend();
    const { errors, t } = await boot(page, { backend });
    const pick = rng(seed);
    const log: string[] = [];
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    // start somewhere interesting about half of the time
    if (pick() < 0.5) { await tapToStart(page, t); if (pick() < 0.5) { await fillWelcome(page, t); } }

    for (let i = 0; i < 90; i++) {
      await act(page, pick, log);
      const crashed = await page.getByTestId("error-boundary").count();
      expect(crashed, `error screen after action ${i}\n${log.slice(-12).join("\n")}`).toBe(0);
    }
    await page.context().setOffline(false);
    await page.setViewportSize({ width: 1194, height: 834 });

    expect(pageErrors, `uncaught exceptions (seed ${seed})\n${log.slice(-15).join("\n")}`).toEqual([]);
    expect(appErrors(errors), `console errors (seed ${seed})`).toEqual([]);

    // whatever happened, a reload brings the kiosk back, and the next customer can finish a visit
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(attractCta(page, t)).toBeVisible();
    const before = backend.rows("quiz_sessions").length;
    await tapToStart(page, t);
    await fillWelcome(page, t, { first: "Ana", last: "Souza", email: `chaos${seed}@example.com` });
    await startGame(page, t);
    await answerAll(page, t);
    await expect(claimButton(page, t)).toBeVisible({ timeout: 20_000 });
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: 15_000 });
    expect(backend.rows("quiz_sessions")).toHaveLength(before + 1);
  });
}

// Twelve visits in a row, as a busy afternoon. CI's software-rendered WebKit is several times slower than an
// iPad, so its job sets SOAK_VISITS=5 (three is the least that leaves something to compare).
const VISITS = Math.max(3, Number(process.env.SOAK_VISITS ?? 12));

test(`soak: ${VISITS} visits in a row without a reload — nothing accumulates`, async ({ page }) => {
  test.setTimeout(420_000);
  await page.context().addInitScript(() => {
    // Track audio contexts that are open AT THE SAME TIME: iOS Safari allows only a handful per page, and
    // a kiosk that never closes them stops making sound after a few customers. (Creating one per screen
    // is fine as long as each is closed again.)
    type W = { __audio: { open: number; maxOpen: number; created: number }; AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const w = window as unknown as W;
    w.__audio = { open: 0, maxOpen: 0, created: 0 };
    for (const key of ["AudioContext", "webkitAudioContext"] as const) {
      const Native = w[key];
      if (!Native) continue;
      w[key] = class extends Native {
        private __closed = false;
        constructor(...a: ConstructorParameters<typeof AudioContext>) {
          super(...a);
          w.__audio.created++;
          w.__audio.open++;
          w.__audio.maxOpen = Math.max(w.__audio.maxOpen, w.__audio.open);
        }
        close() {
          if (!this.__closed) { this.__closed = true; w.__audio.open--; }
          return super.close();
        }
      } as typeof AudioContext;
    }
  });
  const backend = new MockBackend();
  const { errors, t } = await boot(page, { backend });
  const nodes: number[] = [];
  const heap: number[] = [];

  for (let visit = 1; visit <= VISITS; visit++) {
    await tapToStart(page, t);
    await fillWelcome(page, t, { ...VISITOR, email: `soak${visit}@example.com` });
    await startGame(page, t);
    await answerAll(page, t);
    await expect(claimButton(page, t)).toBeVisible({ timeout: 20_000 });
    await claimButton(page, t).click();
    await expect(restartButton(page, t)).toBeVisible({ timeout: 15_000 });
    await restartButton(page, t).click();
    await expect(attractCta(page, t)).toBeVisible();
    await page.waitForTimeout(800);
    nodes.push(await page.evaluate(() => document.querySelectorAll("*").length));
    heap.push(await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0));
  }

  expect(backend.rows("quiz_sessions")).toHaveLength(VISITS);
  expect(backend.rows("quiz_funnel_events")).toHaveLength(VISITS * 3); // started, result shown, claimed — once per visit
  // the DOM at the attract screen is the same size after the last visit as after the second
  expect(Math.max(...nodes.slice(1)) - Math.min(...nodes.slice(1)), `DOM nodes per visit: ${nodes.join(", ")}`).toBeLessThanOrEqual(Math.ceil(nodes[1] * 0.05));
  const audio = await page.evaluate(() => (window as unknown as { __audio: { open: number; maxOpen: number; created: number } }).__audio);
  expect(audio.maxOpen, `audio contexts open at once (${audio.created} created over ${VISITS} visits)`).toBeLessThanOrEqual(3);
  expect(audio.open, "audio contexts still open after the last visit").toBeLessThanOrEqual(3);
  if (heap[1] > 0) expect(heap.at(-1)!, `JS heap per visit: ${heap.join(", ")}`).toBeLessThan(heap[1] * 2.5);
  expect(appErrors(errors)).toEqual([]);
});
