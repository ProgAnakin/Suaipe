// Supabase Edge Function — triggered by Database Webhook on quiz_sessions INSERT
// Generates a unique discount code, sends the match email via Brevo,
// then updates the session row with the code and email_sent = true.
// Deploy: supabase functions deploy on-session-created
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   BREVO_API_KEY             — from brevo.com
//   SUPABASE_URL              — auto-injected by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { genDiscountCode } from "../_shared/discountCode.ts";

const BREVO_KEY        = Deno.env.get("BREVO_API_KEY") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGIN   = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const SHEETS_WEBHOOK   = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL") ?? "";
// Shared secret for the Supabase Database Webhook. When set, the function
// rejects requests that don't carry a matching x-webhook-secret header.
// Leave unset only for local development — production must always set this.
const WEBHOOK_SECRET   = Deno.env.get("WEBHOOK_SECRET") ?? "";
const EMAIL_SENDER     = Deno.env.get("EMAIL_SENDER") ?? "noreply@suaipe.app";

if (!WEBHOOK_SECRET) {
  console.error("[on-session-created] WEBHOOK_SECRET is NOT set — the function will REJECT every request until it is configured.");
}

// Constant-time comparison to avoid timing oracles on the shared secret.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Comma-separated list of emails that bypass the 1-email-per-hour rate limit.
// Set via Supabase secret WHITELIST_EMAILS. Remove when testing is complete.
const WHITELIST_EMAILS = new Set(
  (Deno.env.get("WHITELIST_EMAILS") ?? "").split(",")
    .map((e) => e.trim().toLowerCase()).filter(Boolean)
);

// Suaipe palette — electric-blue → cyan as the brand axis, mint for success.
// `accent` / `accentDeep` form the brand gradient used wherever the legacy
// orange/orange-red pair lived (CTA bars, code box, step numbers, barcode).
const C = {
  bg:         "#0d1228",
  card:       "#151d47",
  cardAlt:    "#1a2550",
  cardHeader: "#101628",
  border:     "#2a3a68",
  fg:         "#f0f4ff",
  muted:      "#7a8fbb",
  accent:     "#3b82f6",
  accentDeep: "#1e40af",
  mint:       "#5eead4",
  cyan:       "#22d3ee",
  blue:       "#3b82f6",
  indigo:     "#6366f1",
} as const;

function matchColor(pct: number): string {
  if (pct >= 90) return C.mint;
  if (pct >= 80) return C.cyan;
  if (pct >= 65) return C.blue;
  return C.indigo;
}

function matchBadgeLabel(pct: number): string {
  if (pct >= 90) return "MATCH PERFETTO";
  if (pct >= 80) return "OTTIMO MATCH";
  if (pct >= 65) return "BUON MATCH";
  return "MATCH TROVATO";
}

// ⚠ Synced copy — kept in lockstep with src/lib/validators.ts (Deno can't
// import from the Vite src/ tree). Unit tests live in
// src/__tests__/validators.test.ts and lock the expected behaviour.
function youtubeId(url: string): string | null {
  // Covers: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
  // youtube.com/embed/ID, youtube-nocookie.com/embed/ID
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// genDiscountCode lives in ../_shared/discountCode.ts — unit-tested from src via
// Vitest (src/__tests__/discountCode.test.ts).

// ⚠ Synced copy — kept in lockstep with src/lib/validators.ts. Tests in
// src/__tests__/validators.test.ts cover both code paths.
const STORE_ID_RE = /^[a-z0-9][a-z0-9-]{1,49}$/;
function isValidStoreId(id: unknown): boolean {
  return typeof id === "string" && STORE_ID_RE.test(id);
}

const BARCODE_RECTS = [
  [2,3,.55],[7,1,.80],[10,4,.50],[16,2,.70],[20,5,.55],[27,1,.85],[30,3,.50],
  [36,2,.70],[40,4,.55],[47,1,.85],[50,6,.50],[58,2,.70],[62,3,.55],[68,1,.85],
  [71,4,.50],[78,2,.70],[83,5,.55],[90,1,.85],[93,3,.50],[98,4,.70],[105,2,.55],
  [109,1,.85],[113,5,.50],[121,2,.70],[125,3,.55],[131,1,.85],[134,4,.50],
  [141,2,.70],[146,6,.55],[155,1,.85],[158,3,.50],[163,2,.70],[168,4,.55],
  [175,1,.85],[178,5,.50],[186,2,.70],[190,3,.55],[196,2,.80],
] as const;

function barcodesvg(color: string): string {
  const rects = BARCODE_RECTS.map(([x,w,o]) =>
    `<rect x="${x}" y="0" width="${w}" height="30" fill="${color}" opacity="${o}"/>`
  ).join("");
  return `<svg width="200" height="30" viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  const u = String(url).trim();
  return /^https:\/\//i.test(u) ? u : "";
}

function progressHtml(pct: number, color: string, muted: string, compatLabel = "COMPATIBILITÀ"): string {
  const filled = Math.round(pct / 10);
  const dots = '●'.repeat(filled) + '○'.repeat(10 - filled);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="text-align:center;padding:0;">
      <p style="margin:0;font-size:72px;font-weight:900;color:${color};line-height:1;font-family:Arial,Helvetica,sans-serif;mso-line-height-rule:exactly;">${pct}<span style="font-size:36px;font-weight:900;">%</span></p>
      <p style="margin:8px 0 6px;font-size:9px;font-weight:700;color:${muted};letter-spacing:0.28em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;text-align:center;">${compatLabel}</p>
      <p style="margin:0;font-size:20px;letter-spacing:4px;color:${color};text-align:center;font-family:Arial,Helvetica,sans-serif;">${dots}</p>
  </td></tr></table>`;
}

interface EmailTpl {
  sender_name: string;
  subject_template: string;
  header_title: string;
  header_subtitle: string;
  footer_store_name: string;
}

type Lang = "it" | "en" | "pt" | "es" | "fr";

const EMAIL_I18N: Record<Lang, {
  htmlLang: string;
  preheader: (pct: number, code: string) => string;
  compatibility: string;
  productSection: string;
  codeSection: string;
  insertAtCheckout: string;
  specialDiscount: string;
  hrs24: string;
  inStore: string;
  oneUse: string;
  discountTicket: string;
  howToRedeem: string;
  step1Title: string; step1Sub: string;
  step2Title: string; step2Sub: string;
  step3Title: string; step3Sub: string;
  actionRequired: string;
  saveEmail: string; saveEmailSub: string;
  within24h: string; within24hSub: string;
  visitStore: string; visitStoreSub: string;
  faqSection: string;
  imagesNote: string;
  gdpr: string;
  receivedNote: string;
  codeExpiry: string;
}> = {
  it: {
    htmlLang: "it",
    preheader: (pct, code) => `🎉 ${pct}% di compatibilità — Il tuo codice ${code} scade in 24 ore!`,
    compatibility: "COMPATIBILITÀ",
    productSection: "── IL TUO GADGET IDEALE ──",
    codeSection: "IL TUO CODICE SCONTO ESCLUSIVO",
    insertAtCheckout: "Inserisci al checkout",
    specialDiscount: "SCONTO SPECIALE",
    hrs24: "✓ 24 ore", inStore: "🏪 In negozio", oneUse: "1️⃣ Un uso",
    discountTicket: "Biglietto Sconto",
    howToRedeem: "COME RISCUOTERE LO SCONTO",
    step1Title: "Mostra l'email", step1Sub: "Al consulente in negozio",
    step2Title: "Scegli il prodotto", step2Sub: "Il tuo match o qualsiasi altro",
    step3Title: "Applica il codice", step3Sub: "Al checkout — sconto immediato",
    actionRequired: "AZIONE RICHIESTA",
    saveEmail: "Salva l'email", saveEmailSub: "Avrai il codice a portata di mano",
    within24h: "Entro 24 ore", within24hSub: "Il codice scade presto",
    visitStore: "Vieni in store", visitStoreSub: "Mostra al consulente",
    faqSection: "DOMANDE FREQUENTI",
    imagesNote: "Le immagini non si caricano? Clicca <strong style=\"color:#f0f4ff;\">&ldquo;Mostra immagini&rdquo;</strong> in cima all&rsquo;email per visualizzare il prodotto e il video del consulente.",
    gdpr: "Dati crittografati · Conformità GDPR",
    receivedNote: "Hai ricevuto questa email perché hai partecipato a Suaipe in negozio.",
    codeExpiry: "Il codice sconto è valido 24 ore dalla ricezione.",
  },
  en: {
    htmlLang: "en",
    preheader: (pct, code) => `🎉 ${pct}% compatibility — Your code ${code} expires in 24 hours!`,
    compatibility: "COMPATIBILITY",
    productSection: "── YOUR IDEAL GADGET ──",
    codeSection: "YOUR EXCLUSIVE DISCOUNT CODE",
    insertAtCheckout: "Use at checkout",
    specialDiscount: "SPECIAL DISCOUNT",
    hrs24: "✓ 24 hours", inStore: "🏪 In store", oneUse: "1️⃣ One use",
    discountTicket: "Discount Ticket",
    howToRedeem: "HOW TO REDEEM YOUR DISCOUNT",
    step1Title: "Show the email", step1Sub: "To the store consultant",
    step2Title: "Choose the product", step2Sub: "Your match or any other",
    step3Title: "Apply the code", step3Sub: "At checkout — instant discount",
    actionRequired: "ACTION REQUIRED",
    saveEmail: "Save the email", saveEmailSub: "Keep the code handy",
    within24h: "Within 24 hours", within24hSub: "The code expires soon",
    visitStore: "Visit the store", visitStoreSub: "Show to the consultant",
    faqSection: "FREQUENTLY ASKED QUESTIONS",
    imagesNote: "Images not loading? Click <strong style=\"color:#f0f4ff;\">&ldquo;Show images&rdquo;</strong> at the top of the email to display the product and consultant video.",
    gdpr: "Encrypted data · GDPR compliant",
    receivedNote: "You received this email because you participated in Suaipe in store.",
    codeExpiry: "The discount code is valid for 24 hours from receipt.",
  },
  pt: {
    htmlLang: "pt",
    preheader: (pct, code) => `🎉 ${pct}% de compatibilidade — O seu código ${code} expira em 24 horas!`,
    compatibility: "COMPATIBILIDADE",
    productSection: "── O SEU GADGET IDEAL ──",
    codeSection: "O SEU CÓDIGO DE DESCONTO EXCLUSIVO",
    insertAtCheckout: "Use no checkout",
    specialDiscount: "DESCONTO ESPECIAL",
    hrs24: "✓ 24 horas", inStore: "🏪 Na loja", oneUse: "1️⃣ Um uso",
    discountTicket: "Bilhete de Desconto",
    howToRedeem: "COMO RESGATAR O DESCONTO",
    step1Title: "Mostre o email", step1Sub: "Ao consultor na loja",
    step2Title: "Escolha o produto", step2Sub: "O seu match ou qualquer outro",
    step3Title: "Aplique o código", step3Sub: "No checkout — desconto imediato",
    actionRequired: "AÇÃO NECESSÁRIA",
    saveEmail: "Guarde o email", saveEmailSub: "Terá o código sempre à mão",
    within24h: "Nas próximas 24 horas", within24hSub: "O código expira em breve",
    visitStore: "Visite a loja", visitStoreSub: "Mostre ao consultor",
    faqSection: "PERGUNTAS FREQUENTES",
    imagesNote: "Imagens não carregam? Clique em <strong style=\"color:#f0f4ff;\">&ldquo;Mostrar imagens&rdquo;</strong> no topo do email para visualizar o produto e o vídeo do consultor.",
    gdpr: "Dados encriptados · Conformidade GDPR",
    receivedNote: "Recebeu este email porque participou no Suaipe na loja.",
    codeExpiry: "O código de desconto é válido por 24 horas após a receção.",
  },
  es: {
    htmlLang: "es",
    preheader: (pct, code) => `🎉 ${pct}% de compatibilidad — Tu código ${code} expira en 24 horas!`,
    compatibility: "COMPATIBILIDAD",
    productSection: "── TU GADGET IDEAL ──",
    codeSection: "TU CÓDIGO DE DESCUENTO EXCLUSIVO",
    insertAtCheckout: "Usa en el checkout",
    specialDiscount: "DESCUENTO ESPECIAL",
    hrs24: "✓ 24 horas", inStore: "🏪 En tienda", oneUse: "1️⃣ Un uso",
    discountTicket: "Vale Descuento",
    howToRedeem: "CÓMO CANJEAR TU DESCUENTO",
    step1Title: "Muestra el email", step1Sub: "Al consultor en tienda",
    step2Title: "Elige el producto", step2Sub: "Tu match o cualquier otro",
    step3Title: "Aplica el código", step3Sub: "Al pagar — descuento inmediato",
    actionRequired: "ACCIÓN REQUERIDA",
    saveEmail: "Guarda el email", saveEmailSub: "Tendrás el código a mano",
    within24h: "Dentro de 24 horas", within24hSub: "El código expira pronto",
    visitStore: "Visita la tienda", visitStoreSub: "Muéstraselo al consultor",
    faqSection: "PREGUNTAS FRECUENTES",
    imagesNote: "¿Las imágenes no cargan? Haz clic en <strong style=\"color:#f0f4ff;\">&ldquo;Mostrar imágenes&rdquo;</strong> en la parte superior del email.",
    gdpr: "Datos cifrados · Cumplimiento GDPR",
    receivedNote: "Recibiste este email porque participaste en Suaipe en tienda.",
    codeExpiry: "El código de descuento es válido 24 horas desde la recepción.",
  },
  fr: {
    htmlLang: "fr",
    preheader: (pct, code) => `🎉 ${pct}% de compatibilité — Votre code ${code} expire dans 24 heures !`,
    compatibility: "COMPATIBILITÉ",
    productSection: "── VOTRE GADGET IDÉAL ──",
    codeSection: "VOTRE CODE DE RÉDUCTION EXCLUSIF",
    insertAtCheckout: "À utiliser au paiement",
    specialDiscount: "RÉDUCTION SPÉCIALE",
    hrs24: "✓ 24 heures", inStore: "🏪 En boutique", oneUse: "1️⃣ Un usage",
    discountTicket: "Bon de Réduction",
    howToRedeem: "COMMENT UTILISER VOTRE RÉDUCTION",
    step1Title: "Montrez l'email", step1Sub: "Au conseiller en boutique",
    step2Title: "Choisissez le produit", step2Sub: "Votre match ou un autre",
    step3Title: "Appliquez le code", step3Sub: "Au paiement — réduction immédiate",
    actionRequired: "ACTION REQUISE",
    saveEmail: "Sauvegardez l'email", saveEmailSub: "Gardez le code à portée de main",
    within24h: "Dans les 24 heures", within24hSub: "Le code expire bientôt",
    visitStore: "Venez en boutique", visitStoreSub: "Montrez-le au conseiller",
    faqSection: "FOIRES AUX QUESTIONS",
    imagesNote: "Images non chargées ? Cliquez sur <strong style=\"color:#f0f4ff;\">&ldquo;Afficher les images&rdquo;</strong> en haut de l'email.",
    gdpr: "Données chiffrées · Conformité RGPD",
    receivedNote: "Vous avez reçu cet email car vous avez participé à Suaipe en boutique.",
    codeExpiry: "Le code de réduction est valable 24 heures après réception.",
  },
};

function buildEmail(record: Record<string, unknown>, code: string, faq: Array<{ q: string; a: string }>, tpl?: EmailTpl): string {
  const lang = (String(record.language ?? "it") as Lang);
  const i18n = EMAIL_I18N[lang] ?? EMAIL_I18N.it;
  // header_title / header_subtitle are editable rich-text fields from /manager
  // and intentionally contain inline HTML (<strong>, <em>, <span style>). They are
  // interpolated raw — do NOT wrap in escHtml. Authoring is gated by PIN auth and
  // email clients sandbox <script>/event handlers, so the XSS surface is minimal.
  const headerTitle    = tpl?.header_title    ?? "Abbiamo trovato il tuo match!";
  const headerSubtitle = tpl?.header_subtitle ?? "Il nostro algoritmo ha analizzato le tue risposte e ha selezionato il <strong style=\"color:#f0f4ff;\">gadget perfetto per il tuo stile di vita</strong>.";
  const footerName     = tpl?.footer_store_name ?? "Costanzo Annichini";
  const nome         = escHtml(String(record.nome    ?? "").trim());
  const cognome      = escHtml(String(record.cognome ?? "").trim());
  const pct          = Number(record.match_percent ?? 0);
  const productName  = escHtml(String(record.product_name  ?? "Il tuo prodotto"));
  const productPrice = escHtml(String(record.product_price ?? ""));
  // Keep raw URLs for YouTube ID extraction, then HTML-escape for use in attributes.
  const productImageRaw = safeUrl(String(record.product_image ?? ""));
  const productVideoRaw = safeUrl(String(record.product_video ?? ""));
  const productImage = escHtml(productImageRaw);
  const productVideo = escHtml(productVideoRaw);
  const ringColor      = matchColor(pct);
  const badgeLabel     = matchBadgeLabel(pct);
  const fullName       = [nome, cognome].filter(Boolean).join(" ");
  const recipientEmail = escHtml(String(record.email ?? ""));
  const vidId          = productVideoRaw ? youtubeId(productVideoRaw) : null;
  const thumbUrl       = vidId ? `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg` : null;

  return `<!DOCTYPE html>
<html lang="${i18n.htmlLang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <title>Il tuo match Suaipe</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block}
    body{margin:0!important;padding:0!important;background-color:${C.bg}}
    a{color:${C.accent};text-decoration:none}
    @media only screen and (max-width:620px){
      .wrapper{width:100%!important;border-radius:0!important}
      .step-col{display:block!important;width:100%!important;text-align:center!important;
                padding:12px 20px!important;border-right:none!important;border-bottom:1px solid #2a3a68!important}
      .step-col:last-child{border-bottom:none!important}
      .hide-mobile{display:none!important;max-height:0!important;overflow:hidden!important}
      .product-name-td{display:block!important;width:100%!important}
      .product-badge-td{display:block!important;width:100%!important;text-align:center!important;padding:8px 0 0!important}
      h1{font-size:22px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Space Grotesk',Arial,Helvetica,sans-serif;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${C.bg};line-height:1px;">
  ${i18n.preheader(pct, code)}
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};">
<tr><td align="center" style="padding:28px 12px 52px;">
<table class="wrapper" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
       style="max-width:600px;width:100%;border-radius:20px;border:1px solid ${C.border};box-shadow:0 32px 80px rgba(0,0,0,0.7);">

  <tr><td height="4" style="background:${C.accent};background:linear-gradient(90deg,${C.accent},${C.accentDeep},${C.accent});font-size:0;line-height:0;border-radius:20px 20px 0 0;">&nbsp;</td></tr>

  <tr>
    <td style="background:${C.cardHeader};padding:36px 40px 32px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr><td style="background:${C.accent};background:linear-gradient(135deg,${C.accent},${C.accentDeep});border-radius:10px;padding:7px 22px;">
          <span style="font-size:13px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#fff;">SUAIPE</span>
        </td></tr>
      </table>
      <h1 style="margin:22px 0 8px;font-size:30px;font-weight:800;color:${C.fg};line-height:1.15;letter-spacing:-0.01em;">
        ${nome ? `Ciao <span style="color:${C.accent};">${nome}</span>,<br/>${headerTitle}` : headerTitle}
      </h1>
      <p style="margin:0;font-size:15px;color:${C.muted};line-height:1.6;">${headerSubtitle}</p>
    </td>
  </tr>

  <tr>
    <td style="background:${C.card};padding:40px 40px 36px;text-align:center;border-top:1px solid ${C.border};">
      ${progressHtml(pct, ringColor, C.muted, i18n.compatibility)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 0;">
        <tr><td style="background:${ringColor}22;border:1.5px solid ${ringColor}66;border-radius:999px;padding:7px 22px;">
          <span style="font-size:12px;font-weight:700;color:${ringColor};letter-spacing:0.12em;">${badgeLabel}</span>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">${i18n.compatibility} verificata su 8 categorie</p>
    </td>
  </tr>

  <tr>
    <td style="background:${C.card};padding:0;border-top:1px solid ${C.border};">
      <p style="margin:0;padding:22px 32px 14px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.muted};text-align:center;">${i18n.productSection}</p>
      ${productImage
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
             <tr><td style="padding:0 24px;">
               <img src="${productImage}" alt="${productName}" width="552"
                    style="width:100%;height:230px;object-fit:cover;object-position:center;border-radius:14px;border:1px solid ${C.border};display:block;"/>
             </td></tr>
           </table>`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
             <tr><td style="padding:0 24px;">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr><td style="background:${C.cardHeader};height:160px;text-align:center;vertical-align:middle;border-radius:14px;border:1px solid ${C.border};">
                   <span style="font-size:64px;line-height:1;">📦</span>
                 </td></tr>
               </table>
             </td></tr>
           </table>`}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:20px 32px 28px;">
          <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${C.fg};line-height:1.2;letter-spacing:-0.01em;">${productName}</h2>
          ${productPrice ? `<p style="margin:0;font-size:26px;font-weight:700;color:${C.accent};line-height:1;">${productPrice}</p>` : ""}
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:${C.card};padding:28px 24px 32px;border-top:1px solid ${C.border};">
      <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.muted};text-align:center;">${i18n.codeSection}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border-radius:16px;border:2px solid ${C.accent};box-shadow:0 8px 48px rgba(59,130,246,0.35);">
        <tr>
          <td style="background:${C.accent};background:linear-gradient(90deg,${C.accent},${C.accentDeep},${C.accent});padding:11px 24px;border-radius:14px 14px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:12px;font-weight:800;color:#fff;letter-spacing:0.14em;">${i18n.specialDiscount}</td>
                <td align="right" style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.1em;">${escHtml(footerName)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${C.cardHeader};padding:30px 28px 26px;text-align:center;">
            <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:${C.accent};letter-spacing:0.24em;text-transform:uppercase;">${i18n.insertAtCheckout}</p>
            <p style="margin:0 0 18px;font-size:38px;font-weight:900;color:${C.fg};font-family:'Courier New',Courier,monospace;letter-spacing:0.06em;line-height:1;white-space:nowrap;">${code}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td style="background:${C.accent};border-radius:999px;padding:5px 10px;white-space:nowrap;">
                  <span style="font-size:10px;font-weight:700;color:#fff;display:inline-block;white-space:nowrap;">${i18n.hrs24}</span>
                </td>
                <td width="6">&nbsp;</td>
                <td style="background:${C.cardAlt};border:1px solid ${C.border};border-radius:999px;padding:5px 10px;white-space:nowrap;">
                  <span style="font-size:10px;font-weight:600;color:${C.fg};display:inline-block;white-space:nowrap;">${i18n.inStore}</span>
                </td>
                <td width="6">&nbsp;</td>
                <td style="background:${C.cardAlt};border:1px solid ${C.border};border-radius:999px;padding:5px 10px;white-space:nowrap;">
                  <span style="font-size:10px;font-weight:600;color:${C.fg};display:inline-block;white-space:nowrap;">${i18n.oneUse}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${C.cardHeader};padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:2px dashed ${C.border};height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${C.cardHeader};padding:12px 28px 14px;text-align:center;border-radius:0 0 14px 14px;">
            ${barcodesvg(C.accent)}
            <p style="margin:5px 0 0;font-size:8px;color:${C.muted};letter-spacing:0.12em;text-transform:uppercase;">${i18n.discountTicket}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:${C.cardAlt};padding:28px 24px;border-top:1px solid ${C.border};">
      <p style="margin:0 0 20px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.muted};text-align:center;">${i18n.howToRedeem}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:16px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">1</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.step1Title}</p>
          <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.5;">${i18n.step1Sub}</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;"><tr><td style="border-top:1px solid ${C.border};height:0;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:16px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">2</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.step2Title}</p>
          <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.5;">${i18n.step2Sub}</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;"><tr><td style="border-top:1px solid ${C.border};height:0;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:16px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">3</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.step3Title}</p>
          <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.5;">${i18n.step3Sub}</p>
        </td>
      </tr></table>
    </td>
  </tr>

  ${productVideo ? `
  <tr>
    <td style="background:${C.card};padding:24px;border-top:1px solid ${C.border};">
      <a href="${productVideo}" target="_blank" style="display:block;text-decoration:none;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:14px;">
          ${thumbUrl ? `<tr><td style="padding:0;">
            <img src="${thumbUrl}" alt="Video del consulente" width="552"
                 style="width:100%;height:200px;object-fit:cover;object-position:center;display:block;border-radius:14px 14px 0 0;"/>
          </td></tr>` : ""}
          <tr>
            <td style="background:${C.cardHeader};padding:20px;text-align:center;border-radius:${thumbUrl ? "0 0 14px 14px" : "14px"};">
              <table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr><td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;min-width:52px;border-radius:26px;background:${C.accent};text-align:center;vertical-align:middle;font-size:22px;color:#fff;overflow:hidden;line-height:52px;mso-line-height-rule:exactly;padding-left:4px;">&#9658;</td></tr>
              </table>
              <p style="margin:10px 0 3px;font-size:14px;font-weight:700;color:${C.fg};">Guarda la presentazione del consulente</p>
              <p style="margin:0;font-size:11px;color:${C.muted};">30 secondi per scoprire tutto sul tuo prodotto</p>
            </td>
          </tr>
        </table>
      </a>
    </td>
  </tr>` : ""}

  ${faq.length > 0 ? `
  <tr>
    <td style="background:${C.cardAlt};padding:28px 24px;border-top:1px solid ${C.border};">
      <p style="margin:0 0 20px;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.muted};text-align:center;">${i18n.faqSection}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${faq.map((item, i) => `
        <tr><td style="padding:${i > 0 ? "14px" : "0"} 0 0;">
          ${i > 0 ? `<div style="border-top:1px solid ${C.border};margin-bottom:14px;"></div>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="4" style="background:${C.accent};border-radius:4px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:4px 0 4px 14px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${C.fg};line-height:1.4;">${item.q}</p>
              <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.65;">${item.a}</p>
            </td>
          </tr></table>
        </td></tr>`).join("")}
      </table>
    </td>
  </tr>` : ""}

  <tr>
    <td style="background:${C.cardAlt};padding:26px 24px;border-top:1px solid ${C.border};">
      <p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${C.accent};text-align:center;">${i18n.actionRequired}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:20px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">&#8595;</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:12px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.saveEmail}</p>
          <p style="margin:0;font-size:10px;color:${C.muted};line-height:1.5;">${i18n.saveEmailSub}</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;"><tr><td style="border-top:1px solid ${C.border};height:0;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:11px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">24h</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:12px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.within24h}</p>
          <p style="margin:0;font-size:10px;color:${C.muted};line-height:1.5;">${i18n.within24hSub}</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;"><tr><td style="border-top:1px solid ${C.border};height:0;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle" style="width:44px;padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;min-width:44px;border-radius:22px;background:linear-gradient(135deg,${C.accent},${C.accentDeep});text-align:center;vertical-align:middle;font-size:20px;font-weight:800;color:#fff;overflow:hidden;line-height:44px;mso-line-height-rule:exactly;">&#8594;</td>
          </tr></table>
        </td>
        <td width="14" style="padding:0;">&nbsp;</td>
        <td valign="middle" style="padding:0;">
          <p style="margin:0 0 3px;font-size:12px;font-weight:700;color:${C.fg};line-height:1.3;">${i18n.visitStore}</p>
          <p style="margin:0;font-size:10px;color:${C.muted};line-height:1.5;">${i18n.visitStoreSub}</p>
        </td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="background:${C.card};padding:14px 28px;text-align:center;border-top:1px solid ${C.border};">
      <p style="margin:0;font-size:11px;color:${C.muted};">${i18n.imagesNote}</p>
    </td>
  </tr>

  <tr>
    <td style="background:${C.cardHeader};padding:24px 32px 28px;text-align:center;border-top:1px solid ${C.border};border-radius:0 0 20px 20px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${C.fg};letter-spacing:0.1em;">${escHtml(footerName)}</p>
      <p style="margin:0 0 12px;font-size:11px;color:${C.muted};">Powered by Suaipe</p>
      ${fullName ? `<p style="margin:0 0 10px;font-size:12px;color:${C.muted};">Inviato a <strong style="color:${C.fg};">${fullName}</strong>${recipientEmail ? ` · ${recipientEmail}` : ""}</p>` : ""}
      <div style="border-top:1px solid ${C.border};margin:12px auto;max-width:200px;"></div>
      <p style="margin:0;font-size:10px;color:${C.muted};line-height:1.8;">
        ${i18n.gdpr}<br/>
        ${i18n.receivedNote}<br/>
        <span style="color:${C.accent};">${i18n.codeExpiry}</span>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`.trim();
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  // Fail-closed CORS: only echo Access-Control-Allow-Origin when the request
  // origin matches the configured allowlist (or wildcard). Server-to-server
  // callers (Supabase DB webhook, no Origin header) are unaffected.
  let allowOrigin: string | null = null;
  if (ALLOWED_ORIGIN === "*") allowOrigin = "*";
  else if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) allowOrigin = origin;

  if (req.method === "OPTIONS") {
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-webhook-secret",
    };
    if (allowOrigin) corsHeaders["Access-Control-Allow-Origin"] = allowOrigin;
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Silent CORS rejection for unexpected origins (and for any browser caller
  // when ALLOWED_ORIGIN is unset).
  if (ALLOWED_ORIGIN === "*") {
    // wildcard — allow everything
  } else if (ALLOWED_ORIGIN) {
    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  } else if (origin) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Webhook secret check — MANDATORY. Runs before parsing the body so
  // unauthenticated callers can't even trigger JSON parsing. If the secret is
  // not configured the function fails CLOSED (rejects everything) rather than
  // open. Configure the matching header "x-webhook-secret: <value>" in
  // Supabase Dashboard → Database → Webhooks.
  {
    const provided = req.headers.get("x-webhook-secret") ?? "";
    if (!WEBHOOK_SECRET || !safeEqual(provided, WEBHOOK_SECRET)) {
      // Silent 200 to avoid leaking whether the URL is a real webhook target.
      console.error("[on-session-created] rejected — missing or invalid webhook secret");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (payload.type !== "INSERT") {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const record = payload.record as Record<string, unknown>;
  if (!record?.email) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Silently ignore sessions with a malformed store_id — they were not created by our app.
  if (record.store_id && !isValidStoreId(record.store_id)) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const discountPct = Number(record.discount_percent ?? 5);
  const code = genDiscountCode(discountPct);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Idempotency guard — a Supabase webhook retry re-delivers the same INSERT
  // payload (email_sent=false in that snapshot). If the email for this session
  // already went out, skip: don't regenerate the code or re-send. Covers the
  // common retry-after-success case without a schema change. (A fully race-proof
  // atomic-claim variant is documented in docs/server-hardening.md.)
  {
    const { data: existing } = await supabase
      .from("quiz_sessions")
      .select("email_sent")
      .eq("id", record.id)
      .maybeSingle();
    if (existing?.email_sent === true) {
      return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200 });
    }
  }

  // Customer PII (nome / cognome / email) is stored in plaintext because the
  // manager dashboard must search and display it; it is protected by row-level
  // security (no anon read; managers/consulenti scoped by store), Supabase's
  // at-rest storage encryption, and a retention purge. See ADR 003.

  // Server-side email rate limit — bypass-proof regardless of how the session was created.
  // If this email already received an email in the last hour, save the code to DB
  // but silently skip sending. The customer experience is unaffected; only abusers are blocked.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentEmails } = await supabase
    .from("quiz_sessions")
    .select("id", { count: "exact", head: true })
    .eq("email", String(record.email))
    .eq("email_sent", true)
    .neq("id", String(record.id))
    .gte("created_at", oneHourAgo);

  const emailNorm = String(record.email).trim().toLowerCase();
  if ((recentEmails ?? 0) >= 1 && !WHITELIST_EMAILS.has(emailNorm)) {
    await supabase.from("quiz_sessions").update({ discount_code: code }).eq("id", record.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Write discount_code first — email_sent stays false until Brevo confirms.
  // If the UPDATE fails we ABORT the email send: otherwise the customer would
  // receive an email referencing a code that was never persisted to the row.
  const { error: dbErr } = await supabase
    .from("quiz_sessions")
    .update({ discount_code: code })
    .eq("id", record.id);

  if (dbErr || !code) {
    console.error("[on-session-created] db update failed — aborting email:", dbErr?.message);
    return new Response(JSON.stringify({ ok: false, error: "discount code persistence failed" }), { status: 500 });
  }

  // Fetch product-specific FAQ: check product_settings first, then custom_products as fallback.
  const faq: Array<{ q: string; a: string }> = [];
  if (record.matched_product_id) {
    const { data: ps } = await supabase
      .from("product_settings")
      .select("faq_q1,faq_a1,faq_q2,faq_a2,faq_q3,faq_a3")
      .eq("product_id", record.matched_product_id)
      .maybeSingle();
    if (ps) {
      for (const n of [1, 2, 3] as const) {
        const q = String((ps as Record<string, unknown>)[`faq_q${n}`] ?? "").trim();
        const a = String((ps as Record<string, unknown>)[`faq_a${n}`] ?? "").trim();
        if (q && a) faq.push({ q: escHtml(q), a: escHtml(a) });
      }
    }
    // Fallback: custom products store FAQ as a JSONB array
    if (faq.length === 0) {
      const { data: cp } = await supabase
        .from("custom_products")
        .select("faq")
        .eq("id", String(record.matched_product_id))
        .maybeSingle();
      if (cp?.faq) {
        for (const item of (cp.faq as { q: string; a: string }[])) {
          if (item.q?.trim() && item.a?.trim())
            faq.push({ q: escHtml(item.q.trim()), a: escHtml(item.a.trim()) });
        }
      }
    }
  }

  // Load the editable email template row for this session's language.
  // Each supported language has its own row in email_template (keyed by language column).
  const sessionLang = (String(record.language ?? "it")) as Lang;
  const { data: tplRow } = await supabase
    .from("email_template")
    .select("sender_name, subject_template, header_title, header_subtitle, footer_store_name")
    .eq("language", sessionLang)
    .maybeSingle();
  const tpl = {
    sender_name:       String(tplRow?.sender_name       ?? "Suaipe Shop"),
    subject_template:  String(tplRow?.subject_template  ?? "{{nome}}, il tuo match è {{pct}}% — Codice sconto valido 24h ⏰"),
    header_title:      String(tplRow?.header_title      ?? "Abbiamo trovato il tuo match!"),
    header_subtitle:   String(tplRow?.header_subtitle   ?? "Il nostro algoritmo ha analizzato le tue risposte e ha selezionato il gadget perfetto per il tuo stile di vita."),
    footer_store_name: String(tplRow?.footer_store_name ?? "Costanzo Annichini"),
  };

  const nome     = String(record.nome ?? "").trim();
  const pct      = Number(record.match_percent ?? 0);
  const subject  = tpl.subject_template
    .replace(/\{\{nome\}\}/g, nome || "Cliente")
    .replace(/\{\{pct\}\}/g,  String(pct));
  const html     = buildEmail(record, code, faq, tpl);

  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: tpl.sender_name, email: EMAIL_SENDER },
      // Customers should not reply directly. Point Reply-To at a noreply mailbox
      // so the "Reply" button in email clients doesn't send anything to a real inbox.
      replyTo: { name: "Suaipe (no-reply)", email: "noreply@suaipe.app" },
      to: [{ email: record.email, name: [nome, String(record.cognome ?? "")].filter(Boolean).join(" ") }],
      subject,
      htmlContent: html,
    }),
  });

  if (!brevoRes.ok) {
    const errText = await brevoRes.text();
    console.error("[on-session-created] Brevo error:", errText);
    // Don't leak the provider's raw error body (may include internals / the
    // recipient address) to the webhook caller — log it server-side only.
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  // Mark email as sent only after Brevo confirms delivery.
  await supabase.from("quiz_sessions").update({ email_sent: true }).eq("id", record.id);

  const brevoData = await brevoRes.json();
  // Log messageId only — never raw email (Supabase Edge logs are operational, not for PII).
  console.log("[on-session-created] email sent:", brevoData.messageId, "session:", record.id);

  // Server-side Google Sheets relay — fire-and-forget, never blocks email delivery.
  if (SHEETS_WEBHOOK) {
    const sheetsPayload = {
      data:     new Date().toLocaleString("it-IT"),
      nome:     String(record.nome    ?? ""),
      cognome:  String(record.cognome ?? ""),
      email:    String(record.email   ?? ""),
      prodotto: String(record.product_name ?? ""),
      match:    `${Number(record.match_percent ?? 0)}%`,
      store_id: String(record.store_id ?? ""),
    };
    fetch(SHEETS_WEBHOOK, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(sheetsPayload),
    }).catch((err) => console.error("[on-session-created] sheets relay failed:", err));
  }

  return new Response(JSON.stringify({ ok: true, code, emailId: brevoData.messageId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
