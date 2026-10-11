import { products } from "@/data/products";
import { getStoreById } from "@/data/stores";
import { downloadTextFile, toCsv } from "@/lib/csv";

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface QuizSession {
  id: string;
  email: string;
  nome?: string | null;
  cognome?: string | null;
  matched_product_id: string;
  /** the name the customer was shown, saved with the lead (survives renames and deleted products) */
  product_name?: string | null;
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

/** The product of a lead: the name saved with it, else the bundled demo catalogue, else the id. */
export function sessionProductName(s: Pick<QuizSession, "matched_product_id" | "product_name">): string {
  return s.product_name?.trim() || productName(s.matched_product_id);
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

/** A Date as YYYY-MM-DD in the VIEWER'S time zone (toISOString() would give the UTC day). */
function ymdLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as a date string (YYYY-MM-DD), local time. */
export function todayStr(): string {
  return ymdLocal(new Date());
}

/** The date `n` days ago as a date string, local time. */
export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymdLocal(d);
}

/** The first day of the current month as a date string, local time. */
export function startOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return ymdLocal(d);
}

export function exportCSV(
  sessions: QuizSession[],
  fromDate?: string,
  toDate?: string,
): void {
  const header = ["First name", "Last name", "Email", "Product", "Match %", "Store", "Date"];
  const rows = sessions.map((s) => [
    s.nome ?? "",
    s.cognome ?? "",
    s.email,
    sessionProductName(s),
    s.match_percent,
    storeName(s.store_id),
    new Date(s.created_at).toLocaleString("en-GB"),
  ]);
  const suffix = fromDate && toDate ? `_${fromDate}_to_${toDate}` : "";
  downloadTextFile(`suaipe${suffix}_${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...rows], ";"));
}
