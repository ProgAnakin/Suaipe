// Reading-time audit of every piece of on-screen copy (src/timeline.ts is the source of the caption times).
// Run: node scripts/qa/text-timing.mjs [--md]      Rule (BRIEF v2): time on screen >= 0.6 s + 0.3 s per word.
// "on screen" = from -> to; "hold" = the part at full opacity (a word takes 0.04 s * index + 0.42 s to arrive, the fade-out starts 0.3 s before `to`).
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const js = transformSync(readFileSync(join(root, "src/timeline.ts"), "utf8"), { loader: "ts", format: "esm" }).code;
const tmp = join(tmpdir(), `suaipe-timeline-${process.pid}.mjs`);
writeFileSync(tmp, js);
const T = await import(pathToFileURL(tmp).href);

const strip = (s) => s.replace(/<br\s*\/?>/gi, " ").replace(/<\/?em>/gi, "");
const words = (s) => strip(s).split(/\s+/).filter(Boolean).length;
const need = (n) => 0.6 + 0.3 * n;

const rows = [];
// every line of copy: burned-in captions (Caption.tsx) and the text the scenes draw themselves (SCENE_TEXT)
for (const [kind, list] of [["caption", T.CAPTIONS], ["scene", T.SCENE_TEXT]]) {
  for (const c of list) {
    const n = words(c.text);
    const arrive = 0.04 * (n - 1) + 0.42; // Caption.tsx timing; the scenes use similar entrances
    rows.push({ kind, text: strip(c.text), n, from: c.from, to: c.to, onScreen: c.to - c.from, hold: Math.max(0, c.to - 0.3 - (c.from + arrive)), exempt: /AI-generated/.test(c.text) });
  }
}
rows.sort((a, b) => a.from - b.from);

const md = process.argv.includes("--md");
const f = (x) => x.toFixed(2);
const out = [];
if (md) {
  out.push("| kind | text | words | on screen | needed | hold (full opacity) | verdict |", "|---|---|---|---|---|---|---|");
}
for (const r of rows) {
  const req = need(r.n);
  const verdict = r.exempt ? "exempt" : r.onScreen < req ? "FAIL" : r.onScreen - req < 0.25 ? "tight" : "ok";
  const line = md
    ? `| ${r.kind} | ${r.text} | ${r.n} | ${f(r.onScreen)} s | ${f(req)} s | ${f(r.hold)} s | ${verdict} |`
    : `${r.kind.padEnd(8)} ${String(r.n).padStart(2)}w  on-screen ${f(r.onScreen)}s  needed ${f(req)}s  hold ${f(r.hold)}s  ${verdict.padEnd(5)}  ${r.text}`;
  out.push(line);
}
console.log(out.join("\n"));
