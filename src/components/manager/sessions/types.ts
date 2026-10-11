import { Mail, Clock, AlertCircle, XCircle } from "lucide-react";
import { products } from "@/data/products";
import { STORES } from "@/data/stores";
import { getCodeTtlMs } from "../EmailTemplateTab";

export interface Session {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  matched_product_id: string;
  /** the name the customer was shown, saved with the lead (survives renames and deleted products) */
  product_name: string | null;
  match_percent: number;
  email_sent: boolean | null;
  discount_code: string | null;
  created_at: string;
  store_id: string | null;
  code_redeemed: boolean;
  code_redeemed_at: string | null;
}

export type SessionKpi = Pick<
  Session,
  "id" | "email_sent" | "discount_code" | "created_at" | "code_redeemed"
>;

export type StatusFilter = "all" | "sent" | "processing" | "no_email" | "failed";

// Single source of truth for the column list — keeps the paginated list and
// CSV export in lockstep when the schema drifts.
export const SESSION_SELECT =
  "id, email, nome, cognome, matched_product_id, product_name, match_percent, email_sent, discount_code, created_at, store_id, code_redeemed, code_redeemed_at";

export const STATUS_META = {
  sent:       { label: "SENT",       icon: Mail,        cls: "border-green-500/40 bg-green-500/10 text-green-400"       },
  processing: { label: "PROCESSING", icon: Clock,       cls: "border-amber-500/40 bg-amber-500/10 text-amber-400"       },
  no_email:   { label: "NO EMAIL",   icon: AlertCircle, cls: "border-orange-500/40 bg-orange-500/10 text-orange-400"    },
  failed:     { label: "FAILED",     icon: XCircle,     cls: "border-destructive/40 bg-destructive/10 text-destructive" },
} as const;

export function productName(id: string): string {
  return products.find((p) => p.id === id)?.name ?? id;
}

/** The product of a lead: the name saved with it, else the bundled demo catalogue, else the id. */
export function sessionProductName(s: Pick<Session, "matched_product_id" | "product_name">): string {
  return s.product_name?.trim() || productName(s.matched_product_id);
}

export function storeName(id: string | null): string {
  if (!id) return "—";
  return STORES.find((s) => s.id === id)?.shortName ?? id;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function getSessionStatus(s: Session): "sent" | "processing" | "no_email" | "failed" {
  if (s.email_sent) return "sent";
  const ageMin = (Date.now() - new Date(s.created_at).getTime()) / 60_000;
  if (ageMin < 5) return "processing";
  if (s.discount_code) return "no_email";
  return "failed";
}

export function isCodeExpired(s: Session): boolean {
  return (Date.now() - new Date(s.created_at).getTime()) > getCodeTtlMs();
}

export function hoursUntilExpiry(s: Session): number | null {
  const msLeft = (new Date(s.created_at).getTime() + getCodeTtlMs()) - Date.now();
  if (msLeft <= 0) return null;
  return Math.ceil(msLeft / 3_600_000);
}
