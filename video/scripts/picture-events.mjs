// Writes audio/picture-events.json: everything the picture does that deserves a sound (see scripts/lib/picture-events.mjs), with a summary.
// Run: node scripts/picture-events.mjs [--md]     (npm run events)
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { pictureEvents } from "./lib/picture-events.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = async (rel, tag) => {
  const js = transformSync(readFileSync(join(root, rel), "utf8"), { loader: "ts", format: "esm" }).code;
  const tmp = join(tmpdir(), `suaipe-${tag}-${process.pid}.mjs`);
  writeFileSync(tmp, js);
  return import(pathToFileURL(tmp).href);
};
const T = await load("src/timeline.ts", "timeline");
const events = pictureEvents(T);

mkdirSync(join(root, "audio"), { recursive: true });
writeFileSync(join(root, "audio/picture-events.json"), JSON.stringify({ duration: T.DURATION_S, count: events.length, events }, null, 1) + "\n");

const by = (key) => events.reduce((m, e) => ((m[e[key]] = (m[e[key]] || 0) + 1), m), {});
const perSecond = new Array(Math.ceil(T.DURATION_S)).fill(0);
events.filter((e) => !e.silent).forEach((e) => perSecond[Math.min(perSecond.length - 1, Math.floor(e.t))]++);
const peak = Math.max(...perSecond);
console.log(`audio/picture-events.json: ${events.length} events (${events.filter((e) => e.silent).length} deliberately silent), peak ${peak} in one second (${perSecond.indexOf(peak)}-${perSecond.indexOf(peak) + 1} s)`);
console.log("by scene:", JSON.stringify(by("scene")));
console.log("by tier: ", JSON.stringify(by("tier")));
if (process.argv.includes("--md")) {
  console.log("\n| t | scene | kind | tier | what happens |\n|---|---|---|---|---|");
  for (const e of events) console.log(`| ${e.t.toFixed(3)}${e.t1 ? `–${e.t1.toFixed(2)}` : ""} | ${e.scene} | ${e.kind} | ${e.tier} | ${e.label}${e.silent ? " *(silent: " + e.silent + ")*" : ""} |`);
}
