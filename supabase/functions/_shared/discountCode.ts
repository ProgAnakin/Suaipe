// Shared, runtime-agnostic helper used by the on-session-created Edge Function
// (Deno) and unit-tested from src via Vitest. Keep it free of Deno-specific
// globals so both runtimes can import it.
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
