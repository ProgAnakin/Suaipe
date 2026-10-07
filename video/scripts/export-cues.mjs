// Builds audio/cues.json (the cue sheet the sound design is composed against) from src/timeline.ts.
// Run: npm run cues
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = readFileSync(join(root, "src/timeline.ts"), "utf8");
const js = transformSync(ts, { loader: "ts", format: "esm" }).code;
const tmp = join(tmpdir(), `suaipe-timeline-${process.pid}.mjs`);
writeFileSync(tmp, js);
const T = await import(pathToFileURL(tmp).href);

const r3 = (x) => Math.round(x * 1000) / 1000;
const sfx = [];
const add = (type, t, extra = {}) => sfx.push({ type, t: r3(t), ...extra });

// ── hook ───────────────────────────────────────────────────────────────────────────────────
T.HOOK.tilePop.forEach((t, i) => add("tile-pop", t, { step: i, of: 10 }));
T.HOOK.words1.forEach((t, i) => add("word-hit", t, { step: i, vel: 0.7 }));
add("riser-a", 0.0, { dur: 2.0, note: "tension riser, ends exactly at lock-on" });
add("lock-on", T.HOOK.lockOn, { note: "product chosen: pitched ping + soft low thump" });
add("whoosh-out", T.HOOK.lockOn, { dur: 0.9, note: "cards fly outward" });
T.HOOK.words2.forEach((t, i) => add("word-hit", t, { step: i, vel: 0.85 }));
add("sparkle-up", 2.5, { dur: 0.8 });
add("riser-b", 3.0, { dur: 1.0, note: "reverse-cymbal style swell landing on the logo hit" });

// ── lock-up ────────────────────────────────────────────────────────────────────────────────
add("logo-hit", T.LOCKUP.hit, { note: "big impact: sub boom + glassy chord + air; music 'drop' happens here" });
add("shimmer", T.LOCKUP.shimmer, { dur: 1.2 });
add("tagline-air", T.LOCKUP.tagline, { dur: 0.7 });
add("whoosh-up", T.IPAD.rise, { dur: 0.9, note: "iPad rises from below" });
add("device-settle", T.IPAD.settle - 0.05, { note: "soft low thump as the iPad lands" });

// ── captions ───────────────────────────────────────────────────────────────────────────────
T.CAPTIONS.forEach((c, i) => add("caption-pop", c.from, { step: i }));

// ── ipad flow ──────────────────────────────────────────────────────────────────────────────
for (const t of [T.IPAD.tap1, T.IPAD.tap2, T.IPAD.tap3, T.IPAD.tap4]) add("tap", t);
add("page-swoosh", T.IPAD.welcomeIn, { dur: 0.45 });
T.IPAD.chipTicks.forEach((t, i) => add("chip-tick", t, { step: i, of: 5 }));
add("callout-in", T.IPAD.callLang[0], { note: "label pops in" });
const typeSeq = (cfg, n) => Array.from({ length: n }, (_, i) => cfg.start + cfg.step * i);
typeSeq(T.IPAD.typeFirst, T.IPAD.typeFirst.count).forEach((t, i) => add("key", t, { step: i }));
typeSeq(T.IPAD.typeLast, T.IPAD.typeLast.count).forEach((t, i) => add("key", t, { step: i }));
typeSeq(T.IPAD.typeEmail, T.IPAD.typeEmail.count + 1).forEach((t, i) => add("key", t, { step: i }));
add("check-tick", T.IPAD.consent);
add("callout-in", T.IPAD.callGdpr[0]);
add("lock-click", T.IPAD.lockClick, { note: "GDPR padlock closes" });
add("confirm", T.IPAD.tap2 + 0.05, { note: "positive confirmation after START THE GAME" });
add("page-swoosh", T.IPAD.tap2 + 0.1, { dur: 0.45 });
add("page-swoosh", T.IPAD.tap3 + 0.05, { dur: 0.45 });
T.IPAD.swipes.forEach((s, i) => {
  add("card-in", s.enter, { step: i, of: 8 });
  add(s.dir < 0 ? "swipe-no" : "swipe-yes", T.swipeAccent(s) - 0.12, { dur: s.dur, accent: r3(T.swipeAccent(s)), step: i, of: 8 });
});
add("reveal-whoosh", T.IPAD.counterStart, { dur: 0.8, note: "flash into the result screen" });
// counter ticks every 5 % of the displayed value; the scene uses the same easing (counterProgress)
{
  const from = T.IPAD.counterFillFrom, to = T.IPAD.counterHit;
  const ticks = [];
  for (let pct = 5; pct <= 95; pct += 5) {
    const target = pct / 98;
    let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (T.counterProgress(mid) < target) lo = mid; else hi = mid; }
    ticks.push(from + (to - from) * ((lo + hi) / 2));
  }
  const thinned = [];
  for (const t of ticks) if (!thinned.length || t - thinned[thinned.length - 1] >= 0.055) thinned.push(t);
  thinned.forEach((t, i) => add("count-tick", t, { step: i, of: thinned.length }));
  add("riser-count", from, { dur: to - from, note: "rising tone under the counter; peaks exactly at the hit" });
}
add("counter-hit", T.IPAD.counterHit, { note: "98 % reached: big impact + bright chime + sparkle; music drop B" });
add("confetti-pop", T.IPAD.counterHit + 0.02);
add("whoosh-pullback", T.IPAD.pullBack, { dur: 0.9 });
add("success-chime", T.IPAD.successChime, { note: "pleasant two-note success" });

// ── phone ──────────────────────────────────────────────────────────────────────────────────
add("whoosh-swap", T.IPAD.exit, { dur: 0.9, note: "iPad leaves left, iPhone arrives right" });
add("notif-ping", T.PHONE.notifPing, { note: "glassy two-note notification ding" });
add("swoosh-open", T.PHONE.open, { dur: 0.5 });
add("scroll-soft", T.PHONE.scroll[0], { dur: T.PHONE.scroll[1] - T.PHONE.scroll[0] });
add("zoom-whoosh", T.PHONE.zoomCode[0], { dur: T.PHONE.zoomCode[1] - T.PHONE.zoomCode[0] });
add("code-ding", T.PHONE.codeDing, { note: "bright bell as the discount code lights up" });
add("whoosh-down", T.PHONE.exit, { dur: 0.7 });

// ── system ─────────────────────────────────────────────────────────────────────────────────
T.SYSTEM.nodes.forEach((t, i) => add("node-on", t, { step: i, of: T.SYSTEM.nodes.length }));
T.SYSTEM.packets.forEach((t, i) => add("packet", t, { step: i }));
T.SYSTEM.tiles.forEach((t, i) => add("tile-on", t, { step: i, of: 3 }));
T.SYSTEM.locks.forEach((t, i) => add("lock-click", t, { step: i, note: i ? "RLS" : "2FA" }));
add("whoosh-in", T.SYSTEM.out, { dur: 0.7, note: "diagram collapses into the end card" });

// ── end card ───────────────────────────────────────────────────────────────────────────────
add("logo-hit-soft", T.END.hit, { note: "softer sibling of logo-hit; the final chord starts here" });
add("shimmer", T.END.shimmer, { dur: 1.2 });
add("tagline-air", T.END.tagline, { dur: 0.7 });
T.END.chips.forEach((t, i) => add("chip-pop", t, { step: i, of: 4 }));
add("sparkle", T.END.sparkle, { dur: 1.5, note: "final glitter over the held chord" });

sfx.sort((a, b) => a.t - b.t);

const out = {
  bpm: T.BPM,
  beat: T.BEAT,
  bar: T.BAR,
  duration: T.DURATION_S,
  sampleRate: 48000,
  harmony: {
    key: "C major / A minor",
    note: "one chord per bar (2 s). Hits: logo-hit lands on C at 4.0, counter-hit on C at 22.0, end hit on C at 40.0.",
    bars: ["Am","G","C","G","Am","F","C","G","Am","F","G","C","G","Am","F","C","G","Am","F","G","C","Cadd9"].map((chord, i) => ({ bar: i + 1, from: i * 2, to: i * 2 + 2, chord })),
  },
  sections: [
    { name: "intro", from: 0.0, to: 4.0, bars: "1-2", brief: "No drums. Dark, tense, rising: low pad drone, filtered noise swell, sparse sub heartbeat, risers. Ticks from the sfx layer carry the rhythm." },
    { name: "drop-A", from: 4.0, to: 8.0, bars: "3-4", brief: "Logo hit at 4.0: kick + sub bass + pad chord + gentle plucked arp enter. Confident, clean, modern tech-product feel." },
    { name: "groove-A", from: 8.0, to: 14.0, bars: "5-7", brief: "Steady groove while the user types: hats on off-beats, soft shaker, bass pattern, arp gets busier. Leave space for the key clicks." },
    { name: "build", from: 14.0, to: 20.0, bars: "8-10", brief: "Energy climbs through the 8 swipes (they land on the beat from 17.5 on): add snare/clap fills, rising filter, tighter arps." },
    { name: "counter", from: 20.0, to: 22.0, bars: "11", brief: "Riser: kick drops out at 21.0, snare roll accelerating into 22.0, everything cuts for a beat of air right before the hit." },
    { name: "drop-B", from: 22.0, to: 26.0, bars: "12-13", brief: "Biggest moment: full chord stack + lead melody + open hats + kick. Celebratory but tasteful." },
    { name: "email", from: 26.0, to: 34.0, bars: "14-17", brief: "Breakdown: low-pass the groove, warm keys + pad, soft pulse; light percussion. The notif-ping and code-ding sit on top." },
    { name: "system", from: 34.0, to: 40.0, bars: "18-20", brief: "Rhythmic, techy: staccato arps / gated pad pulsing with the nodes, rising tension to the end card." },
    { name: "outro", from: 40.0, to: 44.5, bars: "21-22+", brief: "Final big chord at 40.0, then let it ring and decay; sparkle at 42.5; fade the tail to silence by 44.5." },
  ],
  sfx,
};

mkdirSync(join(root, "audio"), { recursive: true });
writeFileSync(join(root, "audio/cues.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`audio/cues.json: ${sfx.length} sfx cues, ${out.sections.length} music sections, ${out.duration}s`);
