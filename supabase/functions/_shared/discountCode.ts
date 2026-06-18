// Tested reference for the discount-code format, unit-tested from src via Vitest.
// The on-session-created Edge Function keeps an INLINE copy of this function (so it
// deploys as a single self-contained file from the Supabase Dashboard) — keep the
// two in lockstep if the format ever changes. Runtime-agnostic (no Deno globals).
//
// Format: SUP-XXXXXXXX## — 8 uppercase hex chars (4 random bytes, 2^32 space, so
// enumeration is impractical) followed by the 2-digit discount % for at-a-glance
// readability by store consultants.
export function genDiscountCode(discountPct: number): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `SUP-${hex}${String(discountPct).padStart(2, "0")}`;
}
