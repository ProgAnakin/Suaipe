import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resizeImage, resizeImagePng, readImageSize, ImageRejectedError, MAX_IMAGE_BYTES } from "@/lib/imageProcessing";

// The staff upload forms re-encode every picture in the browser. The helper is FAIL-CLOSED: a file that is
// not what it claims to be, is too big, cannot be decoded or re-encoded is rejected — it used to fall back to
// uploading the original file as it was (under a .jpg name, with an image content type).
//
// jsdom neither loads images nor rasterises a canvas, so Image (driving onload/onerror ourselves) and the
// canvas 2d context + toBlob are stubbed. The BYTES of the files are real: the helper reads their headers.

// ── image headers ──────────────────────────────────────────────────────────────────────────────────────────
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));
const png = (w: number, h: number) => {
  const b = new Uint8Array(33);
  b.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, ...text("IHDR")], 0);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
const gif = (w: number, h: number) => Uint8Array.from([...text("GIF89a"), w & 255, w >> 8, h & 255, h >> 8, 0, 0, 0]);
const jpeg = (w: number, h: number) => Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xe1, 0x00, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8, // an EXIF-like segment the reader has to skip
  0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, // SOF0
]);
const riff = (kind: string) => {
  const b = new Uint8Array(32);
  b.set([...text("RIFF"), 0, 0, 0, 0, ...text("WEBP"), ...text(kind)], 0);
  return b;
};
const webpExtended = (w: number, h: number) => {
  const b = riff("VP8X");
  b.set([(w - 1) & 255, ((w - 1) >> 8) & 255, ((w - 1) >> 16) & 255, (h - 1) & 255, ((h - 1) >> 8) & 255, ((h - 1) >> 16) & 255], 24);
  return b;
};
const webpLossy = (w: number, h: number) => {
  const b = riff("VP8 ");
  b.set([0x9d, 0x01, 0x2a, w & 255, w >> 8, h & 255, h >> 8], 23);
  return b;
};
const webpLossless = (w: number, h: number) => {
  const b = riff("VP8L");
  const bits = ((w - 1) | ((h - 1) << 14)) >>> 0;
  b.set([0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255], 20);
  return b;
};

describe("readImageSize — the size an image declares, read from its header", () => {
  it("PNG, GIF, JPEG (past a metadata segment) and the three WebP flavours", () => {
    expect(readImageSize(png(640, 480), "image/png")).toEqual({ width: 640, height: 480 });
    expect(readImageSize(gif(300, 200), "image/gif")).toEqual({ width: 300, height: 200 });
    expect(readImageSize(jpeg(4032, 3024), "image/jpeg")).toEqual({ width: 4032, height: 3024 });
    expect(readImageSize(webpExtended(1200, 800), "image/webp")).toEqual({ width: 1200, height: 800 });
    expect(readImageSize(webpLossy(800, 600), "image/webp")).toEqual({ width: 800, height: 600 });
    expect(readImageSize(webpLossless(1024, 768), "image/webp")).toEqual({ width: 1024, height: 768 });
  });

  it("is null when the bytes are not the type that is claimed", () => {
    expect(readImageSize(png(10, 10), "image/jpeg")).toBeNull();
    expect(readImageSize(jpeg(10, 10), "image/png")).toBeNull();
    expect(readImageSize(gif(10, 10), "image/webp")).toBeNull();
    expect(readImageSize(new Uint8Array(text("<svg xmlns='http://www.w3.org/2000/svg'/>")), "image/png")).toBeNull();
    expect(readImageSize(new Uint8Array(text("%PDF-1.7 ....................")), "image/jpeg")).toBeNull();
  });

  it("is null for an empty or truncated header, and for a JPEG that reaches its scan with no frame header", () => {
    expect(readImageSize(new Uint8Array(), "image/png")).toBeNull();
    expect(readImageSize(png(10, 10).subarray(0, 20), "image/png")).toBeNull();
    expect(readImageSize(jpeg(10, 10).subarray(0, 20), "image/jpeg")).toBeNull();
    expect(readImageSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0]), "image/jpeg")).toBeNull();
  });

  it("is null for a type it does not know", () => {
    expect(readImageSize(png(10, 10), "image/svg+xml")).toBeNull();
    expect(readImageSize(png(10, 10), "")).toBeNull();
  });
});

// ── the browser side, stubbed ────────────────────────────────────────────────────────────────────────────────
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  private _src = "";
  set src(value: string) {
    this._src = value;
    MockImage.onSrc?.();
    queueMicrotask(() => {
      if (MockImage.hang) return;
      if (MockImage.shouldFail) { this.onerror?.(); return; }
      this.width = MockImage.w;
      this.height = MockImage.h;
      this.onload?.();
    });
  }
  get src() { return this._src; }
  static shouldFail = false;
  static hang = false;
  static onSrc: (() => void) | null = null;
  static w = 2000;
  static h = 1000;
}

const makeFile = (bytes: Uint8Array = png(2000, 1000), name = "photo.png", type = "image/png") => new File([new Uint8Array(bytes)], name, { type });

describe("resizeImage / resizeImagePng", () => {
  let toBlobResult: Blob | null;

  beforeEach(() => {
    MockImage.shouldFail = false;
    MockImage.hang = false;
    MockImage.onSrc = null;
    MockImage.w = 2000;
    MockImage.h = 1000;
    toBlobResult = new Blob(["x"], { type: "image/jpeg" });
    vi.stubGlobal("Image", MockImage);
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:mock"), configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (cb: BlobCallback) => cb(toBlobResult),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Spy on the canvas the helper creates, to read the size it drew. */
  const watchCanvas = () => {
    const realCreate = document.createElement.bind(document);
    const seen: { canvas?: HTMLCanvasElement } = {};
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "canvas") seen.canvas = el as HTMLCanvasElement;
      return el;
    }) as typeof document.createElement);
    return seen;
  };

  it("returns a JPEG File on success, named after the original with the right extension", async () => {
    const out = await resizeImage(makeFile());
    expect(out).toBeInstanceOf(File);
    expect(out.type).toBe("image/jpeg");
    expect(out.name).toBe("photo.jpg");
  });

  it("the PNG variant returns a PNG File", async () => {
    toBlobResult = new Blob(["x"], { type: "image/png" });
    const out = await resizeImagePng(makeFile(), 600);
    expect(out.type).toBe("image/png");
    expect(out.name).toBe("photo.png");
  });

  it("scales the canvas down so the longest side fits maxPx", async () => {
    const seen = watchCanvas();
    await resizeImage(makeFile(), 1024);
    expect(seen.canvas?.width).toBe(1024); // 2000 * (1024/2000)
    expect(seen.canvas?.height).toBe(512);
  });

  it("never upscales an image smaller than maxPx", async () => {
    MockImage.w = 400;
    MockImage.h = 300;
    const seen = watchCanvas();
    await resizeImage(makeFile(png(400, 300)), 1024);
    expect(seen.canvas?.width).toBe(400);
    expect(seen.canvas?.height).toBe(300);
  });

  it("a file name with odd characters cannot leak into the new one", async () => {
    const out = await resizeImage(makeFile(png(10, 10), "../../my photo (1).PNG"));
    expect(out.name).toBe("_.._my_photo_1_.jpg");
    expect(out.name).toMatch(/^[\w.-]+\.jpg$/);
  });

  // ── fail-closed ─────────────────────────────────────────────────────────────────────────────────────────────
  it("REJECTS — does not hand back the original — when toBlob yields null", async () => {
    toBlobResult = null;
    await expect(resizeImage(makeFile())).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("REJECTS when the image fails to load", async () => {
    MockImage.shouldFail = true;
    await expect(resizeImage(makeFile())).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("REJECTS when the browser re-encodes to another type than asked (no JPEG encoder)", async () => {
    toBlobResult = new Blob(["x"], { type: "image/png" });
    await expect(resizeImage(makeFile())).rejects.toThrow(/could not be converted/i);
  });

  it("REJECTS when the re-encoded picture is still bigger than the limit", async () => {
    toBlobResult = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/jpeg" });
    await expect(resizeImage(makeFile())).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("REJECTS an image that never finishes opening, after 15 s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    MockImage.hang = true;
    const decodeStarted = new Promise<void>((resolve) => { MockImage.onSrc = resolve; });
    const result = resizeImage(makeFile()).then(() => "resolved", (e: Error) => e.message);
    await decodeStarted; // the file has been read (real time); only the decode now hangs
    await vi.advanceTimersByTimeAsync(16_000);
    expect(await result).toMatch(/too long to open/i);
  });

  it("REJECTS an empty file, a file over 5 MB and an unsupported type", async () => {
    await expect(resizeImage(makeFile(new Uint8Array()))).rejects.toThrow(/empty/i);
    await expect(resizeImage(makeFile(new Uint8Array(MAX_IMAGE_BYTES + 1)))).rejects.toThrow(/maximum 5 MB/i);
    await expect(resizeImage(makeFile(png(10, 10), "logo.svg", "image/svg+xml"))).rejects.toThrow(/unsupported format/i);
    await expect(resizeImage(makeFile(png(10, 10), "doc.pdf", "application/pdf"))).rejects.toThrow(/unsupported format/i);
  });

  it("REJECTS a file whose bytes are not the type it claims (an HTML page named .png, a PDF labelled JPEG)", async () => {
    const html = new Uint8Array(text("<html><script>alert(1)</script></html>"));
    await expect(resizeImage(makeFile(html, "x.png", "image/png"))).rejects.toThrow(/not a valid image/i);
    await expect(resizeImage(makeFile(png(10, 10), "x.jpg", "image/jpeg"))).rejects.toThrow(/not a valid image/i);
  });

  it("REJECTS a decompression bomb by its header, before anything decodes it", async () => {
    const img = vi.fn();
    vi.stubGlobal("Image", class { constructor() { img(); } });
    await expect(resizeImage(makeFile(png(30_000, 30_000)))).rejects.toThrow(/too large in pixels/i);
    await expect(resizeImage(makeFile(jpeg(12_000, 12_000), "p.jpg", "image/jpeg"))).rejects.toThrow(/too large in pixels/i);
    await expect(resizeImage(makeFile(gif(0, 0), "p.gif", "image/gif"))).rejects.toThrow(/not a valid image/i);
    expect(img).not.toHaveBeenCalled();
  });

  it("REJECTS a header that lies: small on paper, huge once decoded", async () => {
    MockImage.w = 20_000;
    MockImage.h = 20_000;
    await expect(resizeImage(makeFile(png(100, 100)))).rejects.toThrow(/too large in pixels/i);
  });

  it("accepts a full-resolution phone photo (50 megapixels)", async () => {
    MockImage.w = 8160;
    MockImage.h = 6120;
    await expect(resizeImage(makeFile(jpeg(8160, 6120), "p.jpg", "image/jpeg"))).resolves.toBeInstanceOf(File);
  });

  it("accepts every format the forms allow", async () => {
    await expect(resizeImage(makeFile(gif(300, 200), "a.gif", "image/gif"))).resolves.toBeInstanceOf(File);
    await expect(resizeImage(makeFile(webpExtended(300, 200), "a.webp", "image/webp"))).resolves.toBeInstanceOf(File);
    await expect(resizeImage(makeFile(webpLossy(300, 200), "b.webp", "image/webp"))).resolves.toBeInstanceOf(File);
    await expect(resizeImage(makeFile(webpLossless(300, 200), "c.webp", "image/webp"))).resolves.toBeInstanceOf(File);
  });
});
