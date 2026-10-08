// Writes out/suaipe-captions.srt from ALL the copy in src/timeline.ts (burned-in captions + scene text), split into non-overlapping cues
// (LinkedIn accepts an uploaded .srt for accessibility).
// Run: npm run srt
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const js = transformSync(readFileSync(join(root, "src/timeline.ts"), "utf8"), { loader: "ts", format: "esm" }).code;
const tmp = join(tmpdir(), `suaipe-timeline-srt-${process.pid}.mjs`);
writeFileSync(tmp, js);
const T = await import(pathToFileURL(tmp).href);

const clean = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?em>/gi, "");
const items = [...T.CAPTIONS, ...T.SCENE_TEXT].map((c) => ({ from: c.from, to: c.to, text: clean(c.text) })).sort((a, b) => a.from - b.from);
// a line that is only just leaving while the next one arrives (overlap < 0.5 s) hands over cleanly: no two-line flicker in the subtitle track
for (let i = 0; i < items.length; i++)
  for (let j = i + 1; j < items.length; j++) {
    const overlap = items[i].to - items[j].from;
    if (overlap > 1e-6 && overlap < 0.5 && items[j].to > items[i].to) items[i].to = items[j].from;
  }
const cuts = [...new Set(items.flatMap((i) => [i.from, i.to]))].sort((a, b) => a - b);
const cues = [];
for (let k = 0; k < cuts.length - 1; k++) {
  const a = cuts[k], b = cuts[k + 1];
  const active = items.filter((i) => i.from <= a + 1e-6 && i.to >= b - 1e-6).sort((x, y) => x.from - y.from);
  if (!active.length) continue;
  const text = active.map((i) => i.text).join("\n");
  const last = cues[cues.length - 1];
  if (last && last.text === text && Math.abs(last.to - a) < 1e-6) last.to = b;
  else cues.push({ from: a, to: b, text });
}
const srt = cues.map((c, i) => `${i + 1}\n${T.secToTimecode(c.from)} --> ${T.secToTimecode(c.to)}\n${c.text}\n`).join("\n");
mkdirSync(join(root, "out"), { recursive: true });
writeFileSync(join(root, "out/suaipe-captions.srt"), srt);
console.log(`out/suaipe-captions.srt (${cues.length} cues from ${items.length} lines)`);
