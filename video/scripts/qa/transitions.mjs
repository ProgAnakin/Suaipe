// Prints the film's scene-to-scene transitions as JSON, derived from the chapter overlaps in src/timeline.ts, so the QA scripts never
// carry a hand-copied list. The presentation names mirror src/SuaipeFilm.tsx (one line per <TransitionSeries.Transition>).
// Run: node scripts/qa/transitions.mjs
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const js = transformSync(readFileSync(join(root, "src/timeline.ts"), "utf8"), { loader: "ts", format: "esm" }).code;
const tmp = join(tmpdir(), `suaipe-timeline-${process.pid}.mjs`);
writeFileSync(tmp, js);
const { CHAPTER: C } = await import(pathToFileURL(tmp).href);

const SEQUENCE = [
  ["hook", "lockup", "flashThrough", "hook -> lock-up"],
  ["lockup", "ipad", "passthrough", "lock-up -> hand-off/iPad"],
  ["ipad", "phone", "swapSlide", "iPad -> iPhone"],
  ["phone", "store", "dropOut", "iPhone -> manager & stats"],
  ["store", "consult", "swapSlide", "manager & stats -> consultants"],
  ["consult", "system", "dropOut", "consultants -> system"],
  ["system", "human", "photoCut", "system -> human close"],
  ["human", "end", "defocus", "human close -> end card"],
];
const out = SEQUENCE.map(([a, b, kind, name]) => ({ name, kind, start: +C[b].from.toFixed(3), end: +C[a].to.toFixed(3) }));
console.log(JSON.stringify(out));
