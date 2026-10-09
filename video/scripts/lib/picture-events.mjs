// Every audible thing the PICTURE does, derived from src/timeline.ts (and the few constants the scenes keep to themselves, copied here with a pointer).
// It is the single list the sound design is built from and audited against: scripts/export-cues.mjs turns it into cues, scripts/qa/av-coverage.py
// checks the rendered audio against it, and scripts/qa/visual-onsets.py cross-checks it against what the rendered frames actually do.
//
// An event is { t, t1?, scene, kind, label, shape, tier, salience }
//   shape     impulse (a sound at t) | swell (a sound that builds up to t, e.g. a whoosh peaking when the picture moves) | span (a continuous move from t to t1)
//   tier      S signature (the film's few big moments) | H highlight (a confirmation or arrival) | A action (a tap, a selection, a page, a pop of something read)
//             | T texture (keystrokes, ticks, small pops: heard, never the point)
//   salience  major | standard | minor (how much the eye notices it; minor ones are still given a sound unless `silent` says why not)
//
// Keep this file free of imports from src/ except the timeline passed in: it runs under plain Node.

const r3 = (x) => Math.round(x * 1000) / 1000;

/** mulberry32, as in src/lib/motion.ts (the scenes' particle fields are seeded with it) */
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function pictureEvents(T) {
  const ev = [];
  const add = (scene, kind, t, label, extra = {}) => ev.push({ t: r3(t), scene, kind, label, shape: "impulse", tier: "A", salience: "standard", ...extra });
  const seq = (cfg, n) => Array.from({ length: n }, (_, i) => r3(cfg.start + cfg.step * i));

  // ── hook (HookScene.tsx) ───────────────────────────────────────────────────────────────────────────────────────────────────
  T.HOOK.tilePop.forEach((t, i) => add("hook", "tile-pop", t, `gadget card ${i + 1} of 10 pops in`, { tier: "T", step: i, of: 10 }));
  // four out-of-focus, half-transparent extras at the edges of the frame (HookScene TILES, `ghost`): the eye reads them as part of the wall, not as events
  [0.05, 0.1, 0.15, 0.2].forEach((t, i) => add("hook", "tile-pop-ghost", t, `out-of-focus extra card ${i + 1} pops in`, { tier: "T", salience: "minor", silent: "out of focus at the frame edge, inside the cascade of the ten main pops" }));
  T.HOOK.words1.forEach((t, i) => add("hook", "word", t, `"${["Too", "many", "gadgets."][i]}" lands`, { tier: "A", step: i, of: 3 }));
  add("hook", "lock-on", T.HOOK.lockOn, "the chosen product locks on, the screen shakes, a ring spreads", { tier: "S", salience: "major" });
  add("hook", "tiles-away", T.HOOK.lockOn, "the other nine cards fly away", { shape: "swell", t1: r3(T.HOOK.lockOn + 0.9), tier: "T" });
  T.HOOK.words2.forEach((t, i) => add("hook", "word", t, `"${["One", "perfect", "match."][i]}" slams in`, { tier: "A", step: i + 3, of: 6 }));
  add("hook", "badge", T.HOOK.lockOn + 0.55, '"98% match" badge pops on the hero card', { tier: "A" });
  {
    const r = rng(77); // HookScene SPARKS: nine glints at random moments around the hero
    const at = Array.from({ length: 9 }, () => { r(); r(); r(); r(); const t = T.HOOK.lockOn + 0.45 + r() * 0.7; r(); return t; }).sort((a, b) => a - b);
    add("hook", "twinkles", at[0], `nine sparkles twinkle around the hero (${at.map((x) => x.toFixed(2)).join(", ")})`, { shape: "span", t1: r3(at[8] + 0.35), tier: "T", salience: "minor", group: "hook-sparks", times: at.map(r3) });
  }
  add("hook", "shine", T.HOOK.lockOn + 0.7, "a light sweep crosses the hero card", { shape: "span", t1: r3(T.HOOK.lockOn + 1.6), tier: "T" });
  add("hook", "flash", 3.6, "the picture flashes white into the logo (flashThrough)", { shape: "swell", t1: T.HOOK.flashPeak, tier: "A", salience: "major" });

  // ── lock-up (LockupScene.tsx) ──────────────────────────────────────────────────────────────────────────────────────────────
  add("lockup", "logo-hit", T.LOCKUP.hit, "the logo mark lands: flash, ring, burst of sparks", { tier: "S", salience: "major" });
  ["S", "U", "A", "I", "P", "E"].forEach((c, i) => add("lockup", "letter", T.LOCKUP.hit + 0.1 + 0.05 * i, `wordmark letter ${c} pops in`, { tier: "T", step: i, of: 6 }));
  add("lockup", "shimmer", T.LOCKUP.shimmer, "a sheen sweeps the logo mark", { shape: "span", t1: r3(T.LOCKUP.shimmer + 0.85), tier: "T" });
  add("lockup", "line", T.LOCKUP.hit + 0.75, "the underline draws itself", { shape: "span", t1: r3(T.LOCKUP.hit + 1.35), tier: "T", salience: "minor" });
  add("lockup", "tagline", T.LOCKUP.tagline, '"Product discovery for physical retail" opens from the centre', { shape: "span", t1: r3(T.LOCKUP.tagline + 0.6), tier: "T" });

  // ── hand-off photograph and the dive into the screen (IpadScene / HandoffLayer) ─────────────────────────────────────────────
  add("ipad", "photo-open", T.IPAD.handoff.in, "the hand-off photograph opens", { shape: "swell", t1: r3(T.IPAD.handoff.in + 0.8), tier: "A" });
  add("ipad", "screen-wake", T.IPAD.handoff.wake, "the kiosk screen lights up inside the photographed glass", { tier: "A" });
  add("ipad", "device-settle", T.IPAD.settle - 0.05, "the tablet changes hands", { tier: "A" });
  add("ipad", "zoom", T.IPAD.handoff.zoom[0], "the camera flies into the screen", { shape: "swell", t1: T.IPAD.handoff.zoom[1], tier: "A" });

  // ── the kiosk: welcome ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const tap = (t, label) => add("ipad", "tap", t, label, { tier: "A" });
  tap(T.IPAD.tap1, "finger taps TAP TO START (ripple, button flash)");
  add("ipad", "page", T.IPAD.welcomeIn + 0.16, "welcome screen pushes in over the attract screen", { tier: "T", shape: "swell", t1: r3(T.IPAD.welcomeIn + 0.54) });
  T.IPAD.chipTicks.forEach((t, i) => add("ipad", "select", t, `language highlight hops to ${["IT", "EN", "PT", "ES", "FR"][i]}`, { tier: "A", step: i, of: 5 }));
  add("ipad", "callout", T.IPAD.callLang[0], '"5 languages" label pops in', { tier: "A" });
  // the three fields get focus just before their first character (TYPE_STEPS in ScreenContent.tsx: start - 0.22 / 0.18 / 0.18)
  [T.IPAD.typeFirst.start - 0.22, T.IPAD.typeLast.start - 0.18, T.IPAD.typeEmail.start - 0.18].forEach((t, i) => add("ipad", "field-focus", t, `the ${["first-name", "last-name", "e-mail"][i]} field takes focus`, { tier: "T", salience: "minor" }));
  const names = [..."Marco", ..."Rossi", ..."marco.rossi@example.com"];
  [...seq(T.IPAD.typeFirst, T.IPAD.typeFirst.count), ...seq(T.IPAD.typeLast, T.IPAD.typeLast.count), ...seq(T.IPAD.typeEmail, T.IPAD.typeEmail.count + 1)]
    .forEach((t, i) => add("ipad", "key", t, `keystroke "${names[i]}"`, { tier: "T", step: i, of: 33, group: "typing" }));
  add("ipad", "callout", T.IPAD.callGdpr[0], '"GDPR consent, captured at the source" label pops in', { tier: "A" });
  add("ipad", "check", T.IPAD.consent, "the consent box is ticked", { tier: "A" });
  add("ipad", "lock", T.IPAD.lockClick, "the GDPR padlock closes", { tier: "A" });
  tap(T.IPAD.tap2, "finger taps START THE GAME (ripple, button flash)");
  add("ipad", "confirm", T.IPAD.tap2 + 0.05, "the form is accepted", { tier: "A", salience: "minor" });
  add("ipad", "page", T.IPAD.tap2 + 0.08, "the tutorial fades in", { tier: "T", shape: "swell", t1: r3(T.IPAD.tap2 + 0.48) });
  // the app's own tutorial demonstrates a NO swipe, then a YES swipe (two captures, cross-faded)
  add("ipad", "demo-no", T.IPAD.tap2 + 0.3, "the tutorial card tilts to NO", { tier: "T" });
  add("ipad", "demo-yes", T.IPAD.tap2 + 0.7, "the tutorial card swings to YES", { tier: "T" });
  tap(T.IPAD.tap3, "finger taps I'M READY (ripple, button flash)");

  // ── the eight swipes ───────────────────────────────────────────────────────────────────────────────────────────────────────
  add("ipad", "dots-in", 14.9, "the eight progress dots appear", { tier: "T", salience: "minor", shape: "span", t1: 15.25, silent: "the row fades in 0.2 s after card 1 enters; each dot then has its own tick as it lights" });
  T.IPAD.swipes.forEach((s, i) => {
    add("ipad", "card-in", s.enter, `question card ${i + 1} of 8 enters`, { tier: "T", step: i, of: 8 });
    add("ipad", "swipe", T.swipeAccent(s), `card ${i + 1} swiped ${s.dir > 0 ? "YES (right)" : "NO (left)"}`, { tier: "A", dir: s.dir, dur: s.dur, step: i, of: 8, group: "swipes", salience: "major" });
    add("ipad", "dot", T.swipeAccent(s), `progress dot ${i + 1} lights up`, { tier: "T", dir: s.dir, step: i, of: 8, group: "swipes" });
  });

  // ── the scan and the 98 % ──────────────────────────────────────────────────────────────────────────────────────────────────
  add("ipad", "reveal", T.IPAD.counterStart, "the scan screen opens behind a flash (ring pops in)", { shape: "swell", t1: r3(T.IPAD.counterStart + 0.3), tier: "A" });
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
    thinned.forEach((t, i) => add("ipad", "count", t, `scan counter steps (${Math.round(98 * T.counterProgress((t - from) / (to - from)))} %)`, { tier: "T", step: i, of: thinned.length, group: "scan" }));
  }
  add("ipad", "scan-hit", T.IPAD.counterHit, "98 % reached: flash, shock ring, confetti", { tier: "S", salience: "major" });
  add("ipad", "confetti", T.IPAD.counterHit + 0.12, "two side bursts of confetti from the bottom corners", { tier: "T", salience: "minor" });
  add("ipad", "dock", T.IPAD.pullBack, "the ring docks into the result screen, the camera pulls back", { shape: "swell", t1: r3(T.IPAD.pullBack + 0.8), tier: "A" });
  add("ipad", "shine", 23.0, "a light sweep crosses the product card", { shape: "span", t1: 23.75, tier: "T" });
  tap(T.IPAD.tap4, "finger taps I WANT IT (ripple, button flash)");
  add("ipad", "page", T.IPAD.successIn, "the success screen fades in", { tier: "T", shape: "swell", t1: r3(T.IPAD.successIn + 0.3) });
  add("ipad", "success", T.IPAD.successChime, "success: rings pulse out of the envelope", { tier: "H", salience: "major" });
  [1, 2].forEach((k) => add("ipad", "pulse", T.IPAD.successChime + k * 0.18, `success ring ${k + 1} of 3`, { tier: "T", salience: "minor", group: "success-rings", silent: "the second and third ring repeat the first: they ride the chime's own ring-out" }));

  // ── the e-mail on the customer's phone (PhoneScene.tsx) ────────────────────────────────────────────────────────────────────
  add("phone", "notif-drop", T.PHONE.notif, "the notification banner drops in", { tier: "A" });
  add("phone", "notif-ping", T.PHONE.notifPing, "the banner pulses (ping)", { tier: "H", salience: "major" });
  add("phone", "mail-open", T.PHONE.open, "the banner grows into the e-mail", { shape: "swell", t1: r3(T.PHONE.open + 0.6), tier: "A" });
  add("phone", "scroll", T.PHONE.scroll[0], "the e-mail scrolls to the discount code", { shape: "span", t1: T.PHONE.scroll[1], tier: "T" });
  add("phone", "zoom", T.PHONE.zoomCode[0], "the camera zooms onto the discount code", { shape: "swell", t1: T.PHONE.zoomCode[1], tier: "A" });
  add("phone", "code", T.PHONE.codeDing, "the code lights up: ring, light sweep", { tier: "H", salience: "major" });
  add("phone", "sweep", T.PHONE.codeDing + 0.1, "a light sweep crosses the ticket", { shape: "span", t1: r3(T.PHONE.codeDing + 0.8), tier: "T" });

  // ── Manager & Stats (StoreScene.tsx) ───────────────────────────────────────────────────────────────────────────────────────
  const C = T.CHAPTER;
  add("store", "sample", C.store.from + 0.4, '"Sample data" chip appears', { tier: "T", salience: "minor" });
  add("store", "lean", T.STORE.rows - 0.05, "the camera leans in on the first leads", { shape: "swell", t1: r3(T.STORE.rows + 0.4), tier: "A" });
  add("store", "outline", T.STORE.consent[0] - 0.15, "an outline closes around the first lead", { shape: "span", t1: r3(T.STORE.consent[0] + 0.25), tier: "T", salience: "minor" });
  T.STORE.consent.forEach((t, i) => add("store", "consent-tick", t, `consent tick ${i + 1} of 3 on a lead`, { tier: "A", step: i, of: 3 }));
  add("store", "label", T.STORE.label, '"Consent on record" label pops in', { tier: "A" });
  add("store", "page-push", T.STORE.swap[0], "the screen pushes from the lead list to the dashboard", { shape: "swell", t1: T.STORE.swap[1], tier: "A" });
  add("store", "scroll", T.STORE.scroll[0], "the dashboard scrolls to the product ranking", { shape: "span", t1: T.STORE.scroll[1], tier: "T" });
  add("store", "chip", T.STORE.storeA, '"Store A" chip pops in', { tier: "A" });
  add("store", "store-swap", T.STORE.storeB, "the ranking flips to the other store", { tier: "A", shape: "swell", t1: r3(T.STORE.storeB + 0.28) });
  add("store", "chip", T.STORE.storeB + 0.05, '"Store B" chip pops in', { tier: "A" });
  add("store", "step-back", T.STORE.shift[0], "the tablet steps back", { shape: "swell", t1: T.STORE.shift[1], tier: "A" });
  add("store", "crm-rise", T.STORE.shift[0] + 0.1, "the CRM card rises", { shape: "swell", t1: r3(T.STORE.shift[1] + 0.2), tier: "A" });
  add("store", "lead-fly", T.STORE.fly[0], "a lead lifts out of the tablet and flies to the CRM", { shape: "span", t1: T.STORE.fly[1], tier: "A" });
  add("store", "lead-land", T.STORE.land, "the lead lands as a CRM row", { tier: "A", salience: "major" });
  add("store", "lead-fly", T.STORE.fly2[0], "the next lead flies, quicker", { shape: "span", t1: T.STORE.fly2[1], tier: "A" });
  add("store", "lead-land", T.STORE.land2, "the second lead lands", { tier: "A", salience: "major" });

  // ── Consultants (ConsultScene.tsx) ─────────────────────────────────────────────────────────────────────────────────────────
  add("consult", "sample", C.consult.from + 0.4, '"Sample data" chip appears', { tier: "T", salience: "minor" });
  add("consult", "lean", T.CONSULT.lean[0], "the camera leans in on the phone", { shape: "swell", t1: T.CONSULT.lean[1], tier: "A" });
  add("consult", "callout", T.CONSULT.search[0] + 0.1, '"Search any product" ring and label', { tier: "A" });
  tap(T.CONSULT.tap, "finger taps the third product");
  ev[ev.length - 1].scene = "consult";
  add("consult", "page-push", T.CONSULT.push[0], "the list pushes to the product guide", { shape: "swell", t1: T.CONSULT.push[1], tier: "A" });
  add("consult", "scroll", T.CONSULT.scroll1[0], "the guide scrolls to the manager's video", { shape: "span", t1: T.CONSULT.scroll1[1], tier: "T" });
  add("consult", "callout", T.CONSULT.video[0] + 0.1, '"Manager\'s video" ring and label', { tier: "A" });
  add("consult", "scroll", T.CONSULT.scroll2[0], "the guide scrolls to the insights and the advice", { shape: "span", t1: T.CONSULT.scroll2[1], tier: "T" });
  add("consult", "callout", T.CONSULT.advice[0] + 0.1, "the ring closes around the manager's advice", { tier: "A", salience: "minor" });
  add("consult", "pull", T.CONSULT.pull[0], "the phone steps back", { shape: "swell", t1: T.CONSULT.pull[1], tier: "A" });

  // ── system diagram (SystemScene.tsx) ───────────────────────────────────────────────────────────────────────────────────────
  const nodeNames = ["iPad kiosk", "Supabase", "Edge Function", "Email", "CRM relay"];
  T.SYSTEM.nodes.forEach((t, i) => add("system", "node", t, `node "${nodeNames[i]}" pops in`, { tier: "A", step: i, of: 5 }));
  [1, 2, 3, 4].forEach((i) => add("system", "line", T.SYSTEM.nodes[i] - 0.22, `connector ${i} of 4 draws itself`, { shape: "span", t1: r3(T.SYSTEM.nodes[i] + 0.28), tier: "T", salience: "minor" }));
  T.SYSTEM.packets.forEach((t, i) => add("system", "packet", t, `data starts flowing on connector ${i + 1}`, { tier: "T", step: i, of: 4 }));
  add("system", "chip", T.SYSTEM.nodes[0] + 0.5, '"Multi-store" chip pops on the kiosk node', { tier: "A" });
  ["Manager", "Stats", "Consultants"].forEach((n, i) => add("system", "tile", T.SYSTEM.tiles[i], `tile "${n}" rises`, { tier: "A", step: i, of: 3 }));
  add("system", "lock", T.SYSTEM.locks[0], '"RLS" chip pops on the database, a scan line sweeps', { tier: "A", salience: "major" });
  add("system", "lock", T.SYSTEM.locks[1], "MFA shock ring over the two protected dashboards", { tier: "A", salience: "major" });
  [0, 1].forEach((i) => add("system", "chip", T.SYSTEM.locks[1] + 0.05 * i, `"MFA" chip pops on ${["Manager", "Stats"][i]}`, { tier: "T", salience: "minor" }));

  // ── human close (HumanScene.tsx) ───────────────────────────────────────────────────────────────────────────────────────────
  add("human", "photo-cut", T.HUMAN.bagIn - 0.1, "cut to the bag hand-off photograph", { shape: "swell", t1: r3(T.HUMAN.bagIn + 0.3), tier: "A" });
  add("human", "rustle", T.HUMAN.rustle, "the bag changes hands", { tier: "A", salience: "major" });
  add("human", "redeem", T.HUMAN.redeemed, '"Redeemed in store" chip pops', { tier: "H", salience: "major" });
  add("human", "photo-cross", T.HUMAN.handshakeIn - 0.1, "the photographs cross to the handshake", { shape: "swell", t1: r3(T.HUMAN.handshakeIn + 0.45), tier: "A", salience: "minor" });
  add("human", "clasp", T.HUMAN.clasp, "the hands meet: warm bloom, ring, sparks", { tier: "S", salience: "major" });

  // ── end card (EndScene.tsx) ────────────────────────────────────────────────────────────────────────────────────────────────
  add("end", "end-hit", T.END.hit, "the logo lands over the handshake: rays, ring", { tier: "S", salience: "major" });
  ["S", "U", "A", "I", "P", "E"].forEach((c, i) => add("end", "letter", T.END.hit + 0.08 + 0.05 * i, `wordmark letter ${c} pops in`, { tier: "T", step: i, of: 6 }));
  add("end", "shimmer", T.END.shimmer, "a sheen sweeps the logo mark", { shape: "span", t1: r3(T.END.shimmer + 0.9), tier: "T" });
  add("end", "line", T.END.hit + 0.7, "the underline draws itself", { shape: "span", t1: r3(T.END.hit + 1.3), tier: "T", salience: "minor" });
  add("end", "tagline", T.END.tagline, '"Built for the whole store." rises', { shape: "span", t1: r3(T.END.tagline + 0.55), tier: "T" });
  ["iPad kiosk", "Manager", "Stats", "Consultants"].forEach((n, i) => add("end", "chip", T.END.chips[i], `area chip "${n}" pops in`, { tier: "A", step: i, of: 4 }));
  add("end", "tagline", T.END.tech, "the technology line rises", { shape: "span", t1: r3(T.END.tech + 0.6), tier: "T", salience: "minor" });
  {
    const r = rng(909); // EndScene GLITTER: 22 glints at random moments (the ones scheduled after the last frame are never seen)
    const at = Array.from({ length: 22 }, () => { r(); r(); r(); const t = T.END.sparkle + r() * 1.4; r(); return t; }).sort((a, b) => a - b).filter((t) => t < T.DURATION_S - 0.15);
    add("end", "twinkles", at[0], `${at.length} glints twinkle over the end card (${at[0].toFixed(2)} to ${at[at.length - 1].toFixed(2)} s)`, { shape: "span", t1: r3(Math.min(T.DURATION_S, at[at.length - 1] + 0.5)), tier: "T", salience: "minor", group: "end-glitter", times: at.map(r3) });
  }

  // ── captions (components/Caption.tsx): each opens word by word, the highlighted phrase underlines itself ───────────────
  T.CAPTIONS.forEach((c, i) => add("caption", "caption", c.from, `caption ${i + 1}: "${c.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}"`, { tier: "T", step: i, of: T.CAPTIONS.length }));

  // the highlighted phrase of each caption underlines itself (Caption.tsx: from 0.04 s x (index of its first word) + 0.35 s, over 0.5 s)
  T.CAPTIONS.forEach((c, i) => {
    let words = 0;
    let startIdx = null;
    let em = false;
    for (const part of c.text.split(/<br\s*\/?>/i).flatMap((line) => line.split(/(<\/?em>)/i))) {
      if (/^<em>$/i.test(part)) em = true;
      else if (/^<\/em>$/i.test(part)) em = false;
      else for (const w of part.split(/\s+/).filter(Boolean)) { if (em && startIdx === null) startIdx = words; words++; }
    }
    const a = c.from + 0.04 * (startIdx ?? 0) + 0.35;
    add("caption", "caption-line", a, `caption ${i + 1}: the highlighted phrase underlines itself`, { shape: "span", t1: r3(a + 0.5), tier: "T", salience: "minor", step: i, of: T.CAPTIONS.length });
  });

  // ── scene transitions (SuaipeFilm.tsx): one whoosh each, peaking when the picture moves ──────────────────────────────────────
  const trans = [
    ["hook → lock-up", "flashThrough", C.lockup.from, C.hook.to],
    ["lock-up → hand-off", "passthrough", C.ipad.from, C.lockup.to],
    ["iPad → iPhone", "swapSlide", C.phone.from, C.ipad.to],
    ["iPhone → Manager & Stats", "dropOut", C.store.from, C.phone.to],
    ["Manager & Stats → Consultants", "swapSlide", C.consult.from, C.store.to],
    ["Consultants → system", "dropOut", C.system.from, C.consult.to],
    ["system → human close", "photoCut", C.human.from, C.system.to],
    ["human close → end card", "defocus", C.end.from, C.human.to],
  ];
  trans.forEach(([label, kind, a, b]) => add("transition", "transition", a, `${label} (${kind})`, { shape: "swell", t1: b, tier: "A", presentation: kind, ...(kind === "defocus" ? { silent: "the handshake dissolves into the logo: the sound of that move is the motif on the logo (61.0) over the held chord" } : {}) }));

  // the film ends at DURATION_S: whatever the scenes schedule after the last frame (end-card glints fading out at 64.8 s) is never seen
  const seen = ev.filter((e) => e.t < T.DURATION_S - 0.1);
  seen.sort((a, b) => a.t - b.t || a.kind.localeCompare(b.kind));
  return seen;
}
