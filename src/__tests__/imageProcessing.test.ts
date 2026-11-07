import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resizeImage, resizeImagePng } from "@/lib/imageProcessing";

// jsdom neither loads images nor rasterises a canvas, so we stub Image (driving
// onload/onerror ourselves) and the canvas 2d context + toBlob.
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  private _src = "";
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (MockImage.shouldFail) { this.onerror?.(); return; }
      this.width = MockImage.w;
      this.height = MockImage.h;
      this.onload?.();
    });
  }
  get src() { return this._src; }
  static shouldFail = false;
  static w = 2000;
  static h = 1000;
}

describe("resizeImage", () => {
  let toBlobResult: Blob | null;

  beforeEach(() => {
    MockImage.shouldFail = false;
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const makeFile = () => new File([new Uint8Array([137,80,78,71,13,10,26,10])], "photo.png", { type: "image/png" });

  it("re-encodes as JPEG with a safe name and matching extension", async () => {
    const out = await resizeImage(makeFile());
    expect(out).toBeInstanceOf(File);
    expect(out.type).toBe("image/jpeg");
    expect(out.name).toBe("upload.jpg");
  });

  it("scales the canvas down so the longest side fits maxPx", async () => {
    MockImage.w = 2000;
    MockImage.h = 1000;
    const realCreate = document.createElement.bind(document);
    let canvasEl: HTMLCanvasElement | undefined;
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "canvas") canvasEl = el as HTMLCanvasElement;
      return el;
    }) as typeof document.createElement);

    await resizeImage(makeFile(), 1024);

    expect(canvasEl?.width).toBe(1024);  // 2000 * (1024/2000)
    expect(canvasEl?.height).toBe(512);  // 1000 * (1024/2000)
  });

  it("never upscales an image smaller than maxPx", async () => {
    MockImage.w = 400;
    MockImage.h = 300;
    const realCreate = document.createElement.bind(document);
    let canvasEl: HTMLCanvasElement | undefined;
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "canvas") canvasEl = el as HTMLCanvasElement;
      return el;
    }) as typeof document.createElement);

    await resizeImage(makeFile(), 1024);

    expect(canvasEl?.width).toBe(400);
    expect(canvasEl?.height).toBe(300);
  });

  it("rejects conversion failure instead of uploading the original", async () => {
    toBlobResult = null;
    const file = makeFile();
    await expect(resizeImage(file)).rejects.toThrow('conversion failed');
  });

  it("rejects an image the decoder cannot read", async () => {
    MockImage.shouldFail = true;
    const file = makeFile();
    await expect(resizeImage(file)).rejects.toThrow('conversion failed');
  });

  it('rejects SVG masquerading as PNG before decoding', async () => {
    await expect(resizeImage(new File(['<svg onload="alert(1)"/>'], 'image.png', {type:'image/png'}))).rejects.toThrow('content');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('rejects unsupported formats and files over 5 MB', async () => {
    await expect(resizeImage(new File(['<svg/>'], 'image.svg', {type:'image/svg+xml'}))).rejects.toThrow();
    await expect(resizeImage(new File([new Uint8Array(5*1024*1024+1)], 'image.png', {type:'image/png'}))).rejects.toThrow();
  });
  it('rejects a PNG dimension bomb before decoding', async () => {
    const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);
    new DataView(bytes.buffer).setUint32(16,100_000);new DataView(bytes.buffer).setUint32(20,100_000);
    await expect(resizeImage(new File([bytes], 'bomb.png', {type:'image/png'}))).rejects.toThrow('dimensions');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('checks decoded dimensions and releases the object URL on failure', async () => {
    MockImage.w=10_000;MockImage.h=10_000;
    await expect(resizeImage(makeFile())).rejects.toThrow();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
  it('preserves transparency by requiring a new PNG blob', async () => {
    toBlobResult=new Blob(['raster'],{type:'image/png'});
    const output=await resizeImagePng(makeFile());
    expect(output.name).toBe('upload.png');expect(output.type).toBe('image/png');
  });
});
