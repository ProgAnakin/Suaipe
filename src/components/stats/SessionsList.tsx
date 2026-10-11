import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getStoreById } from "@/data/stores";
import { formatDate, sessionProductName, storeName, type QuizSession } from "./types";

const PAGE_SIZE = 20;

interface SessionsListProps {
  allSessions: QuizSession[];
  searchedSessions: QuizSession[];
  search: string;
  page: number;
  filterStore: string | null;
  isFiltered: boolean;
  codesGenerated: number;
  codesUsed: number;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onExport: () => void;
}

export const SessionsList = ({
  allSessions, searchedSessions, search, page,
  filterStore, isFiltered, codesGenerated, codesUsed,
  onSearchChange, onPageChange, onExport,
}: SessionsListProps) => {
  const totalPages = Math.ceil(searchedSessions.length / PAGE_SIZE);
  const pagedSessions = searchedSessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const redemptionPct = codesGenerated > 0 ? Math.round((codesUsed / codesGenerated) * 100) : 0;

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-6 shadow-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">🕐 Sessions</h2>
          {allSessions.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {search.trim()
                ? `${searchedSessions.length} results · ${allSessions.length} total`
                : `${allSessions.length} total`}
              {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
            </p>
          )}
        </div>
        {allSessions.length > 0 && (
          <button
            onClick={onExport}
            className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground active:scale-95"
          >
            <Download className="h-3 w-3" />
            {filterStore ? `Export ${getStoreById(filterStore)?.shortName ?? ""}` : "Export CSV"}
          </button>
        )}
      </div>

      {codesGenerated > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{codesGenerated}</span> codes generated ·{" "}
          <span className="font-semibold text-foreground">{codesUsed}</span> used{" "}
          <span className={`font-semibold ${
            redemptionPct >= 30 ? "text-green-500"
            : redemptionPct >= 15 ? "text-amber-500"
            : "text-destructive"
          }`}>
            ({redemptionPct}%)
          </span>
        </p>
      )}

      {allSessions.length > 0 && (
        <div className="mb-3 flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email or product..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground active:scale-95 shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {allSessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
          <p className="text-2xl mb-2">📫</p>
          <p className="text-sm font-medium text-foreground">
            {isFiltered ? "No sessions found" : "No sessions yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isFiltered
              ? "Try expanding the date range or changing the selected store."
              : "Start the quiz on the iPad to begin collecting data."}
          </p>
        </div>
      ) : searchedSessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm font-medium text-foreground">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a name, email or product name.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pagedSessions.map((s) => {
              const fullName = [s.nome, s.cognome].filter(Boolean).join(" ");
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3 text-sm"
                >
                  <div className="overflow-hidden">
                    {fullName && (
                      <p className="truncate font-semibold text-foreground">{fullName}</p>
                    )}
                    <p className="truncate font-medium text-foreground/80">{s.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{sessionProductName(s)}</p>
                    {s.store_id && (
                      <p className="text-[10px] text-primary/70 mt-0.5">📍 {storeName(s.store_id)}</p>
                    )}
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="font-bold text-primary">{s.match_percent}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(s.created_at)}</p>
                    {s.discount_code && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {s.code_redeemed ? "✅ used" : "🎟 generated"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground disabled:opacity-30 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground disabled:opacity-30 active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
