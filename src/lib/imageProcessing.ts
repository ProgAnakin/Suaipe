/**
 * Image preparation for the staff upload forms (product photos, quiz-card artwork).
 *
 * FAIL-CLOSED: a file that is too big, is not what its MIME type says, cannot be decoded in time or cannot be
 * re-encoded is REJECTED, with a message the form shows. The original file is never uploaded as a fallback —
 * it used to be, so a corrupt, oversized or mislabelled file could reach the public bucket under a `.jpg`
 * name and an image content type. The bucket enforces the same size and type limits on its own
 * (migration 20261119000001); this is the early, friendly check, and the re-encode through a canvas also drops
 * every byte that is not pixels (EXIF, GPS, embedded scripts, trailing data).
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Above any phone's full-resolution photo (a 50 MP shot is ~8 200 x 6 100), far below a decompression bomb. */
export const MAX_IMAGE_PIXELS = 64_000_000;
export const MAX_IMAGE_SIDE = 16_384;
const READ_TIMEOUT_MS = 5_000;
const DECODE_TIMEOUT_MS = 15_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** The file was refused; `message` is written for the person who picked it. */
export class ImageRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageRejectedError";
  }
}

// ── what the bytes say ─────────────────────────────────────────────────────────────────────────────────────

const ascii = (b: Uint8Array, from: number, count: number) => String.fromCharCode(...b.subarray(from, from + count));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

/** The pixel size an image DECLARES in its header, read without decoding it; null when no valid header is found. */
export function readImageSize(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  if (mime === "image/png") {
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
    return png && bytes.length >= 24 && ascii(bytes, 12, 4) === "IHDR"
      ? { width: u32be(bytes, 16), height: u32be(bytes, 20) }
      : null;
  }
  if (mime === "image/gif") {
    return bytes.length >= 10 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))
      ? { width: u16le(bytes, 6), height: u16le(bytes, 8) }
      : null;
  }
  if (mime === "image/webp") {
    if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
    const kind = ascii(bytes, 12, 4);
    if (kind === "VP8X") {
      return { width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)), height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) };
    }
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
    }
    if (kind === "VP8L" && bytes[20] === 0x2f) {
      const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  if (mime === "image/jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
    let i = 2;
    while (i + 3 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker === 0xff) { i++; continue; } // fill byte
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; } // markers without a length
      if (marker === 0xda) return null; // start of scan with no frame header before it
      const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrameHeader) {
        return i + 9 <= bytes.length ? { width: u16be(bytes, i + 7), height: u16be(bytes, i + 5) } : null;
      }
      i += 2 + u16be(bytes, i + 2);
    }
    return null;
  }
  return null;
}

function readBytes(file: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timer = setTimeout(() => { reject(new ImageRejectedError("The image could not be read in time — try again.")); reader.abort(); }, READ_TIMEOUT_MS);
    reader.onload = () => { clearTimeout(timer); resolve(new Uint8Array(reader.result as ArrayBuffer)); };
    reader.onerror = reader.onabort = () => { clearTimeout(timer); reject(new ImageRejectedError("The image could not be read — choose it again.")); };
    reader.readAsArrayBuffer(file);
  });
}

function checkSize(width: number, height: number) {
  if (!(width > 0) || !(height > 0)) throw new ImageRejectedError("This file is not a valid image.");
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE || width * height > MAX_IMAGE_PIXELS) {
    throw new ImageRejectedError("The image is too large in pixels — reduce it to about 8000 × 8000 or less.");
  }
}

/** Size, declared type, the bytes behind that type, and the size the header declares — before anything decodes it. */
async function assertSafeRaster(file: File): Promise<void> {
  if (!file.size) throw new ImageRejectedError("This file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageRejectedError("Image too large — maximum 5 MB.");
  if (!ACCEPTED_TYPES.has(file.type)) throw new ImageRejectedError("Unsupported format — use JPEG, PNG, WebP or GIF.");
  const bytes = await readBytes(file);
  const declared = readImageSize(bytes, file.type);
  if (!declared) throw new ImageRejectedError("This file is not a valid image of the type it claims to be.");
  checkSize(declared.width, declared.height);
}

// ── decode → resize → re-encode ───────────────────────────────────────────────────────────────────────────

async function rasterize(file: File, maxPx: number, outType: "image/jpeg" | "image/png", quality?: number): Promise<File> {
  await assertSafeRaster(file);
  const bound = Math.max(1, Math.round(maxPx));
  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (result: File | null, why?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      img.onload = img.onerror = null;
      if (result) resolve(result);
      else reject(new ImageRejectedError(why ?? "The image could not be converted — choose a valid, smaller picture."));
    };
    const timer = setTimeout(() => { done(null, "The image took too long to open — choose a smaller picture."); img.src = ""; }, DECODE_TIMEOUT_MS);

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        checkSize(width, height); // what the browser really decoded, not only what the header claimed
        const scale = Math.min(1, bound / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) { done(null); return; }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob || blob.type !== outType || blob.size > MAX_IMAGE_BYTES) { done(null); return; }
          const base = file.name.replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_").replace(/^\.+/, "").slice(0, 80) || "upload";
          done(new File([blob], `${base}.${outType === "image/png" ? "png" : "jpg"}`, { type: outType }));
        }, outType, quality);
      } catch (e) {
        done(null, e instanceof ImageRejectedError ? e.message : undefined);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** Shared by the catalogue forms: a JPEG no larger than `maxPx` on its longest side. Rejects, never falls back to the original. */
export const resizeImage = (file: File, maxPx = 1024, quality = 0.8) => rasterize(file, maxPx, "image/jpeg", quality);

/**
 * A PNG that PRESERVES transparency — used for quiz card images, which sit on the dark card like an emoji
 * cutout (a JPEG would fill the transparent areas with black). Keeps the aspect ratio, capped at `maxPx` on the
 * longest side. Rejects, never falls back to the original.
 */
export const resizeImagePng = (file: File, maxPx = 600) => rasterize(file, maxPx, "image/png");
