import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Search, X, Copy, Check, Clock, AlertCircle, XCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Download, Trash2, Filter, CalendarDays,
} from "lucide-react";
import { useSessionsData } from "./sessions/useSessionsData";
import { SessionSkeleton } from "./sessions/SessionSkeleton";
import {
  formatDate, getSessionStatus, hoursUntilExpiry, isCodeExpired,
  sessionProductName, storeName, StatusFilter, STATUS_META,
} from "./sessions/types";

interface SessionsTabProps {
  storeId: string;
  isGlobal: boolean;
}

export const SessionsTab = ({ storeId, isGlobal }: SessionsTabProps) => {
  const data = useSessionsData({ storeId, isGlobal });
  const {
    sessions, totalCount, loading, negadoCount,
    currentPage, setCurrentPage, totalPages, safePage,
    search, setSearch, statusFilter, setStatusFilter,
    showAdvanced, setShowAdvanced,
    filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    filterProductId, setFilterProductId,
    filterMatchMin, setFilterMatchMin, filterMatchMax, setFilterMatchMax,
    hasAdvancedFilter, clearAdvanced,
    counts, expiredReusable, redemptionUsed, redemptionTotal, redemptionPct, localNegado,
    copiedCode, copyCode, redeemingId, markRedeemed,
    exporting, exportToCSV,
    showPurgeModal, setShowPurgeModal, purging, purgePreviewCount,
    openPurgeModal, executePurge,
    refreshAll, productOptions,
  } = data;

  // the status filter is applied by the database (useSessionsData), so the page is already filtered
  const paginated = sessions;

  const redemptionColor =
    redemptionPct > 50 ? "text-green-400" :
    redemptionPct >= 20 ? "text-amber-400" :
    "text-muted-foreground";
  const redemptionBorderBg =
    redemptionPct > 50 ? "border-green-500/20 bg-green-500/5" :
    redemptionPct >= 20 ? "border-amber-500/20 bg-amber-500/5" :
    "border-border bg-muted/20";


  return (
    <div className="space-y-5">

      {/* Summary KPIs */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{counts.sent}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Emails sent</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts.processing}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Processing</p>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{counts.no_email}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">No email</p>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{counts.failed}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Failed</p>
        </div>
        <div
          className="rounded-2xl border border-border bg-muted/20 p-4 text-center"
          title="Customers who saw their match but left without claiming it. The small number counts leads that were saved but never got a code."
        >
          <p className="text-2xl font-bold text-foreground">{negadoCount}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Not claimed</p>
          <p className="mt-0.5 text-[9px] text-foreground/40">{localNegado} no code</p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${redemptionBorderBg}`}>
          {/* "250/2249" in the big type overflowed the tile once the numbers grew */}
          <p className={`text-2xl font-bold tabular-nums ${redemptionColor}`}>
            {redemptionUsed}<span className="text-sm font-semibold opacity-70">/{redemptionTotal}</span>
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Codes used</p>
          <p className={`mt-0.5 text-[9px] font-semibold ${redemptionColor}`}>{redemptionPct}%</p>
        </div>
      </motion.div>

      {expiredReusable > 0 && (
        <motion.div
          className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          💡 <strong className="text-foreground">{expiredReusable}</strong> expired codes (older than 24h) can be reused manually for new customers.
        </motion.div>
      )}

      {/* Search + advanced filter toggle */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by email, name or discount code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Advanced filters"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              showAdvanced || hasAdvancedFilter
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {hasAdvancedFilter ? "Filters active" : "Filters"}
          </button>
        </div>

        {/* Advanced filters panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Advanced filters
                  </p>
                  {hasAdvancedFilter && (
                    <button onClick={clearAdvanced} className="text-[10px] text-primary hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Date from</label>
                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Date to</label>
                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-muted-foreground mb-1">Product</label>
                    <select value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">All products</option>
                      {productOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Match % min</label>
                    <input type="number" min={0} max={100} value={filterMatchMin} onChange={(e) => setFilterMatchMin(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Match % max</label>
                    <input type="number" min={0} max={100} value={filterMatchMax} onChange={(e) => setFilterMatchMax(e.target.value)}
                      placeholder="100"
                      className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status filter + actions */}
      <div className="flex flex-wrap gap-2">
        {(["all", "sent", "processing", "no_email", "failed"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === f
                ? f === "all"         ? "bg-primary text-primary-foreground"
                : f === "sent"     ? "bg-green-500/20  text-green-400  border border-green-500/40"
                : f === "processing" ? "bg-amber-500/20  text-amber-400  border border-amber-500/40"
                : f === "no_email"   ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                :                       "bg-destructive/20 text-destructive border border-destructive/40"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "all"         ? `All (${counts.all})`
              : f === "sent"     ? `Sent (${counts.sent})`
              : f === "processing" ? `Processing (${counts.processing})`
              : f === "no_email"   ? `No email (${counts.no_email})`
              :                       `Failed (${counts.failed})`}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground/70 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-400 active:scale-95 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Export all sessions to CSV"
          >
            <Download className="h-3.5 w-3.5" /> {exporting ? "…" : "Export CSV"}
          </button>

          <button
            onClick={openPurgeModal}
            className="flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground/70 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Delete sessions older than 7 days — keeps only the last 7 days"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete &gt; 7d old
          </button>

          <button
            onClick={refreshAll}
            className="flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground/70 active:scale-95 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <SessionSkeleton />
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 py-12 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm font-medium text-foreground">
            {search || hasAdvancedFilter ? "No results found" : "No sessions"}
          </p>
          {(search || hasAdvancedFilter) && (
            <p className="text-xs text-muted-foreground mt-1">Try different criteria.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {totalCount} sessions{search ? ` (search: "${search}")` : ""}
              {hasAdvancedFilter && " · filters active"}
              {statusFilter !== "all" && ` · filter: ${statusFilter}`}
              {totalPages > 1 && ` · page ${safePage} of ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={safePage === 1}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground disabled:opacity-30 active:scale-95 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center text-xs font-semibold text-foreground">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground disabled:opacity-30 active:scale-95 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <AnimatePresence initial={false}>
            {paginated.map((s, i) => {
              const status = getSessionStatus(s);
              const meta = STATUS_META[status];
              const expired = isCodeExpired(s);
              const hrsLeft = s.discount_code && !expired ? hoursUntilExpiry(s) : null;
              const expiringSoon = hrsLeft !== null && hrsLeft <= 4 && hrsLeft > 0;
              const fullName = [s.nome, s.cognome].filter(Boolean).join(" ");
              const StatusIcon = meta.icon;
              const isRedeeming = redeemingId === s.id;

              return (
                <motion.div
                  key={s.id}
                  className="rounded-2xl border border-border bg-card p-4"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.15), duration: 0.2 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      {fullName && (
                        <p className="truncate text-sm font-bold text-foreground">{fullName}</p>
                      )}
                      <p className="truncate text-xs text-foreground/80">{s.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {sessionProductName(s)} · <span className="text-primary font-semibold">{s.match_percent}%</span>
                        {isGlobal && s.store_id && (
                          <span className="ml-1.5 text-primary/60">· {storeName(s.store_id)}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(s.created_at)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                      </span>

                      {s.discount_code ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <code className={`rounded-lg px-2 py-1 text-[11px] font-mono font-bold ${
                              s.code_redeemed
                                ? "bg-muted text-muted-foreground line-through"
                                : expired
                                ? "bg-muted text-muted-foreground line-through"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {s.discount_code}
                            </code>

                            {s.code_redeemed ? (
                              <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-400 uppercase">used</span>
                            ) : expired ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">expired</span>
                            ) : expiringSoon ? (
                              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                                expires in {hrsLeft}h
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-400 uppercase">valid</span>
                            )}

                            <button
                              onClick={() => copyCode(s.discount_code!)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground/70 hover:text-foreground active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Copy code"
                            >
                              {copiedCode === s.discount_code
                                ? <Check className="h-3.5 w-3.5 text-green-400" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {!s.code_redeemed && (
                            <button
                              onClick={() => markRedeemed(s)}
                              disabled={isRedeeming}
                              className="flex min-h-[32px] items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-semibold text-foreground/70 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-400 active:scale-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Mark code as used by the customer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {isRedeeming ? "…" : "Mark as used"}
                            </button>
                          )}

                          {s.code_redeemed && s.code_redeemed_at && (
                            <p className="text-[9px] text-muted-foreground/50">
                              Used on {formatDate(s.code_redeemed_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                          <XCircle className="h-3 w-3" /> No code
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={safePage === 1}
                className="flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground/70 disabled:opacity-30 active:scale-95 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-xs text-foreground/70">{safePage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={safePage === totalPages}
                className="flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground/70 disabled:opacity-30 active:scale-95 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {totalCount} total sessions · 20 per page · Codes expire 24h after creation · Live updates ⚡
      </p>

      {/* ── Purge confirmation modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showPurgeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !purging && setShowPurgeModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="purge-modal-title"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p id="purge-modal-title" className="text-sm font-bold text-foreground">Delete old sessions</p>
                  <p className="text-xs text-foreground/70">Removes sessions older than 7 days · keeps the last 7 days</p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
                <p className="font-semibold mb-1">⚠ Irreversible action</p>
                <p>
                  {purgePreviewCount === null
                    ? "Calculating sessions to delete…"
                    : purgePreviewCount === 0
                    ? "No sessions to delete (all within 7 days)."
                    : `${purgePreviewCount} sessions will be permanently deleted.`}
                </p>
              </div>

              <p className="mb-5 text-xs text-foreground/70">
                Before proceeding, use the <strong className="text-foreground">Export CSV</strong> button to save all customer data.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => !purging && setShowPurgeModal(false)}
                  disabled={purging}
                  className="flex-1 min-h-[44px] rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-semibold text-foreground/70 hover:text-foreground active:scale-95 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={executePurge}
                  disabled={purging || purgePreviewCount === 0}
                  className="flex-1 min-h-[44px] rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 active:scale-95 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  {purging ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
