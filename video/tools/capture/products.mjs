// Optimised packshots for the film: the kiosk's 10 product PNGs -> WebP with alpha, max 900 px on the long side.
// Brevia GoPress is built from assets/brevia-gopress.clean.png: the repo's PNG has a checkerboard baked into the
// glass rim, so the repaired copy replaces it.
//
// The source PNGs are heavily padded (the product itself spans only ~15-70 % of the 1683x939 frame), so every packshot
// is TRIMMED to the bounding box of its visible pixels and a uniform margin of PRODUCT_MARGIN (default 3 %) of the box's
// long side is added back on all four sides: the product then fills ~92-94 % of the image box, with its own aspect ratio.
// The crop box is the bounding box of all pixels with alpha >= T, where T is the largest value in {16, 8, 4, 2, 1} that
// still keeps >= 99.98 % of the total alpha mass inside the box - i.e. only invisible dust is cut, never a glass rim,
// glow or soft edge.  Files are written atomically (tmp + rename) so a running render never reads a half-written image.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, PRODUCTS_OUT, CLEAN_BREVIA, log, ensureDir, sharp } from "./lib.mjs";

const SRC = path.join(REPO_ROOT, "public/products");
const MAX = 900;
const MARGIN = Number(process.env.PRODUCT_MARGIN ?? 0.03);
const MAX_CLIPPED_ALPHA_MASS = 2e-4;

/** Bounding box of every pixel whose alpha >= t (RGBA raw buffer). */
function alphaBox(data, W, H, t) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      if (data[row + x * 4 + 3] >= t) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** Crop box that loses (almost) no visible pixel: largest alpha threshold whose box keeps >= 99.98 % of the alpha mass. */
function visibleBox(data, W, H) {
  let total = 0;
  for (let i = 3; i < data.length; i += 4) total += data[i];
  for (const t of [16, 8, 4, 2, 1]) {
    const b = alphaBox(data, W, H, t);
    let lost = 0;
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      const inY = y >= b.y0 && y <= b.y1;
      for (let x = 0; x < W; x++) if (!(inY && x >= b.x0 && x <= b.x1)) lost += data[row + x * 4 + 3];
    }
    if (lost / total <= MAX_CLIPPED_ALPHA_MASS) return { ...b, t };
  }
  return { ...alphaBox(data, W, H, 1), t: 1 };
}

ensureDir(PRODUCTS_OUT);
const out = [];
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".png")).sort()) {
  const id = path.basename(file, ".png");
  const useClean = id === "brevia-gopress" && fs.existsSync(CLEAN_BREVIA);
  const src = useClean ? CLEAN_BREVIA : path.join(SRC, file);
  const dest = path.join(PRODUCTS_OUT, `${id}.webp`);
  const tmp = path.join(PRODUCTS_OUT, `.${id}.tmp-${process.pid}.webp`);

  const { data, info: raw } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const box = visibleBox(data, raw.width, raw.height);
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  const m = Math.round(MARGIN * Math.max(w, h));
  // lossless intermediate (crop + margin): the only lossy step is the final resize + WebP encode
  const padded = await sharp(src)
    .ensureAlpha()
    .extract({ left: box.x0, top: box.y0, width: w, height: h })
    .extend({ top: m, bottom: m, left: m, right: m, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const info = await sharp(padded)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(tmp);
  fs.renameSync(tmp, dest);

  out.push({ id, ...info });
  const fw = w + 2 * m, fh = h + 2 * m;
  log(
    `${id.padEnd(18)} ${raw.width}x${raw.height} -> box ${w}x${h} (alpha>=${box.t}, ${(100 * w / raw.width).toFixed(0)}% x ${(100 * h / raw.height).toFixed(0)}% of the frame)` +
      ` -> ${info.width}x${info.height} (product ${(100 * w / fw).toFixed(0)}% x ${(100 * h / fh).toFixed(0)}%)  ${(info.size / 1024).toFixed(0)} KB  alpha:${info.channels === 4}${useClean ? "  (repaired packshot)" : ""}`,
  );
}
const total = out.reduce((s, o) => s + o.size, 0);
log(`products: ${out.length} files, ${(total / 1048576).toFixed(2)} MB -> ${PRODUCTS_OUT}`);
