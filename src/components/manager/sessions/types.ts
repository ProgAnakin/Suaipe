import { Mail, Clock, AlertCircle, XCircle } from "lucide-react";
import { products } from "@/data/products";
import { STORES } from "@/data/stores";


export interface Session {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  matched_product_id: string;
  product_name?: string | null;
  match_percent: number;
  email_sent: boolean | null;
  email_status?: string;
  discount_code: string | null;
  created_at: string;
  store_id: string | null;
  code_redeemed: boolean;
  code_redeemed_at: string | null;
  expires_at: string;
}

export type SessionKpi = Pick<
  Session,
  "id" | "email_sent" | "discount_code" | "created_at" | "code_redeemed" | "email_status" | "expires_at"
>;

export type StatusFilter = "all" | "sent" | "processing" | "no_email" | "failed";

// Single source of truth for the column list — keeps the paginated list and
// CSV export in lockstep when the schema drifts.
export const SESSION_SELECT =
  "id, email, nome, cognome, product_name, matched_product_id, match_percent, email_sent, discount_code, created_at, store_id, code_redeemed, code_redeemed_at, expires_at, email_status";

export const STATUS_META = {
  sent:       { label: "ACCEPTED",       icon: Mail,        cls: "border-green-500/40 bg-green-500/10 text-green-400"       },
  processing: { label: "PROCESSING", icon: Clock,       cls: "border-amber-500/40 bg-amber-500/10 text-amber-400"       },
  no_email:   { label: "NO EMAIL",   icon: AlertCircle, cls: "border-orange-500/40 bg-orange-500/10 text-orange-400"    },
  failed:     { label: "FAILED",     icon: XCircle,     cls: "border-destructive/40 bg-destructive/10 text-destructive" },
} as const;

export function productName(id: string, snapshot?: string | null): string {
  return snapshot?.trim() || products.find((p) => p.id === id)?.name || id;
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
  if (s.email_status === 'failed') return 'failed';
  if (s.email_status === 'uncertain' || s.email_status === 'suppressed') return 'no_email';
  const ageMin = (Date.now() - new Date(s.created_at).getTime()) / 60_000;
  if (ageMin < 5) return "processing";
  if (s.discount_code) return "no_email";
  return "failed";
}

export function isCodeExpired(s: Session): boolean {
  const expiry = Date.parse(s.expires_at);
  return !Number.isFinite(expiry) || Date.now() >= expiry;
}

export function hoursUntilExpiry(s: Session): number | null {
  const msLeft = new Date(s.expires_at).getTime() - Date.now();
  if (!Number.isFinite(msLeft) || msLeft <= 0) return null;
  return Math.ceil(msLeft / 3_600_000);
}
