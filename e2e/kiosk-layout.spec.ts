import { test, expect, type Page } from "@playwright/test";
import { translations, type Lang } from "../src/i18n/translations";
import { BROKEN_TEXT, answerAll, appErrors, attractCta, boot, claimButton, fillWelcome, noButton, restartButton, screenText, startButton, startGame, tapToStart, yesButton, T } from "./support/kiosk";

// Every screen of the kiosk, in every language and on every screen size an iPad (or a phone, or a
// desktop browser) can have: nothing the customer must tap may sit outside the screen or under
// something else — the kiosk locks the page against scrolling, so a button that does not fit is
// a customer who is stuck — and no screen may print "undefined", "NaN" or a raw template.

test.use({ serviceWorkers: "block" });
test.describe.configure({ timeout: T(90_000) });

const LANGS = Object.keys(translations) as Lang[];

/**
 * CSS pixels. iPad Pro 12.9" / 11" / mini in both orientations (the 10.2" and 10.9" iPads sit between
 * them), a phone in portrait (someone opening the demo link) and a desktop. Phones in landscape and the
 * 320 px iPhone SE are not supported sizes: this is a tablet kiosk.
 */
const VIEWPORTS: Array<[string, number, number]> = [
  ["iPad Pro 12.9 portrait", 1024, 1366],
  ["iPad Pro 12.9 landscape", 1366, 1024],
  ["iPad Pro 11 portrait", 834, 1194],
  ["iPad Pro 11 landscape", 1194, 834],
  ["iPad mini portrait", 744, 1133],
  ["iPad mini landscape", 1133, 744],
  ["iPhone 14 portrait", 390, 844],
  ["desktop", 1440, 900],
];

/**
 * Wait until the element has stopped moving (its entrance animation is over). A fixed pause is not enough
 * on a slow, software-rendered browser (CI WebKit): the frames of a spring animation arrive late, so a
 * measurement taken 600 ms after the screen appeared can still see it mid-flight.
 */
async function settled(locator: ReturnType<Page["locator"]>, timeoutMs = 8_000) {
  const t0 = Date.now();
  let prev = JSON.stringify(await locator.boundingBox());
  for (let still = 0; still < 3 && Date.now() - t0 < timeoutMs;) {
    await new Promise((r) => setTimeout(r, 150));
    const now = JSON.stringify(await locator.boundingBox());
    still = now === prev ? still + 1 : 0;
    prev = now;
  }
}

/** The element is fully on screen and nothing sits on top of its centre. */
async function expectReachable(page: Page, locator: ReturnType<Page["locator"]>, what: string) {
  await settled(locator);
  const box = await locator.boundingBox();
  const vp = page.viewportSize()!;
  expect(box, `${what}: not rendered`).not.toBeNull();
  expect(box!.x, `${what}: starts left of the screen`).toBeGreaterThanOrEqual(-1);
  expect(box!.y, `${what}: starts above the screen`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${what}: runs past the right edge (${Math.round(box!.x + box!.width)} > ${vp.width})`).toBeLessThanOrEqual(vp.width + 1);
  expect(box!.y + box!.height, `${what}: runs past the bottom edge (${Math.round(box!.y + box!.height)} > ${vp.height})`).toBeLessThanOrEqual(vp.height + 1);
  const covered = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(top && (el === top || el.contains(top)));
  });
  expect(covered, `${what}: something covers its centre`).toBe(false);
}

async function expectNoHorizontalOverflow(page: Page, what: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${what}: the page is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
}

test.describe("every language", () => {
  for (const lang of LANGS) {
    test(`${lang}: the whole visit prints no broken text and ends in a stored lead`, async ({ page }) => {
      const { backend, errors, t } = await boot(page, { lang });
      const seen: string[] = [];
      const check = async (screen: string) => {
        const text = await screenText(page);
        seen.push(screen);
        expect(BROKEN_TEXT.test(text), `${lang}/${screen}: "${text.match(BROKEN_TEXT)?.[0]}" is on screen`).toBe(false);
      };

      await expect(attractCta(page, t)).toBeVisible();
      await check("attract");
      await tapToStart(page, t);
      await check("welcome");
      await fillWelcome(page, t);
      await startGame(page, t);
      await check("quiz");
      await answerAll(page, t, [true, false, true, true, false, true, false, true]);
      await expect(claimButton(page, t)).toBeVisible({ timeout: T(20_000) });
      await check("result");
      await claimButton(page, t).click();
      await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
      await check("success");

      expect(backend.rows("quiz_sessions")).toHaveLength(1);
      expect(backend.rows("quiz_sessions")[0].language).toBe(lang);
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
      expect(appErrors(errors)).toEqual([]);
    });
  }
});

test.describe("every screen size", () => {
  for (const [name, width, height] of VIEWPORTS) {
    test(`${name} (${width}×${height}): every button the customer needs is on screen and tappable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const { t } = await boot(page);

      await expectNoHorizontalOverflow(page, "attract");
      await expectReachable(page, attractCta(page, t), "attract: Tap to start");

      await tapToStart(page, t);
      await expectNoHorizontalOverflow(page, "welcome");
      await fillWelcome(page, t);
      await expectReachable(page, startButton(page, t), "welcome: START");

      await startGame(page, t);
      await expectNoHorizontalOverflow(page, "quiz");
      await expectReachable(page, yesButton(page, t), "quiz: YES");
      await expectReachable(page, noButton(page, t), "quiz: NO");

      await answerAll(page, t);
      await expect(claimButton(page, t)).toBeVisible({ timeout: T(20_000) });
      await page.waitForTimeout(600);
      await expectNoHorizontalOverflow(page, "result");
      await expectReachable(page, claimButton(page, t), "result: I want it");

      await claimButton(page, t).click();
      await expect(restartButton(page, t)).toBeVisible({ timeout: T(15_000) });
      await page.waitForTimeout(600);
      await expectNoHorizontalOverflow(page, "success");
      await expectReachable(page, restartButton(page, t), "success: Play again");
    });
  }
});
