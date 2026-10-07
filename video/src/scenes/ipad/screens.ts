import { IPAD, swipeAccent } from "../../timeline";

/** One full-screen still of the captured app, with the window in which it is on screen (film seconds). */
export type ScreenLayer = {
  key: string;
  still: string;
  from: number;
  to: number;
  /** fade/push-in and push-out durations */
  inD: number;
  outD: number;
  /** card entrances get a slightly stronger scale-in */
  card?: boolean;
};

const S = IPAD.swipes;

export const SCREEN_LAYERS: ScreenLayer[] = [
  { key: "attract", still: "attract", from: 0, to: IPAD.welcomeIn + 0.3, inD: 0.01, outD: 0.22 },
  { key: "welcome-empty", still: "welcome-empty", from: IPAD.welcomeIn + 0.16, to: IPAD.consent + 0.12, inD: 0.38, outD: 0.12 },
  { key: "welcome-filled", still: "welcome-filled", from: IPAD.consent, to: IPAD.tap2 + 0.5, inD: 0.12, outD: 0.42 },
  // the app's own tutorial demonstrates a NO swipe, then a YES swipe — both phases are real captures
  { key: "quiz-tutorial", still: "quiz-tutorial", from: IPAD.tap2 + 0.08, to: IPAD.tap2 + 0.78, inD: 0.4, outD: 0.25 },
  { key: "quiz-tutorial-yes", still: "quiz-tutorial-yes", from: IPAD.tap2 + 0.6, to: IPAD.tap3 + 0.38, inD: 0.25, outD: 0.3 },
  ...S.map((s, i) => ({
    key: `card-${i + 1}`,
    still: `card-${i + 1}`,
    from: s.enter,
    to: s.start + 0.05,
    inD: i === 0 ? 0.3 : i === 1 ? 0.26 : 0.16,
    outD: 0.05,
    card: true,
  })),
  { key: "result-plate", still: "result-plate", from: IPAD.counterStart - 0.04, to: IPAD.tap4 + 0.4, inD: 0.18, outD: 0.4 },
  { key: "success-mid", still: "success-mid", from: IPAD.successIn, to: IPAD.successIn + 0.75, inD: 0.3, outD: 0.35 },
  { key: "success", still: "success", from: IPAD.successIn + 0.45, to: IPAD.exit + 1.2, inD: 0.4, outD: 0.3 },
];

export type SwipeWindow = { card: number; from: number; to: number; dir: 1 | -1; accent: number };
export const SWIPES: SwipeWindow[] = S.map((s, i) => ({
  card: i + 1,
  from: s.start,
  to: s.start + s.dur,
  dir: s.dir as 1 | -1,
  accent: swipeAccent(s),
}));
export const SWIPE_FRAMES = 48;
