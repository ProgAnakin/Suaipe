// Builds the cue sheets the sound design is composed against, from src/timeline.ts (and src/cutdown.ts for the 15 s cut-down).
//   audio/cues.json       the master (64.5 s)
//   audio/cues-15s.json   the 15 s cut-down, when src/cutdown.ts describes one (the master's cues mapped through its excerpts)
// Run: npm run cues
//
// Every sound comes from the picture: scripts/lib/picture-events.mjs lists everything the scenes do (250 events: a tap, a selection, a keystroke, a pop, a move, a transition) and this file turns
// each one into a cue (246: a few events share a sound or are silent on purpose, and say why). The music's own cues (risers, the motif's question, the room's tone) are added by hand.
// Direction A "Minimal pulse" is the MUSIC and the hierarchy (qa/SOUND.md); the effects are complete (qa/SOUND-AUDIT.md) and levelled by class (tools/audio/sfx.py CLASS_OF).
// audio/trims.json (scripts/qa/auto-trim.py) adds the few dB the balance audit asked for, keyed "<event kind>@<time>".
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { pictureEvents } from "./lib/picture-events.mjs";

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
// audio/trims.json: the per-event dB the balance audit asked for (scripts/qa/auto-trim.py: an event that stays under its class's floor against the music
// around it gets a few dB more), keyed "<picture event kind>@<time>". Hand-written gains stay in this file; the trims only add to them.
const trims = existsSync(join(root, "audio/trims.json")) ? JSON.parse(readFileSync(join(root, "audio/trims.json"), "utf8")) : {};
const add = (type, t, extra = {}) => {
  const c = { type, t: r3(t), ...extra };
  const trim = c.event ? trims[`${c.event}@${c.eventT}`] : undefined;
  if (trim) c.gain_db = r3((c.gain_db ?? 0) + trim);
  sfx.push(c);
};

// ── every sound comes from the picture ──────────────────────────────────────────────────────────────────────────────────────
// scripts/lib/picture-events.mjs lists everything the picture does (a tap, a selection, a keystroke, a pop, a move). Each event below becomes one
// cue (a few become none, and say why in the inventory: `silent`); the cue carries the event's `tier` (S signature · H highlight · A action ·
// T texture) so the mix can balance by class instead of by luck. Music-only cues (the risers, the motif's question, the room's tone) are added by hand.
const P = pictureEvents(T);
const C = T.CHAPTER;
const only = (kind, scene) => P.filter((e) => e.kind === kind && (!scene || e.scene === scene));
const emit = (e, type, extra = {}) => {
  const { at, ...rest } = extra; // `at` moves the cue off the picture event's own time (a swipe's whoosh starts before its accent)
  add(type, at ?? e.t, { tier: e.tier, event: e.kind, eventT: e.t, note: e.label, ...rest });
};

// hook ------------------------------------------------------------------------------------------------------------------
add("riser-a", 0.0, { dur: T.HOOK.lockOn, tier: "A", note: "tension riser, ends exactly at lock-on" });
only("tile-pop").forEach((e) => emit(e, "tile-pop", { step: e.step, of: e.of }));
only("word").forEach((e) => emit(e, "word-hit", { step: e.step, vel: e.step < 3 ? 0.7 : 0.85 }));
emit(only("lock-on")[0], "lock-on", { note: "★ product chosen: a soft pitched ping + low thump" });
emit(only("tiles-away")[0], "whoosh-out", { dur: 0.9, note: "the other cards fly outward: air" });
emit(only("badge")[0], "chip-pop", { step: 2, of: 4, gain_db: -5, note: "the 98% badge pops on the hero card" });
add("sparkle-up", only("twinkles", "hook")[0].t - 0.03, { dur: 0.8, tier: "T", event: "twinkles", eventT: only("twinkles", "hook")[0].t, note: "the nine twinkles around the hero, as one rising run" });
emit(only("shine", "hook")[0], "shimmer", { dur: 0.9, gain_db: -6, note: "a light sweep crosses the hero card" });
add("riser-b", 3.0, { dur: 1.0, tier: "A", event: "flash", eventT: only("flash")[0].t, note: "swell landing on the logo hit (the picture flashes into the logo)" });

// lock-up: the logo hit, the wordmark, and the first half of the sonic motif (a question: G4 - A4) -----------------------------------------------
emit(only("logo-hit")[0], "logo-hit", { note: "★ sub boom + glassy C chord (with a low-mid body for phones) + air; the pulse begins after it" });
add("motif-q", T.LOCKUP.hit + 0.5, { tier: "S", note: "motif part 1: G4 - A4, left hanging over the C" });
only("letter", "lockup").forEach((e) => emit(e, "letter-tick", { step: e.step, of: e.of }));
emit(only("shimmer", "lockup")[0], "shimmer", { dur: 1.2, note: "the sheen across the logo mark" });
emit(only("line", "lockup")[0], "line-draw", { dur: 0.6, note: "the underline draws itself" });
emit(only("tagline", "lockup")[0], "tagline-air", { dur: 0.7 });

// hand-off photograph and the dive into the screen ---------------------------------------------------------------------------------------------
emit(only("photo-open")[0], "whoosh-up", { dur: 0.9, note: "the hand-off photograph opens" });
add("room-tone", T.IPAD.rise, { dur: r3(T.IPAD.handoff.out + 0.6 - T.IPAD.rise), fade_in: 0.6, fade_out: 0.9, tier: "T", note: "the shop under the hand-off photograph; it gives way to the interface as the camera enters the screen" });
emit(only("device-settle")[0], "device-settle", { note: "soft low thump as the tablet changes hands" });
emit(only("screen-wake")[0], "screen-wake", { dur: 0.6, note: "the kiosk screen lights up inside the photographed glass: soft rising two-note chime" });
emit(only("zoom", "ipad")[0], "zoom-whoosh", { dur: r3(T.IPAD.handoff.zoom[1] - T.IPAD.handoff.zoom[0]), note: "camera flies into the tablet screen" });

// the kiosk: welcome, form, tutorial ------------------------------------------------------------------------------------------------------------------
only("tap", "ipad").forEach((e) => emit(e, "tap"));
only("page", "ipad").forEach((e) => emit(e, "page-swoosh", { dur: 0.45, gain_db: e.t > 13 && e.t < 14 ? -4 : -1 }));
only("select").forEach((e) => emit(e, "chip-tick", { step: e.step, of: e.of, pan: r3(-0.55 + (1.1 * e.step) / (e.of - 1)), note: "the language highlight hops across the flags: left to right" }));
only("callout", "ipad").forEach((e) => emit(e, "callout-in", { note: e.label }));
only("field-focus").forEach((e) => emit(e, "field-tick"));
only("key").forEach((e) => emit(e, "key", { step: e.step }));
emit(only("check")[0], "check-tick", { step: 0, of: 1 });
emit(only("lock", "ipad")[0], "lock-click", { note: "GDPR padlock closes" });
emit(only("confirm")[0], "confirm", { note: "positive confirmation after START THE GAME" });
{ // the tutorial demonstrates the two sounds the eight swipes will use: the NO phrase falls, the YES phrase rises (quieter: it is a demonstration)
  const no = only("demo-no")[0], yes = only("demo-yes")[0];
  emit(no, "swipe-no", { at: no.t - 0.12, dur: 0.45, accent: no.t, pan: -0.5, gain_db: -8, note: "tutorial: the NO swipe, shown" });
  emit(yes, "swipe-yes", { at: yes.t - 0.12, dur: 0.45, accent: yes.t, pan: 0.5, gain_db: -6, note: "tutorial: the YES swipe, shown" });
}

// the eight swipes -------------------------------------------------------------------------------------------------------------------------------------------
only("card-in").forEach((e) => emit(e, "card-in", { step: e.step, of: e.of }));
only("swipe").forEach((e) => {
  emit(e, e.dir < 0 ? "swipe-no" : "swipe-yes", { at: e.t - 0.12, dur: e.dur, accent: e.t, step: e.step, of: e.of, pan: e.dir * 0.55 });
});
only("dot").forEach((e) => emit(e, "dot-tick", { step: e.step, of: e.of, dir: e.dir }));

// the scan and the 98 % ------------------------------------------------------------------------------------------------------------------------------------
emit(only("reveal")[0], "reveal-whoosh", { dur: 0.8, note: "the scan screen opens" });
add("scan-riser", T.IPAD.counterFillFrom, { dur: r3(T.IPAD.counterHit - T.IPAD.counterFillFrom), tier: "A", note: "a tonal riser under the scan ring; it thins to an inhale in the 0.25 s of air before the hit" });
only("count").forEach((e) => emit(e, "count-tick", { step: e.step, of: e.of, note: e.label }));
emit(only("scan-hit")[0], "counter-hit", { note: "★ the 98 % bloom: a bright glass C chord and a sub swell; the first, smaller peak" });
add("confetti-pop", T.IPAD.counterHit + 0.02, { tier: "T", gain_db: -3, note: "the confetti bursts from the ring (centre): a soft pat and a shower of glints, not a bang" });
emit(only("confetti")[0], "confetti-pop", { gain_db: -7, pan: 0.0, wide: true, note: "the two side bursts from the bottom corners" });
emit(only("dock")[0], "whoosh-pullback", { dur: 0.9 });
emit(only("shine", "ipad")[0], "shimmer", { dur: 0.75, gain_db: -2, note: "a light sweep crosses the product card" });
emit(only("success")[0], "success-chime", { note: "pleasant two-note success" });

// the e-mail on the customer's phone ----------------------------------------------------------------------------------------------------------------------
emit(only("notif-drop")[0], "notif-drop", { note: "the banner drops in" });
emit(only("notif-ping")[0], "notif-ping", { note: "glassy two-note notification ding" });
emit(only("mail-open")[0], "swoosh-open", { dur: 0.5 });
emit(only("scroll", "phone")[0], "scroll-soft", { dur: r3(T.PHONE.scroll[1] - T.PHONE.scroll[0]) });
emit(only("zoom", "phone")[0], "zoom-whoosh", { dur: r3(T.PHONE.zoomCode[1] - T.PHONE.zoomCode[0]) });
emit(only("code")[0], "code-ding", { note: "bright bell as the discount code lights up" });
emit(only("sweep")[0], "shimmer", { dur: 0.7, gain_db: -6, note: "a light sweep crosses the ticket" });

// Manager & Stats: steady and competent ---------------------------------------------------------------------------------------------------------------
only("sample").forEach((e) => emit(e, "sample-tick"));
emit(only("lean", "store")[0], "zoom-whoosh", { dur: 0.5, gain_db: 2.5, note: "the camera leans in on the first leads" });
emit(only("outline")[0], "line-draw", { dur: 0.4, gain_db: -1, note: "the outline closes around the first lead" });
only("consent-tick").forEach((e) => emit(e, "check-tick", { step: e.step, of: e.of, note: "consent tick on a lead: three, climbing" }));
emit(only("label", "store")[0], "callout-in", { note: "\"Consent on record\"" });
emit(only("page-push", "store")[0], "page-swoosh", { dur: r3(T.STORE.swap[1] - T.STORE.swap[0]), note: "the screen pushes from the lead list to the dashboard" });
emit(only("scroll", "store")[0], "scroll-soft", { dur: r3(T.STORE.scroll[1] - T.STORE.scroll[0]) });
only("chip", "store").forEach((e, i) => emit(e, "chip-pop", { step: i, of: 2, note: e.label }));
emit(only("store-swap")[0], "chip-tick", { step: 4, of: 5, pan: 0.3, note: "the ranking flips to the other store" });
emit(only("step-back")[0], "whoosh-pullback", { dur: 0.7, gain_db: -3, note: "the tablet steps back" });
emit(only("crm-rise")[0], "whoosh-up", { dur: 0.6, gain_db: -4, note: "the CRM card rises" });
only("lead-fly").forEach((e, i) => emit(e, "lead-fly", { dur: r3(e.t1 - e.t), bend: i === 0 ? 1 : -1, gain_db: i === 0 ? 1.5 : 0, note: e.label }));
only("lead-land").forEach((e, i) => emit(e, "crm-land", { strength: i === 0 ? 1.0 : 0.7, note: e.label }));

// Consultants: calm, a place to learn ----------------------------------------------------------------------------------------------------------------------
emit(only("lean", "consult")[0], "zoom-whoosh", { dur: r3(T.CONSULT.lean[1] - T.CONSULT.lean[0]), gain_db: 2.5, note: "the camera leans in on the phone" });
only("callout", "consult").forEach((e, i) => emit(e, "callout-in", { gain_db: i === 2 ? -4 : 0, note: e.label }));
only("tap", "consult").forEach((e) => emit(e, "tap"));
emit(only("page-push", "consult")[0], "page-swoosh", { dur: r3(T.CONSULT.push[1] - T.CONSULT.push[0]), note: "list to guide" });
only("scroll", "consult").forEach((e) => emit(e, "scroll-soft", { dur: r3(e.t1 - e.t) }));
emit(only("pull")[0], "whoosh-down", { dur: 0.7, note: "the phone steps back as the diagram arrives" });

// system: precise and calm ----------------------------------------------------------------------------------------------------------------------------------------
only("node").forEach((e) => emit(e, "node-on", { step: e.step, of: e.of, note: e.label }));
only("line", "system").forEach((e) => emit(e, "line-draw", { dur: r3(e.t1 - e.t), gain_db: 1, note: e.label }));
only("packet").forEach((e) => emit(e, "packet", { step: e.step, note: e.label }));
only("chip", "system").forEach((e, i) => emit(e, "chip-pop", { step: i === 0 ? 3 : 1, of: 4, gain_db: i === 0 ? 0 : -3, note: e.label }));
only("tile").forEach((e) => emit(e, "tile-on", { step: e.step, of: e.of, note: e.label }));
only("lock", "system").forEach((e, i) => emit(e, "lock-click", { step: i, note: i ? "MFA" : "RLS" }));

// human close: warm, close, real ---------------------------------------------------------------------------------------------------------------------------
add("room-tone", T.HUMAN.bagIn - 0.1, { dur: r3(T.END.shimmer + 2.2 - (T.HUMAN.bagIn - 0.1)), fade_in: 0.8, fade_out: 1.4, tier: "T", note: "the shop returns under the bag and the handshake and rings out under the end card: the opening's room, closing the circle" });
emit(only("photo-cut")[0], "photo-whoosh", { dur: 0.6, note: "cut to the bag photograph" });
emit(only("rustle")[0], "bag-rustle", { dur: 0.5, note: "paper bag changes hands: soft paper rustle + rope-handle creak + a very low, warm thump (real, tactile, quiet)" });
emit(only("redeem")[0], "redeem-ding", { note: "the 'redeemed in store' chip pops: bright glassy two-note ding" });
emit(only("photo-cross")[0], "photo-whoosh", { dur: 0.6, note: "soft air as the photo crosses to the handshake" });
emit(only("clasp")[0], "handshake", { note: "★ the hands meet on the downbeat: a dry skin / cloth clasp (nothing bright) + the big warm resolved C chord (the music's)" });

// end card: the motif completes on the held chord ----------------------------------------------------------------------------------------------------------
emit(only("end-hit")[0], "motif", { note: "★ the sonic motif complete: G4 - A4 - C5 - E5, on the logo, over the held chord" });
only("letter", "end").forEach((e) => emit(e, "letter-tick", { step: e.step, of: e.of }));
emit(only("shimmer", "end")[0], "shimmer", { dur: 1.2 });
emit(only("line", "end")[0], "line-draw", { dur: 0.6, note: "the underline draws itself" });
only("tagline", "end").forEach((e, i) => emit(e, "tagline-air", { dur: 0.7, gain_db: i ? -4 : 0 }));
only("chip", "end").forEach((e) => emit(e, "chip-pop", { step: e.step, of: e.of, note: e.label }));
add("sparkle", T.END.sparkle, { dur: 1.5, tier: "T", event: "twinkles", eventT: only("twinkles", "end")[0].t, note: "the glints over the end card, as one fading run" });

// captions: each opens with a soft tick, the highlighted phrase underlines itself --------------------------------------------------------------------
only("caption").forEach((e) => emit(e, "caption-pop", { step: e.step }));
only("caption-line").forEach((e) => emit(e, "underline", { dur: 0.4, note: e.label }));

// scene transitions: a whoosh each, peaking when the picture moves ---------------------------------------------------------------------------------------
emit(only("transition")[2], "whoosh-swap", { at: T.IPAD.exit, dur: 0.9, note: "iPad leaves left, iPhone arrives right" });
emit(only("transition")[3], "whoosh-down", { at: T.PHONE.exit, dur: 0.7 });
emit(only("transition")[4], "whoosh-swap", { at: C.consult.from, dur: 0.7, note: "the tablet leaves, the consultant's phone arrives" });
emit(only("transition")[5], "whoosh-down", { at: T.CONSULT.pull[0] + 0.3, dur: 0.7 });
emit(only("transition")[6], "whoosh-in", { at: T.SYSTEM.out, dur: 0.7, note: "the diagram is pushed back as the bag hand-off photo fades in" });

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
      // the end card's letters ring under the resolved chord of the cut-down (a different arrangement from the master's): a little more of them
      if (ev.type === "letter-tick" && ev.t >= T.END.hit - 0.1) copy.gain_db = r3((copy.gain_db ?? 0) + 7);
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
