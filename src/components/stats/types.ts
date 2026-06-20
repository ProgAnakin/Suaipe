import { products } from "@/data/products";
import { getStoreById } from "@/data/stores";

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface QuizSession {
  id: string;
  email: string;
  nome?: string | null;
  cognome?: string | null;
  matched_product_id: string;
  match_percent: number;
  created_at: string;
  store_id: string | null;
  email_sent?: boolean | null;
  discount_code?: string | null;
  code_redeemed?: boolean | null;
}

export interface DayCount {
  day: string;
  date: string;
  count: number;
}

export interface ProductStat {
  id: string;
  name: string;
  count: number;
  percent: number;
  avgMatch?: number;
}

export interface FunnelCounts {
  started: number;
  resultShown: number;
  claimed: number;
}

export type AuthStep = "login" | "mfa" | "enroll" | "dashboard";

// ─── Utilities ────────────────────────────────────────────────────────────────

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function productName(id: string): string {
  return products.find((p) => p.id === id)?.name ?? id;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function storeName(id: string | null): string {
  if (!id) return "—";
  return getStoreById(id)?.shortName ?? id;
}

// ─── Date-range helpers (YYYY-MM-DD) ──────────────────────────────────────────

/** Today as an ISO date string (YYYY-MM-DD). */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The date `n` days ago as an ISO date string. */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** The first day of the current month as an ISO date string. */
export function startOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Sanitize a string for safe CSV embedding.
 * - Escapes double quotes (RFC 4180)
 * - Strips CR/LF to prevent row injection
 * - Prefixes formula-triggering characters (=, +, -, @, |, %) with a tab
 *   to neutralise spreadsheet formula injection (OWASP CSV injection)
 */
function csvSafe(value: string): string {
  const stripped = value.replace(/[\r\n]/g, " ");
  const escaped = stripped.replace(/"/g, '""');
  return /^[=+\-@|%]/.test(escaped) ? `\t${escaped}` : escaped;
}

export function exportCSV(
  sessions: QuizSession[],
  fromDate?: string,
  toDate?: string,
): void {
  const header = ["First name", "Last name", "Email", "Product", "Match %", "Store", "Date"];
  const rows = sessions.map((s) => [
    `"${csvSafe(s.nome ?? "")}"`,
    `"${csvSafe(s.cognome ?? "")}"`,
    `"${csvSafe(s.email)}"`,
    `"${csvSafe(productName(s.matched_product_id))}"`,
    s.match_percent,
    `"${csvSafe(storeName(s.store_id))}"`,
    `"${new Date(s.created_at).toLocaleString("en-GB")}"`,
  ]);
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const suffix = fromDate && toDate ? `_${fromDate}_to_${toDate}` : "";
  a.download = `suaipe${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
