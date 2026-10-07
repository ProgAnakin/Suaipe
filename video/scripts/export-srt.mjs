// Writes out/suaipe-captions.srt from the captions in src/timeline.ts (LinkedIn accepts an uploaded .srt for accessibility).
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
const srt = T.CAPTIONS.map((c, i) => `${i + 1}\n${T.secToTimecode(c.from)} --> ${T.secToTimecode(c.to)}\n${clean(c.text)}\n`).join("\n");
mkdirSync(join(root, "out"), { recursive: true });
writeFileSync(join(root, "out/suaipe-captions.srt"), srt);
console.log(`out/suaipe-captions.srt (${T.CAPTIONS.length} captions)`);
