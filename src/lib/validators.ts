// Pure validation helpers shared by the kiosk + manager UIs.
//
// ⚠ The Edge Function `supabase/functions/on-session-created` contains
// copies of these helpers (Deno can't import from `src/`). When you change
// anything here, update the Edge Function copy too. The unit tests in
// `src/__tests__/validators.test.ts` lock the expected behaviour for both.

/** kebab-case slug shape used for store_id values. */
export const STORE_ID_RE = /^[a-z0-9][a-z0-9-]{1,49}$/;

export function isValidStoreId(id: unknown): boolean {
  return typeof id === "string" && STORE_ID_RE.test(id);
}

/**
 * Extract the 11-char YouTube video ID from common URL formats:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/shorts/ID
 * - youtube.com/embed/ID
 * - youtube-nocookie.com/embed/ID
 */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── Lead-capture validation (kiosk Welcome form) ─────────────────────────────
// Behaviour locked by `src/__tests__/welcomeValidators.test.ts`. (The Edge Function
// `on-session-created` only mirrors the store-id and asset-URL helpers above — Deno
// can't import from `src/` — it does not re-validate names or e-mail shapes.)

/** Pragmatic email shape — one `@`, a dot-something TLD of ≥2 letters. */
export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** RFC 5321 limits: 254 characters in total, 64 before the `@`. */
export const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  const at = v.lastIndexOf("@");
  return v.length <= EMAIL_MAX_LENGTH && at > 0 && at <= EMAIL_LOCAL_MAX_LENGTH && EMAIL_RE.test(v);
}

/**
 * First/last name: 2–100 characters — letters and combining marks of any script, spaces,
 * apostrophes and hyphens — with at least one letter. Combining marks (`\p{M}`) matter: names
 * typed with a decomposed accent ("Cafe\u0301") or in scripts that use vowel signs would otherwise
 * be mangled.
 */
export const NAME_RE = /^[\p{L}\p{M}\s'-]{2,100}$/u;

export function isValidName(value: string): boolean {
  const v = value.trim();
  return NAME_RE.test(v) && /\p{L}/u.test(v);
}

/** The apostrophes a touch keyboard produces: ’ (iPadOS "smart punctuation"), ‘, ʼ, ´ and `. */
const TYPOGRAPHIC_APOSTROPHES = /[\u2018\u2019\u02BC\u00B4`]/g;

/**
 * Normalise typographic apostrophes to ', strip anything that isn't a letter, a combining mark,
 * a space, ' or -, collapse runs of spaces, cap at 100. Stored precomposed (NFC), so the same name
 * is always the same string. (O’Connor and D’Angelo keep their apostrophe instead of silently
 * turning into "OConnor" and "DAngelo".)
 */
export function sanitizeName(value: string): string {
  return value
    .normalize("NFC")
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .replace(/[^\p{L}\p{M}\s'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 100);
}

// ── Asset URL resolution (product image in the match email) ──────────────────
// The Edge Function `on-session-created` keeps a synced copy. Behaviour locked
// by `src/__tests__/validators.test.ts`.

/**
 * Resolve a product-image reference to an absolute https URL for an email
 * `<img src>`. Email clients have no document base, so a root-relative path
 * like `/products/x.png` (the kiosk's bundled fallback assets) never loads — it
 * must be made absolute against the deployed site origin.
 *
 * - absolute `https://` URLs (e.g. Supabase Storage) are returned unchanged
 * - root-relative `/path` is resolved against `siteUrl`
 * - everything else (empty, `http://`, `data:`, `blob:`, protocol-relative
 *   `//host`) returns `null` so the email falls back to its placeholder
 */
export function toAbsoluteAssetUrl(
  url: string | null | undefined,
  siteUrl: string,
): string | null {
  const u = String(url ?? "").trim();
  if (/^https:\/\//i.test(u)) return u;
  // `^\/[^/]` matches a single leading slash followed by a non-slash, so it
  // accepts `/products/x.png` but rejects protocol-relative `//evil.com/x.png`.
  if (/^\/[^/]/.test(u)) return siteUrl.replace(/\/+$/, "") + u;
  return null;
}
