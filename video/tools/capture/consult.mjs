// Captures the real /consulente ("Consultant Training: product knowledge base") for the film's Consultants scene, on a phone-sized viewport
// (430 x 932 css px, 3x): the product list with the English switch on, and one product guide as a tall page (what the customer sees, the
// manager's video, two insights, the manager's advice). The browser carries an injected, already MFA-verified session with the
// "consulente" role, and every Supabase call is answered with SAMPLE data: invented guides for the fictional products. The video is a
// neutral poster served in place of the embedded player. Nothing here comes from production; the film labels these screens "Sample data".
//
//   node consult.mjs           writes ../../public/app/still/{consult-list,consult-guide}.webp + consult-layout.json
//   node consult.mjs --probe   prints what is on the pages
import path from "node:path";
import sharp from "sharp";
import * as L from "./lib.mjs";
import { CORS, respond, staffSession } from "./staff.mjs";

const PROBE = process.argv.includes("--probe");
const HOST = "mock.supabase.co";
const VIEW = { width: 430, height: 932 };
const DPR = 3;
const UPDATED = "2026-09-24T09:30:00.000Z";
const VIDEO_URL = "https://youtu.be/AbCdEfGhIjK";

const NAME = Object.fromEntries(L.CATALOG.map((p) => [p.id, p.name]));

// ── sample guides: invented, consultant-facing, no figures ───────────────────────────────────────────
const G = (product_id, en, it) => ({
  product_id, product_name: NAME[product_id] ?? product_id,
  description_it: it[0], description_en: en[0], insight_1_it: it[1], insight_1_en: en[1], insight_2_it: it[2], insight_2_en: en[2],
  manager_advice_it: it[3], manager_advice_en: en[3], manager_advice_audio_url: null, video_url: VIDEO_URL, updated_at: UPDATED,
});
const GUIDES = [
  G("aeris-glow",
    ["Fast hair dryer for customers who want a salon finish without the wait.", "Let them feel the airflow on the back of the hand before you talk features.", "Ask about their hair first: the attachments change the story for fine or curly hair.", "Lead with the time saved every morning, then show the attachments."],
    ["Asciugacapelli veloce per chi vuole un risultato da salone senza attese.", "Fai sentire il flusso d'aria sul dorso della mano prima di parlare di caratteristiche.", "Chiedi prima del tipo di capello: gli accessori cambiano il discorso per capelli fini o ricci.", "Parti dal tempo risparmiato ogni mattina, poi mostra gli accessori."]),
  G("aurae-pulse-pro",
    ["Premium earbuds for customers who commute, train or take calls on the move.", "Offer the fit test: a good seal changes how everything sounds.", "If they ask about noise cancelling, let them try it with the shop around them.", "Never skip the fit test. A customer who hears the difference stops comparing prices."],
    ["Auricolari premium per chi viaggia, si allena o risponde in movimento.", "Proponi la prova di vestibilità: una buona tenuta cambia tutto il suono.", "Se chiedono della cancellazione del rumore, fagliela provare con il negozio intorno.", "Non saltare mai la prova di vestibilità: chi sente la differenza smette di confrontare i prezzi."]),
  G("brevia-gopress",
    ["A portable espresso maker for travel, the office and the campsite: real pressure, no machine on the counter.", "Pull a demo shot at the counter. The smell does half the selling.", "Everyone asks about capsules: it takes capsules or ground coffee, so there is nothing to lock them in.", "Demo first, features second. Mention the battery only if they travel."],
    ["Macchina da caffè espresso portatile per viaggio, ufficio e campeggio: pressione vera, senza macchina sul bancone.", "Prepara un espresso di prova al banco. Il profumo fa metà della vendita.", "Tutti chiedono delle capsule: funziona con capsule o caffè macinato, nessun vincolo.", "Prima la prova, poi le caratteristiche. Parla della batteria solo a chi viaggia."]),
  G("echobox-riff",
    ["Retro Bluetooth speaker with a warm sound and a look that belongs on a shelf.", "Play something they know: the sound sells it faster than a spec sheet.", "Customers ask if it works outdoors. Show them how it is built and let them hold it.", "Sell it as an object for the home first, a speaker second."],
    ["Altoparlante Bluetooth retrò dal suono caldo, pensato per stare in vista su uno scaffale.", "Fai sentire un brano che conoscono: il suono vende più di una scheda tecnica.", "Chiedono se va bene all'aperto. Mostra com'è costruito e fallo tenere in mano.", "Vendilo prima come oggetto per la casa, poi come altoparlante."]),
  G("lumio-air",
    ["A pocket projector for movie nights, trips and quick presentations.", "Switch off one light and project on the nearest wall: the size of the picture does the talking.", "Ask where they would use it. A bedroom and a hotel room need different pitches.", "Let them set it up themselves. If it takes one minute in the store, it takes one minute at home."],
    ["Proiettore tascabile per serate film, viaggi e presentazioni veloci.", "Spegni una luce e proietta sul muro più vicino: l'immagine parla da sola.", "Chiedi dove lo userebbero. Una camera e una stanza d'albergo richiedono discorsi diversi.", "Fallo montare a loro. Se bastano pochi minuti in negozio, bastano anche a casa."]),
  G("lunaring-halo",
    ["A smart ring that tracks sleep and activity without a screen on the wrist.", "Let them try the sizing kit before anything else: the right size is the whole experience.", "People worry about wearing it all day. Point out how little there is to notice.", "Talk about sleep first. It is why most customers come back to ask about it."],
    ["Anello smart che monitora sonno e attività senza uno schermo al polso.", "Fai provare prima la misura: la taglia giusta è tutta l'esperienza.", "Temono di portarlo tutto il giorno. Fai notare quanto poco si senta.", "Parla prima del sonno. È il motivo per cui molti tornano a chiedere."]),
  G("nimbus-sip",
    ["Smart bottle that reminds you to drink and keeps the drink at temperature.", "Fill it with water at the counter and show the light that reminds you to sip.", "Ask if they train or work at a desk: the reminder matters for both, differently.", "It is a daily habit product. Make the first week sound easy."],
    ["Borraccia smart che ricorda di bere e mantiene la temperatura.", "Riempila d'acqua al banco e mostra la luce che ricorda di bere.", "Chiedi se si allenano o lavorano alla scrivania: il promemoria conta in modo diverso.", "È un prodotto d'abitudine. Fai sembrare facile la prima settimana."]),
  G("pulsar-recover-x",
    ["Massage gun for recovery after training and for tired shoulders at the end of the day.", "Let them try it on the shoulder, never on the neck, and show the lowest speed first.", "Customers ask which head to use. Match the head to where they feel it.", "Start with the lowest speed in your demo; the second customer will ask for more."],
    ["Pistola da massaggio per il recupero dopo l'allenamento e le spalle stanche a fine giornata.", "Fai provare sulla spalla, mai sul collo, partendo dalla velocità più bassa.", "Chiedono quale testina usare. Abbinala alla zona in cui sentono il fastidio.", "Parti dalla velocità più bassa nella dimostrazione; il secondo cliente chiederà di più."]),
  G("vibewave-open",
    ["Open-ear earbuds that keep you aware of the street while you listen.", "Let them walk three steps with them on: the open feel is the point.", "People ask about bass. Be honest: it is a different kind of listening.", "Sell awareness and comfort. Do not compare them with in-ear models."],
    ["Auricolari open-ear che ti lasciano sentire la strada mentre ascolti.", "Fai fare tre passi con gli auricolari: il suono aperto è il punto.", "Chiedono dei bassi. Sii onesto: è un ascolto diverso.", "Vendi consapevolezza e comfort. Non confrontarli con i modelli in-ear."]),
  G("voltik-snapcell",
    ["Magnetic power bank that snaps onto the back of the phone.", "Snap it on a demo phone and let them hold both: the feel is the demo.", "Ask which phone they have. Compatibility is the first thing everyone checks.", "Say what it fixes: the afternoon at 20 %. Skip the long spec list."],
    ["Power bank magnetico che si aggancia al retro dello smartphone.", "Agganciala a un telefono di prova e fai tenere in mano entrambi: la sensazione è la dimostrazione.", "Chiedi che telefono hanno. La compatibilità è la prima cosa che tutti controllano.", "Racconta cosa risolve: il pomeriggio con il telefono quasi scarico. Salta l'elenco di specifiche."]),
];

// ── the Supabase stand-in ────────────────────────────────────────────────────────────────────────────
async function consult(route) {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  if (p.endsWith("/rest/v1/store_roles")) return respond(route, [{ role: "consulente" }]);
  if (p.endsWith("/rest/v1/product_guides")) return respond(route, GUIDES);
  return route.fallback();
}

// the manager's explainer, replaced by a neutral poster (no third-party player, no logo): the product, a play button and a duration
const POSTER = (img) => `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0a1030;overflow:hidden;font-family:'Space Grotesk',system-ui,sans-serif}
.p{position:absolute;inset:0;background:radial-gradient(120% 140% at 70% 40%,#1c3a7a 0%,#0e1c4a 45%,#080d26 100%)}
img{position:absolute;right:6%;top:50%;height:86%;transform:translateY(-50%);filter:drop-shadow(0 14px 30px rgba(0,0,0,.55))}
.b{position:absolute;left:12%;top:50%;width:19%;aspect-ratio:1;transform:translateY(-50%);border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 0 8px rgba(255,255,255,.14)}
.b i{margin-left:8%;border-left:34px solid #0a1030;border-top:21px solid transparent;border-bottom:21px solid transparent}
.t{position:absolute;right:12px;bottom:10px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.6);color:#fff;font-size:13px;font-weight:600}
</style><div class="p"></div><img src="${img}"><div class="b"><i></i></div><div class="t">0:30</div>`;

// ── run ───────────────────────────────────────────────────────────────────────────────────────────────
await L.assertAppIsUp();
const browser = await L.launch();
const out = L.ensureDir(path.join(L.OUT_DIR, "still"));
const layout = { viewport: VIEW, dpr: DPR, note: "DOM rects in CSS px of the 430 x 932 viewport (the guide: of the tall page); the stills are 3x" };
try {
  const { ctx, page } = await L.makeSession(browser, { dpr: DPR, width: VIEW.width, height: VIEW.height });
  await ctx.addInitScript((session) => {
    try { sessionStorage.setItem("sb-mock-auth-token", JSON.stringify(session)); } catch (e) { /* ignore */ }
  }, staffSession("consultant@example.com"));
  await ctx.route(`https://${HOST}/**`, consult);
  // (embedded as a data URI: the poster is an https document and may not load the http dev server's image)
  const packshot = "data:image/png;base64," + (await sharp(L.CLEAN_BREVIA).resize({ height: 420 }).png().toBuffer()).toString("base64");
  await ctx.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: POSTER(packshot) }));

  if (PROBE) {
    page.on("console", (m) => console.log("[console]", m.type(), m.text().slice(0, 200)));
    page.on("requestfailed", (r) => console.log("[requestfailed]", r.url().slice(0, 120)));
  }
  const shot = async (name, opts = {}) => {
    await L.fontsReady(page);
    await L.hideCaret(page);
    await L.sleep(opts.settle ?? 900);
    const buf = await page.screenshot({ type: "png", fullPage: !!opts.full });
    await L.writeWebp(buf, path.join(out, `${name}.webp`), { quality: opts.quality ?? 90 });
    L.log("still ", name);
  };
  const rect = (sel) => page.evaluate((s) => {
    const el = s.re ? [...document.querySelectorAll(s.css)].find((e) => new RegExp(s.re, "i").test(e.textContent || "")) : document.querySelector(s.css);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +(r.y + window.scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  }, sel);

  await page.goto(`${L.APP_URL}/consulente`, { waitUntil: "load" });
  await page.waitForFunction(() => /Consultant Training/.test(document.body.innerText) && /Aeris Glow/.test(document.body.innerText), null, { timeout: 25000 });
  if (PROBE) console.log("--- /consulente text ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 1500));
  await page.getByRole("button", { name: /^en$/i }).first().click();          // the guides in English
  await L.sleep(700);
  await shot("consult-list", { settle: 1000 });
  layout.list = {
    header: await rect({ css: "header" }),
    langSwitch: await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => /^en$/i.test(e.textContent.trim())); const r = b?.parentElement?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }),
    search: await rect({ css: "input" }),
    rows: await page.evaluate(() => [...document.querySelectorAll("main button")].map((b) => { const r = b.getBoundingClientRect(); return { text: (b.querySelector("p")?.textContent || "").trim(), x: r.x, y: r.y, w: r.width, h: r.height }; })),
  };

  await page.getByRole("button", { name: /Brevia GoPress/ }).first().click();
  await page.waitForFunction(() => /What the customer sees/.test(document.body.innerText), null, { timeout: 15000 });
  await page.waitForSelector("iframe", { timeout: 15000 });
  await L.sleep(1800);                                                          // the poster in the frame
  await shot("consult-guide", { full: true, settle: 1000, quality: 88 });
  const pageH = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  layout.guide = {
    pageHeight: pageH,
    title: await rect({ css: "h2" }),
    updated: await rect({ css: "p", re: "^Updated" }),
    customer: await page.evaluate(() => { const h = [...document.querySelectorAll("h3")].find((e) => /What the customer sees/.test(e.textContent)); const c = h?.closest("div.rounded-2xl"); const r = c?.getBoundingClientRect(); return r ? { x: r.x, y: r.y + scrollY, w: r.width, h: r.height } : null; }),
    video: await page.evaluate(() => { const h = [...document.querySelectorAll("h3")].find((e) => /Product video/.test(e.textContent)); const c = h?.closest("div.rounded-2xl"); const r = c?.getBoundingClientRect(); return r ? { x: r.x, y: r.y + scrollY, w: r.width, h: r.height } : null; }),
    sections: await page.evaluate(() => [...document.querySelectorAll("h3")].map((h) => { const c = h.closest("div.rounded-2xl"); const r = c?.getBoundingClientRect(); return { title: h.textContent.trim(), x: r?.x, y: r ? r.y + scrollY : null, w: r?.width, h: r?.height }; })),
  };
  L.writeJson(path.join(L.OUT_DIR, "consult-layout.json"), layout);
  L.log("consult captured ✓");
} finally {
  await browser.close();
}
