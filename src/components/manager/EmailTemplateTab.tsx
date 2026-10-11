import { useState, useEffect, useCallback } from "react";
import { Check, Clock, Eye, EyeOff, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TTL_STORAGE_KEY = "wm_code_ttl_hours";
const TTL_OPTIONS = [6, 12, 24, 48, 72] as const;
type TtlOption = typeof TTL_OPTIONS[number];

export function getCodeTtlMs(): number {
  try {
    const v = localStorage.getItem(TTL_STORAGE_KEY);
    const hours = v ? parseInt(v, 10) : 24;
    return (Number.isFinite(hours) ? hours : 24) * 3_600_000;
  } catch { return 24 * 3_600_000; }
}

const SUPPORTED_LANGS = ["it", "en", "fr", "es", "pt"] as const;
type Lang = typeof SUPPORTED_LANGS[number];

const LANG_META: Record<Lang, { flag: string; label: string }> = {
  it: { flag: "🇮🇹", label: "Italiano" },
  en: { flag: "🇬🇧", label: "English" },
  fr: { flag: "🇫🇷", label: "Français" },
  es: { flag: "🇪🇸", label: "Español" },
  pt: { flag: "🇵🇹", label: "Português" },
};

interface EmailTemplate {
  sender_name: string;
  subject_template: string;
  header_title: string;
  header_subtitle: string;
  footer_store_name: string;
}

const DEFAULTS_BY_LANG: Record<Lang, EmailTemplate> = {
  it: {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, il tuo match è {{pct}}% — Codice sconto valido 24h ⏰",
    header_title: "Abbiamo trovato il tuo match!",
    header_subtitle: "Il nostro algoritmo ha analizzato le tue risposte e ha selezionato il gadget perfetto per il tuo stile di vita.",
    footer_store_name: "Suaipe",
  },
  en: {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, your match is {{pct}}% — Discount code valid 24h ⏰",
    header_title: "We found your match!",
    header_subtitle: "Our algorithm analysed your answers and selected the perfect gadget for your lifestyle.",
    footer_store_name: "Suaipe",
  },
  fr: {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, votre match est de {{pct}}% — Code de réduction valable 24h ⏰",
    header_title: "Nous avons trouvé votre match !",
    header_subtitle: "Notre algorithme a analysé vos réponses et a sélectionné le gadget parfait pour votre style de vie.",
    footer_store_name: "Suaipe",
  },
  es: {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, tu match es {{pct}}% — Código de descuento válido 24h ⏰",
    header_title: "¡Encontramos tu match!",
    header_subtitle: "Nuestro algoritmo analizó tus respuestas y seleccionó el gadget perfecto para tu estilo de vida.",
    footer_store_name: "Suaipe",
  },
  pt: {
    sender_name: "Suaipe Shop",
    subject_template: "{{nome}}, o seu match é {{pct}}% — Código de desconto válido 24h ⏰",
    header_title: "Encontrámos o seu match!",
    header_subtitle: "O nosso algoritmo analisou as suas respostas e selecionou o gadget perfeito para o seu estilo de vida.",
    footer_store_name: "Suaipe",
  },
};

const SAMPLE = { nome: "Marco", pct: "87", product: "Sony WH-1000XM5", price: "€349,00", code: "SUP-A3F2B187" };

function interpolate(tpl: string): string {
  return tpl.replace(/\{\{nome\}\}/g, SAMPLE.nome).replace(/\{\{pct\}\}/g, SAMPLE.pct);
}

// header_title and header_subtitle are interpolated as raw HTML by the Edge
// Function so managers can use <strong>/<em>/<span style=…> for emphasis.
// Strip anything that could execute JS before persisting: <script>, on*=
// handlers, javascript: URLs, and data: URIs that could carry payloads.
function sanitizeTemplateHtml(html: string): string {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");
}

const FIELD_META: { key: keyof EmailTemplate; label: string; hint: string; multiline?: boolean }[] = [
  {
    key: "sender_name",
    label: "Sender name (From: field)",
    hint: 'Name shown as the sender in the customer\'s email client. E.g. "Suaipe Shop".',
  },
  {
    key: "subject_template",
    label: "Email subject",
    hint: "Available variables: {{nome}} → customer name, {{pct}} → match percentage.",
    multiline: true,
  },
  {
    key: "header_title",
    label: "Header title",
    hint: 'Large heading at the top of the email. E.g. "We found your match!"',
    multiline: true,
  },
  {
    key: "header_subtitle",
    label: "Header subtitle",
    hint: "Descriptive paragraph below the title.",
    multiline: true,
  },
  {
    key: "footer_store_name",
    label: "Consultant name (email footer)",
    hint: "Shown at the bottom of the email and on the discount code card. E.g. your store or consultant name.",
  },
];

function EmailPreview({ form }: { form: EmailTemplate }) {
  return (
    <div className="rounded-2xl border border-border bg-[#0d1228] overflow-hidden text-[#f0f4ff] font-sans">
      <div className="h-1 w-full bg-gradient-to-r from-[#1e88ff] via-[#0ea5e9] to-[#1e88ff]" />
      <div className="bg-[#101628] px-6 py-5 text-center space-y-2">
        <div className="inline-block rounded-lg bg-gradient-to-r from-[#1e88ff] to-[#0ea5e9] px-4 py-1.5">
          <span className="text-[11px] font-black tracking-widest text-white uppercase">SUAIPE</span>
        </div>
        <p className="text-base font-bold leading-snug">
          Hi <span className="text-[#1e88ff]">{SAMPLE.nome}</span>,{" "}
          <span>{interpolate(form.header_title)}</span>
        </p>
        <p className="text-xs text-[#7a8fbb] leading-relaxed">{interpolate(form.header_subtitle)}</p>
      </div>
      <div className="bg-[#151d47] px-6 py-5 text-center border-t border-[#2a3a68]">
        <p className="text-5xl font-black text-[#5eead4]">{SAMPLE.pct}<span className="text-2xl">%</span></p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a8fbb] mt-1">Compatibility</p>
        <div className="mt-2 inline-block rounded-full border border-[#5eead4]/40 bg-[#5eead4]/10 px-3 py-1">
          <span className="text-[10px] font-bold text-[#5eead4]">GREAT MATCH</span>
        </div>
      </div>
      <div className="bg-[#151d47] px-6 py-4 border-t border-[#2a3a68]">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a8fbb] text-center mb-2">── YOUR IDEAL GADGET ──</p>
        <div className="rounded-xl border border-[#2a3a68] bg-[#101628] h-20 flex items-center justify-center text-3xl mb-3">📦</div>
        <p className="text-sm font-black">{SAMPLE.product}</p>
        <p className="text-lg font-bold text-[#1e88ff]">{SAMPLE.price}</p>
      </div>
      <div className="bg-[#151d47] px-6 py-4 border-t border-[#2a3a68] text-center">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a8fbb] mb-2">YOUR DISCOUNT CODE</p>
        <div className="rounded-xl border-2 border-[#1e88ff] overflow-hidden">
          <div className="bg-gradient-to-r from-[#1e88ff] to-[#0ea5e9] px-4 py-2 flex justify-between">
            <span className="text-[10px] font-black text-white uppercase">Special Discount</span>
            <span className="text-[9px] text-white/70">{form.footer_store_name}</span>
          </div>
          <div className="bg-[#101628] px-4 py-4">
            <p className="text-2xl font-black font-mono tracking-wider">{SAMPLE.code}</p>
            <div className="flex justify-center gap-2 mt-2">
              <span className="rounded-full bg-[#1e88ff] px-2 py-0.5 text-[9px] font-bold text-white">✓ 24 hours</span>
              <span className="rounded-full border border-[#2a3a68] px-2 py-0.5 text-[9px] text-[#f0f4ff]">🏪 In store</span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#101628] px-6 py-4 text-center border-t border-[#2a3a68]">
        <p className="text-xs font-black">{form.footer_store_name}</p>
        <p className="text-[10px] text-[#7a8fbb]">Powered by Suaipe</p>
        <p className="text-[9px] text-[#7a8fbb] mt-1">
          Sent to <strong className="text-[#f0f4ff]">{SAMPLE.nome}</strong> · From: {form.sender_name}
        </p>
      </div>
    </div>
  );
}

export function EmailTemplateTab() {
  const [forms, setForms] = useState<Record<Lang, EmailTemplate>>(
    () => ({ ...DEFAULTS_BY_LANG })
  );
  const [activeLang, setActiveLang] = useState<Lang>("it");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [codeTtl, setCodeTtl] = useState<TtlOption>(() => {
    try {
      const v = localStorage.getItem(TTL_STORAGE_KEY);
      const h = v ? parseInt(v, 10) : 24;
      return (TTL_OPTIONS.includes(h as TtlOption) ? h : 24) as TtlOption;
    } catch { return 24; }
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_template")
      .select("language, sender_name, subject_template, header_title, header_subtitle, footer_store_name");
    if (data && data.length > 0) {
      setForms((prev) => {
        const next = { ...prev };
        for (const row of data) {
          const lang = row.language as Lang;
          if (SUPPORTED_LANGS.includes(lang)) {
            next[lang] = {
              sender_name: row.sender_name,
              subject_template: row.subject_template,
              header_title: row.header_title,
              header_subtitle: row.header_subtitle,
              footer_store_name: row.footer_store_name,
            };
          }
        }
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const form = forms[activeLang];
  const setForm = (updater: (f: EmailTemplate) => EmailTemplate) => {
    setForms((prev) => ({ ...prev, [activeLang]: updater(prev[activeLang]) }));
  };

  const saveTemplate = async () => {
    setSaving(true);
    setError(null);
    const cleaned: EmailTemplate = {
      ...forms[activeLang],
      header_title:    sanitizeTemplateHtml(forms[activeLang].header_title),
      header_subtitle: sanitizeTemplateHtml(forms[activeLang].header_subtitle),
    };
    const { error: err } = await supabase
      .from("email_template")
      .update({ ...cleaned, updated_at: new Date().toISOString() })
      .eq("language", activeLang);
    if (err) {
      setError(err.message);
      toast.error("Error saving template.");
    } else {
      // Reflect the sanitized values back into the form so the user sees
      // exactly what was persisted (and won't re-introduce scrubbed markup).
      setForms((prev) => ({ ...prev, [activeLang]: cleaned }));
      try { localStorage.setItem(TTL_STORAGE_KEY, String(codeTtl)); } catch { /* ignore */ }
      setSaved(true);
      toast.success(`Template ${LANG_META[activeLang].flag} saved.`);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Email Template</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            One template per language — select and edit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold active:scale-95 transition-colors ${
              showPreview
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {showPreview ? <><EyeOff className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
          <button
            onClick={() => setForms((prev) => ({ ...prev, [activeLang]: DEFAULTS_BY_LANG[activeLang] }))}
            className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground active:scale-95"
          >
            <RotateCcw className="h-3 w-3" /> Default
          </button>
          <button
            onClick={saveTemplate}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
          >
            {saved ? <><Check className="h-3 w-3" /> Saved!</> : <><Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}</>}
          </button>
        </div>
      </div>

      {/* Language selector */}
      <div className="flex gap-2 flex-wrap">
        {SUPPORTED_LANGS.map((lang) => (
          <button
            key={lang}
            onClick={() => { setActiveLang(lang); setSaved(false); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors active:scale-95 ${
              activeLang === lang
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <span>{LANG_META[lang].flag}</span>
            <span>{LANG_META[lang].label}</span>
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        💡 Changes take effect for the next email sent — no deploy needed.
        Each language has its own template; the email sent to the customer uses the language chosen during the quiz.
      </div>

      {showPreview ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Subject preview · {LANG_META[activeLang].flag} {LANG_META[activeLang].label}
            </p>
            <p className="text-sm font-semibold text-foreground">{interpolate(form.subject_template)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">From: {form.sender_name}</p>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Preview with sample data — {SAMPLE.nome}, {SAMPLE.pct}%, {SAMPLE.product}
          </p>
          <EmailPreview form={form} />
        </div>
      ) : (
        loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading template…</div>
        ) : (
          <div className="space-y-4">
            {FIELD_META.map(({ key, label, hint, multiline }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <label className="block text-xs font-semibold text-foreground">{label}</label>
                <p className="text-[10px] text-muted-foreground">{hint}</p>
                {multiline ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
            ))}
          </div>
        )
      )}

      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      )}

      {/* Discount code TTL */}
      {!showPreview && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Discount code validity
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Duration shown in the email and sessions panel. The code is treated as expired after this period.
          </p>
          <div className="flex flex-wrap gap-2">
            {TTL_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setCodeTtl(h)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  codeTtl === h ? "bg-primary text-primary-foreground" : "border border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Saved locally — applied on the next template save.
          </p>
        </div>
      )}

      {/* Variable reference */}
      {!showPreview && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Available variables in the subject
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { v: "{{nome}}", desc: "Customer name" },
              { v: "{{pct}}", desc: "% compatibility" },
            ].map(({ v, desc }) => (
              <div key={v} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5">
                <code className="text-[10px] font-mono text-primary">{v}</code>
                <span className="text-[10px] text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
