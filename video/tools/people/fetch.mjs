#!/usr/bin/env node
// Fetches the "human" stills of the film (hands only, no faces) and converts them to the webp files the scenes use
// (public/people/<id>.webp). The prompts, models and hosted URLs live in manifest.json; the hosted URLs expire 7 days after
// generation, so once the webp files are committed THEY are the source of truth and this script is only needed to
// regenerate them (new images -> update manifest.json -> run it).
//
//   node tools/people/fetch.mjs                  download every image of the manifest (except the discarded alternative take)
//   node tools/people/fetch.mjs handoff bag      only these ids
//   node tools/people/fetch.mjs --check          only probe whether the image host is reachable (exit 0 = yes)
//   node tools/people/fetch.mjs --from DIR       convert DIR/<id>.(png|jpg|jpeg|webp) instead of downloading (your own photos)
//   node tools/people/fetch.mjs --all            include the alternative takes too
//
// Needs `curl` and an ffmpeg with libwebp (FFMPEG=/path/to/ffmpeg to override). TLS verification and the proxy settings of
// the environment are left untouched: if the host is denied by the network policy the script says which host to allow.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "public", "people");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "people", "manifest.json"), "utf8"));

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const fromIdx = argv.indexOf("--from");
const fromDir = fromIdx >= 0 ? path.resolve(argv[fromIdx + 1] ?? "") : null;
const wanted = argv.filter((a, i) => !a.startsWith("--") && !(fromIdx >= 0 && i === fromIdx + 1));
const DISCARDED = new Set(["handoff-gemini"]);
const images = manifest.images.filter((im) => (wanted.length ? wanted.includes(im.id) : flag("--all") || !DISCARDED.has(im.id)));
if (!images.length) {
  console.error(`no image matches ${wanted.join(", ") || "the manifest"}`);
  process.exit(2);
}

const host = (url) => new URL(url).host;
const curl = (args) => spawnSync("curl", ["-sS", ...args], { encoding: "utf8" });

if (flag("--check")) {
  const r = curl(["-m", "10", "-o", "/dev/null", "-w", "%{http_code}", "-I", images[0].url]);
  const code = (r.stdout || "").trim();
  const ok = r.status === 0 && /^[23]/.test(code);
  console.log(ok ? `${host(images[0].url)} reachable (HTTP ${code})` : `${host(images[0].url)} NOT reachable: ${(r.stderr || `HTTP ${code}`).trim()}`);
  process.exit(ok ? 0 : 1);
}

const probe = (file) => {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = /Video: [^\n]*?(\d{2,5})x(\d{2,5})/.exec(r.stderr || "");
  return m ? { w: +m[1], h: +m[2] } : null;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "suaipe-people-"));
fs.mkdirSync(OUT, { recursive: true });
let failed = 0;

for (const im of images) {
  let src;
  if (fromDir) {
    src = ["png", "jpg", "jpeg", "webp"].map((e) => path.join(fromDir, `${im.id}.${e}`)).find((f) => fs.existsSync(f));
    if (!src) {
      console.error(`✗ ${im.id}: no ${im.id}.(png|jpg|webp) in ${fromDir}`);
      failed++;
      continue;
    }
  } else {
    src = path.join(tmp, `${im.id}.png`);
    const r = curl(["-fL", "--retry", "3", "--retry-delay", "2", "-m", "180", "-o", src, im.url]);
    if (r.status !== 0) {
      const why = (r.stderr || "").trim();
      console.error(`✗ ${im.id}: ${why || `curl exit ${r.status}`}`);
      if (/403|tunnel/i.test(why)) console.error(`  → the network policy denies ${host(im.url)}: add it under Allowed domains (environment settings → Network access).`);
      if (/404|410/.test(why)) console.error("  → the hosted URL has expired (they last 7 days): regenerate the image and update manifest.json.");
      failed++;
      continue;
    }
  }
  const size = probe(src);
  if (!size) {
    console.error(`✗ ${im.id}: ${src} is not an image ffmpeg can read`);
    failed++;
    continue;
  }
  const dst = path.join(OUT, `${im.id}.webp`);
  const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-i", src, "-c:v", "libwebp", "-q:v", "92", "-compression_level", "6", dst], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`✗ ${im.id}: ffmpeg failed: ${(r.stderr || "").trim()}`);
    failed++;
    continue;
  }
  const odd = size.w !== 960 || size.h !== 1280 ? "  ⚠ the scenes assume 960x1280 (src/people.ts) — update PHOTO or crop it" : "";
  console.log(`✓ ${im.id}: ${size.w}x${size.h} → ${path.relative(ROOT, dst)} (${Math.round(fs.statSync(dst).size / 1024)} KB)${odd}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
