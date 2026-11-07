/** Decode, bound and re-encode raster images; never upload the original on failure. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function readBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timeout = setTimeout(() => { reader.abort(); reject(new Error('Image read timed out.')); }, 5_000);
    reader.onload = () => { clearTimeout(timeout); resolve(new Uint8Array(reader.result as ArrayBuffer)); };
    reader.onerror = reader.onabort = () => { clearTimeout(timeout); reject(new Error('Image could not be read.')); };
    reader.readAsArrayBuffer(file);
  });
}

function checkDimensions(width: number, height: number) {
  if (!width || !height || width > 8192 || height > 8192 || width * height > MAX_PIXELS) throw new Error('Image dimensions exceed the safe limit.');
}

async function validateRaster(file: File): Promise<void> {
  if (!file.size || file.size > MAX_BYTES || !MIME.has(file.type)) throw new Error('Use a raster image up to 5 MB.');
  const bytes = await readBytes(file);
  const starts = (...prefix: number[]) => prefix.every((v, i) => bytes[i] === v);
  const ascii = (from: number, count: number) => String.fromCharCode(...bytes.slice(from, from + count));
  const valid = file.type === 'image/png' ? starts(137,80,78,71,13,10,26,10)
    : file.type === 'image/jpeg' ? starts(255,216,255)
    : file.type === 'image/gif' ? ['GIF87a','GIF89a'].includes(ascii(0,6))
    : ascii(0,4) === 'RIFF' && ascii(8,4) === 'WEBP';
  if (!valid) throw new Error('Image content does not match its format.');
  if (file.type === 'image/png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer);
    checkDimensions(view.getUint32(16), view.getUint32(20));
  }
}

async function rasterize(file: File, maxPx: number, mime: 'image/jpeg' | 'image/png', quality?: number): Promise<File> {
  await validateRaster(file);
  if (!Number.isInteger(maxPx) || maxPx < 1 || maxPx > 2048) throw new Error('Invalid image size.');
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let finished = false;
    const finish = (result?: File) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      img.onload = img.onerror = null;
      if (result) resolve(result); else reject(new Error('Image conversion failed. Choose a valid, smaller raster image.'));
    };
    const timeout = setTimeout(() => { finish(); img.src = ''; }, 15_000);
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width, height = img.naturalHeight || img.height;
        checkDimensions(width, height);
        const scale = Math.min(1, maxPx / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) { finish(); return; }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob || blob.type !== mime || blob.size > MAX_BYTES) { finish(); return; }
          finish(new File([blob], `upload.${mime === 'image/png' ? 'png' : 'jpg'}`, { type: mime }));
        }, mime, quality);
      } catch { finish(); }
    };
    img.onerror = () => finish();
    img.src = url;
  });
}

export const resizeImage = (file: File, maxPx = 1024, quality = 0.8) => rasterize(file, maxPx, 'image/jpeg', quality);
export const resizeImagePng = (file: File, maxPx = 600) => rasterize(file, maxPx, 'image/png');
