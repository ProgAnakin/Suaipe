import { downloadTextFile, toCsv } from "@/lib/csv";
import { useCallback, useMemo, useState } from "react";
import { Ban, Check, Download, RotateCcw, Search, User, X } from "lucide-react";
import type { Product } from "@/data/products";
import { auditStoreName, type AuditLogEntry } from "./managerDashboardUtils";

interface AuditLogTabProps {
  loading: boolean;
  error: boolean;
  entries: AuditLogEntry[];
  catalogProducts: Product[];
  onRefresh: () => void;
}

type ActionFilter = "all" | "activated" | "deactivated";

/** Today / Yesterday / dd/mm/yyyy — the bucket an entry is grouped under. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export const AuditLogTab = ({
  loading,
  error,
  entries,
  catalogProducts,
  onRefresh,
}: AuditLogTabProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActionFilter>("all");

  const nameById = useMemo(
    () => new Map(catalogProducts.map((p) => [p.id, p.name])),
    [catalogProducts],
  );
  const entityLabel = useCallback(
    (id: string | null) => {
      if (!id) return "—";
      if (id.startsWith("quiz_card:")) {
        const rest = id.slice("quiz_card:".length);
        return rest === "batch" ? "Quiz cards (batch)" : `Quiz card ${rest}`;
      }
      return nameById.get(id) ?? id;
    },
    [nameById],
  );

  // Summary counts — computed over ALL entries, independent of the active filter.
  const summary = useMemo(() => {
    let activated = 0;
    let deactivated = 0;
    const actors = new Set<string>();
    for (const e of entries) {
      if (e.new_active === true) activated++;
      else if (e.new_active === false) deactivated++;
      if (e.user_email) actors.add(e.user_email);
    }
    return { total: entries.length, activated, deactivated, editors: actors.size };
  }, [entries]);

  // Apply the action filter + free-text search (product, author, store).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const isAct = e.new_active === true;
      if (filter === "activated" && !isAct) return false;
      if (filter === "deactivated" && isAct) return false;
      if (!q) return true;
      const hay = `${entityLabel(e.product_id)} ${e.user_email ?? ""} ${auditStoreName(e.store_id)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search, filter, entityLabel]);

  // Group the filtered list into ordered [dayLabel, entries] buckets.
  const groups = useMemo(() => {
    const map = new Map<string, AuditLogEntry[]>();
    for (const e of filtered) {
      const key = dayLabel(e.created_at);
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const exportCsv = () => {
    const headers = ["Date", "Time", "Product", "Action", "By", "Store"];
    const rows = filtered.map((e) => [
      dayLabel(e.created_at),
      timeOnly(e.created_at),
      entityLabel(e.product_id),
      e.new_active === true ? "Activated" : "Deactivated",
      e.user_email ?? "—",
      auditStoreName(e.store_id),
    ]);
    downloadTextFile(`suaipe-catalog-history-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([headers, ...rows]));
  };

  const chips: { key: ActionFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.total },
    { key: "activated", label: "Activated", count: summary.activated },
    { key: "deactivated", label: "Deactivated", count: summary.deactivated },
  ];

  const hasEntries = !loading && !error && entries.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Catalog change history</h2>
          <p className="text-xs text-muted-foreground">Who activated or paused which product, and when.</p>
        </div>
        <div className="flex gap-2">
          {hasEntries && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
          >
            <RotateCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {hasEntries && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{summary.total}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Changes</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-green-400">{summary.activated}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Activated</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-destructive">{summary.deactivated}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paused</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{summary.editors}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Editors</p>
          </div>
        </div>
      )}

      {/* Search + action filter */}
      {hasEntries && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product, editor or store…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading history…</div>
      ) : error || entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 py-12 text-center">
          <p className="mb-2 text-2xl">📋</p>
          <p className="text-sm font-medium text-foreground">No history available</p>
          <p className="mt-1 text-xs text-muted-foreground">Future changes will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No changes match your filters</p>
          <button
            onClick={() => { setSearch(""); setFilter("all"); }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([label, items]) => (
            <div key={label} className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {label} · {items.length}
              </p>
              {items.map((entry) => {
                const isActivated = entry.new_active === true;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isActivated ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isActivated ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{entityLabel(entry.product_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {isActivated ? "Activated" : "Paused"}
                        {entry.store_id && <span className="ml-1.5">· {auditStoreName(entry.store_id)}</span>}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{entry.user_email ?? "System"}</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-[10px] text-muted-foreground/60">{timeOnly(entry.created_at)}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
