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

// ── hook (provisional until phase 4: the hook has no drums, the light's fade is the only soft event) ──
add("riser-a", 0.0, { dur: 3.5, note: "tension riser, peaks at 3.5 (the light gathers); the picture holds for 0.25 s of air before the hit" });
add("lock-on", T.HOOK.pulse, { note: "the light pulses once: a soft pitched ping + low thump" });
add("whoosh-out", T.HOOK.fade[0], { dur: 0.7, note: "the light fades out: air" });
add("riser-b", 3.0, { dur: 1.0, note: "swell landing on the logo hit" });

// ── lock-up ────────────────────────────────────────────────────────────────────────────────
add("logo-hit", T.LOCKUP.hit, { note: "big impact: sub boom + glassy chord + air; music 'drop' happens here" });
add("shimmer", T.LOCKUP.shimmer, { dur: 1.2 });
add("tagline-air", T.LOCKUP.tagline, { dur: 0.7 });
add("whoosh-up", T.IPAD.rise, { dur: 0.9, note: "iPad rises from below" });
add("device-settle", T.IPAD.settle - 0.05, { note: "soft low thump as the tablet changes hands in the hand-off photo" });
add("screen-wake", T.IPAD.handoff.wake, { dur: 0.6, note: "the kiosk screen lights up on the photographed tablet: soft rising two-note glass chime" });
add("zoom-whoosh", T.IPAD.handoff.zoom[0], { dur: T.IPAD.handoff.zoom[1] - T.IPAD.handoff.zoom[0], note: "camera flies into the tablet screen" });

// ── captions ───────────────────────────────────────────────────────────────────────────────
T.CAPTIONS.forEach((c, i) => add("caption-pop", c.from, { step: i }));

// ── ipad flow ──────────────────────────────────────────────────────────────────────────────
for (const t of [T.IPAD.tap1, T.IPAD.tap2, T.IPAD.tap3, T.IPAD.tap4]) add("tap", t);
add("page-swoosh", T.IPAD.welcomeIn, { dur: 0.45 });
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

// ── store value (provisional: phase 4 re-designs these as grouped gestures) ──────────────────
T.STORE.consent.forEach((t, i) => add("tile-on", t, { step: i, of: 3 }));
add("packet", T.STORE.crm, { note: "one lead lands in the CRM row" });

// ── system ─────────────────────────────────────────────────────────────────────────────────
T.SYSTEM.nodes.forEach((t, i) => add("node-on", t, { step: i, of: T.SYSTEM.nodes.length }));
T.SYSTEM.packets.forEach((t, i) => add("packet", t, { step: i }));
T.SYSTEM.tiles.forEach((t, i) => add("tile-on", t, { step: i, of: 3 }));
T.SYSTEM.locks.forEach((t, i) => add("lock-click", t, { step: i, note: i ? "RLS" : "MFA" }));
add("whoosh-in", T.SYSTEM.out, { dur: 0.7, note: "the diagram is pushed back as the bag hand-off photo fades in" });
add("whoosh-in", T.STORE.out, { dur: 0.6, note: "the dashboard is pushed back as the system diagram arrives" });

// ── human close ────────────────────────────────────────────────────────────────────────────
add("bag-rustle", T.HUMAN.rustle, { dur: 0.5, note: "paper bag changes hands: soft paper rustle + rope-handle creak + a very low, warm thump (real, tactile, quiet)" });
add("redeem-ding", T.HUMAN.redeemed, { note: "the 'code redeemed' chip pops: bright glassy two-note ding, consonant with the chord, clearly different from notif-ping and code-ding" });
add("photo-whoosh", T.HUMAN.handshakeIn - 0.1, { dur: 0.6, note: "soft air as the photo crosses to the handshake" });
add("handshake", T.HUMAN.clasp, { note: "the hands meet exactly on the downbeat: skin/cloth clasp (soft) + the big warm resolving C chord swell (this IS the song's biggest chord) + a small glint of sparkle" });

// ── signature (provisional stand-ins; phase 4 designs the sonic motif) ───────────────────────
add("logo-hit-soft", T.SIGNATURE.name, { note: "the name lands on the held chord of the handshake; the sonic motif completes here" });
add("shimmer", T.SIGNATURE.name + 0.2, { dur: 1.2 });
add("tagline-air", T.SIGNATURE.thesis, { dur: 0.7 });
add("sparkle", T.SIGNATURE.tiny, { dur: 1.5, note: "a single glint" });

sfx.sort((a, b) => a.t - b.t);

const out = {
  bpm: T.BPM,
  beat: T.BEAT,
  bar: T.BAR,
  duration: T.DURATION_S,
  sampleRate: 48000,
  harmony: {
    key: "C major / A minor",
    note: "one chord per bar (2 s). Hits: logo-hit on C at 4.0 (bar 3), counter-hit on C at 20.0 (bar 11), handshake on C at 44.0 (bar 23), the signature on Cadd9 at 46.0 (bar 24). Provisional: phase 4 re-plans the score.",
    bars: ["Am","G","C","G","Am","F","C","G","Am","F","C","G","Am","F","C","G","Am","F","C","G","Am","G","C","Cadd9","Cadd9"].map((chord, i) => ({ bar: i + 1, from: i * 2, to: i * 2 + 2, chord })),
  },
  sections: [
    { name: "intro", from: 0.0, to: 4.0, bars: "1-2", brief: "No drums. Dark, tense, suspended: low pad drone, sparse sub heartbeat, harmony left open, a quiet 0.25 s air gap right before the hit at 4.0." },
    { name: "drop-A", from: 4.0, to: 8.0, bars: "3-4", brief: "Logo hit at 4.0: first resolution, sonic motif (first half). Kick + sub bass + pad chord + gentle plucked arp enter, confident and clean; the hand-off photo at 6.0 brings a shop room tone." },
    { name: "groove-A", from: 8.0, to: 14.0, bars: "5-7", brief: "Light groove while the user types and consents; leave space for the single typing gesture and the consent click." },
    { name: "build", from: 14.0, to: 18.0, bars: "8-9", brief: "Energy climbs through the eight swipes: the swipes lead the rhythm, 'yes' rises/opens and pans right, 'no' falls/closes and pans left." },
    { name: "counter", from: 18.0, to: 20.0, bars: "10", brief: "One tonal riser under the scan ring, everything cuts for 0.25 s of air right before the hit at 20.0." },
    { name: "drop-B", from: 20.0, to: 24.0, bars: "11-12", brief: "The 98 % hit on C at 20.0 (or held back, per the sound direction): the biggest moment of the first half." },
    { name: "email", from: 24.0, to: 30.0, bars: "13-15", brief: "Breakdown: low-passed groove, warm keys, soft pulse. The notification ping and the code ding sit on top." },
    { name: "store", from: 30.0, to: 38.0, bars: "16-19", brief: "Firm, steady, competent: regular pulse, confident harmony; tiny grouped ticks only, one soft 'land' when the lead reaches the CRM row." },
    { name: "system", from: 38.0, to: 42.0, bars: "20-21", brief: "Precise and calm: staccato arps / gated pad with the nodes (5 nodes in 1.4 s, tiles at 39.8-40.2, locks 40.55 / 40.95); the pulse stops cleanly at 41.5 when the photo takes over." },
    { name: "human", from: 42.0, to: 44.0, bars: "22", brief: "Warm, human, quiet: no drums. Soft pad + felt piano on G (V) leaning towards C, a shop room tone, the bag rustle at 42.0 and the redeem ding at 42.45; a gentle lift into the downbeat at 44.0." },
    { name: "outro", from: 44.0, to: 50.0, bars: "23-25", brief: "The handshake lands on the downbeat of bar 23 (44.0): the big resolving C chord (full, warm, no cymbal). It rings through the Cadd9 of the signature (46.0, where the sonic motif completes); the last 1.5 s are still; fade the tail to true silence by 50.0." },
  ],
  sfx,
};

mkdirSync(join(root, "audio"), { recursive: true });
writeFileSync(join(root, "audio/cues.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`audio/cues.json: ${sfx.length} sfx cues, ${out.sections.length} music sections, ${out.duration}s`);
