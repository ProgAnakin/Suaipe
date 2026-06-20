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
// The Edge Function `on-session-created` keeps its own copies (Deno can't import
// from `src/`). Keep them in sync; `src/__tests__/welcomeValidators.test.ts`
// locks the behaviour.

/** Pragmatic email shape — one `@`, a dot-something TLD of ≥2 letters. */
export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** First/last name: 2–100 chars of any-script letters, spaces, apostrophes, hyphens. */
export const NAME_RE = /^[\p{L}\s'-]{2,100}$/u;

export function isValidName(value: string): boolean {
  return NAME_RE.test(value.trim());
}

/** Strip anything that isn't a letter/space/'/-, collapse runs of spaces, cap at 100. */
export function sanitizeName(value: string): string {
  return value
    .replace(/[^\p{L}\s'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 100);
}
