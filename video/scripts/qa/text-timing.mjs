// Reading-time audit of every piece of on-screen copy (src/timeline.ts is the source of the caption times).
// Run: node scripts/qa/text-timing.mjs [--md]      Rule (BRIEF v2): time on screen >= 0.6 s + 0.3 s per word.
// "on screen" = from -> to; "hold" = the part at full opacity (a word takes 0.04 s * index + 0.42 s to arrive, the fade-out starts 0.3 s before `to`).
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const js = transformSync(readFileSync(join(root, "src/timeline.ts"), "utf8"), { loader: "ts", format: "esm" }).code;
const tmp = join(tmpdir(), `suaipe-timeline-${process.pid}.mjs`);
writeFileSync(tmp, js);
const T = await import(pathToFileURL(tmp).href);

const strip = (s) => s.replace(/<br\s*\/?>/gi, " ").replace(/<\/?em>/gi, "");
const words = (s) => strip(s).split(/\s+/).filter(Boolean).length;
const need = (n) => 0.6 + 0.3 * n;

const rows = [];
// 1) burned-in captions (Caption.tsx): automatic
for (const c of T.CAPTIONS) {
  const n = words(c.text);
  const arrive = 0.04 * (n - 1) + 0.42;
  rows.push({ kind: "caption", text: strip(c.text), n, from: c.from, to: c.to, onScreen: c.to - c.from, hold: Math.max(0, c.to - 0.3 - (c.from + arrive)) });
}
// 2) other copy, windows read off the scene code (constants from timeline.ts where they exist)
const H = T.HOOK, L = T.LOCKUP, I = T.IPAD, U = T.HUMAN, E = T.END;
const other = [
  ["hook", "Too many gadgets.", 3, H.words1[0], H.lockOn + 0.35, H.words1[2] + 0.3, H.lockOn - 0.05, "dims (32 %) and blurs from lock-on, still legible until ~3.5 s"],
  ["hook", "One perfect match.", 3, H.words2[0], 3.65, H.words2[2] + 0.3, 3.65, "the payoff line: gone with the flash at 3.6-4.0"],
  ["lock-up", "Product discovery for physical retail", 5, L.tagline, 5.9, L.tagline + 0.55, L.exit + 0.1, "tagline fades in over 0.6 s; the hand-off photo takes over at 5.4"],
  ["call-out", "5 languages", 2, I.callLang[0], I.callLang[1], I.callLang[0] + 0.3, I.callLang[1] - 0.2, ""],
  ["call-out", "GDPR consent, captured at the source", 5, I.callGdpr[0], I.callGdpr[1], I.callGdpr[0] + 0.3, I.callGdpr[1] - 0.1, "the only place the film mentions GDPR"],
  ["chip", "Code redeemed in store (+ code)", 4, U.redeemed, U.handshakeIn - 0.1, U.redeemed + 0.3, U.handshakeIn - 0.15, ""],
  ["end", "Live in 4 retail stores", 5, E.tagline, E.fadeOut[0], E.tagline + 0.5, E.fadeOut[0], ""],
  ["end", "Rio de Janeiro / Lisbon / Dublin / Milan (chips, all four visible)", 5, E.chips[0], E.fadeOut[0], E.chips[3] + 0.25, E.fadeOut[0], "the 4th chip lands at 42.95, then 0.95 s to read all four"],
  ["end", "REACT · SUPABASE · PWA", 3, E.tech, E.fadeOut[0] + 0.3, E.tech + 0.3, E.fadeOut[0] + 0.1, "small, dim, 10 px tracking"],
];
for (const [kind, text, n, from, to, holdFrom, holdTo, note] of other) rows.push({ kind, text, n, from, to, onScreen: to - from, hold: Math.max(0, holdTo - holdFrom), note });

const md = process.argv.includes("--md");
const f = (x) => x.toFixed(2);
const out = [];
if (md) {
  out.push("| kind | text | words | on screen | needed | hold (full opacity) | verdict |", "|---|---|---|---|---|---|---|");
}
for (const r of rows) {
  const req = need(r.n);
  const verdict = r.onScreen < req ? "FAIL" : r.hold < req ? "tight" : "ok";
  const line = md
    ? `| ${r.kind} | ${r.text} | ${r.n} | ${f(r.onScreen)} s | ${f(req)} s | ${f(r.hold)} s | ${verdict} |`
    : `${r.kind.padEnd(8)} ${String(r.n).padStart(2)}w  on-screen ${f(r.onScreen)}s  needed ${f(req)}s  hold ${f(r.hold)}s  ${verdict.padEnd(5)}  ${r.text}`;
  out.push(line);
}
console.log(out.join("\n"));
