// Match percentage bounds — avoids demoralizing scores (<45%) and unrealistic perfect scores (100%).
// 98% cap preserves the sense that there's always a "better" match to explore.
const MATCH_MIN = 45;
const MATCH_MAX = 98;

// The 8 fixed matching tags — must stay in sync with TAG_MAP below.
export const AVAILABLE_TAGS = [
  "audio", "productivity", "recovery", "sport", "style", "tech", "travel", "wellness",
] as const;
export type AvailableTag = typeof AVAILABLE_TAGS[number];

export interface Product {
  id: string;
  name: string;
  image: string;
  price: string;
  rating: number;
  description: string;
  videoUrl: string;
  tags: string[];
  faq: { q: string; a: string }[];
}

// ⚠️ Fallback / test fixture only — the LIVE catalogue is the `custom_products`
// DB table (see CLAUDE.md gotcha #1). Keep this array in sync with the
// 20260606000001_suaipe_catalog_reset.sql migration and with the matcher tests.
// Fictional Suaipe-brand gadgets: real product categories, invented brand names
// so each one can get its own branded image (/products/<id>.png) and video.
export const products: Product[] = [
  {
    id: "aurae-pulse-pro",
    name: "Aurae Pulse Pro",
    image: "/products/aurae-pulse-pro.png",
    price: "€89,00",
    rating: 4.7,
    description: "Auricolari true wireless con cancellazione attiva del rumore adattiva, driver dinamici da 11mm e modalità trasparenza. Audio nitido per musica e chiamate, fino a 30 ore con la custodia e ricarica rapida USB-C.",
    videoUrl: "#",
    tags: ["audio", "productivity", "travel"],
    faq: [
      { q: "La cancellazione del rumore è efficace?", a: "Sì, l'ANC adattiva si regola in tempo reale sull'ambiente: silenzia aereo, ufficio e metropolitana mantenendo la musica pulita." },
      { q: "Quanto durano le batterie?", a: "Fino a 7 ore con una carica e 30 ore totali con la custodia. Cinque minuti di ricarica danno circa un'ora di ascolto." },
      { q: "Sono buoni per le chiamate?", a: "Sì, i microfoni con riduzione del rumore isolano la voce dal vento e dal traffico per chiamate chiare ovunque." },
    ],
  },
  {
    id: "lunaring-halo",
    name: "Lunaring Halo – Anello Smart",
    image: "/products/lunaring-halo.png",
    price: "€99,00",
    rating: 4.6,
    description: "Anello smart in titanio con monitoraggio 24/7 di frequenza cardiaca, SpO2, temperatura cutanea e fasi del sonno. Calcola un punteggio di recupero giornaliero, resistente all'acqua 10 ATM e fino a 6 giorni di autonomia.",
    videoUrl: "#",
    tags: ["recovery", "sport", "tech"],
    faq: [
      { q: "Come funziona il punteggio di recupero?", a: "Combina sonno, variabilità cardiaca e attività della giornata in un unico valore che ti dice quando spingere e quando riposare." },
      { q: "Si può indossare in acqua?", a: "Sì, impermeabilità 10 ATM: nuoto, doccia e mare senza preoccupazioni." },
      { q: "Quanto dura la batteria?", a: "Fino a 6 giorni con uso normale; si ricarica completamente in circa 80 minuti sulla base magnetica." },
    ],
  },
  {
    id: "brevia-gopress",
    name: "Brevia GoPress – Espresso Portatile",
    image: "/products/brevia-gopress.png",
    price: "€119,00",
    rating: 4.8,
    description: "Macchina da espresso portatile con 20 bar di pressione e riscaldamento dell'acqua integrato in meno di 3 minuti. Compatibile con capsule e caffè macinato, batteria da 7.800mAh per più tazze lontano da casa.",
    videoUrl: "#",
    tags: ["travel", "wellness", "productivity"],
    faq: [
      { q: "Scalda l'acqua da sola?", a: "Sì, la resistenza interna porta l'acqua a temperatura in meno di 3 minuti: ti serve solo acqua e caffè." },
      { q: "Quante tazze fa per carica?", a: "La batteria da 7.800mAh prepara più espressi consecutivi prima di richiedere una ricarica USB-C." },
      { q: "Che caffè posso usare?", a: "Capsule compatibili Nespresso oppure caffè macinato con il filtro incluso: massima libertà ovunque tu sia." },
    ],
  },
  {
    id: "vibewave-open",
    name: "Vibewave Open – Auricolari Open-Ear",
    image: "/products/vibewave-open.png",
    price: "€79,00",
    rating: 4.6,
    description: "Auricolari open-ear a conduzione che lasciano le orecchie libere, con 32GB di memoria interna e certificazione IPX8. Trasmettono musica e podcast restando consapevole dell'ambiente: ideali per corsa, bici e nuoto.",
    videoUrl: "#",
    tags: ["audio", "sport", "travel"],
    faq: [
      { q: "Si possono usare correndo in strada?", a: "Sì, il design open-ear lascia le orecchie aperte così senti traffico e ambiente mentre ascolti." },
      { q: "Funzionano senza telefono?", a: "Sì, 32GB di memoria interna ospitano migliaia di brani da ascoltare senza smartphone." },
      { q: "Resistono al sudore e all'acqua?", a: "Certificazione IPX8: sudore, pioggia e immersione in piscina non sono un problema." },
    ],
  },
  {
    id: "pulsar-recover-x",
    name: "Pulsar Recover X – Pistola Massaggiante",
    image: "/products/pulsar-recover-x.png",
    price: "€99,00",
    rating: 4.7,
    description: "Pistola massaggiante percussiva con motore brushless silenzioso, 5 livelli di intensità e 4 testine intercambiabili. Allevia le tensioni muscolari, migliora la circolazione e accelera il recupero post-allenamento.",
    videoUrl: "#",
    tags: ["recovery", "sport", "wellness"],
    faq: [
      { q: "È rumorosa?", a: "No, il motore brushless lavora sotto i 45dB: puoi usarla davanti alla TV senza disturbare." },
      { q: "Quanto dura la batteria?", a: "Fino a 6 ore di utilizzo per carica, con indicatore di livello e spegnimento automatico di sicurezza." },
      { q: "A cosa servono le testine?", a: "Quattro testine per zone diverse: sferica per i grandi muscoli, a cono per i punti precisi, a forcella per la colonna e piatta per i tendini." },
    ],
  },
  {
    id: "voltik-snapcell",
    name: "Voltik SnapCell – Power Bank Magnetico",
    image: "/products/voltik-snapcell.png",
    price: "€54,00",
    rating: 4.6,
    description: "Power bank magnetico ultrasottile da 5.000mAh con ricarica wireless istantanea e porta USB-C PD da 20W. Si aggancia al telefono e ricarica mentre lo usi, con indicatore LED di carica residua.",
    videoUrl: "#",
    tags: ["travel", "tech", "productivity"],
    faq: [
      { q: "Si aggancia bene al telefono?", a: "Sì, l'allineamento magnetico è compatibile con MagSafe (iPhone 12 e successivi) e con le custodie magnetiche." },
      { q: "Posso usarlo anche via cavo?", a: "Sì, la porta USB-C PD da 20W ricarica rapidamente telefono, auricolari o piccoli dispositivi." },
      { q: "Quanto è ingombrante?", a: "Solo 11mm di spessore: si infila in tasca e raddoppia l'autonomia del telefono senza pesare." },
    ],
  },
  {
    id: "aeris-glow",
    name: "Aeris Glow – Asciugacapelli ad Alta Velocità",
    image: "/products/aeris-glow.png",
    price: "€89,00",
    rating: 4.8,
    description: "Asciugacapelli ad alta velocità con motore brushless da 110.000 RPM e ioni negativi per ridurre il crespo. Controllo intelligente della temperatura anti-danno, ultraleggero e silenzioso, con 3 accessori magnetici.",
    videoUrl: "#",
    tags: ["style", "wellness", "productivity"],
    faq: [
      { q: "Asciuga davvero più in fretta?", a: "Sì, il flusso ad alta velocità riduce i tempi di asciugatura fino al 30% rispetto a un phon tradizionale." },
      { q: "Rovina i capelli?", a: "No, il sensore di temperatura previene il surriscaldamento e gli ioni negativi lasciano i capelli lucidi e morbidi." },
      { q: "Quali accessori include?", a: "Concentratore, diffusore e beccuccio lisciante, tutti ad aggancio magnetico per cambiarli al volo." },
    ],
  },
  {
    id: "echobox-riff",
    name: "Echobox Riff – Speaker Bluetooth Retrò",
    image: "/products/echobox-riff.png",
    price: "€64,00",
    rating: 4.5,
    description: "Cassa Bluetooth portatile in metallo con design retrò, radio FM integrata e suono stereo ricco. Resistente agli urti, abbinamento rapido e fino a 10 ore di riproduzione: musica di carattere ovunque.",
    videoUrl: "#",
    tags: ["audio", "style", "travel"],
    faq: [
      { q: "Ha la radio FM?", a: "Sì, sintonizzatore FM integrato: ascolti musica e notizie anche senza connessione o smartphone." },
      { q: "Quanto dura la batteria?", a: "Fino a 10 ore di riproduzione continua a volume medio, ricarica via USB-C." },
      { q: "È resistente?", a: "La scocca in metallo pieno resiste a urti e graffi quotidiani, perfetta da portare in viaggio." },
    ],
  },
  {
    id: "nimbus-sip",
    name: "Nimbus Sip – Borraccia Smart",
    image: "/products/nimbus-sip.png",
    price: "€45,00",
    rating: 4.4,
    description: "Borraccia smart termica in acciaio con promemoria luminoso di idratazione e tracciamento dei sorsi via app. Mantiene le bevande fredde 24 ore o calde 12, con tappo a tenuta e sensore touch sul fondo.",
    videoUrl: "#",
    tags: ["sport", "wellness", "tech"],
    faq: [
      { q: "Come ricorda di bere?", a: "Un anello luminoso si illumina con delicatezza quando è ora di idratarsi, in base ai tuoi obiettivi personali." },
      { q: "Mantiene la temperatura?", a: "Sì, l'isolamento sottovuoto tiene le bevande fredde fino a 24 ore e calde fino a 12." },
      { q: "Serve l'app?", a: "L'app sincronizza i sorsi e mostra i progressi, ma la borraccia e i promemoria funzionano anche da soli." },
    ],
  },
  {
    id: "lumio-air",
    name: "Lumio Air – Mini Proiettore Portatile",
    image: "/products/lumio-air.png",
    price: "€149,00",
    rating: 4.5,
    description: "Mini proiettore portatile Full HD con messa a fuoco automatica, correzione trapezoidale e sistema smart con app di streaming integrate. Batteria interna e altoparlanti, proietta fino a 120\" ovunque.",
    videoUrl: "#",
    tags: ["travel", "tech", "style"],
    faq: [
      { q: "Quanto grande proietta?", a: "Da 40\" a 120\" in base alla distanza dalla parete, con messa a fuoco e correzione automatiche." },
      { q: "Funziona senza presa di corrente?", a: "Sì, la batteria interna offre un film intero lontano dalla corrente; altoparlanti integrati per audio immediato." },
      { q: "Serve un lettore esterno?", a: "No, il sistema smart integra le principali app di streaming; puoi anche collegare un HDMI o trasmettere dal telefono." },
    ],
  },
];
// Static fallback — used when no dynamic tagMap is supplied (e.g. in unit tests).
// Must stay in sync with questions.ts categories and the quiz_cards DB seed.
const STATIC_TAG_MAP: Record<number, string> = {
  1: "sport",
  2: "audio",
  3: "productivity",
  4: "wellness",
  5: "travel",
  6: "tech",
  7: "style",
  8: "recovery",
};

export function getMatchedProduct(
  answers: Record<number, boolean>,
  activeIds?: Set<string>,
  allProducts?: Product[],
  tagMap?: Record<number, string>,
): { product: Product; matchPercent: number } {
  const resolvedTagMap = tagMap ?? STATIC_TAG_MAP;
  // Undefined selects the fixture; an explicitly empty catalog means unavailable.
  const source = allProducts ?? products;
  const pool = activeIds ? source.filter((p) => activeIds.has(p.id)) : source;
  if (!pool.length) throw new Error("No active products available");

  const activeTags: string[] = [];
  Object.entries(answers).forEach(([qId, answered]) => {
    if (answered && resolvedTagMap[Number(qId)]) activeTags.push(resolvedTagMap[Number(qId)]);
  });

  let bestScore = 0;
  const tied: Product[] = [];

  pool.forEach((product) => {
    const score = product.tags.filter((tag) => activeTags.includes(tag)).length;
    if (score > bestScore) {
      bestScore = score;
      tied.length = 0;
      tied.push(product);
    } else if (score === bestScore) {
      tied.push(product);
    }
  });

  const bestProduct = tied[Math.floor(Math.random() * tied.length)] ?? pool[0];

  const totalTags = bestProduct.tags.length || 1;
  const rawPercent = Math.round((bestScore / totalTags) * 100);
  const matchPercent = Math.min(MATCH_MAX, Math.max(MATCH_MIN, rawPercent));

  return { product: bestProduct, matchPercent };
}
