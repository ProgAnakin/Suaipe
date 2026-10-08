// Builds the cue sheets the sound design is composed against, from src/timeline.ts (and src/cutdown.ts for the 15 s cut-down).
//   audio/cues.json       the master (64.5 s)
//   audio/cues-15s.json   the 15 s cut-down, when src/cutdown.ts describes one (the master's cues mapped through its excerpts)
// Run: npm run cues
//
// Direction A "Minimal pulse" (qa/SOUND.md): about 60 events instead of ~150. Sequences become single gestures that carry their own
// times (typing, language and consent ticks, the five nodes, the three tiles, the cloud of gadgets); captions and card-ins are silent;
// the counter's eleven ticks are one tonal riser; the shop's room tone is a bed under the photographs.
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = async (rel, tag) => {
  const js = transformSync(readFileSync(join(root, rel), "utf8"), { loader: "ts", format: "esm" }).code;
  const tmp = join(tmpdir(), `suaipe-${tag}-${process.pid}.mjs`);
  writeFileSync(tmp, js);
  return import(pathToFileURL(tmp).href);
};
const T = await load("src/timeline.ts", "timeline");
const CUT = await load("src/cutdown.ts", "cutdown");

const r3 = (x) => Math.round(x * 1000) / 1000;
const sfx = [];
const add = (type, t, extra = {}) => sfx.push({ type, t: r3(t), ...extra });
const seq = (cfg, n) => Array.from({ length: n }, (_, i) => r3(cfg.start + cfg.step * i));

// ── hook: the cloud of gadgets, one chosen ──────────────────────────────────────────────────────────────────────────────
add("riser-a", 0.0, { dur: T.HOOK.lockOn, note: "tension riser, ends exactly at lock-on" });
add("tile-bloom", T.HOOK.tilePop[0], { times: T.HOOK.tilePop, note: "the ten gadget cards as ONE rising cascade" });
add("lock-on", T.HOOK.lockOn, { note: "★ product chosen: a soft pitched ping + low thump" });
add("whoosh-out", T.HOOK.lockOn, { dur: 0.9, note: "the other cards fly outward: air" });
add("sparkle-up", 2.5, { dur: 0.8 });
add("riser-b", 3.0, { dur: 1.0, note: "swell landing on the logo hit" });

// ── lock-up: the logo hit, and the first half of the sonic motif (a question: G4 - A4) ───────────────────────────────
add("logo-hit", T.LOCKUP.hit, { note: "★ sub boom + glassy C chord (with a low-mid body for phones) + air; the pulse begins after it" });
add("motif-q", T.LOCKUP.hit + 0.5, { note: "motif part 1: G4 - A4, left hanging over the C" });
add("whoosh-up", T.IPAD.rise, { dur: 0.9, note: "the hand-off photograph opens" });

// ── the kiosk flow ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
add("room-tone", T.IPAD.rise, { dur: r3(T.IPAD.handoff.out + 0.6 - T.IPAD.rise), fade_in: 0.6, fade_out: 0.9, note: "the shop under the hand-off photograph; it gives way to the interface as the camera enters the screen" });
add("device-settle", T.IPAD.settle - 0.05, { note: "soft low thump as the tablet changes hands" });
add("screen-wake", T.IPAD.handoff.wake, { dur: 0.6, note: "the kiosk screen lights up inside the photographed glass: soft rising two-note chime" });
add("zoom-whoosh", T.IPAD.handoff.zoom[0], { dur: r3(T.IPAD.handoff.zoom[1] - T.IPAD.handoff.zoom[0]), note: "camera flies into the tablet screen" });
add("tap", T.IPAD.tap1);
add("page-swoosh", T.IPAD.welcomeIn, { dur: 0.45 });
add("store-ticks", T.IPAD.chipTicks[0], { times: T.IPAD.chipTicks, note: "the language highlight sweeping across the five flags: one gesture" });
{
  const strokes = [...seq(T.IPAD.typeFirst, T.IPAD.typeFirst.count), ...seq(T.IPAD.typeLast, T.IPAD.typeLast.count), ...seq(T.IPAD.typeEmail, T.IPAD.typeEmail.count + 1)];
  add("typing-texture", strokes[0], { dur: r3(strokes[strokes.length - 1] - strokes[0] + 0.12), strokes, note: "one soft texture for the 33 keystrokes of first name, last name and e-mail" });
}
add("lock-click", T.IPAD.lockClick, { note: "GDPR padlock closes" });
add("tap", T.IPAD.tap2);
add("tap", T.IPAD.tap3);
add("page-swoosh", T.IPAD.tap3 + 0.05, { dur: 0.45 });
T.IPAD.swipes.forEach((s, i) => {
  add(s.dir < 0 ? "swipe-no" : "swipe-yes", T.swipeAccent(s) - 0.12, { dur: s.dur, accent: r3(T.swipeAccent(s)), step: i, of: 8, pan: s.dir * 0.55 });
});
add("reveal-whoosh", T.IPAD.counterStart, { dur: 0.8, note: "the scan screen opens" });
add("scan-riser", T.IPAD.counterFillFrom, { dur: r3(T.IPAD.counterHit - T.IPAD.counterFillFrom), note: "one tonal riser replaces the eleven counter ticks; it thins to an inhale in the 0.25 s of air before the hit" });
add("counter-hit", T.IPAD.counterHit, { note: "★ the 98 % bloom: a bright glass C chord and a sub swell, no confetti; the first, smaller peak" });
add("whoosh-pullback", T.IPAD.pullBack, { dur: 0.9 });
add("tap", T.IPAD.tap4);
add("success-chime", T.IPAD.successChime, { note: "pleasant two-note success" });

// ── the e-mail on the customer's phone ──────────────────────────────────────────────────────────────────────────────────────
add("whoosh-swap", T.IPAD.exit, { dur: 0.9, note: "iPad leaves left, iPhone arrives right" });
add("notif-ping", T.PHONE.notifPing, { note: "glassy two-note notification ding" });
add("swoosh-open", T.PHONE.open, { dur: 0.5 });
add("zoom-whoosh", T.PHONE.zoomCode[0], { dur: r3(T.PHONE.zoomCode[1] - T.PHONE.zoomCode[0]) });
add("code-ding", T.PHONE.codeDing, { note: "bright bell as the discount code lights up" });
add("whoosh-down", T.PHONE.exit, { dur: 0.7 });

// ── store value: steady and competent ───────────────────────────────────────────────────────────────────────────────────────
add("store-ticks", T.STORE.consent[0], { times: T.STORE.consent, note: "three consent ticks, one rising gesture" });
add("page-swoosh", T.STORE.swap[0], { dur: r3(T.STORE.swap[1] - T.STORE.swap[0]), note: "the screen pushes from the lead list to the dashboard" });
add("store-ticks", T.STORE.storeA, { times: [T.STORE.storeA, T.STORE.storeB], note: "Store A, Store B: two ticks, the second higher" });
add("crm-land", T.STORE.land, { strength: 1.0, note: "the first lead lands in its CRM row: one soft pluck" });
add("crm-land", T.STORE.land2, { strength: 0.7, note: "the next one lands (quieter)" });
add("whoosh-swap", T.CHAPTER.consult.from, { dur: 0.7, note: "the tablet leaves, the consultant's phone arrives" });

// ── consultants: calm, a place to learn ───────────────────────────────────────────────────────────────────────────────────
add("callout-in", T.CONSULT.search[0], { note: "the search ring" });
add("tap", T.CONSULT.tap);
add("page-swoosh", T.CONSULT.push[0], { dur: r3(T.CONSULT.push[1] - T.CONSULT.push[0]), note: "list to guide" });
add("callout-in", T.CONSULT.video[0] + 0.1, { note: "the manager's video" });
add("callout-in", T.CONSULT.advice[0] + 0.1, { note: "the manager's advice" });
add("whoosh-down", T.CONSULT.pull[0] + 0.3, { dur: 0.7 });

// ── system: precise and calm ─────────────────────────────────────────────────────────────────────────────────────────────────
add("node-run", T.SYSTEM.nodes[0], { times: T.SYSTEM.nodes, note: "five nodes as one run of plucks" });
add("tile-bloom", T.SYSTEM.tiles[0], { times: T.SYSTEM.tiles, note: "three tiles as one bloom" });
T.SYSTEM.locks.forEach((t, i) => add("lock-click", t, { step: i, note: i ? "MFA" : "RLS" }));
add("whoosh-in", T.SYSTEM.out, { dur: 0.7, note: "the diagram is pushed back as the bag hand-off photo fades in" });

// ── human close: warm, close, real ───────────────────────────────────────────────────────────────────────────────────────────
add("room-tone", T.HUMAN.bagIn - 0.1, { dur: r3(T.END.shimmer + 2.2 - (T.HUMAN.bagIn - 0.1)), fade_in: 0.8, fade_out: 1.4, note: "the shop returns under the bag and the handshake and rings out under the end card: the opening's room, closing the circle" });
add("bag-rustle", T.HUMAN.rustle, { dur: 0.5, note: "paper bag changes hands: soft paper rustle + rope-handle creak + a very low, warm thump (real, tactile, quiet)" });
add("redeem-ding", T.HUMAN.redeemed, { note: "the 'redeemed in store' chip pops: bright glassy two-note ding" });
add("photo-whoosh", T.HUMAN.handshakeIn - 0.1, { dur: 0.6, note: "soft air as the photo crosses to the handshake" });
add("handshake", T.HUMAN.clasp, { note: "★ the hands meet on the downbeat: a dry skin / cloth clasp (nothing bright) + the big warm resolved C chord (the music's)" });

// ── end card: the motif completes on the held chord ────────────────────────────────────────────────────────────────────────
add("motif", T.END.hit, { note: "★ the sonic motif complete: G4 - A4 - C5 - E5, on the logo, over the held chord" });
add("sparkle", T.END.sparkle, { dur: 1.5, note: "a single glint" });

sfx.sort((a, b) => a.t - b.t || a.type.localeCompare(b.type));

// one chord per bar. The 98 % (22.0) lands on C after G; the clasp (60.0) on C; the end card blooms into Cadd9 at 62.0.
const BAR_CHORDS = ["Am", "G", "C", "G", "Am", "F", "C", "G", "Am", "F", "G", "C", "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "G", "C", "Cadd9", "Cadd9"];
const bars = BAR_CHORDS.map((chord, i) => ({ bar: i + 1, from: i * 2, to: i * 2 + 2, chord }));

const sections = [
  { name: "hook", from: 0.0, to: 4.0, brief: "Observant. No drums: a dark drone, a faint heartbeat, the harmony left open; 0.25 s of near-silence before the hit at 4.0." },
  { name: "idea", from: 4.0, to: 6.0, brief: "First resolution on C: the logo hit, the motif's question (G-A). The sub pulse begins, half-time." },
  { name: "handoff", from: 6.0, to: 8.0, brief: "A pad on G, a soft pulse, the shop's room tone; the interface takes over as the camera enters the tablet." },
  { name: "form", from: 8.0, to: 14.0, brief: "Pad and a sparse felt piano; room for the language ticks, the typing texture, the consent click and the taps." },
  { name: "swipes", from: 14.0, to: 20.0, brief: "The swipes are the rhythm: tuned yes (rising, right) and no (falling, left) phrases over a pad and the pulse; no keys." },
  { name: "scan", from: 20.0, to: 22.0, brief: "A tonal riser, the pad opens, everything cuts for 0.25 s of air before the 98 %." },
  { name: "match", from: 22.0, to: 26.0, brief: "The 98 % bloom on C: the first, smaller peak. A rolled felt chord, a glass shimmer, then calm." },
  { name: "email", from: 26.0, to: 34.0, brief: "Intimate: low-passed felt piano, the pulse on beat 1 only. The notification and the code ding sit on top." },
  { name: "store", from: 34.0, to: 44.0, brief: "Steady and competent: a firm sub pulse and one quiet off-beat tick, confident chords; one soft 'land' when a lead reaches the CRM." },
  { name: "consult", from: 44.0, to: 54.0, brief: "Calm, a place to learn: the e-mail's low-passed felt piano again, a light pulse; the search, the tap and the two call-outs are small glass ticks." },
  { name: "system", from: 54.0, to: 58.0, brief: "Precise and calm: gated pad and staccato plucks, less busy than before; the pulse stops cleanly at 57.5." },
  { name: "human", from: 58.0, to: 60.0, brief: "Warm and quiet: a soft pad and felt keys on G leaning towards C, the room tone, the bag rustle; no pulse." },
  { name: "resolve", from: 60.0, to: 62.0, brief: "★ The handshake: the film's one big resolved C chord, full and warm, no cymbal; the motif completes on the logo at 61.0." },
  { name: "signature", from: 62.0, to: T.DURATION_S, brief: "Cadd9 rings; the last second is still and the tail fades to true silence." },
];

const base = {
  bpm: T.BPM,
  beat: T.BEAT,
  bar: T.BAR,
  duration: T.DURATION_S,
  sampleRate: 48000,
  direction: "A",
};
const harmonyNote = "one chord per bar (2 s). Hits: logo-hit on C at 4.0, counter-hit on C at 22.0 (after G), handshake on C at 60.0, the motif on the logo at 61.0, Cadd9 from 62.0.";
const master = { ...base, harmony: { key: "C major / A minor", note: harmonyNote, bars }, sections, sfx };

mkdirSync(join(root, "audio"), { recursive: true });
writeFileSync(join(root, "audio/cues.json"), JSON.stringify(master, null, 2) + "\n");
console.log(`audio/cues.json: ${sfx.length} sfx cues, ${sections.length} music sections, ${master.duration}s`);

// ── the 15 s cut-down: the same cues, mapped through the four excerpts ──────────────────────────────────────────────────────
{
  const EX = CUT.EXCERPTS;
  const dur = CUT.CUT_DURATION_S;
  const cutSfx = [];
  const shift = (e) => e.join - e.master;
  const mapPoints = (key, value) => (Array.isArray(value) ? value.map((v) => r3(v)) : value);
  for (const ev of sfx) {
    for (const e of EX) {
      const lo = e.master;
      const hi = e.master + (e.to - e.join);
      const t = ev.t;
      const bed = ev.type === "room-tone";
      const inside = (t >= lo - 1e-6 && t < hi - 1e-6) || (t >= hi - 1e-6 && t <= hi + 1e-6 && ev.type === "tap");
      const overlaps = bed && t < hi && t + ev.dur > lo;
      if (!inside && !overlaps) continue;
      const copy = { ...ev };
      if (bed) {
        const t0 = Math.max(t, lo), t1 = Math.min(t + ev.dur, hi);
        copy.t = r3(t0 + shift(e));
        copy.dur = r3(t1 - t0);
        copy.fade_in = t0 > t + 1e-6 ? 0.4 : ev.fade_in;
        copy.fade_out = t1 < t + ev.dur - 1e-6 ? 0.4 : ev.fade_out;
      } else {
        copy.t = r3(t + shift(e));
        if (copy.accent !== undefined) copy.accent = r3(copy.accent + shift(e));
        if (copy.times) copy.times = copy.times.map((x) => r3(x + shift(e)));
        if (copy.strokes) copy.strokes = copy.strokes.map((x) => r3(x + shift(e)));
      }
      cutSfx.push(copy);
    }
  }
  cutSfx.sort((a, b) => a.t - b.t || a.type.localeCompare(b.type));

  // harmony and sections: the master's, clipped to each excerpt and shifted (chords may now change off the bar line at the joins)
  const segs = [];
  for (const e of EX) {
    const lo = e.master, hi = e.master + (e.to - e.join);
    for (const b of bars) {
      const a = Math.max(b.from, lo), z = Math.min(b.to, hi);
      if (z - a > 1e-6) segs.push({ from: r3(a + shift(e)), to: r3(z + shift(e)), chord: b.chord });
    }
  }
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.chord === s.chord && Math.abs(last.to - s.from) < 1e-6) last.to = s.to;
    else merged.push({ ...s });
  }
  const cutBars = merged.map((s, i) => ({ bar: i + 1, ...s }));
  const cutSections = [];
  for (const e of EX) {
    const lo = e.master, hi = e.master + (e.to - e.join);
    for (const s of sections) {
      const a = Math.max(s.from, lo), z = Math.min(s.to, hi);
      if (z - a > 1e-6) cutSections.push({ name: s.name, from: r3(a + shift(e)), to: r3(z + shift(e)), brief: s.brief });
    }
  }
  // sections that continue across a join (same name, touching) are merged; the hook is shown in full
  const mergedSections = [];
  for (const s of cutSections) {
    const last = mergedSections[mergedSections.length - 1];
    if (last && last.name === s.name && Math.abs(last.to - s.from) < 1e-6) last.to = s.to;
    else mergedSections.push({ ...s });
  }
  const cut = {
    ...base,
    duration: dur,
    cut: { excerpts: EX.map((e) => ({ master: e.master, join: e.join, to: e.to })) },
    harmony: { key: "C major / A minor", note: "the master's chords through the cut: a chord may change off the bar line at a join. The final C / Cadd9 chord starts at 11.0, the motif at 11.5.", bars: cutBars },
    sections: mergedSections,
    sfx: cutSfx,
  };
  writeFileSync(join(root, "audio/cues-15s.json"), JSON.stringify(cut, null, 2) + "\n");
  console.log(`audio/cues-15s.json: ${cutSfx.length} sfx cues, ${mergedSections.length} music sections, ${dur}s`);
}
