import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// vercel.json is where the production Content-Security-Policy lives. A directive that is missing
// does not fail loudly: the browser just refuses the resource. This test pins the ones the app needs.

const vercel = JSON.parse(readFileSync(resolve(__dirname, "../../vercel.json"), "utf8")) as {
  headers: Array<{ headers: Array<{ key: string; value: string }> }>;
};
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key.toLowerCase() === "content-security-policy")!.value;
const directive = (name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";

describe("Content-Security-Policy (vercel.json)", () => {
  it("lets the consultant guide embed its YouTube video — without frame-src it falls back to 'self' and the player is blank", () => {
    const guide = readFileSync(resolve(__dirname, "../components/consulente/ProductGuideDetail.tsx"), "utf8");
    expect(guide).toContain("https://www.youtube-nocookie.com/embed/");
    expect(directive("frame-src")).toContain("https://www.youtube-nocookie.com");
  });
  it("lets the app reach Supabase (REST, storage, realtime) and load YouTube thumbnails", () => {
    expect(directive("connect-src")).toContain("https://*.supabase.co");
    expect(directive("connect-src")).toContain("wss://*.supabase.co");
    expect(directive("img-src")).toContain("https://*.supabase.co");
    expect(directive("img-src")).toContain("https://img.youtube.com");
  });
  it("keeps the strict core: scripts only from the app itself, nothing embeds the app, no plugins", () => {
    expect(directive("script-src")).toBe("script-src 'self'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
  });
});
