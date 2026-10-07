// Builds <OUT_DIR>/manifest.json: every produced file (path relative to video/public, so it can be used with
// Remotion's staticFile()) with pixel dimensions and byte size, plus totals per group and overall.
import fs from "node:fs";
import path from "node:path";
import { OUT_DIR, PRODUCTS_OUT, VIEWPORT, DPR, rel, log, sharp, writeJson } from "./lib.mjs";

const IMG = /\.(webp|png|jpe?g)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".")) // atomic-write temp files
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
}

async function describe(file) {
  const bytes = fs.statSync(file).size;
  const entry = { path: rel(file), bytes };
  if (IMG.test(file)) {
    const m = await sharp(file).metadata();
    entry.width = m.width;
    entry.height = m.height;
    if (m.hasAlpha) entry.alpha = true;
  }
  return entry;
}

const appGroup = (f) => {
  const top = path.relative(OUT_DIR, f).split(path.sep)[0];
  return ["still", "swipe", "typing"].includes(top) ? top : "data";
};

// the app assets (never the manifest itself) + the optimised product packshots
const files = [
  ...walk(OUT_DIR).filter((f) => f !== path.join(OUT_DIR, "manifest.json")).map((f) => ({ f, group: appGroup(f) })),
  ...walk(PRODUCTS_OUT).filter((f) => /\.webp$/.test(f)).map((f) => ({ f, group: "products" })),
].sort((a, b) => a.f.localeCompare(b.f));

const entries = [];
for (const { f, group } of files) entries.push({ group, ...(await describe(f)) });

const groups = {};
for (const e of entries) {
  const g = (groups[e.group] ||= { files: 0, bytes: 0 });
  g.files++;
  g.bytes += e.bytes;
}
const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);
for (const g of Object.values(groups)) g.megabytes = Math.round((g.bytes / 1048576) * 100) / 100;

// compact per-group summaries so the manifest is easy to read at a glance
const swipes = {};
for (const e of entries.filter((x) => x.group === "swipe")) {
  const m = e.path.match(/swipe-(\d+)-(\d+)\.webp$/);
  if (m) (swipes[m[1]] ||= []).push(Number(m[2]));
}

const manifest = {
  generatedBy: "video/tools/capture/manifest.mjs",
  pathsRelativeTo: "video/public",
  capture: { viewportCss: VIEWPORT, deviceScaleFactor: DPR, stillImagePx: { width: VIEWPORT.width * DPR, height: VIEWPORT.height * DPR } },
  totals: { files: entries.length, bytes: totalBytes, megabytes: Math.round((totalBytes / 1048576) * 100) / 100, groups },
  notes: [
    "only files produced by video/tools/capture are listed (e.g. a legacy products/brevia-gopress.png is not)",
    "swipe frames: n = 1..8, 000 = card at rest, 047 = card off-screen; typing/manifest.json has the crop rectangles and frame lists; layout.json has all DOM geometry",
  ],
  swipeFrames: Object.fromEntries(Object.entries(swipes).map(([n, a]) => [n, { count: a.length, first: Math.min(...a), last: Math.max(...a) }])),
  files: entries,
};
writeJson(path.join(OUT_DIR, "manifest.json"), manifest);
log(`manifest.json: ${entries.length} files, ${manifest.totals.megabytes} MB  ` +
  Object.entries(groups).map(([k, g]) => `${k}=${g.files}/${g.megabytes}MB`).join("  "));
