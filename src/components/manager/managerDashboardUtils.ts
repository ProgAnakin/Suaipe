// Pure helpers, type aliases and constants for the Manager Dashboard.
// Kept out of ManagerDashboard.tsx so the component file stays focused on
// state and rendering. Nothing here touches React or component state.

import { STORES } from "@/data/stores";
import type { FaqData } from "./FaqModal";

// ── Per-product override maps (product_id → value) ───────────────────────────
/** product_id → active boolean, loaded from Supabase */
export type SettingsMap = Record<string, boolean>;
/** product_id → price override string */
export type PriceMap = Record<string, string>;
/** product_id → custom image URL */
export type ImageMap = Record<string, string>;
/** product_id → YouTube video URL */
export type VideoMap = Record<string, string>;
/** product_id → discount percent (5 | 8 | 10) */
export type DiscountMap = Record<string, number>;
/** product_id → FAQ data */
export type FaqMap = Record<string, FaqData>;
/** product_id → updated_at ISO string */
export type UpdatedAtMap = Record<string, string>;

/** The discount percentages a manager can assign per product per store. */
export const DISCOUNT_OPTIONS = [5, 8, 10] as const;
export type DiscountOption = typeof DISCOUNT_OPTIONS[number];

/** One pending undo of a product activation toggle. */
export interface UndoEntry {
  productId: string;
  restoredValue: boolean;
}

/** A single row of the manager audit log. */
export interface AuditLogEntry {
  source?: string;
  id: string;
  created_at: string;
  action: string | null;
  product_id: string | null;
  old_active: boolean | null;
  new_active: boolean | null;
  store_id: string | null;
  user_id: string | null;
  user_email: string | null;
}

// ── Formatters & validators ──────────────────────────────────────────────────

/** Format a timestamp as "today", "yesterday", "X days ago", "X weeks ago". */
export function formatUpdatedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks} weeks ago`;
}

/** Validate price formats: "€49,00", "49.00", "49,00", "€49". Empty = allowed (clearing). */
export { isValidPrice } from '@/lib/validators';

/** Validate a video URL — must be a YouTube or Vimeo link. Empty = allowed (clearing). */
export function isValidVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return true;
  return trimmed.includes("youtube.com") || trimmed.includes("youtu.be") || trimmed.includes("vimeo.com");
}

/** Format an audit-log timestamp for display (dd/mm/yy hh:mm). */
export function formatAuditDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Resolve a store_id to its short display name. */
export function auditStoreName(id: string | null): string {
  if (!id) return "—";
  return STORES.find((s) => s.id === id)?.shortName ?? id;
}
